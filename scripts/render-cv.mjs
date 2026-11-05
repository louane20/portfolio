#!/usr/bin/env node
// Renders the PDF résumé from content/profile.yaml, in English and French, into src/static/ under
// the names given by site.resume (GUERD_Nawal_CV.pdf, GUERD_Nawal_CV_FR.pdf):
//   npm run cv
// Run it after changing profile.yaml, then commit the PDFs. The HTML it prints is kept in
// build/cv/ for a quick look in a browser. (Set PW_CHANNEL=chrome to use an installed Chrome.)
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { loadProfile, t } from './lib/content.mjs';
import { cvHtml, cvFooter, CV_LANGS } from '../src/templates/cv.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/cv');
// A résumé longer than this is a résumé nobody finishes.
const MAX_PAGES = 2;

const profile = await loadProfile();
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
let tooLong = false;
try {
  const page = await browser.newPage();
  for (const lang of CV_LANGS) {
    const htmlFile = path.join(OUT, `cv-${lang}.html`);
    await writeFile(htmlFile, cvHtml({ profile, lang, root: ROOT }));
    await page.goto(pathToFileURL(htmlFile).href);
    await page.waitForFunction("document.documentElement.dataset.ready === '1'");
    const file = t(profile.site.resume, lang);
    const pdf = await page.pdf({
      path: path.join(ROOT, 'src/static', file),
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: cvFooter({ profile, lang }),
    });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    console.log(`rendered ${file}: ${pages} page${pages > 1 ? 's' : ''}, ${Math.round(pdf.length / 1024)} KB`);
    if (pages > MAX_PAGES) {
      console.error(`::error::${file} has ${pages} pages; shorten profile.yaml (cv.projects, highlights) to fit ${MAX_PAGES}.`);
      tooLong = true;
    }
  }
} finally {
  await browser.close();
}
if (tooLong) process.exit(1);
