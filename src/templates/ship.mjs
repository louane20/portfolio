// "How I ship": an animated map of the delivery platform, from a commit to production and back.
// Static SVG drawn at build time; the packets move with SMIL (no script), and they are hidden
// for visitors who ask for reduced motion. Tool names stay in English, like code.
import { markers, arrow, line, text, svg, esc } from './blog/kit.mjs';
import { html, raw, cmd } from './common.mjs';

const W = 1160;
const H = 360;
const Y = 170; // the main flow

const STAGES = [
  { id: 'commit', label: 'git push', sub: 'GitLab · GitHub', icon: 'branch' },
  { id: 'ci', label: 'CI pipeline', sub: 'lint · test · scan', icon: 'check' },
  { id: 'registry', label: 'Registry', sub: 'signed image + SBOM', icon: 'box' },
  { id: 'gitops', label: 'GitOps', sub: 'Argo CD sync', icon: 'sync' },
  { id: 'cluster', label: 'Kubernetes', sub: 'kubeadm · Cilium', icon: 'hex' },
  { id: 'observe', label: 'Observe', sub: ['Prometheus', 'Grafana · Loki'], icon: 'pulse' },
];

const BOX_W = 150;
const BOX_H = 92;
const GAP = (W - 40 - STAGES.length * BOX_W) / (STAGES.length - 1);
const xOf = (i) => 20 + i * (BOX_W + GAP);

const ICONS = {
  branch: (x, y) => `<circle cx="${x - 6}" cy="${y - 7}" r="3.2"/><circle cx="${x - 6}" cy="${y + 8}" r="3.2"/><circle cx="${x + 8}" cy="${y - 3}" r="3.2"/><path d="M${x - 6} ${y - 4}v9M${x + 8} ${y}c0 5-8 4-12 6"/>`,
  check: (x, y) => `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" rx="5"/><path d="M${x - 5} ${y}l3.5 3.5 6.5-7"/>`,
  box: (x, y) => `<path d="M${x} ${y - 11}l10 5.5v11L${x} ${y + 11}l-10-5.5v-11z"/><path d="M${x - 10} ${y - 5.5}L${x} ${y}l10-5.5M${x} ${y}v11"/>`,
  sync: (x, y) => `<path d="M${x + 9} ${y - 3}a9 9 0 0 0-16-4M${x - 9} ${y + 3}a9 9 0 0 0 16 4"/><path d="M${x - 8} ${y - 12}v5h5M${x + 8} ${y + 12}v-5h-5"/>`,
  hex: (x, y) => `<path d="M${x} ${y - 12}l10.4 6v12L${x} ${y + 12}l-10.4-6v-12z"/><circle cx="${x}" cy="${y}" r="3.5"/>`,
  pulse: (x, y) => `<path d="M${x - 12} ${y}h5l3-7 5 14 3-7h8"/>`,
};

function stage(s, i) {
  const x = xOf(i);
  const cx = x + BOX_W / 2;
  const top = Y - BOX_H / 2;
  return `<g class="ship-stage${s.id === 'cluster' ? ' is-prod' : ''}">
<rect class="ship-box" x="${x}" y="${top}" width="${BOX_W}" height="${BOX_H}" rx="12"/>
<text class="ship-step" x="${x + 14}" y="${top - 10}">${String(i + 1).padStart(2, '0')}</text>
<g class="ship-ico">${ICONS[s.icon](cx, top + 26)}</g>
<text class="ship-label" x="${cx}" y="${top + 60}" text-anchor="middle">${esc(s.label)}</text>
${(Array.isArray(s.sub) ? s.sub : [s.sub]).map((l, k, all) => `<text class="ship-sub" x="${cx}" y="${top + (all.length > 1 ? 74 : 78) + k * 13}" text-anchor="middle">${esc(l)}</text>`).join('')}
</g>`;
}

export function shipSvg(label) {
  const p = 'ship';
  const flow = `M${xOf(0) + BOX_W} ${Y}H${xOf(STAGES.length - 1)}`;
  const loop = `M${xOf(5) + BOX_W / 2} ${Y - BOX_H / 2}C${xOf(5) + BOX_W / 2} 30 ${xOf(0) + BOX_W / 2} 30 ${xOf(0) + BOX_W / 2} ${Y - BOX_H / 2 - 4}`;
  const lane = (from, to, y, title) => {
    const x1 = xOf(from) + 10;
    const x2 = xOf(to) + BOX_W - 10;
    return `<g class="ship-lane"><rect x="${x1}" y="${y}" width="${x2 - x1}" height="40" rx="10"/><text x="${(x1 + x2) / 2}" y="${y + 25}" text-anchor="middle">${esc(title)}</text></g>`;
  };
  const packets = [0, -1.6, -3.2]
    .map(
      (begin) =>
        `<circle class="ship-pkt" r="5"><animateMotion dur="4.8s" begin="${begin}s" repeatCount="indefinite" path="${flow}"/></circle>`,
    )
    .join('');
  const body = [
    markers(p),
    // Feedback loop: what production says becomes the next commit.
    arrow(p, loop, 'mut', { dashed: true }),
    `<rect class="ship-loop-pill" x="${W / 2 - 150}" y="31" width="300" height="26" rx="13"/>`,
    text(W / 2, 48, 'alerts → issues → the next commit', { anchor: 'middle', cls: 'ship-loop' }),
    // The main flow, with packets travelling along it.
    line(flow, 'acc', { thick: true }),
    `<path class="ship-flow" d="${flow}"/>`,
    packets,
    ...STAGES.slice(0, -1).map((_, i) => arrow(p, `M${xOf(i) + BOX_W + GAP - 14} ${Y}h8`, 'acc')),
    ...STAGES.map(stage),
    // What runs underneath.
    lane(0, 1, 282, 'Trivy · cosign · Playwright'),
    lane(2, 3, 282, 'HashiCorp Vault · secrets'),
    lane(4, 5, 282, 'Ansible · nodes and config'),
    ...[0.5, 2.5, 4.5].map((k) => line(`M${xOf(Math.floor(k)) + BOX_W + GAP / 2} ${Y + BOX_H / 2 + 6}V280`, 'mut', { dashed: true })),
    `<g class="ship-shield"><path d="M${xOf(4) + BOX_W - 18} ${Y - BOX_H / 2 - 12}l12 4.5v8.5c0 8-5 13.5-12 16-7-2.5-12-8-12-16v-8.5z"/><path class="ship-shield-check" d="M${xOf(4) + BOX_W - 23} ${Y - BOX_H / 2 + 2}l3.5 3.5 6.5-7"/></g>`,
    text(xOf(4) + BOX_W - 36, Y - BOX_H / 2 - 16, 'zero trust', { anchor: 'end', cls: 'ship-tag' }),
  ];
  return svg({ w: W, h: H, label, body: body.join(''), wide: true });
}

/** The section on the home page. */
export function shipSection(ctx) {
  const { ui } = ctx;
  return html`
<section class="section ship" id="pipeline-map" aria-labelledby="ship-h">
  <div class="container">
    <header class="section-head">
      ${cmd('cat ~/how-i-ship.yaml')}
      <h2 class="section-title" id="ship-h">${ui.ship.title}</h2>
      <p class="lede">${ui.ship.lede}</p>
    </header>
    <figure class="ship-figure">
      <div class="diagram-scroll" tabindex="0">${raw(shipSvg(ui.ship.alt))}</div>
    </figure>
  </div>
</section>`;
}
