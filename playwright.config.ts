import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for OpenDial.
 * Tests run against the local dev server (npm run dev).
 * In CI, the `e2e` script starts the dev server before tests and stops it after.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run dev server during tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
