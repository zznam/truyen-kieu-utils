import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.api.ts',
  outputDir: './test-results/api',
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3012' },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev --port 3012',
        url: 'http://127.0.0.1:3012',
        reuseExistingServer: true,
        timeout: 60000,
      },
  reporter: 'list',
})
