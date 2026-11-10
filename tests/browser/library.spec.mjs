import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const directory = new URL('../../src/content/activities/', import.meta.url);
const catalog = readdirSync(directory).filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
const puzzle = '/#/play/puzzle-farm-2';

async function seed(page, { age = 2, theme = 'light', dailyMin = null, themes = [] } = {}) {
  await page.goto('/');
  await page.evaluate(async ({ age, theme, dailyMin, themes }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('keyval');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const date = new Date();
    const today = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')].join('-');
    const profile = { id: 'qa', name: 'Мими', age, unlockedAgeMax: age, avatar: null,
      createdAt: Date.now(), skillRatings: {}, completed: {}, stickers: [], totalMs: 0 };
    const state = {
      version: 2,
      profiles: [profile], activeProfileId: profile.id,
      settings: {
        sound: true, music: false, voice: false, reducedMotion: true, theme,
        limits: { dailyMin, sessionMin: null, softStopMin: 1 },
        filter: { ageOverride: null, skills: [], themes },
      },
      pin: { hash: null, salt: null, recoveryHash: null, recoverySalt: null,
        failedAttempts: 0, lockedUntil: null },
      usage: dailyMin === null ? {} : { [profile.id]: { [today]: dailyMin * 60_000 } },
    };
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put(JSON.stringify({ state, version: 2 }), 'tinymind');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }, { age, theme, dailyMin, themes });
  await page.reload();
}

const holes = (page) => page.getByRole('group', { name: 'Сенки', exact: true });
const pieces = (page) => page.getByRole('group', { name: 'Картинки', exact: true });

test('a new family creates a profile and its PIN survives reload', async ({ page }) => {
  await page.goto('/#/parent');
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeVisible();
  const enterPin = async () => {
    for (const digit of ['1', '9', '7', '4']) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
  };
  await enterPin();
  await expect(page.getByRole('heading', { name: 'Повтори PIN' })).toBeVisible();
  await enterPin();
  await page.getByRole('button', { name: 'Записах го' }).click();
  await page.getByRole('textbox', { name: 'Име', exact: true }).fill('Мими');
  await page.getByRole('button', { name: 'Добави', exact: true }).click();
  await expect(page.getByText('Мими', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Излез от родителския режим' }).click();
  await page.goto('/#/kid');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  await page.goto('/#/parent');
  await expect(page.getByRole('heading', { name: 'Въведи PIN' })).toBeVisible();
  await enterPin();
  await expect(page.getByRole('tablist')).toBeVisible();
});

async function solveShadows(page) {
  const count = await pieces(page).getByRole('button').count();
  for (let index = 0; index < count; index += 1) {
    // The list shrinks after each move.
    const piece = pieces(page).getByRole('button').first();
    const label = await piece.getAttribute('aria-label');
    await piece.click();
    await holes(page).getByRole('button', { name: `Сянка: ${label}`, exact: true }).click();
  }
}

test('puzzle accepts both orders, gives a hint, waits at the break and saves one sticker', async ({ page }) => {
  await seed(page);
  await page.goto(puzzle);
  const cow = pieces(page).getByRole('button', { name: 'крава', exact: true });
  const cowShadow = holes(page).getByRole('button', { name: 'Сянка: крава', exact: true });
  await page.getByRole('button', { name: 'Подсказка' }).click();
  await expect(page.getByText('Звездичките свързват картинката и сянката за крава.')).toBeAttached();
  await cowShadow.click();
  await cow.press('Enter');
  await expect(holes(page).getByRole('button', { name: 'На място: крава' })).toBeDisabled();
  await expect(pieces(page).getByRole('button').first()).toBeFocused();
  await solveShadows(page);

  const next = page.getByRole('button', { name: 'Продължи', exact: true });
  await expect(next).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Готово! Кръг 1 от 2' })).toBeFocused();
  // Longer than the old automatic round switch.
  await page.clock.install();
  await page.clock.fastForward(1_500);
  await next.click();
  await solveShadows(page);
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute('aria-valuenow', '100');
  await page.getByText('Заедно извън екрана', { exact: true }).click();
  await expect(page.getByText(/Сложете лъжица върху лист/)).toBeVisible();
  await page.getByRole('button', { name: 'Следваща игра' }).click();
  await page.getByRole('button', { name: 'Започни играта' }).click();
  await expect(page).not.toHaveURL(/puzzle-farm-2$/);
  await page.goto('/#/stickers');
  await expect(page.getByText('1 открити парчета', { exact: true })).toBeVisible();
});

test('cancelled pointer gesture cannot place a piece; a real drag can', async ({ page }) => {
  await seed(page);
  await page.goto(puzzle);
  const piece = pieces(page).getByRole('button').first();
  await expect(piece).toBeVisible();
  const label = await piece.getAttribute('aria-label');
  const hole = holes(page).getByRole('button', { name: `Сянка: ${label}`, exact: true });
  const from = await piece.boundingBox();
  const to = await hole.boundingBox();
  const start = [from.x + from.width / 2, from.y + from.height / 2];
  const end = [to.x + to.width / 2, to.y + to.height / 2];
  await page.mouse.move(...start);
  await page.mouse.down();
  await page.mouse.move(...end, { steps: 10 });
  await piece.dispatchEvent('pointercancel', { pointerId: 1, clientX: end[0], clientY: end[1] });
  await page.mouse.up();
  await expect(hole).toBeEnabled();
  await page.mouse.move(...start);
  await page.mouse.down();
  await page.mouse.move(...end, { steps: 10 });
  await page.mouse.up();
  await expect(holes(page).getByRole('button', { name: `На място: ${label}`, exact: true })).toBeDisabled();
});

test('sorting accepts a basket-first touch gesture at 320px', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true,
    viewport: { width: 320, height: 720 } });
  try {
    const page = await context.newPage();
    await seed(page, { age: 3 });
    await page.goto('/#/play/sorting-animals-food');
    const cow = page.getByRole('button', { name: 'крава', exact: true });
    await page.getByRole('button', { name: 'кошница: круша', exact: true }).tap();
    await cow.tap();
    await expect(cow).toBeVisible();
    await page.getByRole('button', { name: 'кошница: кон', exact: true }).tap();
    await cow.tap();
    await expect(cow).toHaveCount(0);
  } finally {
    await context.close();
  }
});

async function goOffline(page, context) {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
}

test('offline: cached category art, profile and an unvisited puzzle survive reload', async ({ page, context }) => {
  await seed(page);
  await goOffline(page, context);
  await page.goto('/#/c/puzzles');
  await expect(page.locator('header img').first()).toHaveJSProperty('complete', true);
  await expect.poll(() => page.locator('header img').first().evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.goto(puzzle);
  await page.reload();
  await expect(pieces(page).getByRole('button')).toHaveCount(2);
  await solveShadows(page);
  await expect(page.getByRole('button', { name: 'Продължи', exact: true })).toBeVisible();
});

test('daily limit follows the child into game suggestions', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await seed(page, { dailyMin: 10 });
  await page.goto('/#/next');
  const stop = page.getByRole('dialog', { name: 'Днес играхме достатъчно' });
  await expect(stop).toContainText('време за почивка');
  await stop.getByRole('button').scrollIntoViewIfNeeded();
  await expect(stop.getByRole('button')).toBeInViewport();
});

test('parent theme choices apply to the catalogue and direct game links', async ({ page }) => {
  await seed(page, { themes: ['garden'] });
  await page.goto('/#/c/food');
  await expect(page.getByRole('button', { name: /Първото семенце/ })).toBeVisible();
  await page.goto('/#/c/puzzles');
  await expect(page.getByRole('button', { name: /Два отвора/ })).toHaveCount(0);
  await page.goto(puzzle);
  await expect(page.getByText('Тази игра е скрита от родителските настройки.')).toBeVisible();
});

test('garden responds to water and light independently', async ({ page }) => {
  await seed(page, { age: 4 });
  await page.goto('/#/play/garden-two-needs');
  const observe = page.getByRole('button', { name: 'Виж какво ще стане' });
  await observe.click();
  await expect(page.getByRole('status')).toContainText('нужда от вода');
  await page.getByRole('button', { name: 'Без вода' }).press('Space');
  await observe.click();
  await expect(page.getByRole('status')).toContainText('Показа се кълн');
  await page.getByRole('button', { name: 'На тъмно' }).press('Space');
  await observe.click();
  await expect(page.getByRole('status')).toContainText('Водата и светлината');
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute('aria-valuenow', '100');
});

test('garden accepts a prediction, then compares pots without marking it wrong', async ({ page }) => {
  await seed(page, { age: 6, theme: 'dark' });
  await page.goto('/#/play/garden-light-test');
  const observe = page.getByRole('button', { name: 'Виж какво ще стане' });
  await expect(observe).toBeDisabled();
  await page.getByRole('button', { name: 'На тъмно', exact: true }).click();
  await observe.click();
  await expect(page.getByRole('button', { name: 'На тъмно · Кълн' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'На светло · Порасна!' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('И двете саксии имат вода');
  if (process.env.QA_SCREENSHOTS) {
    await page.screenshot({ path: resolve(process.env.QA_SCREENSHOTS, 'жива-градина.png') });
  }
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute('aria-valuenow', '100');
});

for (const theme of ['light', 'dark']) {
  test(`shadow puzzle has no detected WCAG A/AA violations in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await seed(page, { theme, age: 4 });
    await page.goto('/#/play/puzzle-forest-6');
    await expect(holes(page).getByRole('button')).toHaveCount(6);
    const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(report.violations.map(({ id, nodes }) => [id, nodes.map((node) => node.target)])).toEqual([]);
    if (process.env.QA_SCREENSHOTS) {
      await page.screenshot({ path: resolve(process.env.QA_SCREENSHOTS, `горска-поляна-${theme}.png`), fullPage: true });
    }
  });
}

for (const age of [2, 3, 4, 5, 6]) {
  test(`all ${age}-year-old starting activities render offline at 320px`, async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 720 });
    await seed(page, { age });
    await goOffline(page, context);
    const problems = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText;
      if (reason !== 'net::ERR_ABORTED') errors.push(`${reason} ${request.url()}`);
    });
    // Assign each activity to its starting age. Age coverage is checked separately.
    for (const activity of catalog.filter((entry) => entry.ageMin === age)) {
      errors.length = 0;
      await page.goto(`/#/play/${activity.id}`);
      try {
        const game = page.locator(`.playful-game[data-activity="${activity.id}"]`);
        await expect(game).toBeVisible({ timeout: 5_000 });
        await expect(game.locator('button, canvas, input, svg').first()).toBeAttached();
        const badLayout = await game.evaluate((element) => {
          const width = document.documentElement.clientWidth;
          return [...element.querySelectorAll('button:not([disabled])')].some((button) => {
            const rect = button.getBoundingClientRect();
            return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
          });
        });
        if (badLayout) problems.push(`${activity.id}: controls outside 320px viewport`);
      } catch (error) {
        problems.push(`${activity.id}: ${error.message}`);
      }
      problems.push(...errors.map((error) => `${activity.id}: ${error}`));
    }
    expect(problems).toEqual([]);
  });
}
