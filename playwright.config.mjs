import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 4,
  fullyParallel: true,
  reporter: process.env.GAMEPLAY_REPORT
    ? [['list'], ['json', { outputFile: process.env.GAMEPLAY_REPORT }]]
    : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    browserName: process.env.QA_BROWSER || 'chromium',
    channel:
      !process.env.QA_BROWSER || process.env.QA_BROWSER === 'chromium'
        ? process.env.PLAYWRIGHT_CHANNEL || undefined
        : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
});
