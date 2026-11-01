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
    name: 'NAME', synopsis: 'SYNOPSIS', description: 'DESCRIPTION', options: 'OPTIONS', history: 'HISTORY',
    research: 'RESEARCH', examples: 'EXAMPLES', files: 'FILES', environment: 'ENVIRONMENT', exit: 'EXIT STATUS',
    notes: 'NOTES', bugs: 'BUGS', author: 'AUTHOR', seeAlso: 'SEE ALSO',
    present: 'present', thesis: 'Thesis', reportBugs: 'Report bugs, job offers and pull requests to',
    exit0: 'Every check passed and the commit was deployed.',
    exit1: 'A check failed, so nothing was deployed.',
    notesText: 'Field notes are published at',
    web: 'The web version of this page, with a live Zero Trust simulator, is at',
  },
  fr: {
    name: 'NOM', synopsis: 'SYNOPSIS', description: 'DESCRIPTION', options: 'OPTIONS', history: 'HISTORIQUE',
    research: 'RECHERCHE', examples: 'EXEMPLES', files: 'FICHIERS', environment: 'ENVIRONNEMENT', exit: 'CODE DE RETOUR',
    notes: 'NOTES', bugs: 'BOGUES', author: 'AUTEUR', seeAlso: 'VOIR AUSSI',
    present: 'aujourd\u2019hui', thesis: 'M\u00E9moire', reportBugs: 'Signalez bugs, offres d\u2019emploi et pull requests \u00E0',
    exit0: 'Toutes les v\u00E9rifications sont pass\u00E9es et le commit a \u00E9t\u00E9 d\u00E9ploy\u00E9.',
    exit1: 'Une v\u00E9rification a \u00E9chou\u00E9, rien n\u2019a \u00E9t\u00E9 d\u00E9ploy\u00E9.',
    notesText: 'Les notes de terrain sont publi\u00E9es sur',
    web: 'La version web de cette page, avec un simulateur Zero Trust interactif, se trouve sur',
  },
};

const period = (item, s) => {
  const start = String(item.start);
  if (!item.end) return start;
  return `${start} \u2013 ${item.end === 'present' ? s.present : String(item.end)}`;
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
    `.TH ${cmd.toUpperCase()} ${profile.site.section} ${date} "${roffText(`portfolio ${version}`)}" "${roffText(t(profile.site.manual, lang))}"`,
    `.SH ${s.name}`,
    `${cmd} \\- ${roffText(`${p.name}, ${t(p.role, lang).toLowerCase()}`)}`,
    `.SH ${s.synopsis}`,
    `.B ${cmd}`,
  );
  const skills = new Map(profile.skills.items.map((i) => [i.id, i]));
  for (const id of profile.hero.synopsis) line(`.RB [ ${roffText(skills.get(id).long)} ]`);
  line(`.IR ${roffText(profile.hero.argument)} \\&...`);

  line(`.SH ${s.description}`, inline(t(profile.hero.tagline, lang)));
  for (const para of profile.about.paragraphs) line('.PP', inline(t(para, lang)));

  line(`.SH ${s.options}`);
  for (const opt of profile.skills.items) {
    const flags = [opt.short, opt.long].filter(Boolean).map((f) => `\\fB${roffText(f)}\\fR`).join(', ');
    line('.TP', `${flags} \\fI${roffText(opt.args.join(','))}\\fR`, inline(t(opt.text, lang)));
  }

  line(`.SH ${s.history}`);
  for (const item of profile.experience.items) {
    line(
      '.TP',
      `.B ${roffText(period(item, s))}`,
      `\\fB${roffText(t(item.title, lang))}\\fR, ${roffText(item.org)}${item.place ? `, ${roffText(t(item.place, lang))}` : ''}`,
    );
    for (const d of item.details ?? []) line('.RS', '.IP \\(bu 2', inline(t(d, lang)), '.RE');
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

  line(`.SH ${s.examples}`);
  profile.projects.items.forEach((ex, i) => {
    if (i > 0) line('.PP');
    line(`.B "${roffText(`$ ${ex.command}`)}"`, '.RS 4', `\\fB${roffText(t(ex.title, lang))}\\fR (${ex.year}). ${inline(t(ex.text, lang))}`, '.RE');
  });

  line(`.SH ${s.files}`, '.TP', `.I ~/${roffText(profile.site.resume)}`, roffText(siteUrl + profile.site.resume));
  for (const f of [...profile.credentials.certifications, ...profile.credentials.awards]) {
    line('.TP', `.I ${roffText(f.path)}`, `${roffText(t(f.name, lang))}, ${roffText(f.issuer)}, ${roffText(String(f.date))}.`);
  }

  line(`.SH ${s.environment}`);
  for (const env of profile.about.environment) line('.TP', `.B ${env.key}`, roffText(t(env.value, lang)));

  line(`.SH ${s.exit}`, '.TP', '.B 0', roffText(s.exit0), '.TP', '.B 1', roffText(s.exit1));

  line(`.SH ${s.notes}`, `${roffText(s.notesText)} ${roffText(`${siteUrl}notes/`)}`);
  for (const n of notes) line('.IP \\(bu 2', `${roffText(n.title)} (${n.date})`);
  line('.PP', `${roffText(s.web)} ${roffText(lang === 'fr' ? `${siteUrl}fr/` : siteUrl)}`);

  line(`.SH ${s.bugs}`);
  for (const bug of profile.bugs) line('.IP \\(bu 2', inline(t(bug, lang)));
  line('.PP', `${roffText(s.reportBugs)} \\fI${roffText(p.email)}\\fR.`);

  line(
    `.SH ${s.author}`,
    `${roffText(p.name)} <${roffText(p.email)}>`,
    '.br',
    roffText(p.links.github),
    '.br',
    roffText(p.links.linkedin),
    `.SH ${s.seeAlso}`,
    profile.see_also.items.map((x, i, all) => `.BR ${x.name} (${x.section})${i < all.length - 1 ? ',' : ''}`).join('\n'),
  );
  return `${out.join('\n')}\n`;
}
