#!/usr/bin/env node
// Checks every internal link, asset and #fragment in the built site. External links
// are not fetched (that would make CI flaky); they are listed with --external.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? 'dist');
const listExternal = process.argv.includes('--external');
const info = JSON.parse(await readFile(path.join(dir, 'build-info.json'), 'utf8'));
const site = new URL(info.siteUrl);

async function walk(d) {
  const out = [];
  for (const entry of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const ATTR = /\s(?:href|src)="([^"]*)"/g;
const IDS = /\sid="([^"]+)"/g;
const idCache = new Map();

async function idsOf(file) {
  if (!idCache.has(file)) {
    const html = await readFile(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(IDS)].map((m) => m[1])));
  }
  return idCache.get(file);
}

async function resolveTarget(url) {
  if (!url.pathname.startsWith(site.pathname)) return null;
  const rel = decodeURIComponent(url.pathname.slice(site.pathname.length));
  let file = path.join(dir, rel);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    await stat(file);
    return file;
  } catch {
    return null;
  }
}

const problems = [];
const external = new Set();
let checked = 0;

for (const file of await walk(dir)) {
  const rel = path.relative(dir, file).split(path.sep).join('/');
  // 404.html is served at arbitrary URLs, so it only uses absolute links; resolve them from the root.
  const pageUrl = new URL(rel.replace(/index\.html$/, ''), site);
  const html = await readFile(file, 'utf8');
  for (const [, raw] of html.matchAll(ATTR)) {
    const href = raw.replace(/&amp;/g, '&');
    if (!href || /^(mailto|tel|data|javascript):/.test(href)) continue;
    let url;
    try {
      url = new URL(href, pageUrl);
    } catch {
      problems.push(`${rel}: malformed URL "${href}"`);
      continue;
    }
    if (url.origin !== site.origin || !url.pathname.startsWith(site.pathname)) {
      if (/^https?:/.test(url.protocol)) external.add(url.href);
      continue;
    }
    checked += 1;
    const target = await resolveTarget(url);
    if (!target) {
      problems.push(`${rel}: broken link "${href}"`);
      continue;
    }
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!(await idsOf(target)).has(id)) problems.push(`${rel}: "${href}" points to a missing #${id}`);
    }
  }
}

if (listExternal) for (const u of [...external].sort()) console.log(`external: ${u}`);
if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  console.error(`${problems.length} broken internal link(s) out of ${checked}`);
  process.exit(1);
}
console.log(`links OK: ${checked} internal links and fragments checked, ${external.size} external links not fetched`);
