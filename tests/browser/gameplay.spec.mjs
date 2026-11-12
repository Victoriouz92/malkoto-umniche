import { readdirSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { seed } from './support.mjs';
import { solveGame } from './game-solvers.mjs';

const directory = new URL('../../src/content/activities/', import.meta.url);
const catalog = readdirSync(directory, { recursive: true })
  .filter((file) => file.endsWith('.json'))
  .map((file) =>
    JSON.parse(readFileSync(new URL(file.replaceAll('\\', '/'), directory), 'utf8')),
  );
const byId = new Map(catalog.map((activity) => [activity.id, activity]));

async function savedProfile(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const data = await new Promise((resolve, reject) => {
        const request = db.transaction('keyval').objectStore('keyval').get('tinymind');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return JSON.parse(data).state.profiles[0];
    } finally {
      db.close();
    }
  });
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: process.env.QA_BROWSER !== 'firefox' });

for (const activity of catalog) {
  test('finish ' + activity.engine + ' · ' + activity.id, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    page.setDefaultTimeout(6000);
    const evidence = {
      id: activity.id,
      engine: activity.engine,
      age: activity.ageMin,
      actions: 0,
      wrongAttempts: 0,
      hints: 0,
      rounds: [],
    };
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    await page.clock.install();
    await seed(page, { age: activity.ageMin });
    await page.goto('/#/play/' + activity.id);
    const seen = new Map();
    const done = page.getByText('Заедно извън екрана', { exact: true });
    try {
      for (let round = 0; round < 4; round++) {
        await expect(page.locator('.playful-game')).toBeVisible();
        const id = await page.locator('.playful-game').getAttribute('data-activity');
        const current = byId.get(id);
        expect(current, 'Round activity must exist in offered catalogue').toBeTruthy();
        expect(current.ageMin).toBeLessThanOrEqual(activity.ageMin);
        expect(current.ageMax).toBeGreaterThanOrEqual(activity.ageMin);
        expect(current.category).toBe(activity.category);
        const variant = seen.get(id) ?? 0;
        seen.set(id, variant + 1);
        evidence.rounds.push({ id, variant });
        await solveGame(page, current, variant, evidence);
        await page.clock.runFor(2500);
        if (await done.count()) break;
        const next = page.getByRole('button', { name: 'Продължи', exact: true });
        await expect(next, 'Round must finish and offer the next round').toBeVisible();
        await next.press('Enter');
      }
      await expect(done).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Напредък в играта' }),
      ).toHaveAttribute('aria-valuenow', '100');
      await expect.poll(async () => (await savedProfile(page)).completed[activity.id]).toBe(1);
      expect((await savedProfile(page)).stickers).toContain(activity.id);
      expect(errors).toEqual([]);
      await page.getByRole('button', { name: 'Още веднъж', exact: true }).press('Enter');
      await expect(page.locator('.playful-game')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Напредък в играта' }),
      ).toHaveAttribute('aria-valuenow', '0');
      await page.getByRole('button', { name: 'Излез', exact: true }).press('Enter');
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
      expect((await savedProfile(page)).completed[activity.id]).toBe(1);
    } finally {
      await testInfo.attach('played-game', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      });
    }
  });
}
