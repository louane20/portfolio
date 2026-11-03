// EXIT STATUS: reads the latest workflow runs of this very repository from the
// public GitHub API (no token, 60 requests/hour/IP, cached for 5 minutes).

const API = 'https://api.github.com';
const CACHE_KEY = 'guerd-pipeline-v1';
const CACHE_MS = 5 * 60 * 1000;
const WORKFLOWS = {
  ci: '.github/workflows/ci-cd.yml',
  image: '.github/workflows/container.yml',
  'zero-trust': '.github/workflows/zero-trust-e2e.yml',
  codeql: '.github/workflows/codeql.yml',
};

function stateOf(status, conclusion) {
  if (status && status !== 'completed') return status === 'in_progress' ? 'running' : 'queued';
  if (conclusion === 'success') return 'success';
  if (conclusion === 'skipped' || conclusion === 'neutral') return 'skipped';
  if (conclusion === 'cancelled') return 'cancelled';
  if (conclusion) return 'failure';
  return 'unknown';
}

function ago(iso, units) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  const fill = (tpl, n) => tpl.replace('{n}', String(n));
  if (s < 60) return fill(units.s, Math.round(s));
  if (s < 3600) return fill(units.m, Math.round(s / 60));
  if (s < 86400) return fill(units.h, Math.round(s / 3600));
  return fill(units.d, Math.round(s / 86400));
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function load(repo) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && cached.repo === repo && Date.now() - cached.at < CACHE_MS) return cached.data;
  } catch {
    /* no cache available */
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const runs = await getJson(`${API}/repos/${repo}/actions/runs?branch=main&per_page=40&exclude_pull_requests=true`, controller.signal);
    const latest = {};
    for (const run of runs.workflow_runs ?? []) {
      for (const [key, path] of Object.entries(WORKFLOWS)) {
        if (run.path === path && !latest[key]) latest[key] = run;
      }
    }
    let jobs = [];
    if (latest.ci) {
      const data = await getJson(`${API}/repos/${repo}/actions/runs/${latest.ci.id}/jobs?per_page=50`, controller.signal);
      jobs = (data.jobs ?? []).map((j) => ({ name: j.name, status: j.status, conclusion: j.conclusion }));
    }
    const slim = (run) =>
      run && {
        id: run.id,
        number: run.run_number,
        status: run.status,
        conclusion: run.conclusion,
        sha: run.head_sha,
        url: run.html_url,
        updated: run.updated_at,
      };
    const data = {
      ci: slim(latest.ci),
      image: slim(latest.image),
      'zero-trust': slim(latest['zero-trust']),
      codeql: slim(latest.codeql),
      jobs,
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ repo, at: Date.now(), data }));
    } catch {
      /* quota or privacy mode */
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function initPipeline(root, ui) {
  const repo = root.dataset.repo;
  const runEl = root.querySelector('[data-pipe-run]');
  const stages = new Map([...root.querySelectorAll('[data-stage]')].map((el) => [el.dataset.stage, el]));
  const setStage = (key, state) => {
    const el = stages.get(key);
    if (!el) return;
    el.dataset.state = state;
    el.querySelector('[data-stage-state]').textContent = ui[state] ?? ui.unknown;
  };
  try {
    const data = await load(repo);
    if (!data.ci) {
      runEl.textContent = ui.notYet;
      return;
    }
    // Matrix jobs ("Test (desktop)", "Test (mobile)") share a stage: the worst state wins.
    const rank = { failure: 5, cancelled: 4, running: 3, queued: 2, success: 1, skipped: 0, unknown: -1 };
    const merged = new Map();
    for (const job of data.jobs) {
      const key = job.name.trim().split(/[\s(]+/)[0].toLowerCase();
      const state = stateOf(job.status, job.conclusion);
      if (!merged.has(key) || rank[state] > rank[merged.get(key)]) merged.set(key, state);
    }
    for (const [key, state] of merged) if (stages.has(key)) setStage(key, state);
    for (const key of ['image', 'zero-trust', 'codeql']) {
      if (data[key]) setStage(key, stateOf(data[key].status, data[key].conclusion));
    }
    const state = stateOf(data.ci.status, data.ci.conclusion);
    const tone = state === 'success' ? 'success' : state === 'failure' ? 'failure' : 'running';
    // "Latest run #42 on main (a1b2c3d): passed, 3 h ago. View run"
    runEl.replaceChildren();
    const label = document.createTextNode(`${ui.latest} #${data.ci.number} ${ui.onMain} (`);
    const sha = document.createElement('code');
    sha.textContent = data.ci.sha.slice(0, 7);
    const verdict = document.createElement('span');
    verdict.dataset.tone = tone;
    verdict.textContent = ui[state] ?? state;
    const when = document.createTextNode(`, ${ago(data.ci.updated, ui.ago)}. `);
    const link = document.createElement('a');
    link.href = data.ci.url;
    link.rel = 'noopener';
    link.textContent = ui.viewRun;
    runEl.append(label, sha, document.createTextNode('): '), verdict, when, link);
  } catch {
    runEl.textContent = ui.unavailable;
  }
}
