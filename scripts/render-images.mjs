#!/usr/bin/env node
// Regenerates the raster images committed in src/static/ from their sources:
//   favicon.svg -> favicon.ico (16/32/48), apple-touch-icon.png (180), icon-512.png
//   scripts/og/og.html -> og.png (1200x630, social preview)
// Run after changing the favicon or the social card: `node scripts/render-images.mjs`
// (set PW_CHANNEL=chrome to use an installed Chrome instead of Playwright's Chromium).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

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

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
try {
  const page = await browser.newPage();
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
