// Computes a `git log --graph`-style layout for the career history.
// Rows are given newest first. Lane 0 is `main`; other lanes fork from main
// below their oldest commit and merge back above their newest one, unless
// they are still open (their newest commit is above main's HEAD).
import { createHash } from 'node:crypto';

/**
 * @returns {Array<{lane:number, segments:Array<{lane:number, kind:'full'|'top'|'bottom'}>, curves:Array<{type:'fork'|'merge', lane:number}>}>}
 */
export function layoutGraph(items, lanes) {
  const laneIndex = new Map(lanes.map((lane, i) => [lane.id, i]));
  const rows = items.map((item) => ({ lane: laneIndex.get(item.lane), segments: [], curves: [] }));
  const span = new Map();
  rows.forEach((row, i) => {
    const s = span.get(row.lane) ?? { top: i, bottom: i };
    s.top = Math.min(s.top, i);
    s.bottom = Math.max(s.bottom, i);
    span.set(row.lane, s);
  });
  const main = span.get(0);

  for (const [lane, { top, bottom }] of span) {
    const merged = lane !== 0 && main.top < top;
    for (let r = top; r <= bottom; r += 1) {
      let kind = null;
      if (r > top && r < bottom) kind = 'full';
      else if (r === top && r === bottom) kind = merged ? 'top' : null;
      else if (r === top) kind = merged ? 'full' : 'bottom';
      else if (r === bottom) kind = 'top';
      // Rows in between that belong to other lanes still need this lane's line.
      if (kind) rows[r].segments.push({ lane, kind });
    }
    // Rows of other lanes inside this lane's span: draw the pass-through line.
    for (let r = top + 1; r < bottom; r += 1) {
      if (!rows[r].segments.some((s) => s.lane === lane)) rows[r].segments.push({ lane, kind: 'full' });
    }
    if (lane !== 0) {
      rows[bottom].curves.push({ type: 'fork', lane });
      if (merged) rows[top - 1].curves.push({ type: 'merge', lane });
    }
  }
  for (const row of rows) {
    const seen = new Set();
    row.segments = row.segments.filter((s) => (seen.has(s.lane) ? false : seen.add(s.lane))).sort((a, b) => a.lane - b.lane);
  }
  return rows;
}

/** A stable, real SHA-1 for each entry, shown as its short commit hash. */
export const commitHash = (item) =>
  createHash('sha1')
    .update(JSON.stringify([item.id, item.commit, item.start, item.end ?? null]))
    .digest('hex')
    .slice(0, 7);
