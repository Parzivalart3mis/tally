import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright runs the three core flows. By default it targets a local dev
 * server with the Clerk-bypass dev auth (DEV_USER_ID) so flows run without a
 * real login. In CI, set PLAYWRIGHT_BASE_URL to the Vercel preview deploy.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 }, // iPhone-ish
  },
  projects: [
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  ...(useLocalServer
    ? {
        webServer: {
          command: 'pnpm build && pnpm start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            DEV_USER_ID: 'demo-user',
            TURSO_DATABASE_URL: 'file:./e2e-local.db',
            TURSO_AUTH_TOKEN: '',
          },
        },
      }
    : {}),
});
