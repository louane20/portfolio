// Shared helpers for page templates.
import { html, raw, md, attrs } from '../../scripts/lib/html.mjs';
import { t } from '../../scripts/lib/content.mjs';

export { html, raw, md, attrs, t };

/** "2024-11" -> "Nov 2024" (EN) / "nov. 2024" (FR); "2022" -> "2022". */
export function fmtMonth(value, ui) {
  const s = String(value);
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${ui.months[Number(m[2]) - 1]} ${m[1]}`;
}

export function fmtPeriod(item, ui) {
  const start = html`<time datetime="${String(item.start)}">${fmtMonth(item.start, ui)}</time>`;
  if (!item.end) return start;
  if (item.end === 'present') return html`${start} – ${ui.present}`;
  return html`${start} – <time datetime="${String(item.end)}">${fmtMonth(item.end, ui)}</time>`;
}

/** Long date for articles: 2026-11-01 -> "1 November 2026" / "1 novembre 2026". */
export function fmtDay(iso, ui) {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${d} ${ui.monthsLong[mo - 1]} ${y}`;
}

/** A decorative shell command shown above a heading (hidden from assistive technology). */
export const cmd = (command, { typed = false } = {}) =>
  html`<p class="cmd" aria-hidden="true" dir="ltr"><span class="ps1">nawal@guerd</span><span class="ps2">:~$</span> ${
    typed ? html`<span class="typed" data-chars="${command.length}">${command}</span>` : command
  }</p>`;

const svg = (body, cls = 'ico') =>
  raw(`<svg class="${cls}" viewBox="0 0 20 20" aria-hidden="true" focusable="false">${body}</svg>`);

const stroke = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

export const icon = {
  download: svg(`<path ${stroke} d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12"/>`),
  mail: svg(`<path ${stroke} d="M3 5.5h14v9H3zM3.5 6l6.5 5 6.5-5"/>`),
  external: svg(`<path ${stroke} d="M11.5 4.5H15.5V8.5M15.5 4.5 9 11M13.5 11.5V15.5H4.5V6.5H8.5"/>`, 'ico ico-sm'),
  sun: svg(`<circle ${stroke} cx="10" cy="10" r="3.4"/><path ${stroke} d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"/>`),
  moon: svg(`<path ${stroke} d="M15.8 12.6A6.5 6.5 0 0 1 7.4 4.2a6.5 6.5 0 1 0 8.4 8.4Z"/>`),
  menu: svg(`<path ${stroke} d="M3.5 6h13M3.5 10h13M3.5 14h13"/>`),
  close: svg(`<path ${stroke} d="M5 5l10 10M15 5 5 15"/>`),
  copy: svg(`<rect ${stroke} x="7" y="7" width="9" height="9" rx="1.6"/><path ${stroke} d="M13 7V5.4c0-.9-.7-1.6-1.6-1.6H5.4c-.9 0-1.6.7-1.6 1.6v6c0 .9.7 1.6 1.6 1.6H7"/>`),
  pin: svg(`<path ${stroke} d="M10 17s5-4.6 5-8.6A5 5 0 0 0 5 8.4C5 12.4 10 17 10 17Z"/><circle ${stroke} cx="10" cy="8.4" r="1.8"/>`),
  phone: svg(`<path ${stroke} d="M6.2 3.5h-2a.7.7 0 0 0-.7.8A12.5 12.5 0 0 0 15.7 16.5a.7.7 0 0 0 .8-.7v-2l-3-1.3-1.5 1.5a8.6 8.6 0 0 1-4-4l1.5-1.5Z"/>`),
  doc: svg(`<path ${stroke} d="M5.5 2.8h6l3 3v11.4h-9zM11.2 2.8V6h3.3M7.8 10h4.4M7.8 13h4.4"/>`),
  code: svg(`<path ${stroke} d="M7 6 3 10l4 4M13 6l4 4-4 4"/>`),
  pipeline: svg(`<circle ${stroke} cx="4.5" cy="10" r="2"/><circle ${stroke} cx="15.5" cy="10" r="2"/><path ${stroke} d="M6.5 10h7"/>`),
  rss: svg(`<path ${stroke} d="M4.5 9a6.5 6.5 0 0 1 6.5 6.5M4.5 4.5a11 11 0 0 1 11 11"/><circle cx="5.2" cy="14.8" r="1.4" fill="currentColor"/>`),
  share: svg(`<circle ${stroke} cx="14.5" cy="5" r="2"/><circle ${stroke} cx="5.5" cy="10" r="2"/><circle ${stroke} cx="14.5" cy="15" r="2"/><path ${stroke} d="m7.3 9 5.4-3M7.3 11l5.4 3"/>`),
  link: svg(`<path ${stroke} d="M8.6 11.4a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.4 8.6a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9"/>`),
  arrowRight: svg(`<path ${stroke} d="M4 10h12m0 0-4.5-4.5M16 10l-4.5 4.5"/>`, 'ico ico-dir'),
  arrowLeft: svg(`<path ${stroke} d="M16 10H4m0 0 4.5-4.5M4 10l4.5 4.5"/>`, 'ico ico-dir'),
  clock: svg(`<circle ${stroke} cx="10" cy="10" r="6.8"/><path ${stroke} d="M10 6.2V10l2.6 1.6"/>`, 'ico ico-sm'),
};
