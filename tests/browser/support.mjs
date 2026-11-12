export async function seed(
  page,
  {
    age = 2,
    theme = 'light',
    dailyMin = null,
    themes = [],
    ageOverride = null,
    reducedMotion = true,
    music = false,
    sound = true,
  } = {},
) {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
  await page.evaluate(
    async ({ age, theme, dailyMin, themes, ageOverride, reducedMotion, music, sound }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('keyval-store', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('keyval');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const date = new Date();
      const today = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
      const profile = {
        id: 'qa',
        name: 'Мими',
        age,
        unlockedAgeMax: age,
        avatar: null,
        createdAt: Date.now(),
        skillRatings: {},
        completed: {},
        stickers: [],
        totalMs: 0,
      };
      const state = {
        version: 2,
        profiles: [profile],
        activeProfileId: profile.id,
        settings: {
          sound,
          music,
          voice: false,
          reducedMotion,
          theme,
          limits: { dailyMin, sessionMin: null, softStopMin: 1 },
          filter: { ageOverride, skills: [], themes },
        },
        pin: {
          hash: null,
          salt: null,
          recoveryHash: null,
          recoverySalt: null,
          failedAttempts: 0,
          lockedUntil: null,
        },
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
    },
    { age, theme, dailyMin, themes, ageOverride, reducedMotion, music, sound },
  );
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true');
}

export async function enterParentPin(page, pin = '1974') {
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
}

export async function createParentPin(page) {
  await page.goto('/#/parent');
  await enterParentPin(page);
  await page.getByRole('heading', { name: 'Повтори PIN' }).waitFor();
  await enterParentPin(page);
  const recovery = await page.locator('output').innerText();
  await page.getByRole('button', { name: 'Записах го' }).click();
  await page.getByRole('tablist').waitFor();
  return recovery;
}
