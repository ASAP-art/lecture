import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.LAST_CHECK_QA_BASE_URL;
const baseURL = externalBaseURL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['line'], ['json', { outputFile: 'docs/qa-logs/browser.json' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  ...(!externalBaseURL ? { webServer: {
    command: `"${process.execPath}" ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173`,
    url: `${baseURL}/lecture/last-check/`,
    reuseExistingServer: false,
  } } : {}),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/webkit-mobile.spec.ts',
    },
    {
      name: 'webkit-mobile',
      testMatch: '**/webkit-mobile.spec.ts',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
});
