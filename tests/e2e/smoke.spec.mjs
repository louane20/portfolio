import { test, expect } from './fixtures.mjs';

const SECTIONS = ['about', 'skills', 'experience', 'research', 'projects', 'credentials', 'pipeline', 'notes', 'bugs', 'contact', 'see-also'];

test.describe('pages', () => {
  test('home page renders every man page section', async ({ page, consoleErrors }) => {
    const response = await page.goto('./');
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Nawal Guerd/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('Nawal Guerd');
    for (const id of SECTIONS) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
    expect(consoleErrors).toEqual([]);
  });

  test('French version is a full translation', async ({ page, consoleErrors }) => {
    await page.goto('fr/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('#skills .sh')).toHaveText('OPTIONS');
    await expect(page.locator('#experience .sh')).toHaveText('HISTORIQUE');
    await expect(page.locator('.tagline')).toContainText('qui a le droit de lui parler');
    expect(consoleErrors).toEqual([]);
  });

  test('language switch links both ways', async ({ page }) => {
    await page.goto('./');
    await page.locator('a.lang').click();
    await expect(page).toHaveURL(/\/fr\/$/);
    await page.locator('a.lang').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('field note renders as a section 7 page', async ({ page, consoleErrors }) => {
    await page.goto('notes/zero-trust-5g/');
    await expect(page.locator('h1')).toContainText('Zero Trust microsegmentation');
    await expect(page.locator('.note-runhead')).toContainText('ZERO-TRUST-5G(7)');
    await expect(page.locator('.note-body pre').first()).toContainText('CiliumNetworkPolicy');
    expect(consoleErrors).toEqual([]);
  });

  test('unknown paths get "No manual entry"', async ({ page }) => {
    const response = await page.goto('archive/blog-post.html');
    expect(response.status()).toBe(404);
    await expect(page.locator('h1')).toContainText('No manual entry for');
    await expect(page.locator('h1 [data-404-path]')).toHaveText('archive/blog-post.html');
    await expect(page.locator('[data-404-suggest]')).toBeVisible();
  });

  test('links from the previous version of the site still work', async ({ page }) => {
    await page.goto('posts/zero-trust-5g.html');
    await expect(page).toHaveURL(/notes\/zero-trust-5g\/$/);
    await page.goto('blog.html');
    await expect(page).toHaveURL(/#notes$/);
  });
});

test.describe('files', () => {
  test('résumé is downloadable', async ({ request }) => {
    const res = await request.get('GUERD_Nawal_CV.pdf');
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('the man page is valid roff', async ({ request }) => {
    for (const path of ['guerd.1', 'fr/guerd.1']) {
      const body = await (await request.get(path)).text();
      expect(body).toMatch(/^\.TH GUERD 1 /m);
      expect(body).toMatch(/^\.SH (NAME|NOM)$/m);
    }
  });

  test('security.txt is present and not expired', async ({ request }) => {
    const body = await (await request.get('.well-known/security.txt')).text();
    expect(body).toContain('Contact: mailto:');
    const expires = Date.parse(/Expires: (.+)/.exec(body)[1]);
    expect(expires).toBeGreaterThan(Date.now());
  });

  test('sitemap, feed and manifest are served', async ({ request }) => {
    for (const path of ['sitemap.xml', 'feed.xml', 'site.webmanifest', 'robots.txt', 'build-info.json', 'favicon.svg']) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
  });
});

test.describe('layout', () => {
  test('nothing overflows horizontally', async ({ page }) => {
    for (const path of ['./', 'fr/', 'notes/this-site-is-a-pipeline/']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL);
    await expect(page.locator('h1')).toContainText('Nawal Guerd');
    await expect(page.locator('[data-zt-svg] .zt-node')).toHaveCount(9);
    await expect(page.locator('[data-pager]')).toBeHidden();
    await context.close();
  });
});
