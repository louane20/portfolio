// Minimal, dependency-free HTML templating with escaping by default.
// `html\`<p>${value}</p>\`` escapes `value`; wrap trusted markup with `raw()`.
import { Marked } from 'marked';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new Raw(String(value));

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (value instanceof Raw) return value.value;
  return esc(value);
}

export function html(strings, ...values) {
  let out = '';
  strings.forEach((chunk, i) => {
    out += chunk;
    if (i < values.length) out += render(values[i]);
  });
  return new Raw(out);
}

/** Build an attribute string from an object; `true` renders a boolean attribute. */
export function attrs(map) {
  return raw(
    Object.entries(map)
      .filter(([, v]) => v !== null && v !== undefined && v !== false)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
      .join(''),
  );
}

// Inline Markdown for short content strings (**bold**, *italic*, `code`, [link](url)).
const inline = new Marked({ gfm: true, breaks: false });
inline.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      const extra = external ? ' rel="noopener"' : '';
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${extra}>${text}</a>`;
    },
  },
});

export const md = (text) => raw(inline.parseInline(String(text)).trim());

/** Plain text version of inline markdown (for meta tags, roff, JSON-LD). */
export const plain = (text) =>
  String(text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
