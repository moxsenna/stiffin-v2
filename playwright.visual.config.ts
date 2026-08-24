import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
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
