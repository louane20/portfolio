// Document shell: <head>, running head (man page header), footer, pager bar and dialogs.
import { html, raw, t, icon } from './common.mjs';

export const NAV = ['about', 'skills', 'experience', 'research', 'projects', 'pipeline', 'notes', 'contact'];

// Inline so the theme is applied before first paint (no flash). Its hash is added to the CSP.
export const THEME_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.add('js');try{var t=localStorage.getItem('guerd-theme');if(t==='light'||t==='dark')d.dataset.theme=t;}catch(e){}})();";

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

function header(ctx, { home }) {
  const { ui, profile, lang, root } = ctx;
  const cmd = `${profile.site.command.toUpperCase()}(${profile.site.section})`;
  const homeHref = lang === 'en' ? `${root}` : `${root}fr/`;
  const anchor = (id) => (home ? `#${id}` : `${homeHref}#${id}`);
  return html`
<header class="runhead">
  <div class="runhead-line wrap">
    <a class="runhead-cmd" href="${homeHref}" aria-label="${profile.person.name}, ${ui.backToManual}">${cmd}</a>
    <span class="runhead-title">${t(profile.site.manual, lang)}</span>
    <span class="runhead-cmd runhead-end" aria-hidden="true">${cmd}</span>
  </div>
  <div class="runhead-bar wrap">
    <nav class="nav" aria-label="${ui.navLabel}">
      <ul>${NAV.map((id) => html`<li><a href="${anchor(id)}" data-nav="${id}">${ui.sections[id].label}</a></li>`)}</ul>
    </nav>
    <div class="tools">
      <a class="lang" href="${ctx.otherLangHref}" hreflang="${ui.otherLang}" lang="${ui.otherLang}" title="${ui.switchLang}"><span aria-hidden="true">${ui.otherLangShort}</span><span class="sr-only">${ui.otherLangName}</span></a>
      <div class="theme" role="group" aria-label="${ui.themeLabel}" title="${ui.themeHint}">
        <button type="button" data-theme-set="light" aria-pressed="false">${icon.paper}<span>${ui.themePaper}</span></button>
        <button type="button" data-theme-set="dark" aria-pressed="false">${icon.terminal}<span>${ui.themeTerminal}</span></button>
      </div>
    </div>
  </div>
</header>`;
}

function footer(ctx) {
  const { ui, profile, build, lang } = ctx;
  const cmd = `${profile.site.command.toUpperCase()}(${profile.site.section})`;
  const repoUrl = `https://github.com/${build.repository}`;
  const manUrl = `${build.siteUrl}${lang === 'fr' ? 'fr/' : ''}${profile.site.command}.1`;
  const curl = `curl -sL ${manUrl} | man -l -`;
  const provenance = build.sha
    ? html`${ui.footerBuilt} <a href="${repoUrl}/commit/${build.sha}"><code>${build.sha.slice(0, 7)}</code></a>${
        build.runId ? html` ${ui.footerRun} <a href="${repoUrl}/actions/runs/${build.runId}">#${build.runNumber}</a>` : ''
      }, ${build.date}.`
    : html`${ui.footerLocal}, ${build.date}.`;
  return html`
<footer class="runfoot">
  <div class="wrap">
    <div class="runfoot-line">
      <span>${ui.footerSource} ${build.version}</span>
      <span>${build.date}</span>
      <span>${cmd}</span>
    </div>
    <p class="provenance">${provenance}</p>
    <p class="terminal-tip">${ui.footerTerminal} <code class="cmdline">${curl}</code> <button type="button" class="copy" data-copy="${curl}">${ui.copy}</button></p>
    <p class="license">${ui.footerLicense}</p>
  </div>
</footer>`;
}

function chrome(ctx) {
  const { ui } = ctx;
  const c = ui.client;
  return html`
<section class="pager" aria-label="${c.pagerManual} guerd(1)" data-pager hidden>
  <div class="pager-inner">
    <p class="pager-status"><span class="pager-man">${c.pagerManual} guerd(1)</span> <span class="pager-section" data-pager-section></span> <span class="pager-line">${c.pagerLine} <span data-pager-line>1</span> (<span data-pager-pct>0</span>%)</span><span class="pager-msg" data-pager-msg></span></p>
    <form class="pager-search" data-pager-search hidden>
      <label for="pager-q">/</label>
      <input id="pager-q" name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="${c.pagerSearch}">
      <button type="submit" class="sr-only" tabindex="-1">${c.pagerSearch}</button>
    </form>
    <div class="pager-actions">
      <button type="button" data-pager-action="search"><kbd>/</kbd><span>${c.pagerSearch}</span></button>
      <button type="button" data-pager-action="palette"><kbd data-mod-key>Ctrl K</kbd><span>${c.pagerJump}</span></button>
      <button type="button" data-pager-action="help"><kbd>h</kbd><span>${c.pagerHelpBtn}</span></button>
    </div>
  </div>
</section>
<dialog class="palette" data-palette aria-label="${c.paletteLabel}">
  <div class="palette-box">
    <div class="palette-prompt">
      <span class="palette-caret" aria-hidden="true">&gt;</span>
      <input type="text" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="${c.palettePlaceholder}" aria-label="${c.paletteLabel}" data-palette-input>
      <span class="palette-info" data-palette-info aria-hidden="true"></span>
    </div>
    <ul class="palette-list" id="palette-list" role="listbox" data-palette-list></ul>
  </div>
</dialog>
<dialog class="help" data-help aria-labelledby="help-title">
  <div class="help-box">
    <h2 id="help-title">${c.helpTitle}</h2>
    <dl class="help-keys">${c.help.map(([k, d]) => html`<div><dt><kbd>${k}</kbd></dt><dd>${d}</dd></div>`)}</dl>
    <form method="dialog"><button type="submit" class="btn">${c.close}</button></form>
  </div>
</dialog>
<p class="toast" data-toast role="status" aria-live="polite"></p>`;
}

export function layout(ctx, page) {
  const { ui, profile, lang, build, assets, root } = ctx;
  const canonical = `${build.siteUrl}${page.path}`;
  const alternates = page.alternates ?? [];
  const clientData = {
    lang,
    ui: { ...ui.client, zt: ui.zt },
    repository: build.repository,
    email: profile.person.email,
    resume: `${root}${profile.site.resume}`,
    man: `${root}${lang === 'fr' ? 'fr/' : ''}${profile.site.command}.1`,
    otherLangHref: ctx.otherLangHref,
    links: profile.person.links,
    paper: profile.research.paper.open_access,
    sections: page.sections ?? [],
    notes: ctx.notes.map((n) => ({ title: n.title, href: `${root}notes/${n.slug}/` })),
    home: lang === 'en' ? root : `${root}fr/`,
  };
  return `<!doctype html>
${html`<html lang="${ui.htmlLang}" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp(ctx)}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="author" content="${profile.person.name}">
${page.noindex ? html`<meta name="robots" content="noindex">` : ''}
<link rel="canonical" href="${canonical}">
${alternates.map((a) => html`<link rel="alternate" hreflang="${a.lang}" href="${build.siteUrl}${a.path}">`)}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f8f8f4">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#2a0b21">
<meta property="og:type" content="${page.ogType ?? 'profile'}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${build.siteUrl}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${profile.person.name}, ${t(profile.person.role, lang)}">
<meta property="og:locale" content="${ui.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${root}favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="${root}apple-touch-icon.png">
<link rel="manifest" href="${root}site.webmanifest">
<link rel="alternate" type="application/atom+xml" title="${profile.person.name}, field notes" href="${root}feed.xml">
${assets.fonts.map((f) => html`<link rel="preload" href="${root}${f.href}" as="font" type="font/woff2" crossorigin${f.media ? html` media="${f.media}"` : ''}>`)}
<link rel="stylesheet" href="${root}${assets.css}">
<script>${raw(THEME_SCRIPT)}</script>
<script type="module" src="${root}${assets.js}"></script>
${page.jsonld ? html`<script type="application/ld+json">${jsonForScript(page.jsonld)}</script>` : ''}
</head>
<body class="${page.bodyClass ?? ''}">
<a class="skip" href="#main">${ui.skip}</a>
${header(ctx, { home: page.home })}
<main id="main" tabindex="-1">
${raw(page.body)}
</main>
${footer(ctx)}
${chrome(ctx)}
<script type="application/json" id="site-data">${jsonForScript(clientData)}</script>
</body>
</html>`}
`;
}
