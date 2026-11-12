import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seed } from './support.mjs';

const directory = new URL('../../src/content/activities/', import.meta.url);
const catalog = readdirSync(directory, { recursive: true })
  .filter((file) => file.endsWith('.json'))
  .map((file) =>
    JSON.parse(readFileSync(new URL(file.replaceAll('\\', '/'), directory), 'utf8')),
  );
const puzzle = '/#/play/puzzle-farm-2';

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
    await holes(page)
      .getByRole('button', { name: `Сянка: ${label}`, exact: true })
      .click();
  }
}

test('puzzle accepts both orders, gives a hint, waits at the break and saves one sticker', async ({
  page,
}) => {
  await seed(page);
  await page.goto(puzzle);
  const cow = pieces(page).getByRole('button', { name: 'крава', exact: true });
  const cowShadow = holes(page).getByRole('button', { name: 'Сянка: крава', exact: true });
  await page.getByRole('button', { name: 'Подсказка' }).click();
  await expect(
    page.getByText('Звездичките свързват картинката и сянката за крава.'),
  ).toBeAttached();
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
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
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
  await piece.evaluate((element) =>
    element.addEventListener(
      'pointerdown',
      (event) => {
        element.dataset.qaPointer = String(event.pointerId);
      },
      { once: true },
    ),
  );
  await page.mouse.move(...start);
  await page.mouse.down();
  await page.mouse.move(...end, { steps: 10 });
  const pointerId = Number(await piece.getAttribute('data-qa-pointer'));
  await piece.dispatchEvent('pointercancel', { pointerId, clientX: end[0], clientY: end[1] });
  await page.mouse.up();
  await expect(hole).toBeEnabled();
  await page.mouse.move(...start);
  await page.mouse.down();
  await page.mouse.move(...end, { steps: 10 });
  await page.mouse.up();
  await expect(
    holes(page).getByRole('button', { name: `На място: ${label}`, exact: true }),
  ).toBeDisabled();
});

test('sorting accepts a basket-first touch gesture at 320px', async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 320, height: 720 },
  });
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
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await context.setOffline(true);
}

test('offline: cached category art, profile and an unvisited puzzle survive reload', async ({
  page,
  context,
}) => {
  await seed(page);
  await goOffline(page, context);
  await page.goto('/#/c/puzzles');
  await expect(page.locator('header img').first()).toHaveJSProperty('complete', true);
  await expect
    .poll(() =>
      page
        .locator('header img')
        .first()
        .evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
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

test('category filters keep ages separate and reveal more games on demand', async ({
  page,
}) => {
  await seed(page, { ageOverride: { min: 2, max: 6 }, reducedMotion: false });
  await page.goto('/#/c/letters');
  const ageSelector = page.getByRole('group', { name: 'Възраст' });
  await expect(ageSelector.getByRole('button', { name: '2 г.' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const cards = page.locator('button[data-activity]');
  await expect(cards).toHaveCount(12);
  await page.getByRole('button', { name: 'Покажи още игри' }).click();
  await expect(cards).toHaveCount(20);
  await ageSelector.getByRole('button', { name: '6 г.' }).click();
  await expect(cards).toHaveCount(12);
  await page.getByRole('button', { name: 'Първи звук', exact: true }).click();
  for (const card of await cards.all()) {
    const id = await card.getAttribute('data-activity');
    expect(catalog.find((entry) => entry.id === id)?.params.mode).toBe('initial');
  }
  if (process.env.QA_SCREENSHOTS) {
    await page.screenshot({ path: resolve(process.env.QA_SCREENSHOTS, 'букви-каталог.png') });
  }
});

test('first memory game can reveal the picture again and finish by keyboard', async ({
  page,
}) => {
  const game = catalog.find(
    ({ category, engine, ageMin }) =>
      category === 'memory' && engine === 'discovery' && ageMin === 2,
  );
  await seed(page);
  await page.goto('/#/play/' + game.id);
  const continueGame = page.getByRole('button', { name: 'Продължи', exact: true });
  await expect(page.getByRole('heading', { name: 'Виж кой е тук.' })).toBeVisible();
  if (process.env.QA_SCREENSHOTS) {
    await page.screenshot({
      path: resolve(process.env.QA_SCREENSHOTS, 'спомни-си-картинката.png'),
    });
  }
  await continueGame.press('Enter');
  await expect(page.getByRole('heading', { name: 'Кой беше тук?', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Покажи пак' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Виж кой е тук.' })).toBeFocused();
  for (const round of game.params.rounds) {
    await continueGame.press('Enter');
    await page
      .locator('.playful-game section button')
      .nth(round.choices.indexOf(round.answer))
      .press('Enter');
    await expect(page.getByRole('heading', { name: /^Откри:/ })).toBeVisible();
    await page.getByRole('button', { name: /^(Продължи|Готово)$/ }).press('Enter');
  }
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByText('Заедно извън екрана')).toBeVisible();
});

test('music plays only on request, stops cleanly and is absent from listening games', async ({
  page,
}) => {
  await page.addInitScript(() => {
    // A slow output device must start the requested music when it becomes ready.
    let prototype = AudioContext.prototype;
    let descriptor;
    while (prototype && !descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(prototype, 'state');
      prototype = Object.getPrototypeOf(prototype);
    }
    const resume = AudioContext.prototype.resume;
    Object.defineProperty(AudioContext.prototype, 'state', {
      configurable: true,
      get() {
        return this.qaDelayed ? 'suspended' : descriptor.get.call(this);
      },
    });
    AudioContext.prototype.resume = function () {
      if (!this.qaDelayStarted) {
        this.qaDelayStarted = true;
        this.qaDelayed = true;
        setTimeout(() => {
          this.qaDelayed = false;
          this.dispatchEvent(new Event('statechange'));
        }, 1200);
      }
      return resume.call(this);
    };
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      const count = Number(document.documentElement.dataset.audioStarts ?? 0);
      document.documentElement.dataset.audioStarts = String(count + 1);
      return original.apply(this, args);
    };
  });
  await seed(page, { age: 3, sound: false, reducedMotion: false });
  await page.goto(puzzle);
  const music = page.getByRole('button', { name: 'Музика' });
  const animation = () =>
    page.locator('.playful-game').evaluate((game) => getComputedStyle(game).animationName);
  await expect.poll(animation).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(animation).toBe('none');
  const oscillatorCount = () =>
    page.locator('html').evaluate((root) => Number(root.dataset.audioStarts ?? 0));
  await expect(music).toHaveAttribute('aria-pressed', 'false');
  expect(await oscillatorCount()).toBe(0);
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(oscillatorCount).toBeGreaterThan(0);
  await music.click();
  await expect(music).toHaveAttribute('aria-pressed', 'false');
  const stoppedAt = await oscillatorCount();
  await page.clock.install();
  await page.clock.fastForward(1_500);
  expect(await oscillatorCount()).toBe(stoppedAt);
  await page.goto('/#/play/rhythm-studio-3');
  await expect(page.locator('.playful-game[data-activity="rhythm-studio-3"]')).toBeVisible();
  await expect(music).toHaveCount(0);
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
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

test('garden accepts a prediction, then compares pots without marking it wrong', async ({
  page,
}) => {
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
  await expect(page.getByRole('progressbar', { name: 'Напредък в играта' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

for (const theme of ['light', 'dark']) {
  test(`shadow puzzle has no detected WCAG A/AA violations in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await seed(page, { theme, age: 4 });
    await page.goto('/#/play/puzzle-forest-6');
    await expect(holes(page).getByRole('button')).toHaveCount(6);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map(({ id, nodes }) => [id, nodes.map((node) => node.target)]),
    ).toEqual([]);
    if (process.env.QA_SCREENSHOTS) {
      await page.screenshot({
        path: resolve(process.env.QA_SCREENSHOTS, `горска-поляна-${theme}.png`),
        fullPage: true,
      });
    }
  });
}

for (const age of [2, 3, 4, 5, 6]) {
  test(`all ${age}-year-old starting activities render offline at 320px`, async ({
    page,
    context,
  }) => {
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
      if (!['net::ERR_ABORTED', 'NS_BINDING_ABORTED', 'cancelled'].includes(reason))
        errors.push(`${reason} ${request.url()}`);
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
