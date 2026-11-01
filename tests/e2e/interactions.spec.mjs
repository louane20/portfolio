import { test, expect } from './fixtures.mjs';

test.describe('interactions', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard-driven features are tested on desktop');

  test('paper / terminal rendering switch persists', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Terminal' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: 'Terminal' })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('t');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('fzf palette jumps to a section', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('Control+k');
    const dialog = page.locator('dialog[data-palette]');
    await expect(dialog).toBeVisible();
    await page.keyboard.type('skil');
    await expect(dialog.locator('[aria-selected="true"]')).toContainText('Skills');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#skills$/);
  });

  test('less-style search highlights matches and cycles with n', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('/');
    await page.locator('#pager-q').fill('cilium');
    await page.keyboard.press('Enter');
    const hits = page.locator('mark.hit');
    expect(await hits.count()).toBeGreaterThan(3);
    await expect(page.locator('[data-pager-msg]')).toContainText('matches');
    const first = await page.locator('mark.hit[data-current="true"]').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.keyboard.press('n');
    const second = await page.locator('mark.hit[data-current="true"]').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(second).not.toBe(first);
    await page.keyboard.press('Escape');
    await expect(hits).toHaveCount(0);
  });

  test('help opens with h', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('h');
    await expect(page.locator('dialog[data-help]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[data-help]')).toBeHidden();
  });

  test('copy email and reveal the phone number', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('./#contact');
    const copy = page.locator('#contact .mail .copy');
    await copy.click();
    await expect(copy).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('guerd.nawal@gmail.com');
    await page.getByRole('button', { name: 'Show phone number' }).click();
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveAttribute('href', 'tel:+213661908059');
  });
});

test.describe('Figure 1: Zero Trust simulator', () => {
  test('policy layers stop the attacks, layer by layer', async ({ page }) => {
    await page.goto('./');
    const figure = page.locator('[data-zt]');
    const log = figure.locator('[data-zt-log]');
    await expect(log.locator('.v-breach').first()).toBeVisible({ timeout: 10_000 });

    await figure.getByRole('button', { name: 'Cilium L3/L4' }).click();
    await expect(figure).toHaveAttribute('data-mode', 'l4');
    await expect(log.locator('.v-dropped').first()).toBeVisible({ timeout: 10_000 });
    await expect(figure.locator('[data-zt-live]')).toContainText('flows dropped');

    await figure.getByRole('button', { name: '+ Istio L7, mTLS' }).click();
    await expect(log.locator('.v-denied').first()).toContainText('http-request DROPPED', { timeout: 12_000 });
    await expect(figure.locator('[data-zt-live]')).toContainText('Every malicious flow is now stopped');
    await expect(figure.locator('.zt-edge[data-state="breach"]')).toHaveCount(0);
  });

  test('selecting a workload shows its generated policy', async ({ page }) => {
    await page.goto('./');
    const figure = page.locator('[data-zt]');
    await figure.getByRole('button', { name: 'Cilium L3/L4' }).click();
    await figure.locator('.zt-node[data-node="postgres"]').click();
    await expect(figure.locator('[data-zt-selected]')).toHaveText('postgres');
    await figure.locator('[data-zt-policy] summary').click();
    const yaml = figure.locator('[data-zt-yaml]');
    await expect(yaml).toContainText('kind: CiliumNetworkPolicy');
    await expect(yaml).toContainText('app: api');
    await expect(yaml).not.toContainText('app: worker');
  });

  test('5G core scenario applies 3GPP least privilege at L7', async ({ page }) => {
    await page.goto('./');
    const figure = page.locator('[data-zt]');
    await figure.getByRole('button', { name: '5G core' }).click();
    await expect(figure.locator('.zt-node[data-node="amf"]')).toHaveCount(1);
    await figure.getByRole('button', { name: '+ Istio L7, mTLS' }).click();
    await figure.locator('[data-zt-policy] summary').click();
    await expect(figure.locator('[data-zt-yaml]')).toContainText('*/sm-data');
    await expect(figure.locator('[data-zt-log] .v-denied').first()).toContainText('am-data', { timeout: 15_000 });
  });

  test('reduced motion shows the verdicts without animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('https://api.github.com/**', (route) => route.abort());
    await page.goto(test.info().project.use.baseURL);
    const figure = page.locator('[data-zt]');
    await expect(figure.locator('[data-zt-log] .ln')).toHaveCount(12);
    await expect(figure.locator('.zt-packet')).toHaveCount(0);
    await expect(figure.locator('[data-zt-count="breach"]')).toHaveText('4');
    await context.close();
  });
});

test.describe('EXIT STATUS: live pipeline', () => {
  test('shows the latest run from the GitHub API', async ({ page }) => {
    await page.goto('./#pipeline');
    const pipe = page.locator('[data-pipeline]');
    await expect(pipe.locator('[data-pipe-run]')).toContainText('#42');
    await expect(pipe.locator('[data-pipe-run]')).toContainText('exit 0');
    await expect(pipe.locator('[data-stage="lint"]')).toHaveAttribute('data-state', 'success');
    await expect(pipe.locator('[data-stage="test"]')).toHaveAttribute('data-state', 'success');
    await expect(pipe.locator('[data-stage="deploy"]')).toHaveAttribute('data-state', 'skipped');
    await expect(pipe.locator('[data-stage="zero-trust"]')).toHaveAttribute('data-state', 'failure');
  });

  test('degrades gracefully when the API is unavailable', async ({ page, githubApi }) => {
    githubApi.mode = 'down';
    await page.goto('./#pipeline');
    await expect(page.locator('[data-pipe-run]')).toContainText('unreachable or rate-limited');
  });
});
