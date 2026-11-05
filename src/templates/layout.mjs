// Document shell: <head>, the site header with navigation, and the footer.
import { html, raw, t, icon } from './common.mjs';
import { langPrefix } from '../../scripts/lib/content.mjs';
import { UI } from '../i18n.mjs';

// Sections of the home page, plus the blog, which has its own pages.
export const NAV = ['about', 'expertise', 'experience', 'research', 'projects', 'blog', 'contact'];

// Inline so the theme is applied before the first paint (no flash). Its hash is added to the CSP.
export const THEME_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('ng-theme');if(t==='light'||t==='dark')d.dataset.theme=t;}catch(e){}})();";

const jsonForScript = (value) => raw(JSON.stringify(value).replace(/</g, '\\u003c'));

export function csp(ctx) {
  return [
    "default-src 'none'",
    `script-src 'self' '${ctx.themeScriptHash}'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://api.github.com",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export const monogram = (profile) =>
  html`<span class="monogram" aria-hidden="true">${profile.person.given_name[0]}${profile.person.family_name[0]}</span>`;

function header(ctx, { home, blog }) {
  const { ui, profile, lang, root, resumeHref } = ctx;
  const homeHref = `${root}${langPrefix(lang)}` || './';
  const anchor = (id) => (home ? `#${id}` : `${homeHref}#${id}`);
  const blogHref = `${root}${langPrefix(lang)}blog/`;
  const item = (id) =>
    id === 'blog'
      ? html`<li><a href="${blogHref}"${blog ? raw(' aria-current="page"') : ''}${home ? raw(' data-nav-link="writing"') : ''}>${ui.nav.blog}</a></li>`
      : html`<li><a href="${anchor(id)}" data-nav-link="${id}">${ui.nav[id]}</a></li>`;
  return html`
<header class="site-header">
  <div class="container header-row">
    <a class="brand" href="${home ? '#top' : homeHref}">${monogram(profile)}<span class="brand-name">${profile.person.name}</span></a>
    <nav class="nav" id="site-nav" aria-label="${ui.navLabel}" data-nav>
      <ul class="nav-links">${NAV.map(item)}</ul>
      <div class="nav-tools">
        <div class="lang-links" role="group" aria-label="${ui.langLabel}">${ctx.langLinks.map(
          (l) => html`<a class="lang" href="${l.href}" hreflang="${l.lang}" lang="${l.lang}" data-lang-link><span aria-hidden="true">${UI[l.lang].langShort}</span><span class="sr-only">${UI[l.lang].langName}</span></a>`,
        )}</div>
        <button type="button" class="icon-btn theme-btn" data-theme-toggle data-label-light="${ui.theme.toLight}" data-label-dark="${ui.theme.toDark}" aria-label="${ui.theme.toDark}"><span class="i-moon">${icon.moon}</span><span class="i-sun">${icon.sun}</span></button>
      </div>
    </nav>
    <a class="btn btn-primary btn-sm header-cv" href="${resumeHref}" download>${icon.download}<span class="cv-long">${ui.downloadCv}</span><span class="cv-short">${ui.cvShort}</span></a>
    <button type="button" class="icon-btn menu-btn" aria-expanded="false" aria-controls="site-nav" data-menu data-label-open="${ui.menu}" data-label-close="${ui.closeMenu}" aria-label="${ui.menu}"><span class="i-open">${icon.menu}</span><span class="i-close">${icon.close}</span></button>
  </div>
</header>`;
}

function footer(ctx) {
  const { ui, profile, build, lang } = ctx;
  const f = ui.footer;
  const repoUrl = `https://github.com/${build.repository}`;
  const manUrl = `${build.siteUrl}${lang === 'fr' ? 'fr/' : ''}${profile.site.command}.1`;
  const curl = `curl -sL ${manUrl} | man -l -`;
  const year = build.date.slice(0, 4);
  const provenance = build.sha
    ? html`${f.built}, ${f.fromCommit} <a href="${repoUrl}/commit/${build.sha}"><code>${build.sha.slice(0, 7)}</code></a>${
        build.runId ? html` (<a href="${repoUrl}/actions/runs/${build.runId}">${f.run} #${build.runNumber}</a>)` : ''
      }.`
    : html`${f.built}. ${f.local}, <bdi dir="ltr">${build.date}</bdi>.`;
  return html`
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-id">
      <p class="footer-name">${monogram(profile)}<span>${profile.person.name}</span></p>
      <p>© ${year} ${profile.person.name}. ${f.rights}</p>
    </div>
    <div class="footer-build">
      <p>${provenance}</p>
      <p><a href="${repoUrl}">${f.source}</a></p>
      <p class="terminal"><span>${f.terminal}</span><code>${curl}</code><button type="button" class="copy-btn" data-copy="${curl}">${ui.copy}</button></p>
    </div>
  </div>
</footer>
<p class="toast" data-toast role="status" aria-live="polite"></p>`;
}

export function layout(ctx, page) {
  const { ui, profile, lang, build, assets, root } = ctx;
  const canonical = `${build.siteUrl}${page.path}`;
  const alternates = page.alternates ?? [];
  const clientData = {
    lang,
    ui: ui.client,
    repository: build.repository,
    email: profile.person.email,
    timezone: profile.person.timezone,
    locale: ui.locale,
    home: `${root}${langPrefix(lang)}` || './',
    blog: `${root}${langPrefix(lang)}blog/`,
    posts: ctx.posts.map((n) => ({ slug: n.slug, title: n.title, href: `${root}blog/${n.slug}/` })),
    resume: ctx.resumeHref,
  };
  return `<!doctype html>
${html`<html lang="${ui.htmlLang}" dir="${ui.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp(ctx)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="author" content="${profile.person.name}">
${page.noindex ? html`<meta name="robots" content="noindex">` : ''}
<link rel="canonical" href="${canonical}">
${alternates.map((a) => html`<link rel="alternate" hreflang="${a.lang}" href="${build.siteUrl}${a.path}">`)}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f7fa">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b1320">
<meta property="og:type" content="${page.ogType ?? 'profile'}">
${
  page.article
    ? html`<meta property="article:published_time" content="${page.article.published}">
<meta property="article:modified_time" content="${page.article.modified}">
<meta property="article:author" content="${profile.person.name}">
${page.article.tags.map((tag) => html`<meta property="article:tag" content="${tag}">`)}`
    : ''
}
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${page.image ?? `${build.siteUrl}og.png`}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${page.imageAlt ?? `${profile.person.name}, ${t(profile.person.role, lang)}`}">
<meta property="og:locale" content="${ui.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="manifest" href="${root}site.webmanifest">
<link rel="alternate" type="application/atom+xml" title="${profile.person.name}: ${t(profile.blog.title, lang)}" href="${root}feed.xml">
${[...assets.fonts, ...(lang === 'ar' ? assets.arabicFonts : [])].map((f) => html`<link rel="preload" href="${root}${f}" as="font" type="font/woff2" crossorigin>`)}
<link rel="stylesheet" href="${root}${assets.css}">
<script>${raw(THEME_SCRIPT)}</script>
<script type="module" src="${root}${assets.js}"></script>
${page.jsonld ? html`<script type="application/ld+json">${jsonForScript(page.jsonld)}</script>` : ''}
</head>
<body class="${page.bodyClass ?? ''}">
<a class="skip" href="#main">${ui.skip}</a>
${header(ctx, { home: page.home, blog: page.blog })}
<main id="main" tabindex="-1">
${raw(page.body)}
</main>
${footer(ctx)}
<script type="application/json" id="site-data">${jsonForScript(clientData)}</script>
</body>
</html>`}
`;
}
