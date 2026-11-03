import { test, expect } from './fixtures.mjs';

const SECTIONS = ['about', 'expertise', 'experience', 'research', 'projects', 'education', 'writing', 'contact'];

test.describe('pages', () => {
  test('home page renders every section', async ({ page, consoleErrors }) => {
    const response = await page.goto('./');
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Nawal Guerd/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText('Nawal Guerd');
    await expect(page.locator('.hero-role')).toHaveText('DevOps Engineer');
    for (const id of SECTIONS) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    expect(consoleErrors).toEqual([]);
  });

  test('French version is a full translation', async ({ page, consoleErrors }) => {
    await page.goto('fr/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('.hero-role')).toHaveText('Ingénieure DevOps');
    await expect(page.locator('#experience h2')).toHaveText('Expérience');
    await expect(page.locator('.hero-headline')).toContainText('Je construis et je sécurise');
    await expect(page.locator('#area-kubernetes dt').first()).toHaveText('En production');
    expect(consoleErrors).toEqual([]);
  });

  test('language switch links both ways', async ({ page }) => {
    const openMenu = async () => {
      if (await page.locator('[data-menu]').isVisible()) await page.locator('[data-menu]').click();
    };
    await page.goto('./');
    await openMenu();
    await page.locator('a.lang').click();
    await expect(page).toHaveURL(/\/fr\/(#[a-z-]+)?$/);
    await openMenu();
    await page.locator('a.lang').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('article page renders', async ({ page, consoleErrors }) => {
    await page.goto('notes/zero-trust-5g/');
    await expect(page.locator('h1')).toContainText('Zero Trust microsegmentation');
    await expect(page.locator('.article-body pre').first()).toContainText('CiliumNetworkPolicy');
    await expect(page.locator('.toc li')).toHaveCount(4);
    expect(consoleErrors).toEqual([]);
  });

  test('unknown paths get a helpful 404', async ({ page }) => {
    const response = await page.goto('archive/blog-post.html');
    expect(response.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found');
    await expect(page.locator('[data-404-path]')).toHaveText('archive/blog-post.html');
    await expect(page.locator('[data-404-suggest]')).toBeVisible();
  });

  test('links from the previous version of the site still work', async ({ page }) => {
    await page.goto('posts/zero-trust-5g.html');
    await expect(page).toHaveURL(/notes\/zero-trust-5g\/$/);
    await page.goto('blog.html');
    await expect(page).toHaveURL(/#writing$/);
  });
});

test.describe('files', () => {
  test('résumé is downloadable', async ({ request }) => {
    const res = await request.get('GUERD_Nawal_CV.pdf');
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('the terminal version is a valid man page', async ({ request }) => {
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

  test('sitemap, feed, manifest and icons are served', async ({ request }) => {
    for (const path of ['sitemap.xml', 'feed.xml', 'site.webmanifest', 'robots.txt', 'build-info.json', 'favicon.svg', 'favicon.ico', 'og.png']) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
  });
});

test.describe('layout', () => {
  test('nothing overflows horizontally', async ({ page }) => {
    for (const path of ['./', 'fr/', 'notes/this-site-is-a-pipeline/', 'nope/']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test('works without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL);
    await expect(page.locator('h1')).toHaveText('Nawal Guerd');
    await expect(page.locator('#figure .fig-svg')).toHaveCount(3);
    await expect(page.locator('.nav-links a').first()).toBeVisible();
    await expect(page.locator('[data-menu]')).toBeHidden();
    await expect(page.locator('.copy-btn').first()).toBeHidden();
    await context.close();
  });
});
