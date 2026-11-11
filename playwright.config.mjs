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
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
});
