// Shared helpers for page templates.
import { html, raw, md } from '../../scripts/lib/html.mjs';
import { t } from '../../scripts/lib/content.mjs';

export { html, raw, md, t };

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

/** Long date for notes: 2026-11-01 -> "1 Nov 2026". */
export function fmtDay(iso, ui) {
  const [y, mo, d] = iso.split('-').map(Number);
  return `${d} ${ui.months[mo - 1]} ${y}`;
}

/** Gutter label used in front of every section: the man page section name. */
export const gutter = (label) => html`<p class="sh" aria-hidden="true">${label}</p>`;

export const icon = {
  arrowDown: raw(
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v9m0 0 4-4m-4 4L4 7M3 14h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ),
  mail: raw(
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12v8H2zM2 4.5l6 4.5 6-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  ),
  external: raw(
    '<svg class="ico ico-sm" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9 3h4v4M13 3 7 9M11 10v3H3V5h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ),
  paper: raw(
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 1.75h5.5L12.5 4.75v9.5h-8.5zM9.25 1.75v3.25h3.25M6.25 8h4M6.25 10.5h4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  ),
  terminal: raw(
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M1.75 2.75h12.5v10.5H1.75zM4.5 6l2 2-2 2M8 10.25h3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ),
};
