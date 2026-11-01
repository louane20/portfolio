// An fzf-style command palette: fuzzy filter, highlighted matches, n/total counter.
import { copyText } from './ui.js';

/** fzf-like scoring: characters must appear in order; consecutive runs and word starts score higher. */
export function fuzzy(query, text) {
  if (!query) return { score: 0, positions: [] };
  const q = query.toLowerCase();
  const s = text.toLowerCase();
  const positions = [];
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    if (ch === ' ') continue;
    const at = s.indexOf(ch, from);
    if (at === -1) return null;
    positions.push(at);
    score += 1;
    if (at === prev + 1) score += 3;
    if (at === 0 || /[\s\-_(/.]/.test(s[at - 1])) score += 2;
    prev = at;
    from = at + 1;
  }
  score -= (positions.at(-1) - positions[0]) * 0.05;
  return { score, positions };
}

function highlight(text, positions) {
  const frag = document.createDocumentFragment();
  const set = new Set(positions);
  let run = '';
  let marked = false;
  const flush = () => {
    if (!run) return;
    if (marked) {
      const m = document.createElement('mark');
      m.textContent = run;
      frag.append(m);
    } else {
      frag.append(run);
    }
    run = '';
  };
  [...text].forEach((ch, i) => {
    const isHit = set.has(i);
    if (isHit !== marked) {
      flush();
      marked = isHit;
    }
    run += ch;
  });
  flush();
  return frag;
}

export function initPalette(data, { theme, toast, help }) {
  const dialog = document.querySelector('[data-palette]');
  if (!dialog) return { open() {} };
  const input = dialog.querySelector('[data-palette-input]');
  const list = dialog.querySelector('[data-palette-list]');
  const info = dialog.querySelector('[data-palette-info]');
  const ui = data.ui;
  const a = ui.actions;

  const go = (href, newTab) => {
    if (newTab) window.open(href, '_blank', 'noopener');
    else window.location.href = href;
  };
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${id}`);
    } else {
      go(`${data.home}#${id}`);
    }
  };
  const download = (href) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    document.body.append(link);
    link.click();
    link.remove();
  };

  const items = [
    ...data.sections.map((s) => ({ kind: ui.paletteSections, text: s.id === 'top' ? `${s.man}` : `${s.label}`, hint: s.man, run: () => scrollTo(s.id) })),
    { kind: ui.paletteActions, text: a.resume, run: () => download(data.resume) },
    {
      kind: ui.paletteActions,
      text: a.email,
      hint: data.email,
      run: async () => toast((await copyText(data.email)) ? `${ui.copied}: ${data.email}` : data.email),
    },
    { kind: ui.paletteActions, text: a.theme, hint: 't', run: () => theme.toggle() },
    { kind: ui.paletteActions, text: a.lang, run: () => go(data.otherLangHref) },
    { kind: ui.paletteActions, text: a.paper, run: () => go(data.paper, true) },
    { kind: ui.paletteActions, text: a.pipeline, run: () => go(`https://github.com/${data.repository}/actions`, true) },
    { kind: ui.paletteActions, text: a.github, run: () => go(data.links.github, true) },
    { kind: ui.paletteActions, text: a.linkedin, run: () => go(data.links.linkedin, true) },
    { kind: ui.paletteActions, text: a.man, hint: 'man -l guerd.1', run: () => download(data.man) },
    { kind: ui.paletteActions, text: a.help, hint: 'h', run: () => help.open() },
    ...data.notes.map((n) => ({ kind: ui.paletteNotes, text: n.title, run: () => go(n.href) })),
  ];

  let shown = [];
  let active = 0;
  let opener = null;

  const render = () => {
    const query = input.value.trim();
    shown = items
      .map((item, order) => ({ item, order, m: fuzzy(query, item.text) }))
      .filter((r) => r.m)
      .sort((x, y) => y.m.score - x.m.score || x.order - y.order);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren();
    info.textContent = `${shown.length}/${items.length}`;
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'palette-empty';
      li.textContent = ui.paletteEmpty;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-disabled', 'true');
      list.append(li);
      input.removeAttribute('aria-activedescendant');
      return;
    }
    shown.forEach((r, i) => {
      const li = document.createElement('li');
      li.id = `palette-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      const kind = document.createElement('span');
      kind.className = 'palette-kind';
      kind.textContent = r.item.kind;
      const text = document.createElement('span');
      text.className = 'palette-text';
      text.append(highlight(r.item.text, r.m.positions));
      li.append(kind, text);
      if (r.item.hint) {
        const hint = document.createElement('span');
        hint.className = 'palette-hint';
        hint.textContent = r.item.hint;
        li.append(hint);
      }
      li.addEventListener('pointermove', () => {
        if (active !== i) {
          active = i;
          syncActive();
        }
      });
      li.addEventListener('click', () => run(i));
      list.append(li);
    });
    syncActive();
  };
  const syncActive = () => {
    [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    const el = list.children[active];
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }
  };
  const run = (i) => {
    const r = shown[i];
    if (!r) return;
    dialog.close();
    r.item.run();
  };

  input.addEventListener('input', () => {
    active = 0;
    render();
  });
  input.addEventListener('keydown', (event) => {
    const key = event.key;
    const down = key === 'ArrowDown' || (event.ctrlKey && (key === 'n' || key === 'j'));
    const up = key === 'ArrowUp' || (event.ctrlKey && (key === 'p' || key === 'k'));
    if (down || up) {
      event.preventDefault();
      if (shown.length) {
        active = (active + (down ? 1 : -1) + shown.length) % shown.length;
        syncActive();
      }
    } else if (key === 'Enter') {
      event.preventDefault();
      run(active);
    }
  });
  dialog.addEventListener('close', () => {
    if (opener && document.contains(opener)) opener.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  return {
    open() {
      if (dialog.open) return;
      opener = document.activeElement;
      input.value = '';
      active = 0;
      render();
      dialog.showModal();
      input.focus();
    },
  };
}
