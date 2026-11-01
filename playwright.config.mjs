// End-to-end tests run against the production build in dist/, served under the
// same base path as GitHub Pages (read from dist/build-info.json).
import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 4173);
function readBasePath() {
  try {
    return JSON.parse(readFileSync('dist/build-info.json', 'utf8')).basePath ?? '/';
  } catch {
    throw new Error('dist/ is missing: run `npm run build` before the tests.');
  }
}
const basePath = readBasePath();

// PW_CHANNEL=chrome reuses an installed Google Chrome instead of Playwright's Chromium.
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${basePath}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node scripts/serve.mjs dist ${PORT}`,
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
});
