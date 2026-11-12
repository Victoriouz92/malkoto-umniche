import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { seed } from './support.mjs';

test('a real service-worker update in another tab cannot interrupt an unfinished game', async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const root = resolve('dist');
  let version = 1;
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.woff2': 'font/woff2',
  };
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const path = resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    void readFile(path)
      .then((bytes) => {
        response.writeHead(200, {
          'Content-Type': types[extname(path)] ?? 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        response.end(
          url.pathname === '/sw.js'
            ? Buffer.concat([
                bytes,
                Buffer.from('\n/* release test version ' + version + ' */'),
              ])
            : bytes,
        );
      })
      .catch(() => {
        response.writeHead(404);
        response.end();
      });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseURL = 'http://127.0.0.1:' + server.address().port;
  const context = await browser.newContext({ baseURL });
  try {
    await context.addInitScript(() => {
      window.qaBootId = crypto.randomUUID();
    });
    const game = await context.newPage();
    await seed(game);
    await game.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await game.goto('/#/play/puzzle-farm-2');
    await game
      .getByRole('group', { name: 'Картинки', exact: true })
      .getByRole('button', { name: 'крава', exact: true })
      .click();
    await game
      .getByRole('group', { name: 'Сенки', exact: true })
      .getByRole('button', { name: 'Сянка: крава', exact: true })
      .click();
    const boot = await game.evaluate(() => window.qaBootId);
    version = 2;
    await game.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });
    await game.waitForFunction(async () =>
      Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
    );
    await expect(game.getByRole('button', { name: 'Обнови сега' })).toHaveCount(0);
    const menu = await context.newPage();
    await menu.goto('/#/kid');
    await expect(menu.getByRole('button', { name: 'Обнови сега' })).toBeVisible();
    const menuBoot = await menu.evaluate(() => window.qaBootId);
    await menu.getByRole('button', { name: 'Обнови сега' }).click();
    await expect
      .poll(() => menu.evaluate(() => window.qaBootId).catch(() => menuBoot))
      .not.toBe(menuBoot);
    expect(await game.evaluate(() => window.qaBootId)).toBe(boot);
    await expect(
      game.getByRole('button', { name: 'На място: крава', exact: true }),
    ).toBeDisabled();
    await expect(menu.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
    await game.getByRole('button', { name: 'Излез', exact: true }).click();
    await expect(game.getByRole('button', { name: 'Обнови сега' })).toBeVisible();
    await game.getByRole('button', { name: 'Обнови сега' }).click();
    await expect
      .poll(() => game.evaluate(() => window.qaBootId).catch(() => boot))
      .not.toBe(boot);
    await expect(game.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
