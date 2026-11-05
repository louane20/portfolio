#!/usr/bin/env node
// Static site generator: content/profile.yaml + content/blog/*.md -> dist/
//
//   node scripts/build.mjs            production build
//   node scripts/build.mjs --drafts   include draft posts
//
// Environment (all optional, set by CI):
//   SITE_URL            absolute URL the site is served from (actions/configure-pages base_url)
//   GITHUB_REPOSITORY   owner/repo, used for the live pipeline widget and provenance links
//   GITHUB_SHA, GITHUB_RUN_ID, GITHUB_RUN_NUMBER   build provenance shown in the footer
//   SOURCE_DATE_EPOCH   makes the build date reproducible
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

import { loadProfile, loadPosts, t, LANGS, langPrefix, ContentError } from './lib/content.mjs';
import { renderManPage } from './lib/roff.mjs';
import { plain } from './lib/html.mjs';
import { UI } from '../src/i18n.mjs';
import { layout, csp, THEME_SCRIPT } from '../src/templates/layout.mjs';
import { homeBody, personJsonLd } from '../src/templates/home.mjs';
import { notFoundBody } from '../src/templates/pages.mjs';
import { blogIndexBody, blogJsonLd, postBody, postJsonLd } from '../src/templates/blog/pages.mjs';

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
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

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
  // Fonts used above the fold, preloaded so text does not shift when they swap in.
  const fonts = [font('red-hat-display'), font('red-hat-text')];
  // Arabic pages also preload the Arabic text face.
  const arabicFonts = [font('ibm-plex-sans-arabic-400')];
  return { js: rel(js), css: rel(css), fonts, arabicFonts, sizes };
}

async function main() {
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const profile = await loadProfile();
  const posts = await loadPosts({ drafts: args.has('--drafts') });
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

  /** Template context for one page. `root` is the relative path from that page to the site root;
      the language links point to the same page (`sub`) in the other languages. */
  const context = (lang, root, sub = '') => ({
    profile,
    lang,
    ui: UI[lang],
    posts,
    build,
    assets,
    root,
    resumeSize,
    resumeHref: `${root}${profile.site.resume}`,
    themeScriptHash,
    langLinks: LANGS.filter((l) => l !== lang).map((l) => ({ lang: l, href: `${root}${langPrefix(l)}${sub}` || './' })),
  });
  const alternatesOf = (sub) => [...LANGS.map((l) => ({ lang: l, path: `${langPrefix(l)}${sub}` })), { lang: 'x-default', path: sub }];

  for (const lang of LANGS) {
    const prefix = langPrefix(lang);
    const ctx = context(lang, lang === 'en' ? '' : '../');
    const page = layout(ctx, {
      home: true,
      path: prefix,
      title: t(profile.site.title, lang),
      description: t(profile.site.description, lang),
      alternates: alternatesOf(''),
      body: homeBody(ctx),
      jsonld: personJsonLd(ctx),
      bodyClass: 'page-home',
    });
    await write(`${prefix}index.html`, page);
    pages.push({ path: prefix, alternates: true });
    // The man page exists in English and French (roff and terminals handle Arabic poorly).
    if (lang !== 'ar') {
      await write(
        `${prefix}${profile.site.command}.1`,
        renderManPage(profile, lang, { date: build.date, version: build.version, siteUrl: build.siteUrl, notes: posts }),
      );
    }

    // The blog index, in every language (the posts themselves are in English).
    const blogCtx = context(lang, lang === 'en' ? '../' : '../../', 'blog/');
    const blogPath = `${prefix}blog/`;
    await write(
      `${blogPath}index.html`,
      layout(blogCtx, {
        blog: true,
        path: blogPath,
        title: `${t(profile.blog.title, lang)} | ${profile.person.name}`,
        description: t(profile.blog.description, lang),
        ogType: 'website',
        alternates: alternatesOf('blog/'),
        body: String(blogIndexBody(blogCtx)),
        jsonld: blogJsonLd(blogCtx, `${build.siteUrl}${blogPath}`),
        bodyClass: 'page-blog',
      }),
    );
    pages.push({ path: blogPath, alternates: true });
  }

  // Posts: blog/<slug>/. Older and newer neighbours are linked at the bottom of each post.
  for (const [i, post] of posts.entries()) {
    const ctx = context(post.lang, '../../', 'blog/');
    const postPath = `blog/${post.slug}/`;
    const url = `${build.siteUrl}${postPath}`;
    const ogFile = `og/${post.slug}.png`;
    const hasOg = await exists(path.join(ROOT, 'src/static', ogFile));
    if (!hasOg) console.warn(`  note: no social image for "${post.slug}" (run: node scripts/render-images.mjs)`);
    const image = `${build.siteUrl}${hasOg ? ogFile : 'og.png'}`;
    await write(
      `${postPath}index.html`,
      layout(ctx, {
        blog: true,
        path: postPath,
        title: `${post.title} | ${profile.person.name}`,
        description: post.summary,
        ogType: 'article',
        image,
        imageAlt: post.title,
        article: { published: post.date, modified: post.updated, tags: post.tags },
        body: String(postBody(ctx, post, { older: posts[i + 1], newer: posts[i - 1], url })),
        bodyClass: 'page-post',
        jsonld: postJsonLd(ctx, post, { url, image }),
      }),
    );
    pages.push({ path: postPath, lastmod: post.updated });
  }

  // 404: served at arbitrary paths, so every URL in it must be absolute.
  {
    const ctx = context('en', build.basePath);
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

  // Older URLs keep working: blog.html and posts/*.html from the first version of the site,
  // notes/<slug>/ from the second.
  const redirect = (to) =>
    `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Moved</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"></head><body><p>Moved to <a href="${to}">${to}</a>.</p></body></html>\n`;
  await write('blog.html', redirect('blog/'));
  const published = new Set(posts.map((p) => p.slug));
  for (const slug of ['zero-trust-5g', 'airgapped-kubernetes', 'gitops-multi-dc']) {
    await write(`posts/${slug}.html`, redirect(published.has(slug) ? `../blog/${slug}/` : '../blog/'));
  }
  for (const slug of ['zero-trust-5g', 'this-site-is-a-pipeline']) {
    if (published.has(slug)) await write(`notes/${slug}/index.html`, redirect(`../../blog/${slug}/`));
  }

  // Machine-readable extras.
  const today = build.date;
  const alternatesFor = (p) => {
    const sub = p.path.replace(/^(fr|ar)\//, '');
    return LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${build.siteUrl}${langPrefix(l)}${sub}"/>`).join('');
  };
  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages
      .map((p) => `  <url><loc>${build.siteUrl}${p.path}</loc><lastmod>${p.lastmod ?? today}</lastmod>${p.alternates ? alternatesFor(p) : ''}</url>`)
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
    `/* TEAM */\n  Author: ${profile.person.name}\n  Role: ${t(profile.person.role, 'en')}\n  Contact: ${profile.person.email}\n  From: ${t(profile.person.location, 'en')}\n\n/* SITE */\n  Last update: ${today}\n  Language: English, French, Arabic\n  Standards: HTML, CSS, a man page (roff)\n  Components: esbuild, marked, highlight.js, yaml, ajv\n  Fonts: Red Hat Display, Red Hat Text, Red Hat Mono (SIL Open Font License)\n  Source: https://github.com/${build.repository}\n`,
  );
  await write(
    'site.webmanifest',
    JSON.stringify(
      {
        name: `${profile.person.name}, ${t(profile.person.role, 'en')}`,
        short_name: 'Nawal Guerd',
        start_url: './',
        display: 'standalone',
        background_color: '#f5f7fa',
        theme_color: '#1a55a6',
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
  const atomEntries = posts
    .map(
      (p) => `  <entry>
    <title>${xml(p.title)}</title>
    <link rel="alternate" type="text/html" href="${build.siteUrl}blog/${p.slug}/"/>
    <id>${build.siteUrl}blog/${p.slug}/</id>
    <published>${p.date}T00:00:00Z</published>
    <updated>${p.updated}T00:00:00Z</updated>
    <category term="${p.category}" label="${xml(UI.en.blog.categories[p.category])}"/>
    <summary>${xml(p.summary)}</summary>
  </entry>`,
    )
    .join('\n');
  await write(
    'feed.xml',
    `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">\n  <title>${xml(profile.person.name)}: ${xml(t(profile.blog.title, 'en'))}</title>\n  <subtitle>${xml(t(profile.blog.description, 'en'))}</subtitle>\n  <link rel="alternate" type="text/html" href="${build.siteUrl}blog/"/>\n  <link rel="self" type="application/atom+xml" href="${build.siteUrl}feed.xml"/>\n  <id>${build.siteUrl}blog/</id>\n  <updated>${posts.reduce((max, p) => (p.updated > max ? p.updated : max), posts[0]?.updated ?? today)}T00:00:00Z</updated>\n  <author><name>${xml(profile.person.name)}</name><uri>${build.siteUrl}</uri></author>\n  <icon>${build.siteUrl}favicon.svg</icon>\n${atomEntries}\n</feed>\n`,
  );
  await write(
    'build-info.json',
    `${JSON.stringify({ ...build, assets: { js: assets.js, css: assets.css }, posts: posts.map((n) => n.slug), headline: plain(t(profile.person.headline, 'en')) }, null, 2)}\n`,
  );

  const total = Object.values(assets.sizes).reduce((a, b) => a + b, 0);
  const ms = Math.round(performance.now() - started);
  console.log(`built ${pages.length} pages + 404 (${posts.length} posts) in ${ms} ms -> ${path.relative(ROOT, DIST)}/  (site: ${build.siteUrl})`);
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
