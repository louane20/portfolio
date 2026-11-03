// Renders the profile as a real man(7) page, so that
//   curl -sL https://louane20.github.io/portfolio/guerd.1 | man -l -
// shows the same manual in a terminal. Linted in CI with `mandoc -T lint`.
import { t } from './content.mjs';

const NAMED = {
  '\u2014': '\\(em',
  '\u2013': '\\(en',
  '\u2018': '\\(oq',
  '\u2019': '\\(cq',
  '\u201C': '\\(lq',
  '\u201D': '\\(rq',
  '\u00AB': '\\(Fo',
  '\u00BB': '\\(Fc',
  '\u00A0': '\\~',
  '\u2026': '.\\|.\\|.',
  '\u00D7': '\\(mu',
};

/** Escape text for roff: backslashes, leading control characters, non-ASCII. */
export function roffText(text) {
  let out = String(text).replace(/\\/g, '\\e').replace(/-/g, '\\-');
  out = out.replace(/[^\x20-\x7E]/gu, (ch) => NAMED[ch] ?? `\\[u${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}]`);
  return out
    .split('\n')
    .map((line) => (/^[.']/.test(line) ? `\\&${line}` : line))
    .join('\n');
}

/** Inline markdown (**bold**, *italic*, `code`, [text](url)) to roff font escapes. */
function inline(text) {
  const src = String(text).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  let out = '';
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    out += roffText(src.slice(last, m.index));
    if (m[1] !== undefined) out += `\\fB${roffText(m[1])}\\fR`;
    else if (m[2] !== undefined) out += `\\fI${roffText(m[2])}\\fR`;
    else out += `\\fB${roffText(m[3])}\\fR`;
    last = re.lastIndex;
  }
  return out + roffText(src.slice(last));
}

const SECTIONS = {
  en: {
    name: 'NAME', synopsis: 'SYNOPSIS', description: 'DESCRIPTION', options: 'EXPERTISE', experience: 'EXPERIENCE',
    education: 'EDUCATION', research: 'RESEARCH', projects: 'PROJECTS', certifications: 'CERTIFICATIONS',
    awards: 'AWARDS', languages: 'LANGUAGES', author: 'AUTHOR', seeAlso: 'SEE ALSO',
    present: 'present', thesis: 'Thesis', production: 'In production', also: 'Also',
    web: 'The web version, with diagrams and the live pipeline status, is at',
    notes: 'Articles',
  },
  fr: {
    name: 'NOM', synopsis: 'SYNOPSIS', description: 'DESCRIPTION', options: 'EXPERTISE', experience: 'EXPÉRIENCE',
    education: 'FORMATION', research: 'RECHERCHE', projects: 'PROJETS', certifications: 'CERTIFICATIONS',
    awards: 'DISTINCTIONS', languages: 'LANGUES', author: 'AUTEUR', seeAlso: 'VOIR AUSSI',
    present: 'aujourd’hui', thesis: 'Mémoire', production: 'En production', also: 'Également',
    web: 'La version web, avec les schémas et le statut du pipeline en direct, se trouve sur',
    notes: 'Articles',
  },
};

const period = (item, s) => {
  const start = String(item.start);
  if (!item.end) return start;
  return `${start} – ${item.end === 'present' ? s.present : String(item.end)}`;
};

export function renderManPage(profile, lang, { date, version, siteUrl, notes }) {
  const s = SECTIONS[lang];
  const p = profile.person;
  const cmd = profile.site.command;
  const out = [];
  const line = (...l) => out.push(...l);

  line(
    `.\\" Generated from content/profile.yaml by scripts/build.mjs. Do not edit by hand.`,
    `.\\" Read it with: man -l ${cmd}.1`,
    `.TH ${cmd.toUpperCase()} 1 ${date} "${roffText(`portfolio ${version}`)}" "${roffText(`${p.name}, ${t(p.role, lang)}`)}"`,
    `.SH ${s.name}`,
    `${cmd} \\- ${roffText(`${p.name}, ${t(p.role, lang)}`)}`,
    `.SH ${s.synopsis}`,
    `.B ${cmd}`,
  );
  for (const area of profile.expertise.areas) line(`.RB [ \\-\\-${roffText(area.id)} ]`);
  line('.I platform');

  line(`.SH ${s.description}`, inline(t(p.headline, lang)));
  for (const para of profile.about.paragraphs) line('.PP', inline(t(para, lang)));

  line(`.SH ${s.options}`);
  for (const area of profile.expertise.areas) {
    line('.TP', `\\fB\\-\\-${roffText(area.id)}\\fR`, `\\fB${roffText(t(area.title, lang))}.\\fR ${inline(t(area.text, lang))}`);
    if (area.production.length) line('.br', `${roffText(s.production)}: ${roffText(area.production.join(', '))}.`);
    if (area.other?.length) line('.br', `${roffText(s.also)}: ${roffText(area.other.join(', '))}.`);
  }

  line(`.SH ${s.experience}`);
  for (const job of profile.experience.items) {
    line(
      '.TP',
      `.B ${roffText(period(job, s))}`,
      `\\fB${roffText(t(job.role, lang))}\\fR, ${roffText(job.org)}${job.place ? `, ${roffText(t(job.place, lang))}` : ''}`,
    );
    for (const h of job.highlights) line('.RS', '.IP \\(bu 2', inline(t(h, lang)), '.RE');
  }

  line(`.SH ${s.education}`);
  for (const ed of profile.education.items) {
    line('.TP', `.B ${roffText(`${ed.start} – ${ed.end}`)}`, `\\fB${roffText(t(ed.degree, lang))}\\fR, ${roffText(ed.school)}`, inline(t(ed.text, lang)));
  }

  const paper = profile.research.paper;
  line(
    `.SH ${s.research}`,
    `${roffText(paper.authors.join(', '))}.`,
    `\\fI${roffText(paper.title)}\\fR.`,
    `${roffText(paper.venue)}, ${roffText(t(paper.location, lang))}, ${roffText(t(paper.dates, lang))}${paper.pages ? `, pp.\\~${roffText(paper.pages)}` : ''}.`,
    `doi:${roffText(paper.doi)}`,
  );
  for (const point of paper.summary) line('.IP \\(bu 2', inline(t(point, lang)));
  line('.PP', `${s.thesis}: \\fI${roffText(profile.research.thesis.title)}\\fR (${roffText(profile.research.thesis.institution)}, ${profile.research.thesis.year}).`);

  line(`.SH ${s.projects}`);
  const featured = profile.projects.featured;
  line('.TP', `.B ${roffText(t(featured.title, lang))}`, inline(t(featured.text, lang)));
  for (const pr of profile.projects.items) line('.TP', `.B ${roffText(`${t(pr.title, lang)} (${pr.year})`)}`, inline(t(pr.text, lang)));

  line(`.SH ${s.certifications}`);
  for (const c of profile.credentials.certifications) line('.IP \\(bu 2', `${roffText(t(c.name, lang))}, ${roffText(c.issuer)}, ${roffText(String(c.date))}.`);
  line(`.SH ${s.awards}`);
  for (const a of profile.credentials.awards) line('.IP \\(bu 2', `${roffText(t(a.name, lang))}, ${roffText(a.issuer)}, ${roffText(String(a.date))}.`);

  line(`.SH ${s.languages}`, roffText(p.languages.map((l) => `${t(l.name, lang)} (${t(l.level, lang)})`).join(', ')) + '.');

  line(
    `.SH ${s.author}`,
    `${roffText(p.name)} <${roffText(p.email)}>`,
    '.br',
    roffText(p.links.linkedin),
    '.br',
    roffText(p.links.github),
    `.SH ${s.seeAlso}`,
    `${roffText(s.web)} ${roffText(lang === 'fr' ? `${siteUrl}fr/` : siteUrl)}`,
  );
  if (notes.length) {
    line('.PP', `${roffText(s.notes)}: ${roffText(`${siteUrl}${lang === 'fr' ? 'fr/' : ''}blog/`)}`);
    for (const n of notes) line('.IP \\(bu 2', `${roffText(n.title)} (${n.date})`);
  }
  return `${out.join('\n')}\n`;
}
