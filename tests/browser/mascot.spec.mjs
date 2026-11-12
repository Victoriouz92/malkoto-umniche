import { readdirSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { seed } from './support.mjs';
import { solveGame } from './game-solvers.mjs';
test.use({ hasTouch: true });

const directory = new URL('../../src/content/activities/', import.meta.url);
const catalog = readdirSync(directory, { recursive: true })
  .filter((file) => file.endsWith('.json'))
  .map((file) =>
    JSON.parse(readFileSync(new URL(file.replaceAll('\\', '/'), directory), 'utf8')),
  );
const byId = new Map(catalog.map((activity) => [activity.id, activity]));

for (const width of [320, 390, 1280]) {
  test(`idle panda waves without covering controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install();
    await seed(page, { reducedMotion: false });
    await page.goto('/#/kid');
    await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('[data-mascot-atlas]')
          .evaluate((element) => element.complete && element.naturalWidth > 0),
      )
      .toBe(true);
    await page.clock.runFor(12500);
    const panda = page.locator('[data-menu-mascot]');
    await expect(panda).toBeVisible();
    const first = await panda.getAttribute('data-placement');
    await expect
      .poll(() => panda.evaluate((element) => getComputedStyle(element).opacity))
      .toBe('1');
    expect(
      await panda.locator('span').evaluate(async (element) => {
        const url = getComputedStyle(element).backgroundImage.slice(5, -2);
        const image = new Image();
        image.src = url;
        await image.decode();
        return image.naturalWidth;
      }),
    ).toBe(1152);
    await page.screenshot({ path: `outputs/page-art-2026-11-13/panda-peek-${width}.png` });
    expect(
      await panda.evaluate((element) => {
        const a = element.getBoundingClientRect();
        return [...document.querySelectorAll('button,a,input,[role="tab"]')].some((control) => {
          const b = control.getBoundingClientRect();
          return (
            b.width &&
            b.height &&
            Math.max(0, a.left) < b.right &&
            Math.min(innerWidth, a.right) > b.left &&
            Math.max(0, a.top) < b.bottom &&
            Math.min(innerHeight, a.bottom) > b.top
          );
        });
      }),
    ).toBe(false);
    const focus = await page.evaluate(() => document.activeElement?.outerHTML);
    await page.clock.runFor(4600);
    await expect(panda).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.outerHTML)).toBe(focus);
    // Move real time to the next scheduled appearance, without skipping its dismissal.
    for (let i = 0; i < 56 && !(await panda.count()); i++) await page.clock.runFor(1000);
    await expect(panda).toBeVisible();
    expect(await panda.getAttribute('data-placement')).not.toBe(first);
    await page.keyboard.press('Tab');
    await expect(panda).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('panda respects stored and system motion preferences and navigation', async ({ page }) => {
  await page.clock.install();
  await seed(page, { reducedMotion: true });
  await page.goto('/#/kid');
  await page.clock.runFor(70000);
  await expect(page.locator('[data-menu-mascot]')).toHaveCount(0);
  await seed(page, { reducedMotion: false });
  await expect
    .poll(() =>
      page
        .locator('[data-mascot-atlas]')
        .evaluate((element) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/kid');
  await page.clock.runFor(70000);
  await expect(page.locator('[data-menu-mascot]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  await page.clock.runFor(12500);
  await expect(page.locator('[data-menu-mascot]')).toBeVisible();
  await page.goto('/#/parent');
  await page.clock.runFor(70000);
  await expect(page.locator('[data-menu-mascot]')).toHaveCount(0);
});

test('round and final panda dances leave every action available', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await seed(page, { reducedMotion: false });
  const activity = catalog.find((item) => item.engine === 'counting' && item.ageMin === 2);
  await page.goto('/#/play/' + activity.id);
  const seen = new Map();
  const done = page.getByText('Заедно извън екрана', { exact: true });
  const evidence = { actions: 0, wrongAttempts: 0, hints: 0 };
  for (let round = 0; round < 4; round++) {
    await expect(page.locator('.playful-game')).toBeVisible();
    await page.clock.runFor(12500);
    await expect(page.locator('[data-menu-mascot]')).toHaveCount(0);
    const id = await page.locator('.playful-game').getAttribute('data-activity');
    const variant = seen.get(id) ?? 0;
    seen.set(id, variant + 1);
    await solveGame(page, byId.get(id), variant, evidence);
    await page.clock.runFor(1500);
    await expect(page.locator('[data-panda-dance]')).toBeVisible();
    if (await done.count()) break;
    await page.getByRole('button', { name: 'Продължи', exact: true }).press('Enter');
  }
  await expect(done).toBeVisible();
  await page.screenshot({ path: 'outputs/page-art-2026-11-13/panda-dance-390.png' });
  const dancer = page.locator('[data-panda-dance] > span').first();
  expect(
    await dancer.evaluate((element) => getComputedStyle(element).animationIterationCount),
  ).toBe('6');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await dancer.evaluate((element) => getComputedStyle(element).animationName)).toBe(
    'none',
  );
  await expect(page.getByRole('button', { name: 'Още веднъж', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Готово', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
});
