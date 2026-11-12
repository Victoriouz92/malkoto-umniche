import { test, expect } from '@playwright/test';
import { seed, createParentPin } from './support.mjs';

async function controlledMicrophone(page, { pending = false, denied = false } = {}) {
  await page.addInitScript(
    ({ pending, denied }) => {
      window.qaMic = { stopped: 0, state: 'inactive' };
      const stream = { getTracks: () => [{ stop: () => window.qaMic.stopped++ }] };
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => {
            if (denied) return Promise.reject(new DOMException('Denied', 'NotAllowedError'));
            return pending
              ? new Promise((resolve) => {
                  window.qaResolveMic = () => resolve(stream);
                })
              : Promise.resolve(stream);
          },
        },
      });
      window.MediaRecorder = class extends EventTarget {
        constructor() {
          super();
          this.state = 'inactive';
          this.mimeType = 'audio/webm';
        }
        start() {
          this.state = 'recording';
          window.qaMic.state = this.state;
        }
        stop() {
          if (this.state !== 'recording') return;
          this.state = 'inactive';
          window.qaMic.state = this.state;
          const event = new Event('dataavailable');
          event.data = new Blob(['fixture recording']);
          this.dispatchEvent(event);
          this.dispatchEvent(new Event('stop'));
        }
      };
    },
    { pending, denied },
  );
}

test('late microphone permission is released after leaving the voice tab', async ({ page }) => {
  await controlledMicrophone(page, { pending: true });
  await seed(page);
  await createParentPin(page);
  await page.getByRole('tab', { name: 'Моят глас' }).click();
  await page.getByRole('button', { name: 'Запиши', exact: true }).first().click();
  await page.getByRole('tab', { name: 'Настройки', exact: true }).click();
  await page.evaluate(() => window.qaResolveMic());
  await expect.poll(() => page.evaluate(() => window.qaMic.stopped)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Резервно копие' })).toBeVisible();
});

test('recording stops automatically, saves locally and stops on tab exit', async ({ page }) => {
  await controlledMicrophone(page);
  await seed(page);
  await createParentPin(page);
  await page.clock.install();
  await page.getByRole('tab', { name: 'Моят глас' }).click();
  await page.getByRole('button', { name: 'Запиши', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Спри записа', exact: true })).toBeVisible();
  await page.clock.runFor(10_100);
  await expect(page.getByText('Записано', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.qaMic.stopped)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Запиши', exact: true }).first().click();
  await page.getByRole('tab', { name: 'Профили', exact: true }).click();
  expect(await page.evaluate(() => window.qaMic.state)).toBe('inactive');
});

test('microphone denial gives a readable error and keeps recording controls usable', async ({
  page,
}) => {
  await controlledMicrophone(page, { denied: true });
  await seed(page);
  await createParentPin(page);
  await page.getByRole('tab', { name: 'Моят глас' }).click();
  await page.getByRole('button', { name: 'Запиши', exact: true }).first().click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Запиши', exact: true }).first()).toBeEnabled();
});

test('actual parent recording playback is paused when leaving the tab', async ({ page }) => {
  await page.addInitScript(() => {
    window.qaRecordings = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      window.qaRecordings.push(this);
      return original.apply(this, args);
    };
  });
  await seed(page);
  await createParentPin(page);
  await page.evaluate(async () => {
    const samples = 22050,
      bytes = new ArrayBuffer(44 + samples * 2),
      v = new DataView(bytes);
    const text = (offset, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
    };
    text(0, 'RIFF');
    v.setUint32(4, 36 + samples * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 22050, true);
    v.setUint32(28, 44100, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    text(36, 'data');
    v.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++)
      v.setInt16(44 + i * 2, Math.sin((i * 2 * Math.PI * 440) / 22050) * 2000, true);
    const db = await new Promise((resolve) => {
      const r = indexedDB.open('keyval-store', 1);
      r.onsuccess = () => resolve(r.result);
    });
    try {
      await new Promise((resolve) => {
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put(
          new Blob([bytes], { type: 'audio/wav' }),
          'tinymind:voice:qa:bravo',
        );
        tx.oncomplete = resolve;
      });
    } finally {
      db.close();
    }
  });
  await page.getByRole('tab', { name: 'Моят глас' }).click();
  await page.getByRole('button', { name: 'Чуй', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.qaRecordings.some((a) => !a.paused)))
    .toBe(true);
  await page.getByRole('tab', { name: 'Настройки', exact: true }).click();
  expect(await page.evaluate(() => window.qaRecordings.every((a) => a.paused))).toBe(true);
});
