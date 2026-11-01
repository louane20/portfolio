// Shared fixtures: a deterministic fake GitHub API and a console-error collector.
import { test as base, expect } from '@playwright/test';

export const RUN = {
  id: 4242,
  run_number: 42,
  status: 'completed',
  conclusion: 'success',
  head_sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
  html_url: 'https://github.com/louane20/portfolio/actions/runs/4242',
  updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
};

export function fakeRuns() {
  return {
    total_count: 3,
    workflow_runs: [
      { ...RUN, path: '.github/workflows/ci-cd.yml' },
      { ...RUN, id: 4243, run_number: 17, path: '.github/workflows/container.yml' },
      { ...RUN, id: 4244, run_number: 9, conclusion: 'failure', path: '.github/workflows/zero-trust-e2e.yml' },
    ],
  };
}

export const JOBS = {
  jobs: ['Lint', 'Build', 'Test (desktop)', 'Lighthouse', 'Audit', 'Deploy'].map((name) => ({
    name,
    status: 'completed',
    conclusion: name === 'Deploy' ? 'skipped' : 'success',
  })),
};

export const test = base.extend({
  githubApi: [
    async ({ page }, use) => {
      const state = { mode: 'ok' };
      await page.route('https://api.github.com/**', async (route) => {
        const url = route.request().url();
        if (state.mode === 'down') return route.fulfill({ status: 403, json: { message: 'API rate limit exceeded' } });
        if (url.includes('/jobs')) return route.fulfill({ json: JOBS });
        return route.fulfill({ json: fakeRuns() });
      });
      await use(state);
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
      });
      await use(errors);
    },
    { auto: true },
  ],
});

export { expect };
