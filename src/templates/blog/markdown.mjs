// Markdown for blog posts: GitHub-flavoured Markdown, plus
//   - code blocks highlighted at build time (highlight.js, no client-side script), with a
//     header showing the language or a file name (```yaml title="cluster.yaml") and a copy button;
//   - callouts written as GitHub alerts (> [!NOTE], [!TIP], [!WARNING], [!IMPORTANT]);
//   - diagrams from ./diagrams.mjs (```diagram followed by the diagram name);
//   - stable heading ids, and the list of h2 for the table of contents.
import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';
import javascript from 'highlight.js/lib/languages/javascript';
import ini from 'highlight.js/lib/languages/ini';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import diff from 'highlight.js/lib/languages/diff';
import sql from 'highlight.js/lib/languages/sql';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { esc } from '../../../scripts/lib/html.mjs';
import { diagram } from './diagrams.mjs';

for (const [name, lang] of Object.entries({ bash, shell, yaml, json, javascript, ini, dockerfile, diff, sql, plaintext })) {
  hljs.registerLanguage(name, lang);
}

const LABELS = {
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Terminal',
  console: 'Terminal',
  yaml: 'YAML',
  yml: 'YAML',
  json: 'JSON',
  toml: 'TOML',
  ini: 'INI',
  dockerfile: 'Dockerfile',
  diff: 'Diff',
  js: 'JavaScript',
  javascript: 'JavaScript',
  sql: 'SQL',
  text: 'Text',
  plaintext: 'Text',
};

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const ico = (body) => `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${body}</svg>`;
const CALLOUT_ICONS = {
  note: ico(`<circle ${stroke} cx="10" cy="10" r="7"/><path ${stroke} d="M10 9v4.5M10 6.6v.1"/>`),
  tip: ico(`<path ${stroke} d="M7.5 14.5h5M8.2 17h3.6M10 3a5 5 0 0 0-3 9c.5.4.8 1 .8 1.6v.4h4.4v-.4c0-.6.3-1.2.8-1.6A5 5 0 0 0 10 3Z"/>`),
  warning: ico(`<path ${stroke} d="M10 3.5 17 16H3Z"/><path ${stroke} d="M10 8.5v3.2M10 13.8v.1"/>`),
  important: ico(`<path ${stroke} d="M4.5 4h11v9.5H9L5.5 16.5v-3h-1Z"/><path ${stroke} d="M10 6.8v3M10 11.6v.1"/>`),
};
const COPY_ICON = ico(
  `<rect ${stroke} x="7" y="7" width="9" height="9" rx="1.6"/><path ${stroke} d="M13 7V5.4c0-.9-.7-1.6-1.6-1.6H5.4c-.9 0-1.6.7-1.6 1.6v6c0 .9.7 1.6 1.6 1.6H7"/>`,
);

export const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Render a post body. Returns the HTML, the h2 headings (for the TOC) and the diagrams used. */
export function renderMarkdown(source, { ui }) {
  const toc = [];
  const ids = new Set();
  const diagrams = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const plainText = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
        let id = slugify(plainText);
        for (let n = 2; ids.has(id); n += 1) id = `${slugify(plainText)}-${n}`;
        ids.add(id);
        if (depth === 2) toc.push({ id, text: plainText });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' rel="noopener"' : ''}>${text}</a>`;
      },
      code({ text, lang }) {
        const info = (lang || '').trim();
        const language = info.split(/\s+/)[0].toLowerCase();
        if (language === 'diagram') {
          const name = text.trim();
          diagrams.push(name);
          return `${diagram(name)}\n`;
        }
        const title = /title="([^"]+)"/.exec(info)?.[1];
        const known = language && hljs.getLanguage(language);
        const body = known ? hljs.highlight(text, { language, ignoreIllegals: true }).value : esc(text);
        const label = title ?? LABELS[language] ?? language ?? '';
        return `<div class="codeblock"><div class="code-head"><span class="code-title${title ? ' is-file' : ''}">${esc(label)}</span><button type="button" class="copy-btn code-copy" data-copy-code aria-label="${esc(`${ui.copy} ${label || 'code'}`.trim())}">${COPY_ICON}<span>${esc(ui.copy)}</span></button></div><pre tabindex="0"><code class="hljs${language ? ` language-${esc(language)}` : ''}">${body}</code></pre></div>\n`;
      },
      blockquote({ tokens }) {
        const inner = this.parser.parse(tokens);
        const m = /^<p>\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/.exec(inner);
        if (!m) return `<blockquote>${inner}</blockquote>\n`;
        const kind = m[1].toLowerCase();
        const body = inner.replace(m[0], '<p>').replace(/<p><\/p>\n?/g, '');
        return `<div class="callout is-${kind}" role="note"><p class="callout-title">${CALLOUT_ICONS[kind]}<span>${esc(ui.blog.callouts[kind])}</span></p>${body}</div>\n`;
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
  return { html: marked.parse(source), toc, diagrams };
}
