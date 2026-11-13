import { test, expect } from '@playwright/test';
import { seed, createParentPin } from './support.mjs';

for (const width of [320, 1280]) {
  test(`distinct scenes load on every main screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(response.url());
    });
    await seed(page);
    const scenes = new Set();
    const routes = [
      'kid',
      'stickers',
      'next',
      'help',
      'privacy',
      'credits',
      'missing-page',
      ...[
        'puzzles',
        'memory',
        'numbers',
        'letters',
        'colors',
        'shapes',
        'animals',
        'vehicles',
        'food',
      ].map((id) => 'c/' + id),
    ];
    for (const route of routes) {
      await page.goto('/#/' + route);
      const expected = route.startsWith('c/')
        ? route.slice(2)
        : route === 'stickers'
          ? 'album'
          : route === 'kid'
            ? 'kid-home'
            : route === 'missing-page'
              ? 'missing'
              : route;
      // Lazy route transitions may retain the previous screen while loading.
      const image = page.locator(`[data-page-art="${expected}"]`);
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0))
        .toBe(true);
      const id = await image.getAttribute('data-page-art');
      expect(scenes.has(id), `Repeated scene on ${route}`).toBe(false);
      scenes.add(id);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      ).toBe(true);
      if (['kid', 'c/animals', 'c/letters', 'next'].includes(route)) {
        await page.screenshot({
          path: `outputs/page-art-2026-11-13/${route.replace('/', '-')}-${width}.png`,
          fullPage: true,
        });
      }
    }
    await page.goto('/#/parent');
    await expect(page.locator('[data-page-art="parent-gate"]')).toBeVisible();
    await createParentPin(page);
    for (const id of ['profiles', 'limits', 'content', 'stats', 'voice', 'settings']) {
      await page.locator(`#parent-tab-${id}`).click();
      await expect(page.locator(`[data-page-art="parent-${id}"]`)).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator('[data-page-art]')
            .evaluate((element) => element.complete && element.naturalWidth > 0),
        )
        .toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        id,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
