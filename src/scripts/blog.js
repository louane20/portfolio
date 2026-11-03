// Blog behaviours: topic filters on the index, the active section in the table of contents,
// and the reading progress bar. Without JavaScript the index lists every post and the
// table of contents is a plain list of links.

/** Topic filters. `?topic=security` in the URL preselects a topic (used by the breadcrumbs). */
export function initFilters(strings) {
  const group = document.querySelector('[data-filters]');
  const grid = document.querySelector('[data-post-grid]');
  if (!group || !grid) return;
  const buttons = [...group.querySelectorAll('[data-filter]')];
  const cards = [...grid.querySelectorAll('[data-category]')];
  const featured = document.querySelector('[data-featured-section]');
  const status = document.querySelector('[data-filter-status]');
  const empty = document.querySelector('[data-filter-empty]');
  const known = new Set(buttons.map((b) => b.dataset.filter));

  const apply = (topic, { announce = true, updateUrl = true } = {}) => {
    const value = known.has(topic) ? topic : 'all';
    grid.dataset.filter = value;
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.filter === value));
    let shown = 0;
    for (const card of cards) {
      const visible = value === 'all' || card.dataset.category === value;
      card.hidden = !visible;
      if (visible && !(value === 'all' && card.hasAttribute('data-featured'))) shown += 1;
    }
    if (featured) featured.hidden = value !== 'all';
    if (empty) empty.hidden = shown > 0;
    if (status && announce) {
      const n = value === 'all' ? cards.length : shown;
      status.textContent = (n === 1 ? strings.count.one : strings.count.other).replace('{n}', n);
    }
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (value === 'all') url.searchParams.delete('topic');
      else url.searchParams.set('topic', value);
      window.history.replaceState(null, '', url);
    }
  };

  group.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (button) apply(button.dataset.filter);
  });
  const initial = new URLSearchParams(window.location.search).get('topic');
  if (initial) apply(initial, { announce: false, updateUrl: false });
}

/** Marks the section being read in the table of contents. */
export function initToc() {
  const toc = document.querySelector('[data-toc]');
  if (!toc) return;
  const links = new Map([...toc.querySelectorAll('a[href^="#"]')].map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const headings = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!headings.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const probe = window.innerHeight * 0.3;
    let active = null;
    for (const h of headings) if (h.getBoundingClientRect().top <= probe) active = h.id;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = headings.at(-1).id;
    for (const [id, a] of links) {
      if (id === active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

/** A thin bar under the header that fills as the article is read. */
export function initProgress() {
  const bar = document.querySelector('[data-read-progress]');
  const body = document.querySelector('[data-post-body]');
  if (!bar || !body) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = body.getBoundingClientRect();
    const total = rect.height - window.innerHeight * 0.6;
    const done = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - rect.top) / Math.max(total, 1)));
    bar.style.transform = `scaleX(${done.toFixed(4)})`;
  };
  const schedule = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
}
