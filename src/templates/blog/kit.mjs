// Building blocks for the article diagrams. Every shape is styled by CSS classes
// (src/styles/blog.css), so diagrams follow the light and dark themes. No inline styles:
// the Content-Security-Policy forbids them.

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const KINDS = ['n', 'acc', 'ok', 'bad', 'mut', 'warn'];

/** Arrowhead markers. `p` is a per-diagram prefix so ids stay unique on the page. */
export const markers = (p) =>
  `<defs>${KINDS.map(
    (k) =>
      `<marker id="${p}-${k}" class="dg-mk is-${k}" viewBox="0 0 8 8" refX="7.2" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 .6 7.6 4 0 7.4z"/></marker>`,
  ).join('')}</defs>`;

/** A path with an arrowhead. kind: n (neutral), acc (accent), ok, bad, warn, mut (muted). */
export const arrow = (p, d, kind = 'n', { dashed = false, both = false } = {}) =>
  `<path class="dg-ln is-${kind}${dashed ? ' is-dashed' : ''}" d="${d}" marker-end="url(#${p}-${kind})"${both ? ` marker-start="url(#${p}-${kind})"` : ''}/>`;

/** A path without arrowhead. */
export const line = (d, kind = 'n', { dashed = false, thick = false } = {}) =>
  `<path class="dg-ln is-${kind}${dashed ? ' is-dashed' : ''}${thick ? ' is-thick' : ''}" d="${d}"/>`;

/** A labelled box. With `sub`, the label sits on two lines. */
export function box(x, y, w, h, label, { sub = '', kind = 'n', mono = false, dashed = false, rx = 8 } = {}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const labelY = sub ? cy - 2.5 : cy + 4.5;
  return `<g class="dg-box is-${kind}${dashed ? ' is-dashed' : ''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/><text class="dg-t${mono ? ' dg-mono' : ''}" x="${cx}" y="${labelY}" text-anchor="middle">${esc(label)}</text>${
    sub ? `<text class="dg-sub" x="${cx}" y="${cy + 12.5}" text-anchor="middle">${esc(sub)}</text>` : ''
  }</g>`;
}

/** A background zone (network, namespace, trust zone) with its label in the top-left corner. */
export const zone = (x, y, w, h, label, { kind = 'n', dashed = false } = {}) =>
  `<g class="dg-zone is-${kind}${dashed ? ' is-dashed' : ''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text class="dg-zl" x="${x + 14}" y="${y + 21}">${esc(label)}</text></g>`;

export const text = (x, y, s, { cls = 'dg-sub', anchor = 'start' } = {}) =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(s)}</text>`;

/** A small rounded label sitting on top of a line (it masks the line behind it). */
export function pill(x, y, label, kind = 'n') {
  const w = Math.round(label.length * 6.1 + 18);
  return `<g class="dg-pill is-${kind}"><rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="10"/><text x="${x}" y="${y + 3.8}" text-anchor="middle">${esc(label)}</text></g>`;
}

/** A database cylinder. */
export function cylinder(x, y, w, h, label, { sub = '', kind = 'n' } = {}) {
  const ry = 8;
  const rx = w / 2;
  const cx = x + rx;
  const body = `M${x} ${y + ry}a${rx} ${ry} 0 0 1 ${w} 0v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-w} 0z`;
  const top = `M${x} ${y + ry}a${rx} ${ry} 0 0 0 ${w} 0`;
  const cy = y + h / 2 + ry / 2;
  return `<g class="dg-cyl is-${kind}"><path d="${body}"/><path class="dg-cyl-top" d="${top}"/><text class="dg-t" x="${cx}" y="${sub ? cy - 2 : cy + 4.5}" text-anchor="middle">${esc(label)}</text>${
    sub ? `<text class="dg-sub" x="${cx}" y="${cy + 12.5}" text-anchor="middle">${esc(sub)}</text>` : ''
  }</g>`;
}

/** Status badges drawn on lines: check (allowed), cross (blocked), lock (mTLS). */
export const badge = {
  check: (x, y) =>
    `<g class="dg-badge is-ok" transform="translate(${x} ${y})"><circle r="8.5"/><path d="M-3.6 .2-1 2.8 3.8-2.2"/></g>`,
  cross: (x, y) =>
    `<g class="dg-badge is-block" transform="translate(${x} ${y})"><circle r="8.5"/><path d="M-3.2-3.2 3.2 3.2M3.2-3.2-3.2 3.2"/></g>`,
  lock: (x, y) =>
    `<g class="dg-badge is-lock" transform="translate(${x} ${y})"><circle r="8.5"/><rect x="-3.6" y="-1" width="7.2" height="5.4" rx="1.2"/><path d="M-2-1v-1.6a2 2 0 0 1 4 0V-1"/></g>`,
  shield: (x, y) =>
    `<g class="dg-badge is-shield" transform="translate(${x} ${y})"><circle r="13"/><path d="M0-7.5 6 -5v4.6C6 3.6 3.4 6.4 0 7.6c-3.4-1.2-6-4-6-8V-5Z"/></g>`,
};

/** A numbered step: number in a circle, then a left-aligned label. */
export function step(x, y, w, h, n, label, { kind = 'n' } = {}) {
  const cy = y + h / 2;
  return `<g class="dg-box dg-step is-${kind}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><circle class="dg-num" cx="${x + 18}" cy="${cy}" r="10"/><text class="dg-numt" x="${x + 18}" y="${cy + 4}" text-anchor="middle">${n}</text><text class="dg-t" x="${x + 36}" y="${cy + 4.5}">${esc(label)}</text></g>`;
}

/** Lines of monospaced text (a YAML excerpt). Leading spaces become an x offset, because SVG
    collapses white space. A line can be [text, extraClass]. */
export const code = (x, y, lines, { lh = 21, ch = 7.2 } = {}) =>
  lines
    .map((l, i) => {
      const [s, cls] = Array.isArray(l) ? l : [l, ''];
      const indent = /^ */.exec(s)[0].length;
      return `<text class="dg-code${cls ? ` ${cls}` : ''}" x="${x + indent * ch}" y="${y + i * lh}">${esc(s.trimStart())}</text>`;
    })
    .join('');

/** A legend entry: a short line sample followed by its meaning. */
export const swatch = (p, x, y, kind, label, { dashed = false } = {}) =>
  `${arrow(p, `M${x} ${y - 4}h26`, kind, { dashed })}<text class="dg-sub" x="${x + 36}" y="${y}">${esc(label)}</text>`;

/** The <svg> element. `wide` diagrams get a minimum width and scroll inside their figure on phones. */
export function svg({ w, h, label, body, wide = false }) {
  return `<svg class="dg${wide ? ' dg-wide' : ''}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}

/** A complete figure with caption. */
export const figure = (id, inner, caption, { scroll = false } = {}) =>
  `<figure class="diagram" id="fig-${id}">${scroll ? `<div class="diagram-scroll" tabindex="0">${inner}</div>` : inner}<figcaption>${caption}</figcaption></figure>`;
