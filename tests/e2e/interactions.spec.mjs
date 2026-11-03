import { test, expect } from './fixtures.mjs';

test.describe('header', () => {
  test('theme switch persists across visits', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    const toggle = page.locator('[data-theme-toggle]').first();
    if (await page.locator('[data-menu]').isVisible()) await page.locator('[data-menu]').click();
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('mobile menu opens, navigates and closes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the menu button only exists on small screens');
    await page.goto('./');
    const menu = page.locator('[data-menu]');
    const nav = page.locator('[data-nav]');
    await expect(nav).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Research' }).click();
    await expect(page).toHaveURL(/#research$/);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).toBeHidden();
  });

  test('navigation follows the section in view, and so does the language link', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the navigation is collapsed on small screens');
    await page.goto('./');
    await page.locator('#research').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(page.locator('[data-nav-link="research"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-lang-link]')).toHaveAttribute('href', 'fr/#research');
  });
});

test.describe('contact', () => {
  test('copy the email address', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('./#contact');
    const copy = page.locator('#contact .contact-email .copy-btn');
    await copy.click();
    await expect(copy).toContainText('Copied');
    await expect(page.locator('[data-toast]')).toHaveText('Email address copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('guerd.nawal@gmail.com');
  });

  test('phone number is revealed on request', async ({ page }) => {
    await page.goto('./#contact');
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show phone number' }).click();
    await expect(page.locator('#contact a[href^="tel:"]')).toHaveAttribute('href', 'tel:+213661908059');
  });

  test('local time is shown next to the location', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-local-time]')).toHaveText(/^\d{2}:\d{2} local time$/);
  });
});

test.describe('research figure', () => {
  test('each layer stops the attack it can see', async ({ page }) => {
    await page.goto('./#research');
    const panel = (id) => page.locator(`.panel[data-panel="${id}"]`);
    await expect(page.locator('.panel')).toHaveCount(3);

    await expect(panel('flat').locator('.fig-edge.is-attack')).toHaveCount(1);
    await expect(panel('flat').locator('.fig-request.is-attack')).toContainText('200');
    await expect(panel('flat').locator('.outcome')).toHaveText('2 of 2 attacks succeed');

    await expect(panel('network').locator('.fig-edge.is-attack')).toHaveCount(0);
    await expect(panel('network').locator('.fig-cross')).toHaveCount(1);
    await expect(panel('network').locator('.fig-request.is-attack')).toHaveCount(1);

    await expect(panel('mesh').locator('.fig-request.is-blocked')).toContainText('403');
    await expect(panel('mesh').locator('.fig-lock')).toHaveCount(2);
    await expect(panel('mesh').locator('.outcome')).toHaveText('2 of 2 attacks blocked');
    await expect(panel('mesh').locator('svg')).toHaveAttribute('aria-label', /Both attacks are blocked/);
  });
});

test.describe('featured project: live pipeline status', () => {
  test('shows the latest run from the GitHub API', async ({ page }) => {
    await page.goto('./#projects');
    const pipe = page.locator('[data-pipeline]');
    await expect(pipe.locator('[data-pipe-run]')).toContainText('#42');
    await expect(pipe.locator('[data-pipe-run]')).toContainText('passed');
    await expect(pipe.locator('[data-stage="lint"]')).toHaveAttribute('data-state', 'success');
    await expect(pipe.locator('[data-stage="test"]')).toHaveAttribute('data-state', 'success');
    await expect(pipe.locator('[data-stage="deploy"]')).toHaveAttribute('data-state', 'skipped');
    await expect(pipe.locator('[data-stage="zero-trust"]')).toHaveAttribute('data-state', 'failure');
  });

  test('degrades gracefully when the API is unavailable', async ({ page, githubApi }) => {
    githubApi.mode = 'down';
    await page.goto('./#projects');
    await expect(page.locator('[data-pipe-run]')).toContainText('Live status is unavailable');
  });
});
