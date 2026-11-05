// The PDF résumé (GUERD_Nawal_CV.pdf, GUERD_Nawal_CV_FR.pdf). One HTML page per language, printed
// to A4 by scripts/render-cv.mjs with Chromium. Everything on it comes from content/profile.yaml:
// the cv section (keywords, summary, the four figures, which projects) and the rest of the file
// (experience, expertise, education, research, credentials, languages), so the résumé and the site
// never disagree.
//
// Recruiters' applicant tracking systems read the PDF's text, so the reading order stays simple:
// one column for everything that matters, real text (no text in images), and decorative bits that
// are either pure CSS shapes or placed after the content they decorate.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { html, raw, md, t, icon } from './common.mjs';
import { UI } from '../i18n.mjs';

/** The résumé exists in English and French; the Arabic pages offer the English one. */
export const CV_LANGS = ['en', 'fr'];

const STRINGS = {
  en: {
    doc: 'Résumé',
    profile: 'Profile',
    skills: 'Skills',
    legend: ['highlighted', ': in production'],
    projects: 'Selected projects',
    languages: 'Languages',
    present: 'Present',
    authors: 'Authors',
    portfolio: 'Portfolio',
  },
  fr: {
    doc: 'CV',
    profile: 'Profil',
    skills: 'Compétences',
    legend: ['surligné', '\u00a0: en production'],
    projects: 'Projets choisis',
    languages: 'Langues',
    present: 'aujourd’hui',
    authors: 'Auteurs',
    portfolio: 'Portfolio',
  },
};

const globe = raw(
  '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.8"/><path d="M3.4 10h13.2M10 3.2c2 2 2.9 4.3 2.9 6.8S12 14.8 10 16.8C8 14.8 7.1 12.5 7.1 10S8 5.2 10 3.2Z"/></g></svg>',
);

/** The dot grid of the header, as one vector path: tiny squares every 3.4 mm. */
const DOTS = (() => {
  let d = '';
  for (let y = 1.7; y < 90; y += 3.4) for (let x = 1.7; x < 210; x += 3.4) d += `M${x.toFixed(1)} ${y.toFixed(1)}h.5v.5h-.5z`;
  return raw(`<svg class="grid" viewBox="0 0 210 90" aria-hidden="true"><path fill="#4ade80" fill-opacity=".2" d="${d}"/></svg>`);
})();

const month = (value, lang) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value));
  return m ? `${UI[lang].months[Number(m[2]) - 1]} ${m[1]}` : String(value);
};
const period = (item, lang) => {
  if (!item.end) return month(item.start, lang);
  return `${month(item.start, lang)} – ${item.end === 'present' ? STRINGS[lang].present : month(item.end, lang)}`;
};
const bare = (url) => url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');

/** Whole years since the current position began: "2", or "2+" once the next year has started. */
function yearsSince(start, now) {
  const [y, m] = String(start).split('-').map(Number);
  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - (m || 1));
  const years = Math.floor(months / 12);
  return months % 12 ? `${years}+` : String(years);
}

// Static instances of the site's fonts (scripts/cv-fonts.sh explains why they are not the variable ones).
const FONTS = [
  ['Red Hat Text', 'RedHatText-Regular', 400],
  ['Red Hat Text', 'RedHatText-SemiBold', 600],
  ['Red Hat Text', 'RedHatText-Bold', 700],
  ['Red Hat Text', 'RedHatText-Italic', 400, 'italic'],
  ['Red Hat Mono', 'RedHatMono-Regular', 400],
  ['Red Hat Mono', 'RedHatMono-SemiBold', 600],
  ['Red Hat Display', 'RedHatDisplay-Bold', 700],
  ['Red Hat Display', 'RedHatDisplay-ExtraBold', 800],
];
const fontFaces = (root) =>
  FONTS.map(
    ([family, file, weight, style = 'normal']) =>
      `@font-face{font-family:"${family}";src:url("${pathToFileURL(path.join(root, 'scripts/cv/fonts', `${file}.woff2`)).href}") format("woff2");font-weight:${weight};font-style:${style}}`,
  ).join('\n');

const CSS = `
@page { size: A4; margin: 12mm 0 13mm; }
@page :first { margin-top: 0; }
:root {
  --ink: #0f1a15; --ink-2: #34443b; --muted: #5a6b62; --faint: #7f8f86; --line: #dbe5df;
  --accent: #0d7442; --accent-2: #149157; --soft: #e5f3ea; --soft-ink: #0a4a2a;
  --band: #0b0f0e; --band-ink: #eaf2ee; --band-muted: #9fb4a9; --phosphor: #4ade80;
}
* { box-sizing: border-box; }
html { font-size: 8.6pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: "Red Hat Text", "Segoe UI", sans-serif; color: var(--ink); line-height: 1.42; }
a { color: inherit; text-decoration: none; }
p, h1, h2, h3, ul, ol, dl, dd { margin: 0; }
ul, ol { padding: 0; list-style: none; }
strong, b { font-weight: 600; }
.ico { width: 3.1mm; height: 3.1mm; flex: none; }

/* Header: a dark terminal band. */
.top { position: relative; background: var(--band); color: var(--band-ink); padding: 14mm 14mm 13mm;
  overflow: hidden; }
.grid { position: absolute; inset: 0 auto auto 0; width: 210mm; height: 90mm; }
.top::after { content: ""; position: absolute; inset: auto 0 0; height: 0.8mm;
  background: linear-gradient(90deg, var(--phosphor), #22c55e 40%, #0d9488); }
.name, .role, .keywords, .contact { position: relative; }
.name { font-family: "Red Hat Display", sans-serif; font-weight: 800; font-size: 29pt; line-height: 1; letter-spacing: -0.01em; color: #fff; }
.role { margin-top: 2mm; font-size: 13pt; font-weight: 600; color: var(--phosphor); }
.keywords { margin-top: 1.6mm; font-family: "Red Hat Mono", monospace; font-size: 7.5pt; color: var(--band-muted); letter-spacing: 0.01em; }
.contact { display: flex; flex-wrap: wrap; gap: 1.4mm 5mm; margin-top: 4.6mm; font-size: 8pt; }
.contact li { display: flex; align-items: center; gap: 1.4mm; }
.contact .ico { color: var(--phosphor); }
.prompt { position: absolute; top: 7.4mm; left: 14mm; width: 60mm; height: 4.2mm; }
.status { position: absolute; top: 13.6mm; right: 14mm; display: flex; align-items: center; gap: 1.6mm;
  padding: 1.1mm 2.6mm; border: 0.3mm solid rgb(74 222 128 / 55%); border-radius: 5mm; font-size: 7.4pt; color: var(--band-ink); }
.status::before { content: ""; width: 1.7mm; height: 1.7mm; border-radius: 50%; background: var(--phosphor); box-shadow: 0 0 0 0.6mm rgb(74 222 128 / 25%); }

/* The four figures, overlapping the band. */
.stats { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; margin: -7mm 14mm 0; }
.stat { background: #fff; border: 0.3mm solid var(--line); border-top: 0.75mm solid var(--accent-2); border-radius: 2mm;
  padding: 2.2mm 2.8mm 2.4mm; box-shadow: 0 1.2mm 3mm -1mm rgb(11 15 14 / 18%); }
.stat-value { font-family: "Red Hat Display", sans-serif; font-weight: 800; font-size: 15pt; line-height: 1.05; color: var(--accent); }
.stat-label { margin-top: 0.8mm; font-size: 7.2pt; line-height: 1.3; color: var(--muted); }

main { padding: 0 14mm; }
section { margin-top: 4.4mm; }
h2 { display: flex; align-items: center; gap: 2.2mm; margin-bottom: 2.4mm; font-family: "Red Hat Display", sans-serif;
  font-weight: 700; font-size: 9.6pt; letter-spacing: 0.045em; text-transform: uppercase; color: var(--ink); break-after: avoid; }
h2::before { content: ""; width: 2mm; height: 2mm; border-radius: 0.5mm; background: var(--accent-2); flex: none; }
h2 .rule { flex: 1; height: 0.3mm; background: var(--line); }
h2 small { font-family: "Red Hat Mono", monospace; font-size: 6.8pt; font-weight: 400; letter-spacing: 0; text-transform: none; color: var(--faint); }
h2 small mark { background: var(--soft); color: var(--soft-ink); padding: 0 1mm; border-radius: 0.6mm; }
.summary { font-size: 9.1pt; line-height: 1.5; color: var(--ink-2); }
.summary strong { color: var(--ink); }

/* Skills: label, then tools. Production tools are highlighted. */
.skills > div { display: grid; grid-template-columns: 55mm 1fr; gap: 2.6mm; padding: 1.05mm 0; line-height: 1.5; border-bottom: 0.25mm dashed var(--line); break-inside: avoid; }
.skills > div:last-child { border-bottom: 0; }
.skills dt { font-size: 8.2pt; font-weight: 600; color: var(--ink); white-space: nowrap; }
.skills dd { color: var(--ink-2); }
.skills mark { background: var(--soft); box-shadow: 0 0 0 0.45mm var(--soft); border-radius: 0.5mm; color: var(--soft-ink); font-weight: 600; }

/* Experience: a git graph on the left. */
.jobs > li { position: relative; padding-left: 5.4mm; padding-bottom: 2.8mm; }
.jobs > li.is-past, .bullets li, .head { break-inside: avoid; }
.jobs > li::before { content: ""; position: absolute; left: 0.4mm; top: 1.2mm; width: 2.4mm; height: 2.4mm; border-radius: 50%; border: 0.5mm solid var(--accent-2); background: #fff; z-index: 1; }
.jobs > li::after { content: ""; position: absolute; left: 1.45mm; top: 3mm; bottom: -1mm; width: 0.35mm; background: var(--line); }
.jobs > li:last-child { padding-bottom: 0; }
.jobs > li:last-child::after { display: none; }
.jobs > li.is-current::before { background: var(--accent-2); box-shadow: 0 0 0 0.8mm var(--soft); }
.head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; }
.head h3 { font-size: 10.2pt; font-weight: 700; }
.head h3 .org { color: var(--accent); }
.when { flex: none; font-family: "Red Hat Mono", monospace; font-size: 7.6pt; color: var(--muted); }
.about { margin-top: 0.2mm; font-size: 8pt; color: var(--muted); }
.tags { display: flex; flex-wrap: wrap; gap: 1.2mm; margin-top: 1.4mm; }
.tags li { padding: 0.15mm 1.6mm; border: 0.25mm solid var(--line); border-radius: 3mm; font-size: 7pt; color: var(--ink-2); }
.bullets { margin-top: 1.6mm; }
.bullets li { position: relative; padding-left: 3.4mm; margin-top: 0.8mm; color: var(--ink-2); }
.bullets li::before { content: ""; position: absolute; left: 0.3mm; top: 1.75mm; width: 1.5mm; height: 0.45mm; background: var(--accent-2); }
.bullets strong { color: var(--ink); }
.jobs > li.is-past .head h3 { font-size: 9.2pt; }
.jobs > li.is-past .bullets li { margin-top: 0.4mm; }

/* Projects. */
.projects > li { padding: 1.5mm 0; border-bottom: 0.25mm dashed var(--line); break-inside: avoid; }
.projects > li:last-child { border-bottom: 0; padding-bottom: 0; }
.projects > li.featured { padding: 2.6mm 3.2mm; margin-bottom: 1.2mm; border: 0.3mm solid #cfe7d8; border-left: 0.9mm solid var(--accent-2); border-radius: 1.6mm; background: #f4faf6; }
.projects h3 { font-size: 9.4pt; font-weight: 700; }
.projects .head .stack { flex: none; }
.projects h3 .year { margin-left: 1.6mm; font-family: "Red Hat Mono", monospace; font-size: 7.4pt; font-weight: 400; color: var(--faint); }
.projects h3 a { margin-left: 1.6mm; font-family: "Red Hat Mono", monospace; font-size: 7.4pt; font-weight: 600; color: var(--accent); }
.projects p { margin-top: 0.6mm; color: var(--ink-2); }
.stack { font-family: "Red Hat Mono", monospace; font-size: 7.2pt; color: var(--accent) !important; }

/* Education and research. */
.entries > li { padding: 1.4mm 0; break-inside: avoid; }
.entries > li + li { border-top: 0.25mm dashed var(--line); }
.entries h3 { font-size: 9.6pt; font-weight: 700; }
.entries h3 .org { color: var(--accent); font-weight: 600; }
.entries p { margin-top: 0.5mm; color: var(--ink-2); }
.entries .meta { font-size: 8pt; color: var(--muted); }
.entries .meta b { color: var(--ink); }
.paper h3 a { color: var(--ink); }
.venue { display: inline-block; margin-right: 1.4mm; padding: 0 1.4mm; border-radius: 0.8mm; background: var(--band); color: var(--phosphor);
  font-family: "Red Hat Mono", monospace; font-size: 7.2pt; font-weight: 600; }
.doi { font-family: "Red Hat Mono", monospace; font-size: 7.4pt; color: var(--accent); }

/* Last row: three short lists. */
.facts { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6mm; break-inside: avoid; }
.facts h2 { font-size: 8.6pt; margin-bottom: 1.4mm; align-items: flex-start; line-height: 1.25; }
.facts h2::before { margin-top: 0.55mm; }
.facts h2 .rule { margin-top: 1.5mm; }
.facts h2 ~ h2 { margin-top: 3mm; }
.facts li { margin-top: 0.9mm; line-height: 1.3; }
.facts li span { display: block; font-size: 7.6pt; color: var(--muted); }
.facts .inline li span { display: inline; }
.facts .inline li span::before { content: " · "; }
`;

/** The full HTML page of the résumé in one language. */
export function cvHtml({ profile, lang, root, now = new Date() }) {
  const s = STRINGS[lang];
  const p = profile.person;
  const cv = profile.cv;
  const portfolio = profile.site.url;
  const current = profile.experience.items.find((j) => j.end === 'present') ?? profile.experience.items[0];
  const value = (h) => t(h.value, lang).replace('{years}', yearsSince(current.start, now));
  const projects = cv.projects.map((id) => profile.projects.items.find((x) => x.id === id));
  const paper = profile.research.paper;
  const school = t(profile.education.school_name, lang);
  const title = `${p.name} – ${t(p.role, lang)} – ${s.doc}`;
  const heading = (text, aside = '') => html`<h2><span>${text}</span><i class="rule"></i>${aside}</h2>`;

  const fonts = fontFaces(root);

  return `<!doctype html>${html`
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="author" content="${p.name}">
<meta name="description" content="${t(p.role, lang)}. ${t(cv.keywords, lang)}">
<style>${raw(fonts)}${raw(CSS)}</style>
</head>
<body>
<header class="top">
  ${DOTS}
  <h1 class="name">${p.name}</h1>
  <p class="role">${t(p.role, lang)}</p>
  <p class="keywords">${t(cv.keywords, lang)}</p>
  <ul class="contact">
    <li>${icon.mail}<a href="mailto:${p.email}">${p.email}</a></li>
    ${p.phone ? html`<li>${icon.phone}<a href="tel:${p.phone.replace(/\s/g, '')}">${p.phone}</a></li>` : ''}
    <li>${icon.pin}<span>${t(p.location, lang)}</span></li>
    <li>${icon.link}<a href="${p.links.linkedin}">${bare(p.links.linkedin)}</a></li>
    <li>${icon.code}<a href="${p.links.github}">${bare(p.links.github)}</a></li>
    <li>${globe}<a href="${portfolio}">${bare(portfolio)}</a></li>
  </ul>
  <canvas class="prompt" aria-hidden="true"></canvas>
  <p class="status">${t(p.availability, lang)}</p>
</header>

<div class="stats">
  ${cv.highlights.map((h) => html`<div class="stat"><p class="stat-value">${value(h)}</p><p class="stat-label">${t(h.label, lang)}</p></div>`)}
</div>

<main>
  <section>
    ${heading(s.profile)}
    <p class="summary">${md(t(cv.summary, lang))}</p>
  </section>

  <section>
    ${heading(s.skills, html`<small><mark>${s.legend[0]}</mark>${s.legend[1]}</small>`)}
    <dl class="skills">
      ${profile.expertise.areas.map(
        (a) => html`<div><dt>${t(a.title, lang)}</dt><dd>${[...a.production.map((x) => html`<mark>${x}</mark>`), ...(a.other ?? [])].map((x, i) => html`${i ? ', ' : ''}${x}`)}</dd></div>`,
      )}
      ${(profile.expertise.also ?? []).map((g) => html`<div><dt>${t(g.label, lang)}</dt><dd>${g.items.join(', ')}</dd></div>`)}
    </dl>
  </section>

  <section>
    ${heading(t(profile.experience.heading, lang))}
    <ol class="jobs">
      ${profile.experience.items.map(
        (job) => html`
      <li class="${job.end === 'present' ? 'is-current' : 'is-past'}">
        <div class="head">
          <h3>${t(job.role, lang)} · <span class="org">${job.org}</span></h3>
          <p class="when">${period(job, lang)}${job.place ? ` · ${t(job.place, lang)}` : ''}</p>
        </div>
        ${job.org_about ? html`<p class="about">${t(job.org_about, lang)}</p>` : ''}
        ${job.tags?.length ? html`<ul class="tags">${job.tags.map((tag) => html`<li>${t(tag, lang)}</li>`)}</ul>` : ''}
        <ul class="bullets">${job.highlights.map((b) => html`<li>${md(t(b, lang))}</li>`)}</ul>
      </li>`,
      )}
    </ol>
  </section>

  <section>
    ${heading(s.projects)}
    <ul class="projects">
      <li class="featured">
        <h3>${t(profile.projects.featured.title, lang)}<a href="${portfolio}">${bare(portfolio)}</a></h3>
        <p>${md(t(profile.projects.featured.text, lang))}</p>
        <p class="stack">${profile.projects.featured.tags.join(' · ')}</p>
      </li>
      ${projects.map(
        (x) => html`
      <li>
        <div class="head"><h3>${t(x.title, lang)}<span class="year">${x.year}</span></h3><p class="stack">${x.tags.join(' · ')}</p></div>
        <p>${md(t(x.text, lang))}</p>
      </li>`,
      )}
    </ul>
  </section>

  <section>
    ${heading(t(profile.education.heading, lang), html`<small>${profile.education.items[0].school}: ${school}</small>`)}
    <ol class="entries">
      ${profile.education.items.map(
        (e) => html`
      <li>
        <div class="head"><h3>${t(e.degree, lang)} · <span class="org">${e.school}</span></h3><p class="when">${e.start} – ${e.end}</p></div>
        <p>${md(t(e.text, lang))}</p>
      </li>`,
      )}
    </ol>
  </section>

  <section>
    ${heading(t(profile.research.heading, lang))}
    <ol class="entries">
      <li class="paper">
        <h3><a href="https://doi.org/${paper.doi}">${paper.title}</a></h3>
        <p class="meta"><span class="venue">${paper.short_venue}</span>${t(paper.location, lang)}, ${t(paper.dates, lang)} · ${paper.authors.map(
          (a, i) => html`${i ? ', ' : ''}${a === p.name ? html`<b>${a}</b>` : a}`,
        )}</p>
        <p>${md(t(paper.summary[0], lang))}</p>
        <p class="doi"><a href="https://doi.org/${paper.doi}">doi.org/${paper.doi}</a>${paper.open_access ? html` · <a href="${paper.open_access}">${bare(paper.open_access)}</a>` : ''}</p>
      </li>
    </ol>
  </section>

  <section class="facts">
    <div>
      ${heading(t(profile.credentials.certifications_heading, lang))}
      <ul>${profile.credentials.certifications.map((c) => html`<li>${t(c.name, lang)}<span>${c.issuer}, ${month(c.date, lang)}</span></li>`)}</ul>
    </div>
    <div>
      ${heading(t(profile.credentials.awards_heading, lang))}
      <ul>${profile.credentials.awards.map((a) => html`<li>${t(a.name, lang)}<span>${a.issuer}, ${a.date}</span></li>`)}</ul>
      ${heading(s.languages)}
      <ul class="inline">${p.languages.map((l) => html`<li>${t(l.name, lang)}<span>${t(l.level, lang)}</span></li>`)}</ul>
    </div>
    <div>
      ${heading(t(profile.about.community.heading, lang))}
      <ul>${profile.about.community.items.map((c) => html`<li>${md(t(c, lang))}</li>`)}</ul>
    </div>
  </section>

</main>
<script>
// The shell prompt above the name is drawn, not written: applicant tracking systems read a PDF's text
// from the top, and "nawal@guerd:~$ whoami" must not become the candidate's name. render-cv waits for
// data-ready before printing.
document.fonts.ready.then(() => {
  const c = document.querySelector('canvas.prompt');
  const k = 6;
  c.width = c.clientWidth * k;
  c.height = c.clientHeight * k;
  const g = c.getContext('2d');
  g.scale(k, k);
  const y = c.clientHeight * 0.74;
  g.font = '600 10.1px "Red Hat Mono"';
  g.fillStyle = '#4ade80';
  g.fillText('nawal@guerd', 0, y);
  let x = g.measureText('nawal@guerd').width;
  g.font = '400 10.1px "Red Hat Mono"';
  g.fillStyle = '#9fb4a9';
  g.fillText(':~$ whoami', x, y);
  x += g.measureText(':~$ whoami').width + 3;
  g.fillStyle = '#4ade80';
  g.fillRect(x, y - 9, 6, 11);
  document.documentElement.dataset.ready = '1';
});
</script>
</body>
</html>`}`;
}

/** Footer printed by Chromium on every page (its own tiny document: inline styles only). */
export function cvFooter({ profile, lang }) {
  const p = profile.person;
  const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<div style="width:100%;padding:0 14mm;display:flex;justify-content:space-between;font-family:'DejaVu Sans Mono',Menlo,Consolas,monospace;font-size:6.4pt;color:#7f8f86">
<span>${esc(p.name)} · ${esc(t(p.role, lang))}</span><span>${esc(bare(profile.site.url))} · <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>`;
}
