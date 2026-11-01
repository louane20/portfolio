// Field note pages (man section 7) and the 404 page ("No manual entry for ...").
import { Marked } from 'marked';
import { html, raw, fmtDay, gutter } from './common.mjs';
import { esc } from '../../scripts/lib/html.mjs';

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function renderMarkdown(source) {
  const toc = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const plainText = text.replace(/<[^>]+>/g, '');
        const id = slugify(plainText);
        if (depth === 2) toc.push({ id, text: plainText });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' rel="noopener"' : ''}>${text}</a>`;
      },
      code({ text, lang }) {
        const language = (lang || '').split(/\s/)[0];
        const cls = language ? ` class="language-${esc(language)}"` : '';
        const label = language ? `<span class="code-lang" aria-hidden="true">${esc(language)}</span>` : '';
        return `<div class="codeblock">${label}<pre tabindex="0"><code${cls}>${esc(text)}</code></pre></div>\n`;
      },
      table(token) {
        // Wrap tables so they can scroll horizontally on small screens.
        const header = token.header.map((cell) => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`).join('');
        const rows = token.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
          .join('');
        return `<div class="table-wrap" tabindex="0"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  return { html: marked.parse(source), toc };
}

export function noteBody(ctx, note) {
  const { ui, root, lang } = ctx;
  const { html: body, toc } = renderMarkdown(note.body);
  const name = note.slug.toUpperCase();
  return html`
<article class="note" lang="${note.lang}">
  <p class="note-runhead" aria-hidden="true"><span>${name}(7)</span><span>Field Notes</span><span>${name}(7)</span></p>
  <header class="sec note-head">
    ${gutter(lang === 'fr' ? 'NOM' : 'NAME')}
    <div class="sec-body">
      <p class="note-meta"><span class="note-cat">${note.category}</span> <time datetime="${note.date}">${fmtDay(note.date, ui)}</time>, ${note.minutes} ${ui.minRead}</p>
      <h1>${note.title}</h1>
      <p class="lede">${note.summary}</p>
      ${
        toc.length > 2
          ? html`<nav class="toc" aria-label="Contents"><ol>${toc.map((h) => html`<li><a href="#${h.id}">${h.text}</a></li>`)}</ol></nav>`
          : ''
      }
    </div>
  </header>
  <div class="sec">
    ${gutter('DESCRIPTION')}
    <div class="sec-body prose note-body">${raw(body)}</div>
  </div>
  <footer class="sec note-foot">
    ${gutter(lang === 'fr' ? 'VOIR AUSSI' : 'SEE ALSO')}
    <div class="sec-body">
      <p><a href="${lang === 'fr' ? `${root}fr/` : root}">${ui.backToManual}: guerd(1)</a></p>
      <p class="tags">${note.tags.map((tag) => html`<span>${tag}</span>`)}</p>
    </div>
  </footer>
</article>`;
}

export function notFoundBody(ctx) {
  const { ui, root } = ctx;
  return html`
<section class="sec notfound">
  ${gutter('ERRORS')}
  <div class="sec-body">
    <p class="notfound-cmd"><code>$ man <span data-404-path>…</span></code></p>
    <h1>${ui.notFound.lead} <span class="notfound-path" data-404-path>…</span></h1>
    <p class="lede">${ui.notFound.body}</p>
    <p class="notfound-suggest" data-404-suggest hidden>${ui.notFound.suggest} <a href="${root}" data-404-suggest-link>guerd(1)</a>?</p>
    <p><a class="btn btn-primary" href="${root}">${ui.notFound.home}</a> <a class="btn" href="${root}fr/" lang="fr" hreflang="fr">Version française</a></p>
  </div>
</section>`;
}
