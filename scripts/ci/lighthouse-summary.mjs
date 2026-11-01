#!/usr/bin/env node
// Prints the Lighthouse scores collected by `lhci collect` as a Markdown table (job summary).
import { readFile, readdir } from 'node:fs/promises';

const dir = '.lighthouseci';
const files = (await readdir(dir).catch(() => [])).filter((f) => /^lhr-.*\.json$/.test(f));
const links = JSON.parse(await readFile(`${dir}/links.json`, 'utf8').catch(() => '{}'));
const score = (c) => (c?.score === null || c?.score === undefined ? 'n/a' : Math.round(c.score * 100));

const rows = [];
for (const file of files) {
  const lhr = JSON.parse(await readFile(`${dir}/${file}`, 'utf8'));
  const url = new URL(lhr.requestedUrl);
  const report = links[lhr.requestedUrl] ? `[report](${links[lhr.requestedUrl]})` : '';
  const c = lhr.categories;
  const a = lhr.audits;
  rows.push(
    `| \`${url.pathname}\` | ${score(c.performance)} | ${score(c.accessibility)} | ${score(c['best-practices'])} | ${score(c.seo)} | ${a['largest-contentful-paint']?.displayValue ?? ''} | ${a['cumulative-layout-shift']?.displayValue ?? ''} | ${report} |`,
  );
}

console.log('### Lighthouse (mobile, simulated throttling)\n');
if (!rows.length) {
  console.log('No Lighthouse results were collected.');
} else {
  console.log('| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | |');
  console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  console.log(rows.sort().join('\n'));
}
