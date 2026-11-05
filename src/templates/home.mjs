// The home page, section by section.
import { html, raw, md, t, fmtMonth, fmtPeriod, icon, cmd } from './common.mjs';
import { monogram } from './layout.mjs';
import { panelSvg, legendSwatch } from './figure.mjs';
import { postCard, blogHref } from './blog/pages.mjs';
import { shipSection } from './ship.mjs';

const languagesLine = (profile, lang) =>
  profile.person.languages.map((l) => `${t(l.name, lang)} (${t(l.level, lang)})`).join(lang === 'ar' ? '، ' : ', ');

function hero(ctx) {
  const { profile, lang, ui, root, resumeHref, resumeSize } = ctx;
  const p = profile.person;
  const portrait = p.photo
    ? html`<img class="portrait" src="${root}${p.photo}" alt="${p.name}" width="72" height="72">`
    : html`<span class="portrait portrait-mono" aria-hidden="true">${p.given_name[0]}${p.family_name[0]}</span>`;
  return html`
<section class="hero" id="top" aria-labelledby="hero-name">
  <div class="container hero-grid">
    <div class="hero-main">
      <p class="status"><span class="status-dot" aria-hidden="true"></span>${t(p.availability, lang)}</p>
      ${cmd('whoami', { typed: true })}
      <h1 class="hero-name" id="hero-name">${p.name}</h1>
      <p class="hero-role">${t(p.role, lang)}<span class="cursor" aria-hidden="true"></span></p>
      <p class="hero-headline">${t(p.headline, lang)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${resumeHref}" download>${icon.download}<span>${ui.downloadCv}</span><span class="btn-meta">${ui.pdf}, ${resumeSize}</span></a>
        <a class="btn btn-secondary" href="#contact">${icon.mail}<span>${ui.contactMe}</span></a>
      </div>
      <ul class="hero-links">
        <li><a href="${p.links.linkedin}" rel="me noopener">LinkedIn</a></li>
        <li><a href="${p.links.github}" rel="me noopener">GitHub</a></li>
        <li><a href="mailto:${p.email}">${p.email}</a></li>
      </ul>
    </div>
    <aside class="glance" aria-labelledby="glance-title">
      <div class="win-bar" aria-hidden="true" dir="ltr"><span class="win-dots"><i></i><i></i><i></i></span><span class="win-title">nawal@guerd: ~ — neofetch</span></div>
      <div class="glance-head">
        ${portrait}
        <div>
          <p class="glance-name">${p.name}</p>
          <p class="glance-title" id="glance-title">${ui.atAGlance}</p>
        </div>
      </div>
      <dl class="glance-list">
        ${profile.glance.map(
          (g) => html`<div><dt>${t(g.label, lang)}</dt><dd>${t(g.value, lang)}${g.note ? html`<span class="glance-note">${t(g.note, lang)}</span>` : ''}</dd></div>`,
        )}
        <div><dt>${ui.location}</dt><dd>${t(p.location, lang)}<span class="glance-note" data-local-time data-tz="${p.timezone}" data-suffix="${ui.localTime}">UTC+1</span></dd></div>
        <div><dt>${ui.languages}</dt><dd>${languagesLine(profile, lang)}</dd></div>
      </dl>
    </aside>
  </div>
</section>`;
}

function about(ctx) {
  const { profile, lang } = ctx;
  const a = profile.about;
  return html`
<section class="section" id="about" aria-labelledby="about-h">
  <div class="container about-grid">
    <div class="prose">
      ${cmd('cat about.md')}
      <h2 class="section-title" id="about-h">${t(a.heading, lang)}</h2>
      ${a.paragraphs.map((para) => html`<p>${md(t(para, lang))}</p>`)}
    </div>
    <aside class="aside-card" aria-labelledby="community-h">
      <h3 id="community-h">${t(a.community.heading, lang)}</h3>
      <ul class="plain-list">${a.community.items.map((item) => html`<li>${md(t(item, lang))}</li>`)}</ul>
    </aside>
  </div>
</section>`;
}

const chips = (items, strong) => html`<ul class="chips">${items.map((name) => html`<li class="chip${strong ? ' chip-strong' : ''}">${name}</li>`)}</ul>`;

function expertise(ctx) {
  const { profile, lang, ui } = ctx;
  const e = profile.expertise;
  return html`
<section class="section band" id="expertise" aria-labelledby="expertise-h">
  <div class="container">
    <header class="section-head">
      ${cmd('kubectl get skills -o wide')}
      <h2 class="section-title" id="expertise-h">${t(e.heading, lang)}</h2>
      ${e.intro ? html`<p class="lede">${t(e.intro, lang)}</p>` : ''}
    </header>
    <div class="areas">
      ${e.areas.map(
        (area) => html`
      <article class="area" id="area-${area.id}" aria-labelledby="area-${area.id}-h">
        <h3 id="area-${area.id}-h">${t(area.title, lang)}</h3>
        <p>${md(t(area.text, lang))}</p>
        <dl class="tools">
          ${area.production.length ? html`<div><dt>${ui.inProduction}</dt><dd>${chips(area.production, true)}</dd></div>` : ''}
          ${area.other?.length ? html`<div><dt>${ui.alsoUsed}</dt><dd>${chips(area.other, false)}</dd></div>` : ''}
        </dl>
      </article>`,
      )}
    </div>
    ${
      e.also?.length
        ? html`<dl class="also">${e.also.map((g) => html`<div><dt>${t(g.label, lang)}</dt><dd>${g.items.join(', ')}</dd></div>`)}</dl>`
        : ''
    }
  </div>
</section>`;
}

function experience(ctx) {
  const { profile, lang, ui } = ctx;
  const x = profile.experience;
  return html`
<section class="section" id="experience" aria-labelledby="experience-h">
  <div class="container">
    <header class="section-head">
      ${cmd('git log --oneline career')}
      <h2 class="section-title" id="experience-h">${t(x.heading, lang)}</h2>
    </header>
    <ol class="timeline">
      ${x.items.map(
        (job) => html`
      <li class="job${job.end === 'present' ? ' is-current' : ''}" id="job-${job.id}">
        <div class="job-when">
          <p class="job-dates">${fmtPeriod(job, ui)}</p>
          ${job.place ? html`<p class="job-place">${t(job.place, lang)}</p>` : ''}
        </div>
        <div class="job-body">
          <h3 class="job-role">${t(job.role, lang)}</h3>
          <p class="job-org">${job.org}</p>
          ${job.tags?.length ? html`<ul class="tags">${job.tags.map((tag) => html`<li>${t(tag, lang)}</li>`)}</ul>` : ''}
          ${
            job.highlights.length > 1
              ? html`<ul class="bullets">${job.highlights.map((h) => html`<li>${md(t(h, lang))}</li>`)}</ul>`
              : html`<p class="job-text">${md(t(job.highlights[0], lang))}</p>`
          }
        </div>
      </li>`,
      )}
    </ol>
  </div>
</section>`;
}

export function bibtex(paper) {
  const tex = (s) => s.replace('ï', '{\\"i}');
  const authors = paper.authors
    .map((a) => {
      const parts = a.split(' ');
      const last = parts.pop();
      return `${tex(last)}, ${tex(parts.join(' '))}`;
    })
    .join(' and ');
  return [
    `@inproceedings{${paper.bibtex_key},`,
    `  author    = {${authors}},`,
    `  title     = {${paper.title.replace(/&/g, '\\&')}},`,
    `  booktitle = {${paper.venue}},`,
    `  year      = {${paper.year}},`,
    paper.pages ? `  pages     = {${paper.pages.replace('–', '--')}},` : null,
    '  address   = {Milan, Italy},',
    '  publisher = {IEEE},',
    `  doi       = {${paper.doi}}`,
    '}',
  ]
    .filter(Boolean)
    .join('\n');
}

function research(ctx) {
  const { profile, lang, ui } = ctx;
  const r = profile.research;
  const paper = r.paper;
  const bib = bibtex(paper);
  const fig = r.figure;
  const tone = { flat: 'is-bad', network: 'is-warn', mesh: 'is-good' };
  return html`
<section class="section band" id="research" aria-labelledby="research-h">
  <div class="container">
    <header class="section-head">
      ${cmd('cat research/ieee-wcnc-2025.md')}
      <h2 class="section-title" id="research-h">${t(r.heading, lang)}</h2>
      ${r.intro ? html`<p class="lede">${t(r.intro, lang)}</p>` : ''}
    </header>
    <div class="research-grid">
      <article class="paper" aria-labelledby="paper-h">
        <p class="paper-venue"><span class="venue">${paper.short_venue}</span><span>${t(paper.location, lang)}, ${t(paper.dates, lang)}</span></p>
        <h3 class="paper-title" id="paper-h">${paper.title}</h3>
        <p class="paper-authors"><span class="sr-only">${ui.authors}: </span>${paper.authors.map(
          (a, i) => html`${i ? ', ' : ''}${a === profile.person.name ? html`<strong>${a}</strong>` : a}`,
        )}</p>
        <ul class="bullets">${paper.summary.map((s) => html`<li>${md(t(s, lang))}</li>`)}</ul>
        <div class="actions">
          <a class="btn btn-primary" href="${paper.open_access}" rel="noopener">${icon.doc}<span>${ui.readPaper}</span><span class="btn-meta">${ui.openAccess}</span></a>
          <a class="btn btn-secondary" href="https://doi.org/${paper.doi}" rel="noopener"><span>DOI ${paper.doi}</span>${icon.external}</a>
        </div>
        <details class="bibtex">
          <summary>${ui.citation}</summary>
          <pre tabindex="0"><code>${bib}</code></pre>
          <button type="button" class="copy-btn" data-copy="${bib}">${ui.copyBibtex}</button>
        </details>
        ${paper.funding ? html`<p class="fineprint">${t(paper.funding, lang)}</p>` : ''}
      </article>
      <aside class="aside-card thesis" aria-labelledby="thesis-h">
        <p class="aside-label">${ui.thesis}, ${r.thesis.institution}, ${r.thesis.year}</p>
        <h3 id="thesis-h"><cite>${r.thesis.title}</cite></h3>
        <p>${t(r.thesis.text, lang)}</p>
      </aside>
    </div>
    <figure class="figure" id="figure" aria-labelledby="figure-h">
      <figcaption class="figure-head">
        <h3 id="figure-h">${t(fig.title, lang)}</h3>
        <p>${t(fig.caption, lang)}</p>
      </figcaption>
      <ol class="panels">
        ${fig.panels.map(
          (panel, i) => html`
        <li class="panel" data-panel="${panel.id}">
          <h4 class="panel-title"><span class="panel-step"><span class="sr-only">${ui.figure.step} </span>${i + 1}</span>${t(panel.title, lang)}</h4>
          ${panelSvg(panel.id, ui.figure)}
          <p class="panel-text">${t(panel.text, lang)}</p>
          <p class="outcome ${tone[panel.id]}">${ui.figure.outcome[panel.id]}</p>
        </li>`,
        )}
      </ol>
      <ul class="legend">
        ${['allowed', 'attack', 'blocked', 'mtls'].map((k) => html`<li>${legendSwatch[k]}<span>${ui.figure.legend[k]}</span></li>`)}
      </ul>
    </figure>
  </div>
</section>`;
}

function projects(ctx) {
  const { profile, lang, ui, build } = ctx;
  const pr = profile.projects;
  const repo = `https://github.com/${build.repository}`;
  const ci = ['lint', 'build', 'test', 'lighthouse', 'audit', 'deploy'];
  const side = ['image', 'zero-trust', 'codeql'];
  const stage = (key) => html`
            <li class="stage" data-stage="${key}" data-state="unknown">
              <span class="stage-dot" aria-hidden="true"></span>
              <span class="stage-name">${ui.stages[key]}</span>
              <span class="stage-hint">${ui.stageHints[key]}</span>
              <span class="stage-state" data-stage-state>${ui.client.pipe.unknown}</span>
            </li>`;
  return html`
<section class="section" id="projects" aria-labelledby="projects-h">
  <div class="container">
    <header class="section-head">
      ${cmd('ls -l ~/projects')}
      <h2 class="section-title" id="projects-h">${t(pr.heading, lang)}</h2>
      ${pr.intro ? html`<p class="lede">${t(pr.intro, lang)}</p>` : ''}
    </header>
    <article class="featured" aria-labelledby="featured-h">
      <div class="featured-text">
        <p class="featured-label">${ui.featured}</p>
        <h3 id="featured-h">${t(pr.featured.title, lang)}</h3>
        <p>${md(t(pr.featured.text, lang))}</p>
        <ul class="tag-list">${pr.featured.tags.map((tag) => html`<li>${tag}</li>`)}</ul>
        <div class="actions">
          <a class="btn btn-secondary" href="${repo}" rel="noopener">${icon.code}<span>${ui.viewSource}</span></a>
          <a class="btn btn-ghost" href="${repo}/actions" rel="noopener">${icon.pipeline}<span>${ui.viewPipeline}</span>${icon.external}</a>
        </div>
      </div>
      <div class="pipeline" data-pipeline data-repo="${build.repository}">
        <p class="pipeline-title">${ui.pipelineLabel}</p>
        <ol class="stages">${ci.map(stage)}</ol>
        <ol class="stages stages-side">${side.map(stage)}</ol>
        <p class="pipeline-run" data-pipe-run aria-live="polite">${ui.client.pipe.checking}</p>
      </div>
    </article>
    <ul class="project-grid">
      ${pr.items.map(
        (p) => html`
      <li class="project" id="project-${p.id}">
        <p class="project-year">${p.year}</p>
        <h3>${p.link ? html`<a href="${p.link}" rel="noopener">${t(p.title, lang)}</a>` : t(p.title, lang)}</h3>
        <p>${md(t(p.text, lang))}</p>
        <ul class="tag-list">${p.tags.map((tag) => html`<li>${tag}</li>`)}</ul>
      </li>`,
      )}
    </ul>
  </div>
</section>`;
}

function education(ctx) {
  const { profile, lang, ui } = ctx;
  const ed = profile.education;
  const c = profile.credentials;
  const cred = (item) => html`
          <li id="cred-${item.id}">
            <span class="cred-name">${t(item.name, lang)}</span>
            <span class="cred-meta">${item.issuer}, <time datetime="${String(item.date)}">${fmtMonth(item.date, ui)}</time></span>
          </li>`;
  return html`
<section class="section band" id="education" aria-labelledby="education-h">
  <div class="container edu-grid">
    <div>
      ${cmd('cat education.txt')}
      <h2 class="section-title" id="education-h">${t(ed.heading, lang)}</h2>
      <ol class="edu-list">
        ${ed.items.map(
          (item) => html`
        <li id="edu-${item.id}">
          <p class="edu-dates"><time datetime="${String(item.start)}">${item.start}</time> – <time datetime="${String(item.end)}">${item.end}</time></p>
          <h3>${t(item.degree, lang)}</h3>
          <p class="edu-school"><abbr title="${t(ed.school_name, lang)}">${item.school}</abbr>, ${t(ed.school_name, lang).split(', ').pop()}</p>
          <p>${md(t(item.text, lang))}</p>
        </li>`,
        )}
      </ol>
    </div>
    <div class="creds">
      <h2 class="section-title" id="certifications-h">${t(c.certifications_heading, lang)}</h2>
      <ul class="cred-list" aria-labelledby="certifications-h">${c.certifications.map(cred)}</ul>
      <h2 class="section-title" id="awards-h">${t(c.awards_heading, lang)}</h2>
      <ul class="cred-list" aria-labelledby="awards-h">${c.awards.map(cred)}</ul>
    </div>
  </div>
</section>`;
}

function writing(ctx) {
  const { profile, lang, ui } = ctx;
  if (!ctx.posts.length) return '';
  const b = profile.blog;
  return html`
<section class="section" id="writing" aria-labelledby="writing-h">
  <div class="container">
    <header class="section-head section-head-split">
      <div>
        ${cmd('ls -t ~/blog | head -3')}
      <h2 class="section-title" id="writing-h">${t(b.heading, lang)}</h2>
        ${b.intro ? html`<p class="lede">${t(b.intro, lang)}</p>` : ''}
      </div>
      <a class="btn btn-secondary" href="${blogHref(ctx)}"><span>${ui.blog.viewAll}</span>${icon.arrowRight}</a>
    </header>
    <ul class="post-grid post-grid-home">
      ${ctx.posts.slice(0, 3).map((post) => postCard(ctx, post, { uid: `h-${post.slug}` }))}
    </ul>
    ${lang !== 'en' ? html`<p class="lang-note">${ui.blog.inEnglish}</p>` : ''}
  </div>
</section>`;
}

function contact(ctx) {
  const { profile, lang, ui, resumeHref } = ctx;
  const p = profile.person;
  const phone =
    !p.phone || p.phone_display === 'hidden'
      ? ''
      : p.phone_display === 'visible'
        ? html`<div><dt>${ui.phone}</dt><dd><a href="tel:${p.phone.replace(/\s+/g, '')}">${p.phone}</a></dd></div>`
        : html`<div><dt>${ui.phone}</dt><dd><button type="button" class="link-btn" data-reveal-phone="${Buffer.from(p.phone).toString('base64')}">${ui.showPhone}</button></dd></div>`;
  return html`
<section class="section contact" id="contact" aria-labelledby="contact-h">
  <div class="container">
    <div class="contact-box">
      <div class="contact-main">
        ${cmd('./contact.sh')}
      <h2 class="section-title" id="contact-h">${t(profile.contact.heading, lang)}</h2>
        <p class="lede">${t(profile.contact.text, lang)}</p>
        <p class="contact-email"><a href="mailto:${p.email}">${p.email}</a><button type="button" class="copy-btn" data-copy="${p.email}" aria-label="${ui.copyEmail}">${icon.copy}<span>${ui.copy}</span></button></p>
        <div class="actions">
          <a class="btn btn-primary" href="${resumeHref}" download>${icon.download}<span>${ui.downloadCv}</span></a>
          <a class="btn btn-secondary" href="${p.links.linkedin}" rel="me noopener"><span>LinkedIn</span>${icon.external}</a>
          <a class="btn btn-secondary" href="${p.links.github}" rel="me noopener"><span>GitHub</span>${icon.external}</a>
        </div>
      </div>
      <dl class="contact-details">
        <div><dt>${ui.email}</dt><dd><a href="mailto:${p.email}">${p.email}</a></dd></div>
        ${phone}
        <div><dt>${ui.location}</dt><dd>${t(p.location, lang)}</dd></div>
        <div><dt>${ui.languages}</dt><dd>${languagesLine(profile, lang)}</dd></div>
      </dl>
    </div>
  </div>
</section>`;
}

export function homeBody(ctx) {
  return [hero, shipSection, about, expertise, experience, research, projects, education, writing, contact].map((fn) => String(fn(ctx))).join('\n');
}

export function personJsonLd(ctx) {
  const { profile, lang, build } = ctx;
  const p = profile.person;
  const paper = profile.research.paper;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${build.siteUrl}#person`,
        name: p.name,
        givenName: p.given_name,
        familyName: p.family_name,
        jobTitle: t(p.role, lang),
        description: t(p.headline, lang),
        worksFor: { '@type': 'Organization', name: p.employer },
        address: { '@type': 'PostalAddress', addressLocality: { fr: 'Alger', ar: 'الجزائر' }[lang] ?? 'Algiers', addressCountry: 'DZ' },
        email: `mailto:${p.email}`,
        url: build.siteUrl,
        sameAs: [p.links.github, p.links.linkedin],
        alumniOf: { '@type': 'CollegeOrUniversity', name: t(profile.education.school_name, 'en').split(',')[0] },
        knowsAbout: profile.expertise.areas.flatMap((a) => a.production),
        knowsLanguage: ['ar', 'fr', 'en'],
      },
      {
        '@type': 'ScholarlyArticle',
        headline: paper.title,
        author: paper.authors.map((name) => (name === p.name ? { '@id': `${build.siteUrl}#person` } : { '@type': 'Person', name })),
        datePublished: `${paper.year}`,
        isPartOf: { '@type': 'PublicationEvent', name: paper.venue },
        sameAs: `https://doi.org/${paper.doi}`,
        url: paper.open_access,
      },
    ],
  };
}

export { monogram, raw };
