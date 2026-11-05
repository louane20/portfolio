import { test, expect } from './fixtures.mjs';

test.describe('header', () => {
  test('dark by default; the light theme persists across visits', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('./');
    const toggle = page.locator('[data-theme-toggle]').first();
    if (await page.locator('[data-menu]').isVisible()) await page.locator('[data-menu]').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
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
    await expect(page.locator('[data-lang-link][hreflang="fr"]')).toHaveAttribute('href', 'fr/#research');
    await expect(page.locator('[data-lang-link][hreflang="ar"]')).toHaveAttribute('href', 'ar/#research');
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

test.describe('blog', () => {
  test('topic filters narrow the list and update the address', async ({ page }) => {
    await page.goto('blog/');
    const visible = page.locator('.post-grid .post-card:visible');
    await expect(visible).toHaveCount(4);
    await page.getByRole('button', { name: /^Security/ }).click();
    await expect(page.getByRole('button', { name: /^Security/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(visible).toHaveCount(1);
    await expect(visible.first()).toContainText('Zero Trust');
    await expect(page.locator('[data-featured-section]')).toBeHidden();
    await expect(page).toHaveURL(/\?topic=security$/);
    await expect(page.locator('[data-filter-status]')).toHaveText('1 article');
    await page.getByRole('button', { name: /^All/ }).click();
    await expect(visible).toHaveCount(4);
    await expect(page.locator('[data-featured-section]')).toBeVisible();
    await expect(page).toHaveURL(/\/blog\/$/);
  });

  test('a topic in the address is preselected, as linked from the breadcrumbs', async ({ page }) => {
    await page.goto('blog/kubernetes-operators/');
    await page.locator('.crumbs').getByRole('link', { name: 'Platform' }).click();
    await expect(page).toHaveURL(/\/blog\/\?topic=platform$/);
    await expect(page.getByRole('button', { name: /^Platform/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.post-grid .post-card:visible')).toHaveCount(2);
  });

  test('copy a code block', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('blog/kubernetes-operators/');
    const block = page.locator('.codeblock').filter({ hasText: 'kind: Cluster' }).first();
    await block.locator('.code-copy').click();
    await expect(block.locator('.code-copy')).toContainText('Copied');
    await expect(page.locator('[data-toast]')).toHaveText('Code copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('apiVersion: postgresql.cnpg.io/v1');
    expect(copied).not.toContain('Copy');
  });

  test('the table of contents follows the reading, and so does the progress bar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the contents become a sticky column on wide screens');
    await page.goto('blog/airgapped-kubernetes/');
    const bar = page.locator('[data-read-progress]');
    await expect(bar).toHaveCSS('transform', /matrix\(0, /);
    await page.evaluate(() => document.getElementById('point-the-nodes-at-the-mirror').scrollIntoView({ block: 'start' }));
    await expect(page.locator('.toc a[href="#point-the-nodes-at-the-mirror"]')).toHaveAttribute('aria-current', 'true');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator('.toc a').last()).toHaveAttribute('aria-current', 'true');
    await expect(bar).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  });
});

test.describe('delivery map and navigation', () => {
  test('the delivery map shows the six stages, and moves only without reduced motion', async ({ page }) => {
    await page.goto('./#pipeline-map');
    const map = page.locator('#pipeline-map svg[role="img"]');
    await expect(map).toHaveAttribute('aria-label', /git push/);
    await expect(page.locator('#pipeline-map .ship-stage')).toHaveCount(6);
    await expect(page.locator('#pipeline-map .ship-pkt').first()).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('#pipeline-map .ship-pkt').first()).toBeHidden();
  });

  test('sections already read are marked as passed stages', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the navigation is collapsed on small screens');
    await page.goto('./');
    await page.evaluate(() => document.getElementById('projects').scrollIntoView({ block: 'start' }));
    await expect(page.locator('[data-nav-link="projects"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-nav-link="about"]')).toHaveClass(/is-done/);
    await expect(page.locator('[data-nav-link="contact"]')).not.toHaveClass(/is-done/);
  });
});

test.describe('interactive terminal', () => {
  test('answers commands from the profile, and links work', async ({ page }) => {
    await page.goto('./#shell');
    const input = page.locator('#term-input');
    const out = page.locator('[data-term-out]');
    await expect(input).toBeVisible();
    await input.fill('whoami');
    await input.press('Enter');
    await expect(out).toContainText('Nawal Guerd: DevOps & Cloud Infrastructure Engineer, ATM Mobilis');
    await input.fill('skills');
    await input.press('Enter');
    await expect(out).toContainText('in production: Cilium');
    await input.fill('contact');
    await input.press('Enter');
    await expect(out.locator('a[href="mailto:guerd.nawal@gmail.com"]')).toBeVisible();
    await input.fill('rm -rf /');
    await input.press('Enter');
    await expect(out).toContainText('command not found: rm');
    await input.fill('<img src=x onerror=alert(1)>');
    await input.press('Enter');
    await expect(out.locator('img')).toHaveCount(0);
    await input.press('ArrowUp');
    await expect(input).toHaveValue('<img src=x onerror=alert(1)>');
    await input.fill('cle');
    await input.press('Tab');
    await expect(input).toHaveValue('clear');
    await input.press('Enter');
    await expect(out.locator('.t-line')).toHaveCount(0);
  });

  test('shows a recorded session without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL);
    await expect(page.locator('[data-term-out]')).toContainText('whoami');
    await expect(page.locator('#term-input')).toBeHidden();
    await context.close();
  });
});
