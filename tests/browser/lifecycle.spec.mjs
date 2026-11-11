import { test, expect } from '@playwright/test';
import { seed } from './support.mjs';

for (const [age, band, tap] of [
  [2, 'toddler', '5.5rem'],
  [4, 'toddler', '5.5rem'],
  [6, 'preschool', '4.5rem'],
]) {
  test('age ' + age + ' applies its control sizes throughout navigation', async ({ page }) => {
    await seed(page, { age });
    await page.goto('/#/kid');
    await expect(page.locator('html')).toHaveAttribute('data-age-band', band);
    expect(
      await page
        .locator('html')
        .evaluate((root) => getComputedStyle(root).getPropertyValue('--tap').trim()),
    ).toBe(tap);
    await page.goto('/#/ds');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.goto('/#/kid');
    await expect(page.locator('html')).toHaveAttribute('data-age-band', band);
  });
}

async function observeAudio(page) {
  await page.addInitScript(() => {
    window.qaAudio = { plays: 0, elements: [] };
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.qaAudio.plays++;
      if (!window.qaAudio.elements.includes(this)) window.qaAudio.elements.push(this);
      return original.apply(this, args);
    };
  });
}

test('leaving a sound game cancels its delayed replay', async ({ page }) => {
  await observeAudio(page);
  await seed(page);
  const now = new Date('2026-01-01T12:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.goto('/#/play/sound-farm-2');
  const game = page.locator('.playful-game');
  await expect(game).toBeVisible();
  // The first sound is a cow. Pick the other visible picture, then leave
  // during the short delay before the game replays its instruction.
  const cow = game.getByRole('button', { name: 'крава', exact: true });
  await expect(cow).toBeVisible();
  await game.getByRole('button', { name: 'котка', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Излез', exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  const before = await page.evaluate(() => window.qaAudio.plays);
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => window.qaAudio.plays)).toBe(before);
  expect(
    await page.evaluate(() => window.qaAudio.elements.every((element) => element.paused)),
  ).toBe(true);
});

test('a sound game pauses its recording when the window loses focus', async ({ page }) => {
  await observeAudio(page);
  await seed(page);
  await page.goto('/#/play/sound-farm-2');
  await page.locator('.playful-game').getByRole('button', { name: 'Чуй', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.qaAudio.elements.some((element) => !element.paused)))
    .toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(
    await page.evaluate(() => window.qaAudio.elements.every((element) => element.paused)),
  ).toBe(true);
});

test('a new sound round cannot autoplay while the window is unfocused', async ({ page }) => {
  await observeAudio(page);
  await seed(page);
  await page.clock.install();
  await page.goto('/#/play/sound-farm-2');
  await page
    .locator('.playful-game')
    .getByRole('button', { name: 'крава', exact: true })
    .press('Enter');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const before = await page.evaluate(() => window.qaAudio.plays);
  await page.clock.runFor(3000);
  expect(await page.evaluate(() => window.qaAudio.plays)).toBe(before);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page
    .locator('.playful-game')
    .getByRole('button', { name: 'Чуй', exact: true })
    .press('Enter');
  expect(await page.evaluate(() => window.qaAudio.plays)).toBe(before + 1);
});
