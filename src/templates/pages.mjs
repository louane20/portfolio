// Article pages (content/notes/*.md) and the 404 page.
import { Marked } from 'marked';
import { html, raw, fmtDay } from './common.mjs';
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
  const home = lang === 'fr' ? `${root}fr/` : root;
  return html`
<article class="article-page" lang="${note.lang}">
  <div class="container article-wrap">
    <p class="back"><a href="${home}#writing">${ui.backHome}</a></p>
    <header class="article-head">
      <p class="article-meta"><span class="article-cat">${note.category}</span><time datetime="${note.date}">${fmtDay(note.date, ui)}</time><span>${note.minutes} ${ui.minRead}</span></p>
      <h1>${note.title}</h1>
      <p class="lede">${note.summary}</p>
    </header>
    ${
      toc.length > 2
        ? html`<nav class="toc" aria-label="${lang === 'fr' ? 'Sommaire' : 'Contents'}"><ol>${toc.map((h) => html`<li><a href="#${h.id}">${h.text}</a></li>`)}</ol></nav>`
        : ''
    }
    <div class="prose article-body">${raw(body)}</div>
    <footer class="article-foot">
      <ul class="tag-list">${note.tags.map((tag) => html`<li>${tag}</li>`)}</ul>
      <p><a class="btn btn-secondary" href="${home}">${ui.backHome}</a></p>
    </footer>
  </div>
</article>`;
}

export function notFoundBody(ctx) {
  const { ui, root } = ctx;
  return html`
<section class="section notfound">
  <div class="container">
    <p class="notfound-code">${ui.notFound.code}</p>
    <h1>${ui.notFound.title}</h1>
    <p class="lede">${ui.notFound.body}</p>
    <p class="notfound-path"><code data-404-path></code></p>
    <p class="notfound-suggest" data-404-suggest hidden>${ui.notFound.suggest} <a href="${root}" data-404-suggest-link>${ui.notFound.home}</a></p>
    <div class="actions">
      <a class="btn btn-primary" href="${root}">${ui.notFound.home}</a>
      <a class="btn btn-secondary" href="${root}fr/" lang="fr" hreflang="fr">Version française</a>
    </div>
  </div>
</section>`;
}
