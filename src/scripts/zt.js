// Figure 1 runtime: animates packets along the edges, applies verdicts per mode,
// prints Hubble-style flow logs and shows the generated policy of the selected workload.
import { SCENARIOS, verdict, logLine, policyYaml, svgMarkup, edges, edgeKey, nodeById, tally } from './zt-model.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DEFAULT_SELECTION = { platform: 'api', core5g: 'udm' };
const MAX_LOG = 60;
const STOP = { forwarded: 1, breach: 1, dropped: { ingress: 0.8, egress: 0.2 }, denied: 0.88 };

const rand = (min, max) => min + Math.random() * (max - min);
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

export function initZeroTrust(figure, ui) {
  const svg = figure.querySelector('[data-zt-svg]');
  const logEl = figure.querySelector('[data-zt-log]');
  const yamlEl = figure.querySelector('[data-zt-yaml]');
  const selectedEl = figure.querySelector('[data-zt-selected]');
  const hintEl = figure.querySelector('[data-zt-hint]');
  const liveEl = figure.querySelector('[data-zt-live]');
  const pauseBtn = figure.querySelector('[data-zt-pause]');
  const counters = Object.fromEntries(
    [...figure.querySelectorAll('[data-zt-count]')].map((el) => [el.dataset.ztCount, el]),
  );
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const labels = {
    outside: ui.outside,
    identity: ui.identity,
    compromised: ui.compromised,
    compromisedShort: ui.compromisedShort,
  };

  const state = {
    scenario: SCENARIOS[figure.dataset.scenario] ?? SCENARIOS.platform,
    mode: figure.dataset.mode ?? 'flat',
    selected: null,
    paused: false,
    visible: true,
    packets: [],
    timers: [],
    counts: { forwarded: 0, dropped: 0, denied: 0, breach: 0 },
    pathLength: new Map(),
    last: 0,
  };

  // ---------- rendering ----------
  const pathFor = (key) => svg.querySelector(`.zt-edge[data-edge="${CSS.escape(key)}"]`);
  const nodeEl = (id) => svg.querySelector(`.zt-node[data-node="${CSS.escape(id)}"]`);

  function renderScenario() {
    svg.innerHTML = svgMarkup(state.scenario, state.mode, labels);
    state.pathLength.clear();
    for (const path of svg.querySelectorAll('.zt-edge')) state.pathLength.set(path.dataset.edge, path.getTotalLength());
    state.packets = [];
    resetTimers();
    select(DEFAULT_SELECTION[state.scenario.id] ?? state.scenario.nodes[1].id);
  }

  function applyMode() {
    for (const e of edges(state.scenario, state.mode)) {
      const path = pathFor(e.key);
      if (!path) continue;
      path.dataset.state = e.state;
      if (e.mtls) path.dataset.mtls = 'true';
      else delete path.dataset.mtls;
    }
    for (const b of figure.querySelectorAll('[data-zt-mode]')) b.setAttribute('aria-pressed', String(b.dataset.ztMode === state.mode));
    hintEl.textContent = ui.modeHints[state.mode];
    figure.dataset.mode = state.mode;
    resetCounts();
    const t = tally(state.scenario, state.mode);
    liveEl.textContent = fill(ui.live[state.mode], { breach: t.breach, dropped: t.dropped, l7: t.denied });
    renderPolicy();
    if (reduced.matches) staticLog();
  }

  function select(id) {
    state.selected = id;
    for (const node of svg.querySelectorAll('.zt-node')) node.setAttribute('aria-pressed', String(node.dataset.node === id));
    for (const path of svg.querySelectorAll('.zt-edge')) {
      const [from, to] = path.dataset.edge.split('>');
      const touches = from === id || to === id;
      path.dataset.focus = String(touches);
      path.dataset.dim = String(!touches);
    }
    selectedEl.textContent = nodeById(state.scenario, id)?.label ?? id;
    renderPolicy();
  }

  function renderPolicy() {
    yamlEl.textContent = policyYaml(state.scenario, state.selected, state.mode, ui.noPolicy);
  }

  function resetCounts() {
    state.counts = { forwarded: 0, dropped: 0, denied: 0, breach: 0 };
    if (reduced.matches) state.counts = tally(state.scenario, state.mode);
    for (const [k, el] of Object.entries(counters)) el.textContent = String(state.counts[k]);
  }

  // ---------- log ----------
  function appendLog(flow, when = new Date()) {
    const parts = logLine(state.scenario, flow, state.mode, when);
    const line = document.createElement('span');
    line.className = 'ln';
    const time = document.createElement('span');
    time.className = 't';
    time.textContent = parts.time;
    const verdictEl = document.createElement('span');
    verdictEl.className = `v-${parts.verdict}`;
    verdictEl.textContent = parts.detail + (parts.verdict === 'breach' ? '  !! breach' : '');
    line.append(time, ` ${parts.src} ${parts.arrow} ${parts.dst} `, verdictEl);
    if (parts.mtls) {
      const m = document.createElement('span');
      m.className = 'mtls';
      m.textContent = '  mTLS';
      line.append(m);
    }
    const stick = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 24;
    logEl.append(line);
    while (logEl.childElementCount > MAX_LOG) logEl.firstElementChild.remove();
    if (stick) logEl.scrollTop = logEl.scrollHeight;
  }

  function staticLog() {
    logEl.replaceChildren();
    const now = Date.now();
    state.scenario.flows.forEach((flow, i) => appendLog(flow, new Date(now + i * 37)));
  }

  // ---------- animation ----------
  function resetTimers() {
    const now = performance.now();
    state.timers = state.scenario.flows.map((flow) => ({ flow, next: now + rand(150, flow.attack ? 2600 : 1800) }));
  }

  function emit(flow, now) {
    const key = edgeKey(flow);
    const path = pathFor(key);
    if (!path) return;
    const { verdict: v, where } = verdict(state.scenario, flow, state.mode);
    const stop = v === 'dropped' ? STOP.dropped[where] : STOP[v];
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', flow.attack ? '4.2' : '3.6');
    dot.setAttribute('class', 'zt-packet');
    if (flow.attack) dot.dataset.bad = 'true';
    svg.querySelector('.zt-packets').append(dot);
    state.packets.push({ flow, path, dot, start: now, duration: rand(1000, 1500) * stop + 250, stop, verdict: v, where, key });
  }

  function mark(x, y, kind) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', 'zt-mark');
    p.setAttribute('d', 'M-5 -5L5 5M5 -5L-5 5');
    if (kind === 'denied') {
      p.dataset.kind = 'denied';
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'zt-mark-text');
      text.setAttribute('y', '-10');
      text.textContent = '403';
      g.append(text);
    }
    g.append(p);
    svg.querySelector('.zt-marks').append(g);
    setTimeout(() => g.remove(), 900);
  }

  function flash(id, kind) {
    const el = nodeEl(id);
    if (!el) return;
    el.dataset.hit = kind;
    clearTimeout(Number(el.dataset.hitTimer));
    el.dataset.hitTimer = String(setTimeout(() => delete el.dataset.hit, 520));
  }

  function finish(packet) {
    const length = state.pathLength.get(packet.key) ?? packet.path.getTotalLength();
    const point = packet.path.getPointAtLength(length * packet.stop);
    if (packet.verdict === 'dropped' || packet.verdict === 'denied') {
      mark(point.x, point.y, packet.verdict);
      flash(packet.where === 'egress' ? packet.flow.from : packet.flow.to, 'shield');
    } else if (packet.verdict === 'breach') {
      flash(packet.flow.to, 'breach');
    }
    state.counts[packet.verdict] += 1;
    counters[packet.verdict].textContent = String(state.counts[packet.verdict]);
    appendLog(packet.flow);
    packet.dot.remove();
  }

  function frame(now) {
    if (!state.paused && state.visible && !reduced.matches) {
      for (const timer of state.timers) {
        if (now >= timer.next) {
          emit(timer.flow, now);
          timer.next = now + rand(timer.flow.attack ? 2300 : 1700, timer.flow.attack ? 3900 : 3400);
        }
      }
      state.packets = state.packets.filter((packet) => {
        const t = Math.min(1, (now - packet.start) / packet.duration);
        const length = state.pathLength.get(packet.key) ?? 0;
        const point = packet.path.getPointAtLength(length * packet.stop * t);
        packet.dot.setAttribute('cx', point.x.toFixed(1));
        packet.dot.setAttribute('cy', point.y.toFixed(1));
        if (t >= 1) {
          finish(packet);
          return false;
        }
        return true;
      });
    } else if (state.last && now - state.last > 0) {
      // Keep packets frozen in place while paused: shift their start time.
      for (const packet of state.packets) packet.start += now - state.last;
      for (const timer of state.timers) timer.next += now - state.last;
    }
    state.last = now;
    requestAnimationFrame(frame);
  }

  // ---------- events ----------
  figure.addEventListener('click', (event) => {
    const modeBtn = event.target.closest('[data-zt-mode]');
    if (modeBtn && modeBtn.dataset.ztMode !== state.mode) {
      state.mode = modeBtn.dataset.ztMode;
      for (const p of state.packets) p.dot.remove();
      state.packets = [];
      applyMode();
      return;
    }
    const scenarioBtn = event.target.closest('[data-zt-scenario]');
    if (scenarioBtn && scenarioBtn.dataset.ztScenario !== state.scenario.id) {
      state.scenario = SCENARIOS[scenarioBtn.dataset.ztScenario];
      figure.dataset.scenario = state.scenario.id;
      for (const b of figure.querySelectorAll('[data-zt-scenario]')) b.setAttribute('aria-pressed', String(b === scenarioBtn));
      logEl.replaceChildren();
      renderScenario();
      applyMode();
      return;
    }
    const node = event.target.closest('.zt-node');
    if (node) select(node.dataset.node);
  });
  svg.addEventListener('keydown', (event) => {
    const node = event.target.closest('.zt-node');
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      select(node.dataset.node);
    }
  });
  pauseBtn.addEventListener('click', () => {
    state.paused = !state.paused;
    pauseBtn.setAttribute('aria-pressed', String(state.paused));
    pauseBtn.textContent = state.paused ? ui.resume : ui.pause;
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting && !document.hidden;
    }).observe(figure);
  }
  document.addEventListener('visibilitychange', () => {
    state.visible = !document.hidden;
  });
  reduced.addEventListener('change', () => {
    for (const p of state.packets) p.dot.remove();
    state.packets = [];
    applyMode();
  });

  renderScenario();
  applyMode();
  if (reduced.matches) pauseBtn.hidden = true;
  requestAnimationFrame(frame);
}
