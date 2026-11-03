#!/usr/bin/env node
// Regenerates the raster images committed in src/static/ from their sources:
//   favicon.svg -> favicon.ico (16/32/48), apple-touch-icon.png (180), icon-512.png
//   scripts/og/og.html -> og.png (1200x630, social preview)
//   scripts/og/post.html + each post's cover -> og/<slug>.png (social preview of a post)
// Run after changing the favicon, the social card or a post title:
//   node scripts/render-images.mjs            everything
//   node scripts/render-images.mjs --posts    only the post previews
// (set PW_CHANNEL=chrome to use an installed Chrome instead of Playwright's Chromium).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { loadPosts } from './lib/content.mjs';
import { coverSvg } from '../src/templates/blog/covers.mjs';
import { UI } from '../src/i18n.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = path.join(ROOT, 'src/static');

/** Minimal ICO container with PNG payloads (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const postsOnly = process.argv.includes('--posts');
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
try {
  const page = await browser.newPage();
  await mkdir(path.join(STATIC, 'og'), { recursive: true });
  for (const post of await loadPosts()) {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(pathToFileURL(path.join(ROOT, 'scripts/og/post.html')).href);
    await page.evaluate(
      ({ title, category, label, cover }) => {
        // Runs in the browser page.
        const { document } = globalThis;
        document.getElementById('title').textContent = title;
        document.getElementById('cat').classList.add(`cat-${category}`);
        document.getElementById('cat-label').textContent = label;
        document.getElementById('art').innerHTML = cover;
      },
      { title: post.title, category: post.category, label: UI.en.blog.categories[post.category], cover: coverSvg(post.cover, 'og') },
    );
    await page.evaluate('document.fonts.ready');
    await page.screenshot({ path: path.join(STATIC, 'og', `${post.slug}.png`) });
    console.log(`rendered og/${post.slug}.png`);
  }
  if (postsOnly) process.exit(0);
  const svg = await readFile(path.join(STATIC, 'favicon.svg'), 'utf8');
  const render = async (size, padding = 0) => {
    await page.setViewportSize({ width: size, height: size });
    const inner = size - padding * 2;
    await page.setContent(
      `<html><body style="margin:0;background:${padding ? '#2a0b21' : 'transparent'}"><div style="padding:${padding}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
    );
    return page.screenshot({ omitBackground: !padding, clip: { x: 0, y: 0, width: size, height: size } });
  };
  const icons = [];
  for (const size of [16, 32, 48]) icons.push({ size, data: await render(size) });
  await writeFile(path.join(STATIC, 'favicon.ico'), ico(icons));
  await writeFile(path.join(STATIC, 'apple-touch-icon.png'), await render(180, 0));
  await writeFile(path.join(STATIC, 'icon-512.png'), await render(512, 0));

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(pathToFileURL(path.join(ROOT, 'scripts/og/og.html')).href);
  await page.evaluate('document.fonts.ready');
  await page.screenshot({ path: path.join(STATIC, 'og.png') });
  console.log('rendered favicon.ico, apple-touch-icon.png, icon-512.png and og.png into src/static/');
} finally {
  await browser.close();
}
