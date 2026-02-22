import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve("../../src/backend", '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }
  ],
  webServer: [
    {
    command: 'cd ../../src/frontend && npm start',
    url: 'http://localhost:3000/',
    reuseExistingServer: true,
    timeout: 5000
  },
  // {
  //     command: './start_backend.sh',
  //     url: 'http://localhost:8000',
  //     timeout: 5000,
  //     reuseExistingServer: true
  //   },
],
  //globalSetup: require.resolve('./global-setup')
});
