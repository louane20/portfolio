// Accessibility: axe-core (WCAG 2.2 A/AA) on every page type, in both renderings.
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.mjs';

const PAGES = [
  ['home (en)', './'],
  ['home (fr)', 'fr/'],
  ['home (ar)', 'ar/'],
  ['blog (en)', 'blog/'],
  ['blog (fr)', 'fr/blog/'],
  ['blog (ar)', 'ar/blog/'],
  ['post', 'blog/zero-trust-5g/'],
  ['post with diagrams and code', 'blog/kubernetes-operators/'],
  ['404', 'nope/'],
];

for (const theme of ['light', 'dark']) {
  for (const [name, path] of PAGES) {
    test(`${name}, ${theme === 'light' ? 'paper' : 'terminal'} rendering, has no axe violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      // Dark is the default; the light theme is the one a visitor chooses with the toggle.
      if (theme === 'light') await page.addInitScript(() => localStorage.setItem('ng-theme', 'light'));
      await page.goto(path);
      await page.locator('body').waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0].target.join(' ')}`);
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
}
