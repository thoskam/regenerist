import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:3107',
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROME_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } } : {}),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run ${process.env.PLAYWRIGHT_PRODUCTION ? 'start' : 'dev'} -- --hostname 127.0.0.1 --port 3107`,
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
