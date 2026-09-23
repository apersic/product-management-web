import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4200';

const ci = process.env['CI'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(ci),
  retries: ci ? 2 : 0,
  workers: ci ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx ng serve --host 127.0.0.1 --port 4200',
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
});
