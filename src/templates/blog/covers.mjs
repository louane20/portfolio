// Cover illustrations for blog posts, drawn as inline SVG at build time. Colours come from
// CSS (src/styles/covers.css) through a palette class, so every cover follows the light and
// dark themes. Covers are decorative: the title next to them carries the meaning.
//
// Canvas: 800 x 400. Cards crop it to 16:9 and the article header to about 2.4:1, so the art
// stays inside x 60..740, y 40..360.

const W = 800;
const H = 400;

// One palette per cover keeps the cards on the blog index visually distinct.
const PALETTE = {
  airgap: 'blue',
  operators: 'teal',
  'open-source': 'violet',
  'zero-trust': 'green',
  pipeline: 'amber',
  gitops: 'blue',
};

export const COVERS = Object.keys(PALETTE);

const defs = (u) => `<defs>
<linearGradient id="${u}-bg" x1="0" y1="0" x2="1" y2="1"><stop class="cv-s1" offset="0"/><stop class="cv-s2" offset="1"/></linearGradient>
<pattern id="${u}-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle class="cv-dot" cx="2" cy="2" r="1.3"/></pattern>
<marker id="${u}-ar" class="cv-mk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 1 9 5 0 9z"/></marker>
</defs>
<rect width="${W}" height="${H}" fill="url(#${u}-bg)"/>
<rect width="${W}" height="${H}" fill="url(#${u}-dots)"/>`;

const check = (x, y, s = 1) =>
  `<path class="cv-ln cv-check" d="M${x - 8 * s} ${y}l${5.5 * s} ${5.5 * s} ${10.5 * s}-${11 * s}"/>`;

const cross = (x, y) =>
  `<g class="cv-block" transform="translate(${x} ${y})"><circle r="17"/><path d="M-6.5-6.5 6.5 6.5M6.5-6.5-6.5 6.5"/></g>`;

const lock = (x, y) =>
  `<g class="cv-lock" transform="translate(${x} ${y})"><circle r="15"/><rect x="-6" y="-2" width="12" height="9" rx="2"/><path d="M-3.5-2v-3a3.5 3.5 0 0 1 7 0v3"/></g>`;

/** A small parcel: an image or an artifact. */
const parcel = (x, y, s = 34) =>
  `<g><rect class="cv-soft" x="${x}" y="${y}" width="${s}" height="${s * 0.86}" rx="5"/><path class="cv-ln is-thin" d="M${x} ${y + s * 0.3}h${s}M${x + s / 2} ${y}v${s * 0.3}"/></g>`;

const hexPath = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)];
};

const ART = {
  airgap(u) {
    return [
      // The internet side: upstream registries and their artifacts.
      `<rect class="cv-card" x="92" y="92" width="192" height="216" rx="18"/>`,
      `<circle class="cv-ln is-thin" cx="188" cy="150" r="27"/><ellipse class="cv-ln is-thin" cx="188" cy="150" rx="11" ry="27"/><path class="cv-ln is-thin" d="M161 150h54M165 136h46M165 164h46"/>`,
      parcel(124, 206),
      parcel(171, 206),
      parcel(218, 206),
      `<text class="cv-txt" x="188" y="284" text-anchor="middle">upstream</text>`,
      // The gap itself, and the one-way capsule that crosses it.
      `<path class="cv-gap" d="M376 36V364M424 36V364"/>`,
      `<path class="cv-ln" d="M286 200H346" marker-end="url(#${u}-ar)"/>`,
      `<rect class="cv-card" x="350" y="166" width="100" height="68" rx="34"/>`,
      parcel(383, 186, 30),
      `<g class="cv-seal" transform="translate(436 172)"><circle r="12"/>${check(0, -1, 0.62)}</g>`,
      `<path class="cv-ln" d="M452 200H508" marker-end="url(#${u}-ar)"/>`,
      // The inside: a cluster and its own registry.
      `<rect class="cv-card" x="516" y="92" width="192" height="216" rx="18"/>`,
      `<path class="cv-ln is-thin" d="${hexPath(612, 168, 50)}"/>`,
      `<rect class="cv-soft" x="587" y="133" width="22" height="22" rx="5"/><rect class="cv-soft" x="615" y="133" width="22" height="22" rx="5"/><rect class="cv-fill" x="601" y="162" width="22" height="22" rx="5"/>`,
      `<text class="cv-txt" x="612" y="270" text-anchor="middle">registry.internal</text>`,
      // No route back out.
      `<path class="cv-ln is-thin is-dash" d="M590 308V340H210V308"/>`,
      cross(400, 340),
    ].join('');
  },

  operators(u) {
    const c = [400, 200];
    const r = 112;
    const arc = (from, to) => {
      const [x1, y1] = polar(...c, r, from);
      const [x2, y2] = polar(...c, r, to);
      return `<path class="cv-ln" d="M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}" marker-end="url(#${u}-ar)"/>`;
    };
    const teeth = Array.from({ length: 8 }, (_, i) => {
      const [x1, y1] = polar(...c, 22, i * 45);
      const [x2, y2] = polar(...c, 31, i * 45);
      return `M${x1} ${y1}L${x2} ${y2}`;
    }).join('');
    return [
      `<circle class="cv-ring" cx="400" cy="200" r="150"/>`,
      arc(-78, 18),
      arc(42, 138),
      arc(162, 258),
      `<rect class="cv-card" x="350" y="150" width="100" height="100" rx="24"/>`,
      `<circle class="cv-ln" cx="400" cy="200" r="20"/><path class="cv-ln" d="${teeth}"/><circle class="cv-fill" cx="400" cy="200" r="6"/>`,
      `<text class="cv-txt" x="400" y="62" text-anchor="middle">observe</text>`,
      `<text class="cv-txt" x="540" y="300" text-anchor="middle">diff</text>`,
      `<text class="cv-txt" x="262" y="300" text-anchor="middle">act</text>`,
      // PostgreSQL on the left, a Kafka log on the right.
      `<path class="cv-ln is-thin is-dash" d="M198 200H286M514 200H586"/>`,
      `<path class="cv-card" d="M110 160a44 13 0 0 1 88 0v80a44 13 0 0 1-88 0z"/><path class="cv-ln is-thin" d="M110 160a44 13 0 0 0 88 0M110 187a44 13 0 0 0 88 0M110 214a44 13 0 0 0 88 0"/>`,
      `<g>${[0, 1, 2, 3, 4]
        .map((i) => `<rect class="${i === 4 ? 'cv-fill' : 'cv-cell'}" x="${590 + i * 26}" y="174" width="21" height="21" rx="4"/>`)
        .join('')}${[0, 1, 2, 3]
        .map((i) => `<rect class="${i === 3 ? 'cv-fill' : 'cv-cell'}" x="${590 + i * 26}" y="203" width="21" height="21" rx="4"/>`)
        .join('')}</g>`,
    ].join('');
  },

  'open-source'() {
    const commit = (x, y, fill = false) => `<circle class="${fill ? 'cv-commit is-merge' : 'cv-commit'}" cx="${x}" cy="${y}" r="${fill ? 11 : 10}"/>`;
    const person = (x) =>
      `<g class="cv-person"><circle cx="${x}" cy="86" r="10"/><path d="M${x - 16} 118a16 14 0 0 1 32 0z"/></g>`;
    return [
      // Contributors, and the commits they bring.
      person(280),
      person(330),
      person(380),
      `<path class="cv-ln is-thin is-dash" d="M280 122V140M330 122V140M380 122V140"/>`,
      `<path class="cv-ln" d="M60 232H742"/>`,
      `<path class="cv-ln" d="M200 232C240 232 236 150 276 150H384C424 150 420 232 460 232"/>`,
      `<path class="cv-ln" d="M528 232C556 232 556 300 584 300H606C634 300 634 232 662 232"/>`,
      commit(120, 232),
      commit(200, 232),
      commit(280, 150),
      commit(330, 150),
      commit(380, 150),
      commit(460, 232, true),
      commit(528, 232),
      commit(595, 300),
      commit(662, 232, true),
      `<text class="cv-txt" x="78" y="210">main</text>`,
      // A terminal: where most contributions start.
      `<rect class="cv-card" x="476" y="66" width="250" height="92" rx="14"/>`,
      `<circle class="cv-soft" cx="498" cy="88" r="5"/><circle class="cv-soft" cx="514" cy="88" r="5"/><circle class="cv-soft" cx="530" cy="88" r="5"/>`,
      `<text class="cv-txt is-lg" x="496" y="133">$ git commit -s</text><rect class="cv-fill" x="669" y="117" width="10" height="20" rx="1.5"/>`,
    ].join('');
  },

  'zero-trust'() {
    const centre = [400, 200];
    const around = [0, 60, 120, 180, 240, 300].map((deg) => polar(...centre, 128, deg).map(Number));
    const mid = (p) => [(centre[0] + p[0]) / 2, (centre[1] + p[1]) / 2];
    const links = around.map(([x, y]) => `M${centre[0]} ${centre[1]}L${x} ${y}`).join('');
    return [
      `<circle class="cv-ring" cx="400" cy="200" r="182"/><circle class="cv-ring" cx="400" cy="200" r="236"/>`,
      `<path class="cv-ln is-thin" d="${links}"/>`,
      ...around.map(([x, y]) => `<path class="cv-card" d="${hexPath(x, y, 34)}"/><circle class="cv-soft" cx="${x}" cy="${y}" r="10"/>`),
      lock(...mid(around[0])),
      lock(...mid(around[2])),
      lock(...mid(around[4])),
      lock(...mid(around[5])),
      cross(...mid(around[1])),
      `<path class="cv-card" d="${hexPath(400, 200, 50)}"/>`,
      `<path class="cv-fill" d="M400 176l19 7v14c0 13-8 23-19 27-11-4-19-14-19-27v-14z"/>`,
      `<path class="cv-ln cv-check is-inverse" d="M392 200l6 6 11-12"/>`,
    ].join('');
  },

  pipeline(u) {
    const stages = ['lint', 'build', 'test', 'scan', 'sign'];
    return [
      `<path class="cv-ln" d="M110 172H520"/>`,
      `<path class="cv-ln is-thin is-dash" d="M110 290H520"/>`,
      ...stages.map(
        (name, i) =>
          `<circle class="cv-card is-strong" cx="${110 + i * 100}" cy="172" r="25"/>${check(110 + i * 100, 172)}<text class="cv-txt" x="${110 + i * 100}" y="228" text-anchor="middle">${name}</text>`,
      ),
      `<text class="cv-txt is-mute" x="110" y="322">e2e: kind + Cilium</text>`,
      `<path class="cv-ln" d="M535 172H586" marker-end="url(#${u}-ar)"/>`,
      `<rect class="cv-card" x="592" y="132" width="96" height="80" rx="16"/>`,
      parcel(620, 150, 40),
      `<g class="cv-seal" transform="translate(684 136)"><circle r="16"/>${check(0, -1, 0.8)}</g>`,
      `<path class="cv-ln" d="M640 214V256" marker-end="url(#${u}-ar)"/>`,
      `<rect class="cv-card" x="580" y="262" width="120" height="58" rx="14"/>`,
      `<circle class="cv-soft" cx="612" cy="291" r="10"/><circle class="cv-soft" cx="640" cy="291" r="10"/><circle class="cv-fill" cx="668" cy="291" r="10"/>`,
    ].join('');
  },

  gitops(u) {
    const dcs = [80, 170, 260];
    return [
      `<rect class="cv-card" x="86" y="128" width="176" height="144" rx="18"/>`,
      `<circle class="cv-ln" cx="146" cy="176" r="12"/><circle class="cv-ln" cx="146" cy="232" r="12"/><circle class="cv-ln" cx="206" cy="190" r="12"/><path class="cv-ln" d="M146 188V220M206 202C206 222 170 214 156 226"/>`,
      ...dcs.map(
        (y, i) =>
          `<path class="cv-ln is-thin" d="M264 200C380 200 380 ${y + 30} 514 ${y + 30}" marker-end="url(#${u}-ar)"/><rect class="cv-card" x="522" y="${y}" width="196" height="60" rx="14"/><text class="cv-txt" x="548" y="${y + 36}">dc-${i + 1}</text><circle class="cv-ln is-thin" cx="686" cy="${y + 30}" r="12"/><path class="cv-fill" d="M694 ${y + 22}l3 9-9-1z"/>`,
      ),
    ].join('');
  },
};

/** Inline SVG cover. `uid` must be unique on the page (several covers can share one page). */
export function coverSvg(name, uid) {
  const art = ART[name];
  if (!art) throw new Error(`unknown cover "${name}" (known: ${COVERS.join(', ')})`);
  const u = `cv-${uid}`;
  return `<svg class="cover pal-${PALETTE[name]}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${defs(u)}${art(u)}</svg>`;
}
