import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { seed } from './support.mjs';

async function enterPin(page, pin = '1974') {
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
}
async function openParents(page) {
  await page.goto('/#/parent');
  await enterPin(page);
  await expect(page.getByRole('heading', { name: 'Повтори PIN' })).toBeVisible();
  await enterPin(page);
  const recovery = await page.locator('output').innerText();
  await page.getByRole('button', { name: 'Записах го' }).click();
  await expect(page.getByRole('tablist')).toBeVisible();
  return recovery;
}
async function stored(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction('keyval').objectStore('keyval').get('tinymind');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test('navigation from the footer starts the next screen at its heading', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('button', { name: 'Родителски вход' }).click();
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeFocused();
});

test('legacy profiles migrate without losing their completed games', async ({ page }) => {
  await seed(page);
  await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('keyval-store', 1);
      r.onsuccess = () => resolve(r.result);
    });
    try {
      await new Promise((resolve) => {
        const tx = db.transaction('keyval', 'readwrite'),
          store = tx.objectStore('keyval'),
          r = store.get('tinymind');
        r.onsuccess = () => {
          const value = JSON.parse(r.result);
          value.version = 1;
          value.state.version = 1;
          delete value.state.profiles[0].unlockedAgeMax;
          delete value.state.settings.filter;
          value.state.profiles[0].completed['puzzle-farm-2'] = 3;
          store.put(JSON.stringify(value), 'tinymind');
        };
        tx.oncomplete = resolve;
      });
    } finally {
      db.close();
    }
  });
  await page.goto('/#/kid');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  expect(JSON.parse(await stored(page)).state.profiles[0].completed['puzzle-farm-2']).toBe(3);
});

test('PIN remains editable during the short submission delay', async ({ page }) => {
  await seed(page);
  await page.goto('/#/parent');
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeVisible();
  const now = new Date('2026-11-12T08:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.keyboard.type('1974');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('5');
  await expect(page.getByRole('status')).toHaveText('Въведени 4 от 4 цифри');
  await page.clock.runFor(1);
  await page.clock.runFor(200);
  await expect(page.getByRole('heading', { name: 'Повтори PIN' })).toBeVisible();
  await page.keyboard.type('1975');
  await page.clock.runFor(200);
  await expect(page.getByRole('heading', { name: 'Код за възстановяване' })).toBeVisible();
});

test('profile deletion removes its recordings as well as its progress', async ({ page }) => {
  await seed(page);
  await openParents(page);
  await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('keyval-store', 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise((resolve) => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(
        { type: 'audio/webm', bytes: new TextEncoder().encode('test recording').buffer },
        'tinymind:voice:qa:bravo',
      );
      tx.oncomplete = resolve;
    });
    db.close();
  });
  await page.getByRole('tab', { name: 'Профили', exact: true }).click();
  await page.getByRole('button', { name: 'Изтрий', exact: true }).first().click();
  await page.getByRole('button', { name: 'Изтрий', exact: true }).last().click();
  await expect(page.getByText('Още няма профили. Добави първия.')).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open('keyval-store', 1);
        r.onsuccess = () => resolve(r.result);
      });
      try {
        return await new Promise((resolve) => {
          const r = db
            .transaction('keyval')
            .objectStore('keyval')
            .get('tinymind:voice:qa:bravo');
          r.onsuccess = () => resolve(r.result === undefined);
        });
      } finally {
        db.close();
      }
    }),
  ).toBe(true);
});

test('public landing has real readable HTML without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://localhost:4173');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Малки игри');
    await expect(page.getByRole('link', { name: 'Поверителност', exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('a blocked audio resume cannot lock the rhythm game', async ({ page }) => {
  await page.addInitScript(() => {
    AudioContext.prototype.resume = () => new Promise(() => {});
    Object.defineProperty(AudioContext.prototype, 'state', { get: () => 'suspended' });
  });
  await seed(page, { age: 3 });
  await page.goto('/#/play/rhythm-studio-3');
  await page.clock.install();
  await page.getByRole('button', { name: 'Чуй примера', exact: true }).click();
  await page.clock.runFor(10_000);
  await expect(page.getByRole('button', { name: 'Бум', exact: true })).toBeEnabled();
});

test('production security headers allow local gameplay without external requests', async ({
  page,
}) => {
  const config = JSON.parse(
    await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
  );
  const headers = Object.fromEntries(
    config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );
  // Production is HTTPS. WebKit upgrades loopback HTTP too, where this test server has no TLS.
  headers['content-security-policy'] = headers['content-security-policy'].replace(
    '; upgrade-insecure-requests',
    '',
  );
  const external = [];
  page.on('request', (request) => {
    if (
      !request.url().startsWith('http://localhost:4173') &&
      !request.url().startsWith('blob:')
    )
      external.push(request.url());
  });
  await page.addInitScript(() => {
    window.qaPolicyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.qaPolicyViolations.push(event.violatedDirective),
    );
  });
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  await seed(page);
  await page.goto('/#/play/puzzle-farm-2');
  await page
    .getByRole('group', { name: 'Картинки', exact: true })
    .getByRole('button', { name: 'крава', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Сенки', exact: true })
    .getByRole('button', { name: 'Сянка: крава', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'На място: крава', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.qaPolicyViolations)).toEqual([]);
  expect(external).toEqual([]);
});

test('landing exposes all nine real categories and public parent information', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page);
  const publicHtml = await (await page.request.get('/')).text();
  for (const path of ['help', 'privacy', 'credits']) {
    expect(publicHtml).toContain('href="#/' + path + '"');
  }
  const categories = [
    ['Пъзели', 'puzzles'],
    ['Цветове', 'colors'],
    ['Форми', 'shapes'],
    ['Числа', 'numbers'],
    ['Букви', 'letters'],
    ['Животни', 'animals'],
    ['Памет', 'memory'],
    ['Превозни средства', 'vehicles'],
    ['Храна', 'food'],
  ];
  for (const [label, id] of categories) {
    await page.goto('/');
    await page.locator('#games').getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/c/' + id + '$'));
    await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  for (const [label, title, path] of [
    ['Как се играе', 'Първи стъпки заедно', 'help'],
    ['Поверителност', 'Поверителност и вашите данни', 'privacy'],
    ['Автори и материали', 'Автори и материали', 'credits'],
  ]) {
    await page.goto('/');
    const link = page.getByRole('contentinfo').getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', '#/' + path);
    const newTab = await page.context().newPage();
    await newTab.goto(new URL(await link.getAttribute('href'), page.url()).href);
    await expect(newTab.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await newTab.close();
    await link.click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

for (const path of ['/core', '/ds', '/this-does-not-exist']) {
  test('production keeps technical controls private: ' + path, async ({ page }) => {
    await seed(page);
    await page.goto('/#' + path);
    await expect(
      page.getByRole('heading', { name: 'Тази пътечка не води до игра' }),
    ).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await page.getByRole('link', { name: 'Обратно към игрите →' }).click();
    await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  });
}

test('all parent tabs work with keyboard navigation and have accessible panels', async ({
  page,
}) => {
  await seed(page);
  await openParents(page);
  const tabs = page.getByRole('tab');
  await tabs.first().focus();
  await tabs.first().press('Home');
  for (let i = 0; i < 6; i++) {
    const current = tabs.nth(i);
    await expect(current).toBeFocused();
    await expect(current).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      await current.getAttribute('id'),
    );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
    if (i < 5) await current.press('ArrowRight');
  }
  await tabs.last().press('Home');
  await expect(tabs.first()).toBeFocused();
  await tabs.first().press('End');
  await expect(tabs.last()).toBeFocused();
});

test('PIN lockout persists after reload and recovery creates a new PIN', async ({ page }) => {
  await seed(page);
  const code = await openParents(page);
  await page.goto('/#/kid');
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  await page.goto('/#/parent');
  for (let i = 0; i < 5; i++) {
    await enterPin(page, '8888');
    await expect
      .poll(async () => {
        const pin = JSON.parse(await stored(page)).state.pin;
        return i === 4 ? pin.lockedUntil > Date.now() : pin.failedAttempts === i + 1;
      })
      .toBe(true);
    if (i < 4) await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();
  await page.clock.install();
  await page.clock.runFor(31_000);
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Забравен PIN' }).click();
  await page.getByRole('textbox').fill(code.toLowerCase().replace('-', ''));
  await page.getByRole('button', { name: 'Потвърди', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeVisible();
  await enterPin(page, '2468');
  await expect(page.getByRole('heading', { name: 'Повтори PIN' })).toBeVisible();
  await enterPin(page, '2468');
  await page.getByRole('button', { name: 'Записах го' }).click();
  await page.goto('/#/kid');
  await expect(page.getByRole('heading', { name: 'Здравей, Мими!' })).toBeVisible();
  await page.goto('/#/parent');
  await enterPin(page, '2468');
  await expect(page.getByRole('tablist')).toBeVisible();
});

test('backup export, validated restore and cancellation preserve user data', async ({
  page,
}) => {
  await seed(page);
  await openParents(page);
  await page.getByRole('tab', { name: 'Настройки', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Изтегли резервно копие' }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(backup.state.profiles[0].name).toBe('Мими');
  const upload = page.getByLabel('Възстанови от файл');
  await upload.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":true}'),
  });
  await expect(page.getByRole('status')).toContainText('не е валидно');
  expect(JSON.parse(await stored(page)).state.profiles[0].name).toBe('Мими');
  backup.state.profiles[0].name = 'Тестово копие';
  const file = {
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await upload.setInputFiles(file);
  await page.getByRole('button', { name: 'Отказ', exact: true }).click();
  expect(JSON.parse(await stored(page)).state.profiles[0].name).toBe('Мими');
  await upload.setInputFiles(file);
  await page.getByRole('button', { name: 'Потвърди възстановяването' }).click();
  await expect(page.getByRole('status')).toContainText('възстановено');
  await page.reload();
  await enterPin(page);
  await page.getByRole('tab', { name: 'Профили', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Тестово копие');
});

test('corrupt saved data offers recovery without overwriting the original', async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('keyval-store', 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise((resolve) => {
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put('broken original', 'tinymind');
      tx.oncomplete = resolve;
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Данните не могат да се отворят' }),
  ).toBeVisible();
  expect(await stored(page)).toBe('broken original');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Изтегли копие на данните' }).click();
  expect(await readFile(await (await pending).path(), 'utf8')).toBe('broken original');
  await page.getByRole('button', { name: 'Продължи временно без запазване' }).click();
  await expect(page.getByRole('status')).toContainText('Временен режим');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Малки игри');
  expect(await stored(page)).toBe('broken original');
});

test('denied storage has a usable explicit temporary mode', async ({ page }) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new DOMException('Storage denied', 'SecurityError');
    };
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Данните не могат да се отворят' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Продължи временно без запазване' }).click();
  await expect(page.getByRole('status')).toContainText('Временен режим');
  await page.getByRole('button', { name: 'Започнете безплатно' }).click();
  await expect(page.getByRole('heading', { name: 'Създай PIN' })).toBeVisible();
});

test('write failures tell the family their progress is not saved', async ({ page }) => {
  await seed(page);
  await openParents(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (args[1] === 'tinymind') throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('tab', { name: 'Настройки', exact: true }).click();
  await page.getByRole('switch').first().click();
  await expect(page.getByRole('status')).toContainText('Запазването не успя');
});

for (const route of ['help', 'privacy', 'credits']) {
  test('public ' + route + ' is readable and accessible at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/#/' + route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  });
}

test('all twenty actual recordings decode and play in the browser', async ({ page }) => {
  await page.addInitScript(() => {
    window.qaPlayedAudio = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.qaPlayedAudio.push(this);
      return original.apply(this, args);
    };
  });
  await seed(page);
  await page.goto('/#/play/sound-farm-2');
  await page.locator('.playful-game').getByRole('button', { name: 'Чуй', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.qaPlayedAudio.some(
          (audio) =>
            /cow.*\.mp3/.test(audio.currentSrc) && audio.readyState >= 2 && !audio.paused,
        ),
      ),
    )
    .toBe(true);
  const assets = await (await page.request.get('/sw.js')).text();
  const names = [
    ...new Set([...assets.matchAll(/(?:assets\/)?[a-z]+-[\w-]+\.mp3/g)].map((m) => m[0])),
  ];
  expect(names).toHaveLength(20);
  const decoded = await page.evaluate(async (names) => {
    const context = new AudioContext();
    const result = [];
    try {
      for (const name of names) {
        const response = await fetch('/' + name);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        let peak = 0;
        for (const value of audio.getChannelData(0)) peak = Math.max(peak, Math.abs(value));
        result.push({ name, duration: audio.duration, peak });
      }
    } finally {
      await context.close();
    }
    return result;
  }, names);
  for (const item of decoded) {
    expect(item.duration).toBeGreaterThan(0.1);
    expect(item.duration).toBeLessThan(4);
    expect(item.peak).toBeGreaterThan(0.005);
  }
});
