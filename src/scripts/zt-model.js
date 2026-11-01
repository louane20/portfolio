// Zero Trust simulator model. Pure data and functions, no DOM: imported by the
// build (to server-render the first frame) and by the browser (to animate it).
//
// Policies are not written by hand. They are generated from the *intended* flows
// (legit: true), the same way intent-based access control derives rules from
// declared communication intents. Malicious flows are what an attacker tries.

export const MODES = ['flat', 'l4', 'l7'];

const W = 760;
const H = 400;

export const SCENARIOS = {
  platform: {
    id: 'platform',
    namespace: 'prod',
    svc: 'prod.svc',
    nodes: [
      { id: 'internet', kind: 'world', label: 'internet', x: 58, y: 200 },
      { id: 'kong', kind: 'pod', label: 'kong', identity: 1201, x: 178, y: 200 },
      { id: 'frontend', kind: 'pod', label: 'frontend', identity: 2307, x: 306, y: 200 },
      { id: 'api', kind: 'pod', label: 'api', identity: 3452, x: 446, y: 200 },
      { id: 'postgres', kind: 'pod', label: 'postgres', identity: 5119, x: 632, y: 74 },
      { id: 'vault', kind: 'pod', label: 'vault', identity: 6023, x: 632, y: 200 },
      { id: 'kafka', kind: 'pod', label: 'kafka', identity: 4108, x: 632, y: 326 },
      { id: 'worker', kind: 'pod', label: 'worker', identity: 7781, x: 446, y: 338, compromised: true },
      { id: 'exfil', kind: 'world', label: '203.0.113.66', x: 178, y: 338 },
    ],
    flows: [
      { from: 'internet', to: 'kong', port: 443, legit: true, http: { method: 'GET', path: '/products/42', cilium: '/.*', istio: '/*' } },
      { from: 'kong', to: 'frontend', port: 8080, legit: true, http: { method: 'GET', path: '/products/42', cilium: '/.*', istio: '/*' } },
      { from: 'frontend', to: 'api', port: 8080, legit: true, http: { method: 'GET', path: '/api/products/42', cilium: '/api/products/[0-9]+', istio: '/api/products/*' } },
      { from: 'frontend', to: 'api', port: 8080, legit: true, http: { method: 'POST', path: '/api/orders', cilium: '/api/orders', istio: '/api/orders' } },
      { from: 'api', to: 'postgres', port: 5432, legit: true },
      { from: 'api', to: 'vault', port: 8200, legit: true, http: { method: 'GET', path: '/v1/secret/data/api', cilium: '/v1/secret/data/api', istio: '/v1/secret/data/api' } },
      { from: 'api', to: 'kafka', port: 9092, legit: true },
      { from: 'worker', to: 'kafka', port: 9092, legit: true },
      { from: 'worker', to: 'postgres', port: 5432, attack: 'lateral movement to the database' },
      { from: 'worker', to: 'vault', port: 8200, http: { method: 'GET', path: '/v1/secret/data/root' }, attack: 'reading secrets it was never granted' },
      { from: 'worker', to: 'exfil', port: 443, attack: 'exfiltration to an unknown host' },
      { from: 'frontend', to: 'api', port: 8080, http: { method: 'GET', path: '/api/admin/export' }, attack: 'SSRF through the frontend' },
    ],
  },
  core5g: {
    id: 'core5g',
    namespace: 'core5g',
    svc: 'core5g.svc',
    nodes: [
      { id: 'gnb', kind: 'world', label: 'gNB', x: 58, y: 200 },
      { id: 'amf', kind: 'pod', label: 'amf', identity: 2101, x: 200, y: 200 },
      { id: 'ausf', kind: 'pod', label: 'ausf', identity: 2204, x: 384, y: 72 },
      { id: 'nrf', kind: 'pod', label: 'nrf', identity: 2002, x: 384, y: 200 },
      { id: 'smf', kind: 'pod', label: 'smf', identity: 2306, x: 384, y: 328 },
      { id: 'udm', kind: 'pod', label: 'udm', identity: 2410, x: 584, y: 72 },
      { id: 'rogue', kind: 'pod', label: 'rogue-nf', identity: 9901, x: 584, y: 200, compromised: true },
      { id: 'upf', kind: 'pod', label: 'upf', identity: 2512, x: 584, y: 328 },
      { id: 'exfil', kind: 'world', label: '203.0.113.66', x: 708, y: 200 },
    ],
    flows: [
      { from: 'gnb', to: 'amf', port: 38412, proto: 'SCTP', legit: true },
      { from: 'amf', to: 'ausf', port: 443, legit: true, http: { method: 'POST', path: '/nausf-auth/v1/ue-authentications', cilium: '/nausf-auth/v1/ue-authentications', istio: '/nausf-auth/v1/ue-authentications' } },
      { from: 'ausf', to: 'udm', port: 443, legit: true, http: { method: 'POST', path: '/nudm-ueau/v1/suci-0-208-93-0-0-0-00000001/security-information/generate-auth-data', cilium: '/nudm-ueau/v1/[^/]+/security-information/generate-auth-data', istio: '/nudm-ueau/v1/*' } },
      { from: 'amf', to: 'udm', port: 443, legit: true, http: { method: 'GET', path: '/nudm-sdm/v2/imsi-208930000000001/am-data', cilium: '/nudm-sdm/v2/[^/]+/am-data', istio: '*/am-data' } },
      { from: 'amf', to: 'smf', port: 443, legit: true, http: { method: 'POST', path: '/nsmf-pdusession/v1/sm-contexts', cilium: '/nsmf-pdusession/v1/sm-contexts', istio: '/nsmf-pdusession/v1/sm-contexts' } },
      { from: 'smf', to: 'udm', port: 443, legit: true, http: { method: 'GET', path: '/nudm-sdm/v2/imsi-208930000000001/sm-data', cilium: '/nudm-sdm/v2/[^/]+/sm-data', istio: '*/sm-data' } },
      { from: 'smf', to: 'upf', port: 8805, proto: 'UDP', legit: true },
      { from: 'amf', to: 'nrf', port: 443, legit: true, http: { method: 'GET', path: '/nnrf-disc/v1/nf-instances', cilium: '/nnrf-disc/v1/nf-instances', istio: '/nnrf-disc/v1/nf-instances' } },
      { from: 'smf', to: 'nrf', port: 443, legit: true, http: { method: 'GET', path: '/nnrf-disc/v1/nf-instances', cilium: '/nnrf-disc/v1/nf-instances', istio: '/nnrf-disc/v1/nf-instances' } },
      { from: 'rogue', to: 'udm', port: 443, http: { method: 'GET', path: '/nudm-sdm/v2/imsi-208930000000001/am-data' }, attack: 'stealing subscriber data' },
      { from: 'rogue', to: 'nrf', port: 443, http: { method: 'PUT', path: '/nnrf-nfm/v1/nf-instances/6c8d0f3e' }, attack: 'registering a fake network function' },
      { from: 'rogue', to: 'exfil', port: 443, attack: 'exfiltration to an unknown host' },
      { from: 'smf', to: 'udm', port: 443, http: { method: 'GET', path: '/nudm-sdm/v2/imsi-208930000000001/am-data' }, attack: 'an over-privileged SMF reading AMF data' },
    ],
  },
};

export const nodeById = (scenario, id) => scenario.nodes.find((n) => n.id === id);
const isWorld = (node) => node.kind === 'world';
const proto = (flow) => flow.proto ?? 'TCP';
export const edgeKey = (flow) => `${flow.from}>${flow.to}`;

/** Intended flows into `to` (ingress intents). */
const ingressIntents = (scenario, to) => scenario.flows.filter((f) => f.legit && f.to === to);
/** Intended flows out of `from` (egress intents). */
const egressIntents = (scenario, from) => scenario.flows.filter((f) => f.legit && f.from === from);

/**
 * Verdict for one flow under one mode.
 * forwarded: allowed and harmless. breach: allowed but malicious.
 * dropped: stopped by L3/L4 policy (eBPF). denied: stopped by the L7 policy.
 * `where` says where the packet stops: egress (at the source) or ingress (at the destination).
 */
export function verdict(scenario, flow, mode) {
  const bad = Boolean(flow.attack);
  if (mode === 'flat') return { verdict: bad ? 'breach' : 'forwarded' };

  const src = nodeById(scenario, flow.from);
  const dst = nodeById(scenario, flow.to);
  // Egress: a pod reaching outside the cluster needs an explicit egress intent.
  if (isWorld(dst)) {
    const ok = egressIntents(scenario, flow.from).some((f) => f.to === flow.to && f.port === flow.port);
    if (!ok) return { verdict: 'dropped', where: 'egress' };
  } else {
    const ok = ingressIntents(scenario, flow.to).some(
      (f) => f.from === flow.from && f.port === flow.port && proto(f) === proto(flow),
    );
    if (!ok) return { verdict: 'dropped', where: 'ingress' };
  }
  if (mode === 'l7' && flow.http && !isWorld(src)) {
    const rules = ingressIntents(scenario, flow.to).filter((f) => f.from === flow.from && f.port === flow.port && f.http);
    if (rules.length) {
      const ok = rules.some(
        (f) => f.http.method === flow.http.method && new RegExp(`^${f.http.cilium}$`).test(flow.http.path),
      );
      if (!ok) return { verdict: 'denied', where: 'ingress' };
    }
  }
  return { verdict: bad ? 'breach' : 'forwarded' };
}

export function tally(scenario, mode) {
  const counts = { forwarded: 0, dropped: 0, denied: 0, breach: 0 };
  for (const flow of scenario.flows) counts[verdict(scenario, flow, mode).verdict] += 1;
  return counts;
}

/** Whether a flow is protected by mTLS in this mode (pod to pod, service mesh on). */
export const mtls = (scenario, flow, mode) =>
  mode === 'l7' && !isWorld(nodeById(scenario, flow.from)) && !isWorld(nodeById(scenario, flow.to));

// ---------------------------------------------------------------------------
// Hubble-style log line (compact output, shortened to fit the figure).

const pad = (n, w = 2) => String(n).padStart(w, '0');
export function clock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function endpoint(scenario, id, port) {
  const node = nodeById(scenario, id);
  if (isWorld(node)) return { name: port ? `${node.label}:${port}` : node.label, id: 'world' };
  return { name: `${scenario.namespace}/${node.label}${port ? `:${port}` : ''}`, id: `ID:${node.identity}` };
}

const shorten = (p, max = 40) => (p.length <= max ? p : `${p.slice(0, 19)}…${p.slice(-(max - 20))}`);

/** Returns structured parts so the UI can colour them; `text` is the plain line. */
export function logLine(scenario, flow, mode, date = new Date()) {
  const { verdict: v } = verdict(scenario, flow, mode);
  const src = endpoint(scenario, flow.from);
  const dst = endpoint(scenario, flow.to, flow.port);
  const arrow = v === 'dropped' ? '<>' : '->';
  let detail;
  if (flow.http && (mode === 'l7' || v === 'denied') && !isWorld(nodeById(scenario, flow.to))) {
    detail = `http-request ${v === 'denied' ? 'DROPPED' : 'FORWARDED'} (${flow.http.method} ${shorten(flow.http.path)})`;
  } else if (v === 'dropped') {
    detail = `Policy denied DROPPED (${proto(flow)}${proto(flow) === 'TCP' ? ' SYN' : ''})`;
  } else {
    detail = `to-endpoint FORWARDED (${proto(flow)}${proto(flow) === 'TCP' ? ' SYN' : ''})`;
  }
  const parts = {
    time: clock(date),
    src: src.name,
    arrow,
    dst: dst.name,
    detail,
    verdict: v,
    // A connection dropped at L3/L4 never gets as far as a TLS handshake.
    mtls: mtls(scenario, flow, mode) && v !== 'dropped',
  };
  parts.text = `${parts.time}: ${parts.src} ${arrow} ${parts.dst} ${detail}`;
  return parts;
}

// ---------------------------------------------------------------------------
// Policy YAML, generated from the intents of the selected workload.

function ciliumPolicy(scenario, nodeId, withL7) {
  const node = nodeById(scenario, nodeId);
  const ingress = ingressIntents(scenario, nodeId);
  const egress = egressIntents(scenario, nodeId);
  const lines = [
    'apiVersion: cilium.io/v2',
    'kind: CiliumNetworkPolicy',
    'metadata:',
    `  name: ${node.label}`,
    `  namespace: ${scenario.namespace}`,
    'spec:',
    '  endpointSelector:',
    '    matchLabels:',
    `      app: ${node.label}`,
  ];
  const bySource = new Map();
  for (const f of ingress) {
    const key = f.from;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(f);
  }
  if (bySource.size) {
    lines.push('  ingress:');
    for (const [from, flows] of bySource) {
      const src = nodeById(scenario, from);
      if (isWorld(src)) {
        lines.push('    - fromEntities:', '        - world');
      } else {
        lines.push('    - fromEndpoints:', '        - matchLabels:', `            app: ${src.label}`);
      }
      const ports = [...new Set(flows.map((f) => `${f.port}/${proto(f)}`))];
      lines.push('      toPorts:');
      for (const p of ports) {
        const [port, pr] = p.split('/');
        lines.push('        - ports:', `            - port: "${port}"`, `              protocol: ${pr}`);
        const http = flows.filter((f) => f.http && String(f.port) === port);
        if (withL7 && http.length && !isWorld(src)) {
          lines.push('          rules:', '            http:');
          for (const f of http) lines.push(`              - method: ${f.http.method}`, `                path: "${f.http.cilium}"`);
        }
      }
    }
  } else {
    lines.push('  ingress: []  # nothing may connect to it');
  }
  const outside = egress.filter((f) => isWorld(nodeById(scenario, f.to)));
  const inside = egress.filter((f) => !isWorld(nodeById(scenario, f.to)));
  lines.push('  egress:');
  for (const f of inside) {
    lines.push('    - toEndpoints:', '        - matchLabels:', `            app: ${nodeById(scenario, f.to).label}`);
    lines.push('      toPorts:', '        - ports:', `            - port: "${f.port}"`, `              protocol: ${proto(f)}`);
  }
  for (const f of outside) lines.push('    - toEntities: [world]', `      toPorts: [{ ports: [{ port: "${f.port}" }] }]`);
  lines.push(
    '    - toEndpoints:  # DNS only',
    '        - matchLabels:',
    '            k8s:io.kubernetes.pod.namespace: kube-system',
    '            k8s-app: kube-dns',
    '      toPorts:',
    '        - ports:',
    '            - port: "53"',
    '              protocol: ANY',
  );
  return lines.join('\n');
}

function istioPolicy(scenario, nodeId) {
  const node = nodeById(scenario, nodeId);
  const ingress = ingressIntents(scenario, nodeId).filter((f) => !isWorld(nodeById(scenario, f.from)));
  const lines = [
    'apiVersion: security.istio.io/v1',
    'kind: AuthorizationPolicy',
    'metadata:',
    `  name: ${node.label}`,
    `  namespace: ${scenario.namespace}`,
    'spec:',
    '  selector:',
    '    matchLabels:',
    `      app: ${node.label}`,
    '  action: ALLOW',
  ];
  if (!ingress.length) {
    lines.push('  rules: []  # mTLS on, but no workload is authorized');
    return lines.join('\n');
  }
  lines.push('  rules:');
  for (const f of ingress) {
    const principal = `cluster.local/ns/${scenario.namespace}/sa/${nodeById(scenario, f.from).label}`;
    lines.push('    - from:', '        - source:', `            principals: ["${principal}"]`, '      to:', '        - operation:');
    if (f.http) {
      lines.push(`            methods: ["${f.http.method}"]`, `            paths: ["${f.http.istio}"]`);
    } else {
      lines.push(`            ports: ["${f.port}"]`);
    }
  }
  return lines.join('\n');
}

export function policyYaml(scenario, nodeId, mode, noPolicyText) {
  const node = nodeById(scenario, nodeId);
  if (!node || isWorld(node)) return `# ${node ? node.label : nodeId}: outside the cluster, no policy applies.`;
  if (mode === 'flat') return `# ${noPolicyText}\n# kubectl get cnp,netpol -n ${scenario.namespace}\n# No resources found in ${scenario.namespace} namespace.`;
  const header = '# Generated from the declared intents (who must talk to whom).';
  if (mode === 'l4') return `${header}\n${ciliumPolicy(scenario, nodeId, false)}`;
  return [
    header,
    '# Layer 1: Cilium, identity-aware L3/L4 in eBPF.',
    ciliumPolicy(scenario, nodeId, false),
    '---',
    '# Layer 2: Istio, mTLS identities and per-request authorization.',
    `# (PeerAuthentication mode STRICT is set for the whole ${scenario.namespace} namespace.)`,
    istioPolicy(scenario, nodeId),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Geometry and the static SVG (first frame). The browser animates on top of it.

export function edgePath(scenario, from, to) {
  const a = nodeById(scenario, from);
  const b = nodeById(scenario, to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Bend each edge slightly so parallel lines and crossings stay readable.
  const bend = Math.min(26, len * 0.08);
  const mx = (a.x + b.x) / 2 - (dy / len) * bend;
  const my = (a.y + b.y) / 2 + (dx / len) * bend;
  return `M${a.x} ${a.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x} ${b.y}`;
}

const HEX_R = 23;
export const hexPoints = (r = HEX_R) =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');

const xmlEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Edges for a scenario, one per (from, to) pair, with the verdict mix for a mode. */
export function edges(scenario, mode) {
  const map = new Map();
  for (const flow of scenario.flows) {
    const key = edgeKey(flow);
    if (!map.has(key)) map.set(key, { key, from: flow.from, to: flow.to, verdicts: new Set(), attack: false, legit: false });
    const e = map.get(key);
    e.verdicts.add(verdict(scenario, flow, mode).verdict);
    if (flow.attack) e.attack = true;
    if (flow.legit) e.legit = true;
  }
  return [...map.values()].map((e) => {
    // An edge is "open" if at least one flow gets through, "blocked" if none does.
    const through = e.verdicts.has('forwarded') || e.verdicts.has('breach');
    const state = e.verdicts.has('breach') ? 'breach' : through ? 'open' : e.verdicts.has('denied') ? 'denied' : 'blocked';
    return { ...e, state, mtls: mode === 'l7' && e.legit && scenario.flows.some((f) => edgeKey(f) === e.key && mtls(scenario, f, mode)) };
  });
}

export function svgMarkup(scenario, mode, labels) {
  const edgeEls = edges(scenario, mode)
    .map(
      (e) =>
        `<path class="zt-edge" data-edge="${xmlEsc(e.key)}" data-state="${e.state}"${e.mtls ? ' data-mtls="true"' : ''} d="${edgePath(scenario, e.from, e.to)}"/>`,
    )
    .join('');
  const hex = hexPoints();
  const nodeEls = scenario.nodes
    .map((n) => {
      // The accessible name comes from the visible text: label, identity, badge.
      const label = xmlEsc(n.label);
      const shape =
        n.kind === 'world'
          ? `<circle class="zt-world" r="17"/><path class="zt-world-lines" d="M-17 0H17M0 -17C-9 -8 -9 8 0 17M0 -17C9 -8 9 8 0 17"/>`
          : `<polygon class="zt-hex" points="${hex}"/>`;
      const text = `<text class="zt-label" y="${n.kind === 'world' ? 33 : 40}">${label}</text>${n.kind === 'world' ? '' : `<text class="zt-id" y="4">${n.identity}</text>`}`;
      const badge = n.compromised ? `<text class="zt-badge" y="-31">${xmlEsc(labels.compromisedShort)}</text>` : '';
      return `<g class="zt-node" data-node="${n.id}" data-kind="${n.kind}"${n.compromised ? ' data-compromised="true"' : ''} transform="translate(${n.x} ${n.y})" tabindex="0" role="button" aria-pressed="false">${shape}${text}${badge}</g>`;
    })
    .join('');
  return `<g class="zt-edges">${edgeEls}</g><g class="zt-packets"></g><g class="zt-marks"></g><g class="zt-nodes">${nodeEls}</g>`;
}

export const VIEWBOX = `0 0 ${W} ${H}`;
