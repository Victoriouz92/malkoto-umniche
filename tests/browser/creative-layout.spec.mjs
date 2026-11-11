import { readdirSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { seed } from './support.mjs';

const directory = new URL('../../src/content/activities/', import.meta.url);
const activities = readdirSync(directory, { recursive: true })
  .filter((file) => file.endsWith('.json'))
  .map((file) =>
    JSON.parse(readFileSync(new URL(file.replaceAll('\\', '/'), directory), 'utf8')),
  )
  .filter((activity) => ['tracing', 'connect-dots'].includes(activity.engine));

test.use({ viewport: { width: 320, height: 800 }, hasTouch: true });

for (const activity of activities) {
  test(
    'creative geometry stays aligned and readable at 320px · ' + activity.id,
    async ({ page }) => {
      await seed(page, { age: activity.ageMin, reducedMotion: false });
      await page.goto('/#/play/' + activity.id);
      const game = page.locator('.playful-game');
      const points = game.getByRole('button', { name: /^точка / });
      await expect(points).toHaveCount(activity.params.points.length);
      const geometry = await points.evaluateAll((buttons, authored) => {
        const svg = buttons[0].parentElement.querySelector('svg');
        const matrix = svg.getScreenCTM();
        return buttons.map((button, index) => {
          const bounds = button.getBoundingClientRect();
          const projected = new DOMPoint(authored[index].x, authored[index].y).matrixTransform(
            matrix,
          );
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            dx: Math.abs(bounds.x + bounds.width / 2 - projected.x),
            dy: Math.abs(bounds.y + bounds.height / 2 - projected.y),
          };
        });
      }, activity.params.points);
      for (const point of geometry) {
        expect(point.dx).toBeLessThan(1);
        expect(point.dy).toBeLessThan(1);
        expect(point.width).toBeGreaterThanOrEqual(44);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x + point.width).toBeLessThanOrEqual(320);
      }
      for (let a = 0; a < geometry.length; a++) {
        for (let b = a + 1; b < geometry.length; b++) {
          const p = geometry[a],
            q = geometry[b];
          const distance = Math.hypot(
            p.x + p.width / 2 - q.x - q.width / 2,
            p.y + p.height / 2 - q.y - q.height / 2,
          );
          expect(distance, 'Numbered circles must not cover one another').toBeGreaterThan(
            (p.width + q.width) / 2,
          );
        }
      }
      await points.first().tap();
      await expect(points.first()).toHaveCSS('opacity', '0.72');
    },
  );
}
