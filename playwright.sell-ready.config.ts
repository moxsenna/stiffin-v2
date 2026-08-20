import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-sell-ready',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 360, height: 740 },
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @promotor/platform-api serve',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: {
        PORT: '8787',
        APP_ENV: 'development',
        TEST_DATABASE_URL:
          process.env.TEST_DATABASE_URL ||
          process.env.DATABASE_URL ||
          'postgresql://promotor_runtime:ci_runtime_pw@localhost:5432/postgres',
      },
    },
    {
      command: 'pnpm --filter @promotor/promotor-class-web dev -p 3001',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_API_MODE: 'http',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8787',
      },
    },
    {
      command: 'pnpm --filter @promotor/promotor-flow-web dev -p 3000',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        NEXT_PUBLIC_API_MODE: 'http',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8787',
      },
    },
  ],
});
