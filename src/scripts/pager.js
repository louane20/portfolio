// The `less` experience: a reverse-video status line, `/` search with n/N,
// j/k/g/G/space/b scrolling, ]/[ to jump between sections, h for help.
import { isTyping } from './ui.js';

const LINE_PX = 24;

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function initPager(data, { palette, help, theme, toast }) {
  const pager = document.querySelector('[data-pager]');
  if (!pager) return;
  pager.hidden = false;
  const ui = data.ui;
  const status = pager.querySelector('.pager-status');
  const sectionEl = pager.querySelector('[data-pager-section]');
  const lineEl = pager.querySelector('[data-pager-line]');
  const pctEl = pager.querySelector('[data-pager-pct]');
  const msgEl = pager.querySelector('[data-pager-msg]');
  const form = pager.querySelector('[data-pager-search]');
  const input = form.querySelector('input');
  const main = document.querySelector('main');

  const sections = data.sections
    .map((s) => ({ ...s, el: document.getElementById(s.id) }))
    .filter((s) => s.el);
  const navLinks = new Map([...document.querySelectorAll('[data-nav]')].map((a) => [a.dataset.nav, a]));
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  for (const kbd of document.querySelectorAll('[data-mod-key]')) kbd.textContent = isMac ? '⌘K' : 'Ctrl K';

  // ---------- status line + scrollspy ----------
  let current = null;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY;
    lineEl.textContent = String(Math.floor(y / LINE_PX) + 1);
    pctEl.textContent = String(Math.min(100, Math.round((y / max) * 100)));
    const probe = window.innerHeight * 0.3;
    let active = sections[0];
    for (const s of sections) {
      if (s.el.getBoundingClientRect().top <= probe) active = s;
    }
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 4 && sections.length) {
      active = sections[sections.length - 1];
    }
    if (active && active !== current) {
      current = active;
      sectionEl.textContent = active.man;
      for (const [id, a] of navLinks) {
        if (id === active.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      }
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  let msgTimer;
  const say = (text, ms = 4500) => {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => (msgEl.textContent = ''), ms);
  };

  // ---------- search ----------
  let hits = [];
  let index = -1;
  const clearHits = () => {
    for (const mark of main.querySelectorAll('mark.hit')) {
      const parent = mark.parentNode;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
    hits = [];
    index = -1;
  };
  const focusHit = (i) => {
    if (!hits.length) return;
    index = (i + hits.length) % hits.length;
    hits.forEach((h, j) => (h.dataset.current = String(j === index)));
    const hit = hits[index];
    const details = hit.closest('details');
    if (details && !details.open) details.open = true;
    hit.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    say(hits.length === 1 ? ui.oneMatch : `${index + 1}/${fill(ui.matches, { n: hits.length })}`);
  };
  const search = (query) => {
    clearHits();
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const el = node.parentElement;
        if (!el || el.closest('script, style, svg, [data-zt-log], .sr-only, noscript')) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().includes(needle) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode() && nodes.length < 400) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const lower = text.toLowerCase();
      const frag = document.createDocumentFragment();
      let from = 0;
      for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, at + needle.length)) {
        frag.append(text.slice(from, at));
        const mark = document.createElement('mark');
        mark.className = 'hit';
        mark.textContent = text.slice(at, at + needle.length);
        frag.append(mark);
        hits.push(mark);
        from = at + needle.length;
      }
      frag.append(text.slice(from));
      node.parentNode.replaceChild(frag, node);
    }
    if (!hits.length) {
      say(ui.notFound);
      return;
    }
    // Like less: start from the first match below the current position.
    const first = hits.findIndex((h) => h.getBoundingClientRect().top > 8);
    focusHit(first === -1 ? 0 : first);
  };
  const openSearch = () => {
    form.hidden = false;
    status.hidden = true;
    input.value = '';
    input.focus();
  };
  const closeSearch = () => {
    form.hidden = true;
    status.hidden = false;
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = input.value;
    closeSearch();
    search(q);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    }
  });
  input.addEventListener('blur', () => {
    if (!form.hidden) setTimeout(closeSearch, 120);
  });

  // ---------- buttons ----------
  pager.addEventListener('click', (event) => {
    const action = event.target.closest('[data-pager-action]')?.dataset.pagerAction;
    if (action === 'search') openSearch();
    if (action === 'palette') palette.open();
    if (action === 'help') help.open();
  });

  // ---------- keys ----------
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const jumpSection = (dir) => {
    const top = window.scrollY + 2;
    const tops = sections.map((s) => s.el.getBoundingClientRect().top + window.scrollY);
    let target;
    if (dir > 0) target = tops.find((t) => t > top + 8);
    else target = [...tops].reverse().find((t) => t < top - 8);
    if (target !== undefined) window.scrollTo({ top: target, behavior: smooth() });
  };
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      palette.open();
      return;
    }
    if (isTyping(event)) return;
    switch (event.key) {
      case '/':
        event.preventDefault();
        openSearch();
        break;
      case 'n':
        if (hits.length) focusHit(index + 1);
        break;
      case 'N':
        if (hits.length) focusHit(index - 1);
        break;
      case 'j':
        window.scrollBy({ top: LINE_PX * 3 });
        break;
      case 'k':
        window.scrollBy({ top: -LINE_PX * 3 });
        break;
      case 'f':
        window.scrollBy({ top: window.innerHeight * 0.9, behavior: smooth() });
        break;
      case 'b':
        window.scrollBy({ top: -window.innerHeight * 0.9, behavior: smooth() });
        break;
      case 'g':
        window.scrollTo({ top: 0, behavior: smooth() });
        break;
      case 'G':
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth() });
        break;
      case ']':
        jumpSection(1);
        break;
      case '[':
        jumpSection(-1);
        break;
      case 'h':
      case '?':
        event.preventDefault();
        help.open();
        break;
      case 't':
        theme.toggle();
        break;
      case 'q':
        toast(ui.quit);
        break;
      case 'Escape':
        if (hits.length) {
          clearHits();
          say('', 0);
        }
        break;
      default:
    }
  });
}
