#!/usr/bin/env node
// Static site generator: content/*.yaml + content/notes/*.md -> dist/
//
//   node scripts/build.mjs            production build
//   node scripts/build.mjs --drafts   include draft notes
//
// Environment (all optional, set by CI):
//   SITE_URL            absolute URL the site is served from (actions/configure-pages base_url)
//   GITHUB_REPOSITORY   owner/repo, used for the live pipeline widget and provenance links
//   GITHUB_SHA, GITHUB_RUN_ID, GITHUB_RUN_NUMBER   build provenance shown in the footer
//   SOURCE_DATE_EPOCH   makes the build date reproducible
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

import { loadProfile, loadNotes, t, LANGS, ContentError } from './lib/content.mjs';
import { renderManPage } from './lib/roff.mjs';
import { plain } from './lib/html.mjs';
import { UI } from '../src/i18n.mjs';
import { layout, csp, THEME_SCRIPT } from '../src/templates/layout.mjs';
import { homeBody, homeSections, personJsonLd } from '../src/templates/home.mjs';
import { noteBody, notFoundBody } from '../src/templates/pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const args = new Set(process.argv.slice(2));
const started = performance.now();

const git = (...cmd) => {
  try {
    return execFileSync('git', cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const withSlash = (url) => (url.endsWith('/') ? url : `${url}/`);
const sha256 = (data) => createHash('sha256').update(data).digest('base64');
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function write(rel, content) {
  const file = path.join(DIST, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

function buildInfo(profile, pkg) {
  const epoch = Number(process.env.SOURCE_DATE_EPOCH || git('log', '-1', '--format=%ct') || Date.now() / 1000);
  const when = new Date(epoch * 1000);
  const inCi = process.env.GITHUB_ACTIONS === 'true';
  const siteUrl = withSlash(process.env.SITE_URL || profile.site.url);
  return {
    version: pkg.version,
    repository: process.env.GITHUB_REPOSITORY || profile.site.repository,
    sha: inCi ? process.env.GITHUB_SHA || '' : '',
    runId: inCi ? process.env.GITHUB_RUN_ID || '' : '',
    runNumber: inCi ? process.env.GITHUB_RUN_NUMBER || '' : '',
    ref: process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD') || '',
    siteUrl,
    basePath: new URL(siteUrl).pathname,
    date: when.toISOString().slice(0, 10),
    builtAt: when.toISOString(),
  };
}

async function bundle() {
  const result = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [
      { in: 'src/scripts/main.js', out: 'app' },
      { in: 'src/styles/main.css', out: 'app' },
    ],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['es2022', 'chrome111', 'firefox115', 'safari16.4'],
    outdir: 'dist/assets',
    entryNames: '[name]-[hash]',
    assetNames: 'fonts/[name]-[hash]',
    loader: { '.woff2': 'file' },
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  });
  const outputs = Object.entries(result.metafile.outputs);
  const rel = (p) => path.relative(DIST, path.join(ROOT, p)).split(path.sep).join('/');
  const find = (pred) => outputs.find(([, meta]) => pred(meta))?.[0];
  const js = find((m) => m.entryPoint === 'src/scripts/main.js');
  const css = find((m) => m.entryPoint === 'src/styles/main.css');
  const font = (name) => {
    const out = find((m) => m.inputs && Object.keys(m.inputs).includes(`src/fonts/${name}.woff2`));
    if (!out) throw new Error(`esbuild did not emit the font ${name}`);
    return rel(out);
  };
  if (!js || !css) throw new Error('esbuild did not produce the expected outputs');
  const sizes = Object.fromEntries(outputs.map(([p, m]) => [rel(p), m.bytes]));
  // Fonts used above the fold, preloaded to avoid layout shifts when they swap in.
  // The serif only renders in the paper (light) rendering.
  const fonts = [
    { href: font('iosevka-400') },
    { href: font('iosevka-700') },
    { href: font('stix-two-text-roman'), media: '(prefers-color-scheme: light)' },
    { href: font('stix-two-text-italic'), media: '(prefers-color-scheme: light)' },
  ];
  return { js: rel(js), css: rel(css), fonts, sizes };
}

async function main() {
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const profile = await loadProfile();
  const notes = await loadNotes({ drafts: args.has('--drafts') });
  const build = buildInfo(profile, pkg);

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  const assets = await bundle();

  await cp(path.join(ROOT, 'src/static'), DIST, { recursive: true });
  const resumeSize = kb((await stat(path.join(DIST, profile.site.resume))).size);
  const themeScriptHash = `sha256-${sha256(THEME_SCRIPT)}`;
  const pages = [];

  // Security headers for the nginx image, generated so the CSP hash always matches the inline script.
  // GitHub Pages cannot send headers, so the same policy is also set with <meta http-equiv>.
  await mkdir(path.join(ROOT, 'build'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'build/security-headers.conf'),
    [
      '# Generated by scripts/build.mjs. Included by deploy/docker/default.conf.',
      `add_header Content-Security-Policy "${csp({ themeScriptHash })}; frame-ancestors 'none'" always;`,
      'add_header X-Content-Type-Options "nosniff" always;',
      'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
      'add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;',
      'add_header Cross-Origin-Opener-Policy "same-origin" always;',
      'add_header Cross-Origin-Resource-Policy "same-origin" always;',
      'add_header X-Frame-Options "DENY" always;',
      '# HSTS belongs to whatever terminates TLS (the ingress or the CDN), not to this plain-HTTP container.',
      '',
    ].join('\n'),
  );

  for (const lang of LANGS) {
    const ui = UI[lang];
    const prefix = lang === 'en' ? '' : `${lang}/`;
    const root = lang === 'en' ? '' : '../';
    const ctx = {
      profile,
      lang,
      ui,
      notes,
      build,
      assets,
      root,
      resumeSize,
      themeScriptHash,
      otherLangHref: lang === 'en' ? 'fr/' : '../',
    };
    const page = layout(ctx, {
      home: true,
      path: prefix,
      title: t(profile.site.title, lang),
      description: t(profile.site.description, lang),
      alternates: [
        { lang: 'en', path: '' },
        { lang: 'fr', path: 'fr/' },
        { lang: 'x-default', path: '' },
      ],
      body: homeBody(ctx),
      sections: homeSections(ctx),
      jsonld: personJsonLd(ctx),
      bodyClass: 'page-home',
    });
    await write(`${prefix}index.html`, page);
    pages.push({ path: prefix, lang });
    await write(
      `${prefix}${profile.site.command}.1`,
      renderManPage(profile, lang, { date: build.date, version: build.version, siteUrl: build.siteUrl, notes }),
    );
  }

  // Field notes (written in English; linked from both languages).
  for (const note of notes) {
    const ui = UI[note.lang];
    const ctx = {
      profile,
      lang: note.lang,
      ui,
      notes,
      build,
      assets,
      root: '../../',
      resumeSize,
      themeScriptHash,
      otherLangHref: '../../fr/',
    };
    const page = layout(ctx, {
      path: `notes/${note.slug}/`,
      title: `${note.title} | ${profile.person.name}`,
      description: note.summary,
      ogType: 'article',
      body: String(noteBody(ctx, note)),
      sections: [],
      bodyClass: 'page-note',
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: note.title,
        description: note.summary,
        datePublished: note.date,
        dateModified: note.updated,
        inLanguage: note.lang,
        author: { '@type': 'Person', name: profile.person.name, url: build.siteUrl },
        keywords: note.tags.join(', '),
      },
    });
    await write(`notes/${note.slug}/index.html`, page);
    pages.push({ path: `notes/${note.slug}/`, lang: note.lang });
  }

  // 404: served at arbitrary paths, so every URL in it must be absolute.
  {
    const ctx = {
      profile,
      lang: 'en',
      ui: UI.en,
      notes,
      build,
      assets,
      root: build.basePath,
      resumeSize,
      themeScriptHash,
      otherLangHref: `${build.basePath}fr/`,
    };
    await write(
      '404.html',
      layout(ctx, {
        path: '404.html',
        title: `${UI.en.notFound.title} | ${profile.person.name}`,
        description: UI.en.notFound.body,
        body: String(notFoundBody(ctx)),
        bodyClass: 'page-404',
        noindex: true,
      }),
    );
  }

  // Old URLs from the first version of the site (blog.html, posts/*.html) keep working.
  const redirect = (to) =>
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"></head><body><p>Moved to <a href="${to}">${to}</a>.</p></body></html>\n`;
  await write('blog.html', redirect('./#notes'));
  for (const slug of ['zero-trust-5g', 'airgapped-kubernetes', 'gitops-multi-dc']) {
    const published = notes.some((n) => n.slug === slug);
    await write(`posts/${slug}.html`, redirect(published ? `../notes/${slug}/` : '../#notes'));
  }

  // Machine-readable extras.
  const today = build.date;
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages
      .map(
        (p) =>
          `  <url><loc>${build.siteUrl}${p.path}</loc><lastmod>${today}</lastmod>${
            p.path === '' || p.path === 'fr/'
              ? `<xhtml:link rel="alternate" hreflang="en" href="${build.siteUrl}"/><xhtml:link rel="alternate" hreflang="fr" href="${build.siteUrl}fr/"/>`
              : ''
          }</url>`,
      )
      .join('\n')}\n</urlset>\n`,
  );
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${build.siteUrl}sitemap.xml\n`);

  // RFC 9116. Regenerated on every build, so it never expires while the pipeline runs.
  const expires = new Date(Date.parse(build.builtAt) + 180 * 86400 * 1000).toISOString();
  await write(
    '.well-known/security.txt',
    `Contact: mailto:${profile.person.email}\nExpires: ${expires}\nPreferred-Languages: en, fr, ar\nCanonical: ${build.siteUrl}.well-known/security.txt\nPolicy: https://github.com/${build.repository}/security/policy\n`,
  );
  await write(
    'humans.txt',
    `/* TEAM */\n  Author: ${profile.person.name}\n  Role: ${t(profile.person.role, 'en')}\n  Contact: ${profile.person.email}\n  From: ${t(profile.person.location, 'en')}\n\n/* SITE */\n  Last update: ${today}\n  Language: English, French\n  Standards: HTML, CSS, a man page (roff)\n  Components: esbuild, marked, yaml, ajv\n  Fonts: STIX Two Text, Iosevka (SIL Open Font License)\n  Source: https://github.com/${build.repository}\n`,
  );
  await write(
    'site.webmanifest',
    JSON.stringify(
      {
        name: `${profile.person.name}, ${t(profile.person.role, 'en')}`,
        short_name: 'guerd(1)',
        start_url: './',
        display: 'standalone',
        background_color: '#f8f8f4',
        theme_color: '#2a0b21',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2,
    ),
  );
  const atomEntries = notes
    .map(
      (n) => `  <entry>
    <title>${n.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
    <link href="${build.siteUrl}notes/${n.slug}/"/>
    <id>${build.siteUrl}notes/${n.slug}/</id>
    <published>${n.date}T00:00:00Z</published>
    <updated>${n.updated}T00:00:00Z</updated>
    <summary>${n.summary.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</summary>
  </entry>`,
    )
    .join('\n');
  await write(
    'feed.xml',
    `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n  <title>${profile.person.name}, field notes</title>\n  <link href="${build.siteUrl}"/>\n  <link rel="self" href="${build.siteUrl}feed.xml"/>\n  <id>${build.siteUrl}</id>\n  <updated>${(notes[0]?.updated ?? today)}T00:00:00Z</updated>\n  <author><name>${profile.person.name}</name></author>\n${atomEntries}\n</feed>\n`,
  );
  await write(
    'build-info.json',
    `${JSON.stringify({ ...build, assets: { js: assets.js, css: assets.css }, notes: notes.map((n) => n.slug), plainTagline: plain(t(profile.hero.tagline, 'en')) }, null, 2)}\n`,
  );

  const total = Object.values(assets.sizes).reduce((a, b) => a + b, 0);
  const ms = Math.round(performance.now() - started);
  console.log(`built ${pages.length} pages + 404 in ${ms} ms -> ${path.relative(ROOT, DIST)}/  (site: ${build.siteUrl})`);
  for (const [file, bytes] of Object.entries(assets.sizes)) console.log(`  ${file.padEnd(46)} ${String(bytes).padStart(7)} B`);
  console.log(`  ${'total assets'.padEnd(46)} ${String(total).padStart(7)} B`);
}

main().catch((error) => {
  if (error instanceof ContentError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
