import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results/ui',
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3012',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev --port 3012',
        url: 'http://127.0.0.1:3012',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
  reporter: 'list',
})
