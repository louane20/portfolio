// The research figure: three small diagrams of the same cluster, one per protection layer.
// Rendered at build time as static SVG (no script needed). Colours come from CSS classes.
import { raw } from '../../scripts/lib/html.mjs';

const NODE_W = 80;
const NODE_H = 34;
const NODES = {
  internet: { x: 46, y: 44, label: 'Internet', external: true },
  frontend: { x: 170, y: 44, label: 'Frontend' },
  api: { x: 294, y: 44, label: 'API' },
  worker: { x: 170, y: 156, label: 'Worker' },
  db: { x: 294, y: 156, label: 'PostgreSQL' },
};

const STATES = {
  flat: { allowed: 'plain', lateral: 'attack', request: 'attack', mtls: false },
  network: { allowed: 'allowed', lateral: 'blocked', request: 'attack', mtls: false },
  mesh: { allowed: 'allowed', lateral: 'blocked', request: 'blocked', mtls: true },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function node(id, { compromisedLabel, hit }) {
  const n = NODES[id];
  const cls = ['fig-node', n.external ? 'is-external' : '', id === 'worker' ? 'is-compromised' : '', hit ? 'is-hit' : '']
    .filter(Boolean)
    .join(' ');
  const badge =
    id === 'worker'
      ? `<text class="fig-badge" x="${n.x}" y="${n.y - NODE_H / 2 - 7}" text-anchor="middle">${esc(compromisedLabel)}</text>`
      : '';
  return `<g class="${cls}"><rect x="${n.x - NODE_W / 2}" y="${n.y - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="8"/><text x="${n.x}" y="${n.y + 4}" text-anchor="middle">${n.label}</text>${badge}</g>`;
}

function edge(x1, y1, x2, y2, kind, prefix) {
  const marker = kind === 'blocked' ? '' : ` marker-end="url(#${prefix}-arrow-${kind})"`;
  return `<line class="fig-edge is-${kind}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${marker}/>`;
}

const cross = (x, y) =>
  `<g class="fig-cross" transform="translate(${x} ${y})"><circle r="8"/><path d="M-3.2 -3.2L3.2 3.2M3.2 -3.2L-3.2 3.2"/></g>`;

const lock = (x, y) =>
  `<g class="fig-lock" transform="translate(${x} ${y})"><circle r="8"/><rect x="-3.6" y="-1" width="7.2" height="5.4" rx="1.2"/><path d="M-2 -1V-2.6a2 2 0 0 1 4 0V-1"/></g>`;

function request(kind) {
  // The frontend calls an admin endpoint it never needs.
  const x = 222;
  const y = 98;
  const code = kind === 'blocked' ? '403' : '200';
  return `<g class="fig-request is-${kind}"><line x1="232" y1="52" x2="232" y2="${y - 11}"/><rect x="${x - 52}" y="${y - 11}" width="104" height="22" rx="11"/><text class="fig-mono" x="${x - 42}" y="${y + 3.5}">GET /admin</text><text class="fig-mono fig-code" x="${x + 42}" y="${y + 3.5}" text-anchor="end">${code}</text></g>`;
}

function markers(prefix) {
  return ['plain', 'allowed', 'attack']
    .map(
      (kind) =>
        `<marker id="${prefix}-arrow-${kind}" class="fig-arrow is-${kind}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0.5L7.5 4L0 7.5z"/></marker>`,
    )
    .join('');
}

/** One panel's SVG. */
export function panelSvg(id, labels) {
  const s = STATES[id];
  const prefix = `fig-${id}`;
  const L = NODE_W / 2;
  const parts = [
    `<defs>${markers(prefix)}</defs>`,
    // Declared, legitimate flows.
    edge(NODES.internet.x + L, 44, NODES.frontend.x - L - 2, 44, s.allowed, prefix),
    edge(NODES.frontend.x + L, 44, NODES.api.x - L - 2, 44, s.allowed, prefix),
    edge(294, 44 + NODE_H / 2, 294, 156 - NODE_H / 2 - 2, s.allowed, prefix),
    // Lateral movement from the compromised worker.
    edge(NODES.worker.x + L, 156, NODES.db.x - L - 2, 156, s.lateral, prefix),
    request(s.request),
  ];
  if (s.lateral === 'blocked') parts.push(cross(232, 156));
  if (s.mtls) parts.push(lock(232, 31), lock(307, 100));
  for (const id2 of Object.keys(NODES)) {
    const hit = (id2 === 'db' && s.lateral === 'attack') || (id2 === 'api' && s.request === 'attack');
    parts.push(node(id2, { compromisedLabel: labels.compromised, hit }));
  }
  return raw(
    `<svg class="fig-svg" viewBox="0 0 340 196" role="img" aria-label="${esc(labels.alt[id])}">${parts.join('')}</svg>`,
  );
}

/** Small inline swatches for the legend. */
export const legendSwatch = {
  allowed: raw('<svg viewBox="0 0 28 10" aria-hidden="true"><line class="fig-edge is-allowed" x1="1" y1="5" x2="27" y2="5"/></svg>'),
  attack: raw('<svg viewBox="0 0 28 10" aria-hidden="true"><line class="fig-edge is-attack" x1="1" y1="5" x2="27" y2="5"/></svg>'),
  blocked: raw(`<svg viewBox="0 0 28 18" aria-hidden="true">${cross(14, 9)}</svg>`),
  mtls: raw(`<svg viewBox="0 0 28 18" aria-hidden="true">${lock(14, 9)}</svg>`),
};
