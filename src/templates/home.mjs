// The manual itself: every section of the home page, in man page order.
import { html, raw, md, t, fmtMonth, fmtPeriod, fmtDay, gutter, icon } from './common.mjs';
import { layoutGraph, commitHash } from '../../scripts/lib/gitgraph.mjs';
import { SCENARIOS, MODES, VIEWBOX, svgMarkup, policyYaml, tally } from '../scripts/zt-model.js';

const LANE_GAP = 16;

/** id -> { href, label } for every piece of evidence a skill can cite. */
function evidenceIndex(profile, lang) {
  const map = new Map();
  for (const item of profile.experience.items) {
    const label = item.id === 'wcnc-2025' ? profile.research.paper.short_venue : item.org === 'USTHB' ? `${t(item.title, lang)}, USTHB` : item.org;
    map.set(item.id, { href: item.id === 'wcnc-2025' ? '#research' : `#exp-${item.id}`, label });
  }
  for (const item of profile.projects.items) map.set(item.id, { href: `#ex-${item.id}`, label: t(item.title, lang) });
  for (const item of [...profile.credentials.certifications, ...profile.credentials.awards]) {
    map.set(item.id, { href: `#file-${item.id}`, label: t(item.name, lang) });
  }
  return map;
}

function hero(ctx) {
  const { profile, lang, ui, root } = ctx;
  const p = profile.person;
  const skills = new Map(profile.skills.items.map((s) => [s.id, s]));
  const zt = ui.zt;
  const scenario = SCENARIOS.platform;
  const mode = 'flat';
  const counts = tally(scenario, mode);
  const labels = { outside: zt.outside, identity: zt.identity, compromised: zt.compromised, compromisedShort: zt.compromisedShort };
  return html`
<section class="hero" id="top" aria-labelledby="name-h">
  <div class="hero-text">
    <div class="row">
      ${gutter(ui.man.name)}
      <div class="row-body">
        <h1 id="name-h" class="name"><span class="name-full">${p.name}</span> <span class="name-role">— ${t(p.role, lang)}</span></h1>
        <p class="tagline">${t(profile.hero.tagline, lang)}</p>
      </div>
    </div>
    <div class="row">
      ${gutter(ui.man.synopsis)}
      <div class="row-body">
        <p class="synopsis"><code><b>${profile.site.command}</b>${profile.hero.synopsis.map(
          (id) => html` <span class="syn-opt">[<a href="#opt-${id}"><b>${skills.get(id).long}</b></a>]</span>`,
        )} <span class="man-arg">${profile.hero.argument}</span> …</code></p>
        <div class="cta">
          <a class="btn btn-primary" href="${root}${profile.site.resume}" download>${icon.arrowDown}<span>${ui.downloadResume}</span> <span class="btn-meta">${ui.pdf}</span></a>
          <a class="btn" href="mailto:${p.email}">${icon.mail}<span>${ui.emailMe}</span></a>
        </div>
        <p class="availability"><span class="led" aria-hidden="true"></span>${t(p.availability, lang)}</p>
      </div>
    </div>
  </div>
  <figure class="zt" id="figure-1" data-zt data-scenario="${scenario.id}" data-mode="${mode}" aria-labelledby="zt-cap">
    <div class="zt-head">
      <p class="zt-title">${zt.title}</p>
      <div class="zt-scenarios" role="group" aria-label="${zt.scenarioLabel}">
        ${Object.keys(SCENARIOS).map(
          (id) => html`<button type="button" data-zt-scenario="${id}" aria-pressed="${id === scenario.id ? 'true' : 'false'}">${zt.scenarios[id]}</button>`,
        )}
      </div>
    </div>
    <div class="zt-modes" role="group" aria-label="${zt.modeLabel}">
      ${MODES.map(
        (m, i) =>
          html`<button type="button" data-zt-mode="${m}" aria-pressed="${m === mode ? 'true' : 'false'}" aria-describedby="zt-hint"><span class="zt-step" aria-hidden="true">${i}</span>${zt.modes[m]}</button>`,
      )}
    </div>
    <p class="zt-hint" id="zt-hint" data-zt-hint>${zt.modeHints[mode]}</p>
    <div class="zt-stage">
      <svg class="zt-svg" viewBox="${VIEWBOX}" role="group" aria-label="${zt.svgLabel}" data-zt-svg>${raw(svgMarkup(scenario, mode, labels))}</svg>
    </div>
    <ul class="zt-stats">
      ${['forwarded', 'dropped', 'denied', 'breach'].map(
        (k) => html`<li data-stat="${k}">${zt.stats[k === 'denied' ? 'l7' : k]} <b data-zt-count="${k}">${counts[k]}</b></li>`,
      )}
      <li class="zt-pause"><button type="button" data-zt-pause aria-pressed="false">${zt.pause}</button></li>
    </ul>
    <div class="zt-log" role="log" aria-label="${zt.logLabel}" data-zt-log tabindex="0"></div>
    <details class="zt-policy" data-zt-policy>
      <summary>${zt.policyFor} <b data-zt-selected>api</b></summary>
      <pre tabindex="0"><code data-zt-yaml>${policyYaml(scenario, 'api', mode, zt.noPolicy)}</code></pre>
    </details>
    <p class="sr-only" aria-live="polite" data-zt-live></p>
    <figcaption id="zt-cap">${zt.caption}</figcaption>
  </figure>
</section>`;
}

function about(ctx) {
  const { profile, lang, ui } = ctx;
  return html`
<section class="sec" id="about" aria-labelledby="about-h">
  ${gutter(ui.sections.about.man)}
  <div class="sec-body sec-split">
    <div class="prose">
      <h2 id="about-h">${t(profile.about.heading, lang)}</h2>
      ${profile.about.paragraphs.map((para) => html`<p>${md(t(para, lang))}</p>`)}
    </div>
    <aside class="env" aria-label="${ui.man.environment}">
      <p class="env-title" aria-hidden="true">${ui.man.environment}</p>
      <dl>${profile.about.environment.map((e) => html`<div><dt>${e.key}</dt><dd>${t(e.value, lang)}</dd></div>`)}</dl>
      <p class="env-interests"><span class="env-key">${ui.interests}</span> ${md(t(profile.interests, lang))}</p>
    </aside>
  </div>
</section>`;
}

function skills(ctx) {
  const { profile, lang, ui } = ctx;
  const evidence = evidenceIndex(profile, lang);
  return html`
<section class="sec" id="skills" aria-labelledby="skills-h">
  ${gutter(ui.sections.skills.man)}
  <div class="sec-body">
    <h2 id="skills-h">${t(profile.skills.heading, lang)}</h2>
    ${profile.skills.intro ? html`<p class="lede">${t(profile.skills.intro, lang)}</p>` : ''}
    <dl class="options">
      ${profile.skills.items.map(
        (opt) => html`
      <div class="opt" id="opt-${opt.id}">
        <dt><code>${opt.short ? html`<b>${opt.short}</b>, ` : ''}<b>${opt.long}</b> <span class="man-arg">${opt.args.join(',')}</span></code></dt>
        <dd>
          <p>${md(t(opt.text, lang))}</p>
          ${
            opt.evidence?.length
              ? html`<p class="evidence"><span>${ui.usedIn}</span> ${opt.evidence.map((id, i) => {
                  const e = evidence.get(id);
                  return html`${i ? ', ' : ''}<a href="${e.href}">${e.label}</a>`;
                })}</p>`
              : ''
          }
        </dd>
      </div>`,
      )}
    </dl>
  </div>
</section>`;
}

function curveSvg(type, lane) {
  const w = lane * LANE_GAP;
  const d = type === 'fork' ? `M${w} 0C${w} 14 0 12 0 26` : `M${w} 26C${w} 12 0 14 0 0`;
  return raw(`<svg class="curve" data-type="${type}" data-lane="${lane}" width="${w}" height="26" viewBox="0 0 ${w} 26" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`);
}

function experience(ctx) {
  const { profile, lang, ui } = ctx;
  const { items, lanes } = profile.experience;
  const rows = layoutGraph(items, lanes);
  const refClass = (ref) => (ref.startsWith('HEAD') ? 'ref-head' : ref.startsWith('tag:') ? 'ref-tag' : 'ref-branch');
  return html`
<section class="sec" id="experience" aria-labelledby="experience-h">
  ${gutter(ui.sections.experience.man)}
  <div class="sec-body">
    <h2 id="experience-h">${t(profile.experience.heading, lang)}</h2>
    <p class="gitlog-cmd" aria-hidden="true"><code>$ git log --graph --decorate --all</code></p>
    <ol class="gitlog" data-lanes="${lanes.length}">
      ${items.map((item, i) => {
        const row = rows[i];
        return html`
      <li class="commit" id="exp-${item.id}" data-lane="${row.lane}">
        <div class="graph" aria-hidden="true">
          ${row.segments.map((s) => html`<span class="seg" data-lane="${s.lane}" data-kind="${s.kind}"></span>`)}
          ${row.curves.map((c) => curveSvg(c.type, c.lane))}
          <span class="dot" data-lane="${row.lane}"${item.refs?.some((r) => r.startsWith('HEAD')) ? raw(' data-head="true"') : ''}></span>
        </div>
        <div class="commit-body">
          <p class="commit-meta"><code class="hash">${commitHash(item)}</code>${
            item.refs?.length ? html` <span class="refs">(${item.refs.map((r, j) => html`${j ? ', ' : ''}<span class="${refClass(r)}">${r}</span>`)})</span>` : ''
          } <span class="when">${fmtPeriod(item, ui)}${item.place ? html`, ${t(item.place, lang)}` : ''}</span></p>
          <h3 class="commit-title">${t(item.title, lang)}<span class="commit-org">${item.org}</span></h3>
          <p class="commit-subject"><code>${item.commit}</code></p>
          ${
            item.details?.length
              ? item.details.length > 1
                ? html`<details class="commit-details"${item.open ? raw(' open') : ''}><summary>${ui.showDetails} <span class="count">${item.details.length}</span></summary><ul>${item.details.map((d) => html`<li>${md(t(d, lang))}</li>`)}</ul></details>`
                : html`<p class="commit-text">${md(t(item.details[0], lang))}</p>`
              : ''
          }
        </div>
      </li>`;
      })}
    </ol>
  </div>
</section>`;
}

export function bibtex(paper) {
  const authors = paper.authors
    .map((a) => {
      const parts = a.split(' ');
      const last = parts.pop();
      return `${last.replace('ï', '{\\"i}')}, ${parts.join(' ').replace('ï', '{\\"i}')}`;
    })
    .join(' and ');
  return [
    `@inproceedings{${paper.bibtex_key},`,
    `  author    = {${authors}},`,
    `  title     = {${paper.title.replace(/&/g, '\\&')}},`,
    `  booktitle = {${paper.venue}},`,
    `  year      = {${paper.year}},`,
    paper.pages ? `  pages     = {${paper.pages.replace('–', '--')}},` : null,
    `  address   = {Milan, Italy},`,
    `  publisher = {IEEE},`,
    `  doi       = {${paper.doi}}`,
    '}',
  ]
    .filter(Boolean)
    .join('\n');
}

function research(ctx) {
  const { profile, lang, ui } = ctx;
  const paper = profile.research.paper;
  const thesis = profile.research.thesis;
  const bib = bibtex(paper);
  return html`
<section class="sec" id="research" aria-labelledby="research-h">
  ${gutter(ui.sections.research.man)}
  <div class="sec-body">
    <h2 id="research-h">${t(profile.research.heading, lang)}</h2>
    <div class="research">
      <article class="paper">
        <p class="paper-venue"><b>${paper.short_venue}</b> ${t(paper.location, lang)}, ${t(paper.dates, lang)}</p>
        <h3 class="paper-title"><cite>${paper.title}</cite></h3>
        <p class="paper-authors"><span class="sr-only">${ui.paperAuthors}: </span>${paper.authors.map(
          (a, i) => html`${i ? ', ' : ''}${a === profile.person.name ? html`<strong>${a}</strong>` : a}`,
        )}</p>
        <ul class="paper-summary">${paper.summary.map((s) => html`<li>${md(t(s, lang))}</li>`)}</ul>
        <p class="paper-links">
          <a class="btn btn-primary" href="${paper.open_access}" rel="noopener">${ui.readPaper} <span class="btn-meta">${ui.openAccess}, ${paper.open_access_license}</span></a>
          <a class="doi" href="https://doi.org/${paper.doi}" rel="noopener">${ui.doi} ${paper.doi}</a>
        </p>
        <details class="bibtex">
          <summary>BibTeX</summary>
          <pre tabindex="0"><code>${bib}</code></pre>
          <button type="button" class="copy" data-copy="${bib}">${ui.copyBibtex}</button>
        </details>
        ${paper.funding ? html`<p class="paper-funding">${t(paper.funding, lang)}</p>` : ''}
      </article>
      <aside class="thesis" aria-label="${ui.thesis}">
        <p class="thesis-label">${ui.thesis}, ${thesis.institution} ${thesis.year}</p>
        <h3 class="thesis-title"><cite>${thesis.title}</cite></h3>
        <p>${t(thesis.text, lang)}</p>
        <p><a href="#figure-1">${ui.ztLink}</a></p>
      </aside>
    </div>
  </div>
</section>`;
}

function projects(ctx) {
  const { profile, lang, ui, build } = ctx;
  return html`
<section class="sec" id="projects" aria-labelledby="projects-h">
  ${gutter(ui.sections.projects.man)}
  <div class="sec-body">
    <h2 id="projects-h">${t(profile.projects.heading, lang)}</h2>
    <ol class="examples">
      ${profile.projects.items.map((ex) => {
        const href = ex.link === 'repository' ? `https://github.com/${build.repository}` : ex.link;
        return html`
      <li class="example" id="ex-${ex.id}">
        <p class="example-cmd"><code><span class="ps1" aria-hidden="true">$ </span>${ex.command}</code></p>
        <h3 class="example-title">${t(ex.title, lang)} <span class="example-year">${ex.year}</span></h3>
        <p>${md(t(ex.text, lang))}</p>
        <p class="tags">${ex.tags.map((tag) => html`<span>${tag}</span>`)}</p>
        ${href ? html`<p><a href="${href}" rel="noopener">${ui.projectRepo}${icon.external}</a></p>` : ''}
      </li>`;
      })}
    </ol>
  </div>
</section>`;
}

function credentials(ctx) {
  const { profile, lang, ui, root, resumeSize } = ctx;
  const row = (f) => html`
        <tr id="file-${f.id}">
          <th scope="row"><code>${f.path}</code></th>
          <td class="files-name">${t(f.name, lang)}</td>
          <td class="files-issuer">${f.issuer}</td>
          <td class="files-date"><time datetime="${String(f.date)}">${fmtMonth(f.date, ui)}</time></td>
        </tr>`;
  return html`
<section class="sec" id="credentials" aria-labelledby="credentials-h">
  ${gutter(ui.sections.credentials.man)}
  <div class="sec-body">
    <h2 id="credentials-h">${t(profile.credentials.heading, lang)}</h2>
    <p class="resume-file" id="file-resume"><code>~/${profile.site.resume}</code> <span>${ui.resumeFile}</span> <a class="btn" href="${root}${profile.site.resume}" download>${icon.arrowDown}<span>${ui.downloadResume}</span> <span class="btn-meta">${ui.pdf}, ${resumeSize}</span></a></p>
    <table class="files">
      <caption class="sr-only">${ui.certifications}, ${ui.awards}</caption>
      <tbody>
        <tr class="files-group"><th colspan="4" scope="colgroup">${ui.certifications}</th></tr>${profile.credentials.certifications.map(row)}
      </tbody>
      <tbody>
        <tr class="files-group"><th colspan="4" scope="colgroup">${ui.awards}</th></tr>${profile.credentials.awards.map(row)}
      </tbody>
    </table>
  </div>
</section>`;
}

function pipeline(ctx) {
  const { profile, lang, ui, build } = ctx;
  const repo = build.repository;
  const owner = repo.split('/')[0];
  const image = `ghcr.io/${repo.toLowerCase()}`;
  const manUrl = `${build.siteUrl}${lang === 'fr' ? 'fr/' : ''}${profile.site.command}.1`;
  const verify = [
    [
      ui.verifyCosign,
      `cosign verify ${image}:latest \\\n  --certificate-identity "https://github.com/${repo}/.github/workflows/container.yml@refs/heads/main" \\\n  --certificate-oidc-issuer https://token.actions.githubusercontent.com`,
    ],
    [ui.verifyAttest, `gh attestation verify oci://${image}:latest --owner ${owner}`],
    [ui.verifyMan, `curl -sL ${manUrl} | man -l -`],
  ];
  const ci = ['lint', 'build', 'test', 'lighthouse', 'audit', 'deploy'];
  const stage = (key) => html`
        <li class="stage" data-stage="${key}" data-state="unknown"><span class="stage-led" aria-hidden="true"></span><b>${ui.stages[key][0]}</b><span class="stage-desc">${ui.stages[key][1]}</span><span class="stage-state" data-stage-state>${ui.client.pipe.unknown}</span></li>`;
  return html`
<section class="sec" id="pipeline" aria-labelledby="pipeline-h">
  ${gutter(ui.sections.pipeline.man)}
  <div class="sec-body">
    <h2 id="pipeline-h">${t(profile.pipeline.heading, lang)}</h2>
    <p class="lede">${t(profile.pipeline.intro, lang)}</p>
    <dl class="exit-codes">${ui.exitCodes.map(([code, text]) => html`<div><dt><code>${code}</code></dt><dd>${text}</dd></div>`)}</dl>
    <div class="pipe" data-pipeline data-repo="${repo}">
      <p class="pipe-run" data-pipe-run aria-live="polite">${ui.client.pipe.checking}</p>
      <div class="pipe-flow">
        <ol class="pipe-dag" aria-label="ci-cd.yml">
          <li class="pipe-col"><ol>${stage('lint')}</ol></li>
          <li class="pipe-col"><ol>${stage('build')}</ol></li>
          <li class="pipe-col"><ol>${stage('test')}${stage('lighthouse')}${stage('audit')}</ol></li>
          <li class="pipe-col"><ol>${stage('deploy')}</ol></li>
        </ol>
        <ol class="pipe-side" aria-label="container.yml, zero-trust-e2e.yml, codeql.yml">${['image', 'zero-trust', 'codeql'].map(stage)}</ol>
      </div>
      <p class="pipe-links"><a href="https://github.com/${repo}/actions" rel="noopener">github.com/${repo}/actions${icon.external}</a></p>
      <noscript><p>${ui.client.pipe.unavailable}</p></noscript>
    </div>
    <div class="verify">
      <h3>${ui.verifyHeading}</h3>
      <p>${ui.verifyIntro}</p>
      ${verify.map(
        ([label, cmd]) => html`
      <div class="cmd">
        <p class="cmd-label">${label}</p>
        <pre tabindex="0"><code>${cmd}</code></pre>
        <button type="button" class="copy" data-copy="${cmd.replace(/\\\n\s+/g, '')}">${ui.copy}</button>
      </div>`,
      )}
    </div>
    <script type="application/json" id="pipeline-stages">${raw(JSON.stringify({ ci, side: ['image', 'zero-trust', 'codeql'] }))}</script>
  </div>
</section>`;
}

function notes(ctx) {
  const { profile, lang, ui, root } = ctx;
  if (!ctx.notes.length) return '';
  return html`
<section class="sec" id="notes" aria-labelledby="notes-h">
  ${gutter(ui.sections.notes.man)}
  <div class="sec-body">
    <h2 id="notes-h">${t(profile.notes.heading, lang)}</h2>
    <ul class="notes-list">
      ${ctx.notes.map(
        (n) => html`
      <li>
        <p class="note-meta"><span class="note-cat">${n.category}</span> <time datetime="${n.date}">${fmtDay(n.date, ui)}</time>, ${n.minutes} ${ui.minRead}${n.lang !== lang ? html`, <span lang="${n.lang}">${n.lang.toUpperCase()}</span>` : ''}</p>
        <h3 class="note-title"><a href="${root}notes/${n.slug}/" hreflang="${n.lang}">${n.title}</a></h3>
        <p>${n.summary}</p>
      </li>`,
      )}
    </ul>
  </div>
</section>`;
}

function bugs(ctx) {
  const { profile, lang, ui } = ctx;
  return html`
<section class="sec sec-small" id="bugs" aria-labelledby="bugs-h">
  ${gutter(ui.sections.bugs.man)}
  <div class="sec-body">
    <h2 id="bugs-h" class="sr-only">${ui.sections.bugs.label}</h2>
    <ul class="bugs">${profile.bugs.map((b) => html`<li>${md(t(b, lang))}</li>`)}</ul>
    <p>${ui.reportBugs} <a href="mailto:${profile.person.email}">${profile.person.email}</a>.</p>
  </div>
</section>`;
}

function contact(ctx) {
  const { profile, lang, ui, root } = ctx;
  const p = profile.person;
  const phoneDigits = p.phone ? p.phone.replace(/\s+/g, '') : '';
  const phone =
    !p.phone || p.phone_display === 'hidden'
      ? ''
      : p.phone_display === 'visible'
        ? html`<div><dt>${lang === 'fr' ? 'Téléphone' : 'Phone'}</dt><dd><a href="tel:${phoneDigits}">${p.phone}</a></dd></div>`
        : html`<div><dt>${lang === 'fr' ? 'Téléphone' : 'Phone'}</dt><dd><button type="button" class="linkish" data-reveal-phone="${Buffer.from(p.phone).toString('base64')}">${ui.showPhone}</button></dd></div>`;
  return html`
<section class="sec" id="contact" aria-labelledby="contact-h">
  ${gutter(ui.sections.contact.man)}
  <div class="sec-body">
    <h2 id="contact-h">${t(profile.contact.heading, lang)}</h2>
    <p class="lede">${t(profile.contact.text, lang)}</p>
    <p class="mail"><a href="mailto:${p.email}">${p.email}</a> <button type="button" class="copy" data-copy="${p.email}">${ui.copyEmail}</button></p>
    <dl class="contact-list">
      <div><dt>GitHub</dt><dd><a href="${p.links.github}" rel="me noopener">${p.links.github.replace('https://', '')}</a></dd></div>
      <div><dt>LinkedIn</dt><dd><a href="${p.links.linkedin}" rel="me noopener">${p.links.linkedin.replace('https://www.', '')}</a></dd></div>
      ${phone}
      <div><dt>${lang === 'fr' ? 'Lieu' : 'Location'}</dt><dd>${t(p.location, lang)}</dd></div>
      <div><dt>${lang === 'fr' ? 'CV' : 'Résumé'}</dt><dd><a href="${root}${profile.site.resume}" download>${profile.site.resume}</a></dd></div>
    </dl>
  </div>
</section>`;
}

function seeAlso(ctx) {
  const { profile, lang, ui } = ctx;
  return html`
<section class="sec sec-small" id="see-also" aria-labelledby="see-also-h">
  ${gutter(ui.sections['see-also'].man)}
  <div class="sec-body">
    <h2 id="see-also-h" class="sr-only">${ui.sections['see-also'].label}</h2>
    <p>${t(profile.see_also.intro, lang)}</p>
    <p class="see-also">${profile.see_also.items.map(
      (x, i, all) => html`<a href="${x.url}" rel="noopener"><b>${x.name}</b>(${x.section})</a>${i < all.length - 1 ? ', ' : ''}`,
    )}</p>
  </div>
</section>`;
}

export function homeBody(ctx) {
  return [hero, about, skills, experience, research, projects, credentials, pipeline, notes, bugs, contact, seeAlso]
    .map((fn) => String(fn(ctx)))
    .join('\n');
}

export function homeSections(ctx) {
  const { ui, notes: list } = ctx;
  const ids = ['about', 'skills', 'experience', 'research', 'projects', 'credentials', 'pipeline', 'notes', 'bugs', 'contact', 'see-also'];
  return [{ id: 'top', label: ui.man.name, man: ui.man.name }].concat(
    ids.filter((id) => id !== 'notes' || list.length).map((id) => ({ id, label: ui.sections[id].label, man: ui.sections[id].man })),
  );
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
        worksFor: { '@type': 'Organization', name: p.employer },
        address: { '@type': 'PostalAddress', addressLocality: lang === 'fr' ? 'Alger' : 'Algiers', addressCountry: 'DZ' },
        email: `mailto:${p.email}`,
        url: build.siteUrl,
        sameAs: [p.links.github, p.links.linkedin],
        alumniOf: { '@type': 'CollegeOrUniversity', name: 'USTHB, University of Science and Technology Houari Boumediene' },
        knowsAbout: ['Kubernetes', 'GitOps', 'Argo CD', 'Cilium', 'Istio', 'Zero Trust', 'Ansible', 'Prometheus', '5G security'],
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
