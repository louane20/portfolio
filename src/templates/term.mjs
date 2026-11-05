// "~/shell": an interactive terminal on the home page. Visitors type commands (help, whoami,
// skills, experience, projects, blog, contact, cv, sudo hire-me...) and get answers built from
// content/profile.yaml. Without JavaScript the section shows a recorded session instead.
import { html, raw, t, cmd } from './common.mjs';
import { plain } from '../../scripts/lib/html.mjs';

const fmtDate = (v) => String(v);

/** Everything the client-side terminal can print, in the page language. */
export function termData(ctx) {
  const { profile, lang, ui, root, posts } = ctx;
  const p = profile.person;
  return {
    prompt: 'nawal@guerd:~$',
    name: p.name,
    role: t(p.role, lang),
    employer: p.employer,
    location: t(p.location, lang),
    headline: plain(t(p.headline, lang)),
    email: p.email,
    linkedin: p.links.linkedin,
    github: p.links.github,
    resume: ctx.resumeHref,
    glance: [
      ...profile.glance.map((g) => [t(g.label, lang), plain(t(g.value, lang))]),
      [ui.location, t(p.location, lang)],
      [ui.languages, profile.person.languages.map((l) => t(l.name, lang)).join(', ')],
    ],
    skills: profile.expertise.areas.map((a) => ({ title: t(a.title, lang), tools: a.production, other: a.other ?? [] })),
    experience: profile.experience.items.map((j) => ({
      when: j.end ? `${fmtDate(j.start)} → ${j.end === 'present' ? ui.present : fmtDate(j.end)}` : fmtDate(j.start),
      role: t(j.role, lang),
      org: j.org,
    })),
    projects: [t(profile.projects.featured.title, lang), ...profile.projects.items.map((x) => t(x.title, lang))],
    paper: { title: profile.research.paper.title, venue: profile.research.paper.short_venue, doi: profile.research.paper.doi, url: profile.research.paper.open_access },
    about: profile.about.paragraphs.map((x) => plain(t(x, lang))),
    posts: posts.map((x) => ({ title: x.title, href: `${root}blog/${x.slug}/`, date: x.date })),
    ui: ui.term,
  };
}

const line = (s, cls = '') => html`<span class="t-line${cls ? ` ${cls}` : ''}">${s}</span>`;

/** The section, with a recorded `help` and `whoami` session as the no-JavaScript fallback. */
export function termSection(ctx) {
  const { ui } = ctx;
  const d = termData(ctx);
  const prompt = (c) => html`<span class="t-line t-cmd"><span class="t-ps">${d.prompt}</span> ${c}</span>`;
  return html`
<section class="section term-section" id="shell" aria-labelledby="shell-h">
  <div class="container">
    <header class="section-head">
      ${cmd('ssh visitor@nawal-guerd')}
      <h2 class="section-title" id="shell-h">${ui.term.title}</h2>
      <p class="lede">${ui.term.lede}</p>
    </header>
    <div class="term" data-term>
      <div class="win-bar" aria-hidden="true" dir="ltr"><span class="win-dots"><i></i><i></i><i></i></span><span class="win-title">visitor@nawal-guerd: ~ — bash</span></div>
      <div class="term-screen" dir="ltr" tabindex="0" data-term-screen>
        <div class="term-out" data-term-out aria-live="polite">
          ${line(ui.term.motd, 't-dim')}
          ${prompt('help')}
          ${ui.term.commands.map(([c, desc]) => html`<span class="t-line"><span class="t-key">${c.padEnd(14, ' ')}</span>${desc}</span>`)}
          ${prompt('whoami')}
          ${line(`${d.name}: ${d.role}, ${d.employer}. ${d.location}.`)}
        </div>
        <form class="term-form" data-term-form hidden>
          <label class="t-ps" for="term-input">${d.prompt}</label>
          <input type="text" id="term-input" class="term-input" name="command" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" aria-describedby="term-hint">
          <button type="submit" class="sr-only">${ui.term.run}</button>
        </form>
      </div>
      <p class="term-hint" id="term-hint">${ui.term.hint}</p>
    </div>
  </div>
</section>
<script type="application/json" id="term-data">${raw(JSON.stringify(d).replace(/</g, '\\u003c'))}</script>`;
}
