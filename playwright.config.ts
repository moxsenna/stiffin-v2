import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 360, height: 740 },
    trace: 'on-first-retry',
    actionTimeout: 10000,
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
      command: `pnpm --filter @promotor/promotor-class-web dev -p ${process.env.CLASS_PORT || 3001}`,
      port: Number(process.env.CLASS_PORT || 3001),
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: `pnpm --filter @promotor/promotor-flow-web dev -p ${process.env.FLOW_PORT || 3000}`,
      port: Number(process.env.FLOW_PORT || 3000),
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
