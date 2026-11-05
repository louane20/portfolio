import { test, expect } from './fixtures.mjs';

const SECTIONS = ['shell', 'pipeline-map', 'about', 'expertise', 'experience', 'projects', 'research', 'education', 'writing', 'contact'];

test.describe('pages', () => {
  test('home page renders every section', async ({ page, consoleErrors }) => {
    const response = await page.goto('./');
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Nawal Guerd/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText('Nawal Guerd');
    await expect(page.locator('.hero-role')).toHaveText('DevOps & Cloud Infrastructure Engineer');
    for (const id of SECTIONS) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    expect(consoleErrors).toEqual([]);
  });

  test('French version is a full translation', async ({ page, consoleErrors }) => {
    await page.goto('fr/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('.hero-role')).toHaveText('Ingénieure DevOps & Infrastructure Cloud');
    await expect(page.locator('#experience h2')).toHaveText('Expérience');
    await expect(page.locator('.hero-headline')).toContainText("Je conçois, j'automatise");
    await expect(page.locator('#area-kubernetes dt').first()).toHaveText('En production');
    expect(consoleErrors).toEqual([]);
  });

  test('language switch links both ways', async ({ page }) => {
    const openMenu = async () => {
      if (await page.locator('[data-menu]').isVisible()) await page.locator('[data-menu]').click();
    };
    await page.goto('./');
    await openMenu();
    await page.locator('a.lang[hreflang="fr"]').click();
    await expect(page).toHaveURL(/\/fr\/(#[a-z-]+)?$/);
    await openMenu();
    await page.locator('a.lang[hreflang="ar"]').click();
    await expect(page).toHaveURL(/\/ar\/(#[a-z-]+)?$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await openMenu();
    await page.locator('a.lang[hreflang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('Arabic version is a full right-to-left translation', async ({ page, consoleErrors }) => {
    await page.goto('ar/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.hero-role')).toHaveText('مهندسة DevOps والبنية التحتية السحابية');
    await expect(page.locator('#experience h2')).toHaveText('الخبرة المهنية');
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute('href', /\/ar\/$/);
    await expect(page.locator('link[rel="preload"][href*="ibm-plex-sans-arabic"]')).toHaveCount(2);
    await page.goto('ar/blog/');
    await expect(page.locator('h1')).toHaveText('ملاحظات من الإنتاج');
    await expect(page.locator('.post-card[lang="en"][dir="ltr"]').first()).toBeAttached();
    expect(consoleErrors).toEqual([]);
  });

  test('English and French pages never download the Arabic font', async ({ page }) => {
    const fonts = [];
    page.on('request', (r) => r.url().includes('ibm-plex-sans-arabic') && fonts.push(r.url()));
    for (const path of ['./', 'fr/', 'blog/']) await page.goto(path, { waitUntil: 'networkidle' });
    expect(fonts).toEqual([]);
  });

  test('blog index lists every post, the latest featured', async ({ page, consoleErrors }) => {
    const response = await page.goto('blog/');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Notes from production');
    await expect(page.locator('.feature-card')).toHaveCount(1);
    await expect(page.locator('.feature-card h2')).toHaveText('Running Kubernetes behind an air gap');
    await expect(page.locator('.post-grid .post-card')).toHaveCount(5);
    await expect(page.locator('.post-grid .post-card svg.cover')).toHaveCount(5);
    await expect(page.locator('.nav-links a[aria-current="page"]')).toHaveText('Blog');
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveAttribute('href', /\/fr\/blog\/$/);
    const jsonld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(jsonld['@type']).toBe('Blog');
    expect(jsonld.blogPost).toHaveLength(5);
    expect(consoleErrors).toEqual([]);
  });

  test('French blog index says the posts are in English', async ({ page }) => {
    await page.goto('fr/blog/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('h1')).toHaveText('Notes de production');
    await expect(page.locator('.lang-note')).toHaveText('Les articles sont rédigés en anglais.');
    await expect(page.locator('.post-card[lang="en"]').first()).toBeAttached();
    await expect(page.locator('.post-card a[hreflang="en"]').first()).toHaveAttribute('href', /^\.\.\/\.\.\/blog\//);
  });

  test('home page shows the three latest posts', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#writing .post-card')).toHaveCount(3);
    await expect(page.locator('#writing a[href="blog/"]')).toBeVisible();
  });

  test('post page renders with diagrams, highlighted code and contents', async ({ page, consoleErrors }) => {
    await page.goto('blog/zero-trust-5g/');
    await expect(page.locator('h1')).toContainText('Zero Trust microsegmentation');
    await expect(page.locator('.post-body pre').first()).toContainText('CiliumNetworkPolicy');
    await expect(page.locator('.post-body pre .hljs-attr').first()).toBeAttached();
    await expect(page.locator('.post-body figure.diagram svg[role="img"]')).toHaveCount(2);
    await expect(page.locator('.post-body .callout.is-note')).toHaveCount(1);
    await expect(page.locator('.toc li')).toHaveCount(4);
    // The oldest post only links to a newer one.
    await expect(page.locator('.post-nav a')).toHaveCount(1);
    await expect(page.locator('.post-nav a')).toContainText('Next article');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/zero-trust-5g\.png$/);
    const jsonld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(jsonld['@type']).toBe('BlogPosting');
    expect(jsonld.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(consoleErrors).toEqual([]);
  });

  test('unknown paths get a helpful 404', async ({ page }) => {
    const response = await page.goto('archive/blog-post.html');
    expect(response.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found');
    await expect(page.locator('[data-404-path]')).toHaveText('archive/blog-post.html');
    await expect(page.locator('[data-404-suggest]')).toBeVisible();
  });

  test('links from previous versions of the site still work', async ({ page }) => {
    await page.goto('posts/zero-trust-5g.html');
    await expect(page).toHaveURL(/\/blog\/zero-trust-5g\/$/);
    await page.goto('notes/this-site-is-a-pipeline/');
    await expect(page).toHaveURL(/\/blog\/this-site-is-a-pipeline\/$/);
    await page.goto('blog.html');
    await expect(page).toHaveURL(/\/blog\/$/);
  });
});

test.describe('files', () => {
  test('résumé is downloadable, in English and French', async ({ request }) => {
    for (const file of ['GUERD_Nawal_CV.pdf', 'GUERD_Nawal_CV_FR.pdf']) {
      const res = await request.get(file);
      expect(res.status()).toBe(200);
      const body = await res.body();
      expect(body.subarray(0, 5).toString()).toBe('%PDF-');
      // Two pages at most (scripts/render-cv.mjs enforces it too).
      expect((body.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBeLessThanOrEqual(2);
    }
  });

  test('each language offers its own résumé', async ({ page }) => {
    for (const [path, file] of [['./', 'GUERD_Nawal_CV.pdf'], ['fr/', 'GUERD_Nawal_CV_FR.pdf'], ['ar/', 'GUERD_Nawal_CV.pdf']]) {
      await page.goto(path);
      const links = page.locator('a[download]');
      expect(await links.count()).toBeGreaterThan(1);
      for (const href of await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')))) expect(href).toMatch(new RegExp(`(^|/)${file.replace('.', '\\.')}$`));
    }
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

  test('the feed and the sitemap list every post, each with its social image', async ({ request }) => {
    const feed = await (await request.get('feed.xml')).text();
    const posts = [...feed.matchAll(/<id>([^<]+\/blog\/([a-z0-9-]+)\/)<\/id>/g)].map((m) => m[2]);
    expect(posts).toHaveLength(5);
    const sitemap = await (await request.get('sitemap.xml')).text();
    for (const slug of posts) {
      expect(sitemap).toContain(`/blog/${slug}/</loc>`);
      const image = await request.get(`og/${slug}.png`);
      expect(image.status(), slug).toBe(200);
      expect(image.headers()['content-type']).toContain('image/png');
    }
  });
});

test.describe('projects', () => {
  test('a project card with a link opens it from anywhere on the card', async ({ page }) => {
    await page.goto('./#projects');
    const cards = page.locator('.project.is-link');
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) {
      const href = await card.locator('a.project-link').getAttribute('href');
      expect(href).toMatch(/^https:\/\//);
      // Centred, so the sticky header and the status bar cover none of it.
      await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const box = await card.boundingBox();
      // A point near the bottom of the card, far from the title, still hits the title's link.
      const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href'), [box.x + 12, box.y + box.height - 12]);
      expect(hit).toBe(href);
    }
    await expect(page.locator('#project-5g-automation .project-cta')).toHaveText('Read the paper');
  });
});

test.describe('layout', () => {
  test('nothing overflows horizontally', async ({ page }) => {
    for (const path of ['./', 'fr/', 'ar/', 'blog/', 'fr/blog/', 'ar/blog/', 'blog/airgapped-kubernetes/', 'blog/kubernetes-operators/', 'nope/']) {
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
    // The blog without JavaScript: every post listed once, no filter buttons, code still readable.
    await page.goto(`${test.info().project.use.baseURL}blog/`);
    await expect(page.locator('.filters')).toBeHidden();
    await expect(page.locator('.post-grid .post-card:visible')).toHaveCount(4);
    await page.goto(`${test.info().project.use.baseURL}blog/airgapped-kubernetes/`);
    await expect(page.locator('.post-body figure.diagram')).toHaveCount(2);
    await expect(page.locator('.code-copy').first()).toBeHidden();
    await context.close();
  });
});
