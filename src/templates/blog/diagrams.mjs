// Article diagrams. A Markdown post embeds one with a fenced block:
//
//   ```diagram
//   airgap-zones
//   ```
//
// Each entry returns a complete <figure>. Shapes come from ./kit.mjs and are styled by
// src/styles/diagrams.css, so every diagram follows the light and dark themes.
import { markers, arrow, line, box, zone, text, pill, cylinder, badge, step, code, swatch, svg, figure, esc } from './kit.mjs';

/** A pod card for the CloudNativePG diagram: name, role and its own volume. */
function pod(x, y, name, role, { primary = false } = {}) {
  const w = 160;
  const cx = x + w / 2;
  return `<g class="dg-box${primary ? ' is-acc' : ''}"><rect x="${x}" y="${y}" width="${w}" height="92" rx="10"/><text class="dg-t dg-mono" x="${cx}" y="${y + 25}" text-anchor="middle">${esc(name)}</text></g>${pill(cx, y + 47, role, primary ? 'acc' : 'n')}<g class="dg-disk"><path d="M${cx - 30} ${y + 66}a8 3 0 0 1 16 0v9a8 3 0 0 1-16 0z"/><path d="M${cx - 30} ${y + 66}a8 3 0 0 0 16 0"/></g>${text(cx - 8, y + 77, 'own volume')}`;
}

/** A Kafka broker: a box with a few partition replicas inside. */
function broker(x, y) {
  const cells = [0, 1, 2, 3, 4, 5]
    .map((i) => `<rect class="dg-cell${i % 4 === 0 ? ' is-lead' : ''}" x="${x + 12 + (i % 3) * 20}" y="${y + 34 + Math.floor(i / 3) * 16}" width="15" height="11" rx="2.5"/>`)
    .join('');
  return `<g class="dg-box"><rect x="${x}" y="${y}" width="80" height="76" rx="8"/><text class="dg-t" x="${x + 40}" y="${y + 22}" text-anchor="middle">broker</text></g>${cells}`;
}

const DIAGRAMS = {
  'airgap-zones'() {
    const p = 'dg-az';
    const rows = [70, 118, 166, 214, 262];
    const outside = [
      ['registry.k8s.io', true],
      ['quay.io · ghcr.io', true],
      ['Helm charts'],
      ['OS packages'],
      ['CVE database'],
    ];
    const steps = ['Pull by digest', 'Scan for CVEs', 'Verify signatures', 'Re-sign, attach SBOM', 'Bundle with checksums'];
    const inside = [['registry.internal', 'acc', true], ['Git server'], ['Argo CD'], ['Kubernetes clusters'], ['OS and CVE mirrors']];
    const body = [
      markers(p),
      zone(10, 34, 164, 300, 'INTERNET'),
      zone(232, 34, 244, 300, 'TRANSFER ZONE', { kind: 'warn' }),
      zone(534, 34, 216, 300, 'AIR-GAPPED ZONE', { kind: 'acc' }),
      ...outside.map(([label, mono], i) => box(24, rows[i], 136, 36, label, { mono })),
      ...steps.map((label, i) => step(246, rows[i], 216, 36, i + 1, label)),
      ...inside.map(([label, kind = 'n', mono], i) => box(548, rows[i], 188, 36, label, { kind, mono })),
      arrow(p, 'M176 184H228'),
      text(202, 174, 'pull', { anchor: 'middle' }),
      arrow(p, 'M478 184H530', 'acc'),
      text(504, 174, 'one way', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
      arrow(p, 'M642 336V360H92V338', 'bad', { dashed: true }),
      badge.cross(372, 360),
      text(372, 384, 'no route back to the internet', { anchor: 'middle', cls: 'dg-sub dg-bad' }),
    ];
    return figure(
      'airgap-zones',
      svg({
        w: 760,
        h: 392,
        wide: true,
        label:
          'Three zones from left to right. The internet holds upstream registries, Helm charts, OS packages and the CVE database. The transfer zone pulls by digest, scans, verifies signatures, re-signs with an SBOM and bundles with checksums. The bundle crosses one way into the air-gapped zone: internal registry, Git server, Argo CD, the clusters and the mirrors. There is no route from the inside back to the internet.',
        body: body.join(''),
      }),
      'Three zones, one direction. Everything enters through the transfer zone, where it is pulled, checked and bundled. Nothing inside can reach the internet.',
      { scroll: true },
    );
  },

  'airgap-pull'() {
    const p = 'dg-ap';
    const body = [
      markers(p),
      box(16, 40, 240, 60, 'Pod spec', { sub: 'quay.io/cilium/cilium:v1.19.10' }),
      box(300, 40, 210, 60, 'containerd on the node', { sub: 'certs.d/quay.io/hosts.toml' }),
      box(556, 40, 188, 60, 'registry.internal', { sub: '/v2/quay/cilium/cilium', kind: 'acc' }),
      box(556, 150, 188, 60, 'quay.io', { sub: 'never contacted', kind: 'mut', dashed: true }),
      arrow(p, 'M258 70H296'),
      arrow(p, 'M512 70H552', 'acc'),
      arrow(p, 'M405 102V180H552', 'mut', { dashed: true }),
      badge.cross(480, 180),
    ];
    return figure(
      'airgap-pull',
      svg({
        w: 760,
        h: 222,
        wide: true,
        label:
          'A pod asks for quay.io/cilium/cilium. containerd reads the hosts.toml file for quay.io and pulls the image from registry.internal under the quay prefix. quay.io itself is never contacted.',
        body: body.join(''),
      }),
      'Mirroring at the node: manifests reference the upstream registry, containerd resolves it to the internal one.',
      { scroll: true },
    );
  },

  'operator-loop'() {
    const p = 'dg-ol';
    const body = [
      markers(p),
      zone(12, 30, 222, 240, 'CUSTOM RESOURCE'),
      `<g class="dg-box"><rect x="28" y="60" width="190" height="128" rx="8"/></g>`,
      code(42, 86, ['kind: Cluster', 'spec:', '  instances: 3', '  storage:', '    size: 20Gi']),
      code(42, 222, [['status:', 'dg-acc'], ['  readyInstances: 3', 'dg-acc']]),
      box(316, 116, 128, 60, 'Operator', { sub: 'reconcile loop', kind: 'acc' }),
      zone(526, 30, 222, 240, 'KUBERNETES OBJECTS'),
      ...[
        ['Pods', 544, 64],
        ['PVCs', 644, 64],
        ['Services', 544, 116],
        ['Secrets', 644, 116],
        ['PDBs', 544, 168],
        ['RBAC', 644, 168],
      ].map(([label, x, y]) => box(x, y, 88, 40, label)),
      text(637, 240, 'owned by the custom resource', { anchor: 'middle' }),
      arrow(p, 'M236 110C276 110 280 132 312 132', 'acc'),
      text(270, 104, 'watch', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
      arrow(p, 'M446 132C478 132 490 110 522 110', 'acc'),
      text(486, 104, 'create, update', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
      arrow(p, 'M524 196C488 196 482 162 448 162', 'n', { dashed: true }),
      text(486, 214, 'events', { anchor: 'middle' }),
      arrow(p, 'M314 162C276 162 280 218 238 218', 'acc', { dashed: true }),
      text(272, 238, 'status', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
    ];
    return figure(
      'operator-loop',
      svg({
        w: 760,
        h: 290,
        wide: true,
        label:
          'The reconcile loop. On the left, a custom resource declares kind Cluster with three instances and 20 GiB of storage. The operator watches it, creates and updates Kubernetes objects (pods, PVCs, services, secrets, PDBs, RBAC), receives their events, and writes the observed state back into the status of the custom resource.',
        body: body.join(''),
      }),
      'An operator is a control loop: it compares what the custom resource asks for with what exists, acts on the difference, and reports back in <code>status</code>.',
      { scroll: true },
    );
  },

  'operator-levels'() {
    const levels = [
      ['Basic install', 'Installs it'],
      ['Seamless upgrades', 'Upgrades it'],
      ['Full lifecycle', 'Backup, failover'],
      ['Deep insights', 'Metrics, alerts'],
      ['Auto pilot', 'Scales and heals'],
    ];
    const base = 252;
    const body = levels.map(([name, desc], i) => {
      const x = 12 + i * 148;
      const h = 74 + i * 30;
      const top = base - h;
      const kind = i >= 2 ? 'acc' : 'n';
      return `<g class="dg-box dg-level is-${kind}"><rect x="${x}" y="${top}" width="144" height="${h}" rx="10"/><text class="dg-lvl" x="${x + 14}" y="${top + 26}">${i + 1}</text><text class="dg-t" x="${x + 14}" y="${top + 46}">${esc(name)}</text><text class="dg-sub" x="${x + 14}" y="${top + 63}">${esc(desc)}</text></g>`;
    });
    body.push(
      line('M308 40V30H748V40', 'acc'),
      text(528, 22, 'what production needs: level 3 and up', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
    );
    return figure(
      'operator-levels',
      svg({
        w: 760,
        h: 262,
        wide: true,
        label:
          'The five operator capability levels as rising steps: 1 basic install, 2 seamless upgrades, 3 full lifecycle with backup and failover, 4 deep insights with metrics and alerts, 5 auto pilot that scales and heals. Levels 3 to 5 are marked as what production needs.',
        body: body.join(''),
      }),
      'The capability levels of the Operator Framework. Installing is the easy part; the value starts at level 3.',
      { scroll: true },
    );
  },

  'cnpg-cluster'() {
    const p = 'dg-cn';
    const body = [
      markers(p),
      box(300, 16, 160, 40, 'Application'),
      box(580, 16, 160, 40, 'CNPG operator', { kind: 'acc' }),
      box(96, 100, 148, 34, 'orders-db-rw', { mono: true, kind: 'acc' }),
      box(396, 100, 148, 34, 'orders-db-ro', { mono: true }),
      arrow(p, 'M328 58C328 82 170 74 170 96'),
      pill(246, 74, 'read-write', 'acc'),
      arrow(p, 'M432 58C432 80 470 76 470 96'),
      pill(462, 74, 'read-only'),
      pod(90, 170, 'orders-db-1', 'primary', { primary: true }),
      pod(290, 170, 'orders-db-2', 'replica'),
      pod(490, 170, 'orders-db-3', 'replica'),
      arrow(p, 'M170 136V166', 'acc'),
      arrow(p, 'M454 136C454 152 370 148 370 166'),
      arrow(p, 'M486 136C486 152 570 148 570 166'),
      arrow(p, 'M700 58V216H654', 'acc', { dashed: true }),
      pill(700, 132, 'reconciles', 'acc'),
      arrow(p, 'M206 264C206 298 334 298 334 268', 'acc'),
      arrow(p, 'M226 264C226 330 534 330 534 268', 'acc'),
      text(380, 340, 'streaming replication', { anchor: 'middle', cls: 'dg-sub dg-acc' }),
      arrow(p, 'M128 264V346'),
      pill(128, 306, 'Barman Cloud plugin'),
      cylinder(48, 350, 160, 64, 'Object storage', { sub: 'WAL and base backups' }),
    ];
    return figure(
      'cnpg-cluster',
      svg({
        w: 760,
        h: 424,
        wide: true,
        label:
          'A CloudNativePG cluster named orders-db. The application writes through the orders-db-rw service, which points to the primary orders-db-1, and reads through orders-db-ro, which points to the replicas orders-db-2 and orders-db-3. Each instance has its own volume. The primary streams to both replicas and archives WAL and base backups to object storage through the Barman Cloud plugin. The CNPG operator reconciles the instances.',
        body: body.join(''),
      }),
      'A CloudNativePG cluster: one primary, two streaming replicas, a volume per instance. Applications use the <code>-rw</code> and <code>-ro</code> services, which follow the primary through a failover.',
      { scroll: true },
    );
  },

  'strimzi-kraft'() {
    const p = 'dg-sk';
    const body = [
      markers(p),
      box(16, 44, 170, 40, 'Kafka', { mono: true }),
      box(16, 96, 170, 40, 'KafkaNodePool ×2', { mono: true }),
      box(16, 268, 170, 40, 'KafkaTopic', { mono: true }),
      box(16, 320, 170, 40, 'KafkaUser', { mono: true }),
      box(236, 60, 160, 60, 'Cluster Operator', { sub: 'deploys, rolls, upgrades', kind: 'acc' }),
      zone(236, 252, 160, 120, 'ENTITY OPERATOR'),
      box(250, 284, 132, 34, 'Topic Operator'),
      box(250, 326, 132, 34, 'User Operator'),
      zone(446, 24, 298, 278, 'KAFKA CLUSTER · events', { kind: 'acc' }),
      text(466, 62, 'KRaft controllers: the metadata quorum'),
      ...[466, 560, 654].map((x) => box(x, 72, 80, 36, 'controller')),
      ...[466, 560, 654].map((x) => broker(x, 170)),
      ...[506, 600, 694].map((x) => line(`M${x} 110V168`, 'n', { dashed: true })),
      pill(600, 139, 'metadata'),
      box(500, 352, 190, 40, 'Applications'),
      arrow(p, 'M595 350V250', 'acc'),
      badge.lock(595, 326),
      text(578, 330, 'TLS listener :9093, mTLS', { anchor: 'end', cls: 'dg-sub dg-acc' }),
      arrow(p, 'M188 64C210 64 212 80 232 80'),
      arrow(p, 'M188 116C210 116 212 100 232 100'),
      arrow(p, 'M398 90H442', 'acc'),
      arrow(p, 'M316 122V248', 'n', { dashed: true }),
      pill(316, 186, 'deploys'),
      arrow(p, 'M188 288C214 288 220 300 246 300'),
      arrow(p, 'M188 340C214 340 220 343 246 343'),
      arrow(p, 'M398 312C430 312 430 208 462 208', 'acc'),
    ];
    return figure(
      'strimzi-kraft',
      svg({
        w: 760,
        h: 404,
        wide: true,
        label:
          'Strimzi in KRaft mode. The Cluster Operator watches the Kafka and KafkaNodePool resources and runs three controller pods, which hold the metadata quorum, and three broker pods, which hold the partitions. It also deploys the Entity Operator, whose Topic Operator and User Operator turn KafkaTopic and KafkaUser resources into topics, ACLs and credentials on the brokers. Applications connect to the brokers on a TLS listener on port 9093 with mutual TLS.',
        body: body.join(''),
      }),
      'Strimzi in KRaft mode: no ZooKeeper. Controllers and brokers are separate node pools, and topics and users are Kubernetes resources too.',
      { scroll: true },
    );
  },

  'oss-stack'() {
    const rows = [
      ['HashiCorp Vault', 'secrets management', 'BUSL-1.1', 'HashiCorp (IBM)', 'warn'],
      ['Redis', 'cache and queues', 'RSAL, SSPL or AGPL', 'Redis Ltd', 'warn'],
      ['CloudNativePG', 'PostgreSQL as a Kubernetes resource', 'Apache-2.0', 'CNCF Sandbox', 'acc'],
      ['Strimzi', 'Kafka on Kubernetes', 'Apache-2.0', 'CNCF Incubating', 'acc'],
      ['Prometheus', 'metrics and alerting', 'Apache-2.0', 'CNCF Graduated', 'acc'],
      ['Argo CD', 'GitOps delivery', 'Apache-2.0', 'CNCF Graduated', 'acc'],
      ['Cilium', 'eBPF networking and policy', 'Apache-2.0', 'CNCF Graduated', 'acc'],
      ['Kubernetes, containerd', 'orchestration and runtime', 'Apache-2.0', 'CNCF Graduated', 'acc'],
      ['Linux', 'the kernel under all of it', 'GPL-2.0', 'kernel community', 'n'],
    ];
    const body = rows.map(([name, what, licence, home, kind], i) => {
      const y = 12 + i * 40;
      return `<g class="dg-band is-${kind}"><rect x="12" y="${y}" width="736" height="34" rx="8"/><rect class="dg-band-mark" x="12" y="${y}" width="5" height="34" rx="2"/><text class="dg-t" x="32" y="${y + 21.5}">${esc(name)}</text><text class="dg-sub" x="226" y="${y + 21.5}">${esc(what)}</text></g>${pill(548, y + 17, licence)}${pill(672, y + 17, home, kind)}`;
    });
    return figure(
      'oss-stack',
      svg({
        w: 760,
        h: 376,
        wide: true,
        label:
          'The open-source stack under a typical platform, top to bottom, with licence and home. HashiCorp Vault: BUSL-1.1, HashiCorp, owned by IBM. Redis: RSAL, SSPL or AGPL, Redis Ltd. CloudNativePG: Apache-2.0, CNCF Sandbox. Strimzi: Apache-2.0, CNCF Incubating. Prometheus, Argo CD, Cilium, Kubernetes and containerd: Apache-2.0, CNCF Graduated. Linux: GPL-2.0, kernel community.',
        body: body.join(''),
      }),
      'Almost every layer is open source under a neutral foundation. The two that are not are the ones whose licences changed.',
      { scroll: true },
    );
  },

  'oss-timeline'() {
    const p = 'dg-ot';
    const years = [2021, 2022, 2023, 2024, 2025];
    const x = (year) => 92 + (year - 2021) * 148;
    const card = (cx, y, w, title, sub, kind) =>
      `<g class="dg-box is-${kind}"><rect x="${cx - w / 2}" y="${y}" width="${w}" height="56" rx="8"/><text class="dg-t" x="${cx}" y="${y + 23}" text-anchor="middle">${esc(title)}</text><text class="dg-sub" x="${cx}" y="${y + 41}" text-anchor="middle">${esc(sub)}</text></g>`;
    const up = [
      [2021, 160, 'Elasticsearch, Kibana', 'SSPL or Elastic License'],
      [2023, 136, 'Terraform, Vault', 'BUSL 1.1'],
      [2024, 136, 'Redis', 'RSALv2 or SSPLv1'],
    ];
    const down = [
      [2021, 160, 'OpenSearch', 'fork, Apache-2.0', 'acc'],
      [2023, 136, 'OpenTofu, OpenBao', 'forks, MPL-2.0', 'acc'],
      [2024, 132, 'Valkey', 'fork, BSD-3-Clause', 'acc'],
      [2025, 132, 'Redis 8', 'adds AGPL-3.0', 'ok'],
    ];
    const body = [
      markers(p),
      line('M24 160H744', 'mut'),
      ...up.map(([year]) => line(`M${x(year)} 104V150`, 'warn')),
      ...down.map(([year, , , , kind]) => line(`M${x(year)} 170V216`, kind)),
      ...years.map((year) => pill(x(year), 160, String(year), up.some(([y]) => y === year) || down.some(([y]) => y === year) ? 'n' : 'mut')),
      ...up.map(([year, w, title, sub]) => card(x(year), 48, w, title, sub, 'warn')),
      ...down.map(([year, w, title, sub, kind]) => card(x(year), 216, w, title, sub, kind)),
      swatch(p, 24, 312, 'warn', 'licence change'),
      swatch(p, 196, 312, 'acc', 'community fork under the Linux Foundation'),
      swatch(p, 530, 312, 'ok', 'OSI licence added back'),
    ];
    return figure(
      'oss-timeline',
      svg({
        w: 760,
        h: 326,
        wide: true,
        label:
          'Timeline from 2021 to 2025. 2021: Elasticsearch and Kibana move to SSPL or the Elastic License; OpenSearch forks under Apache-2.0. 2023: Terraform and Vault move to BUSL 1.1; OpenTofu and OpenBao fork under MPL-2.0. 2024: Redis moves to RSALv2 or SSPLv1; Valkey forks under BSD-3-Clause. 2025: Redis 8 adds AGPL-3.0.',
        body: body.join(''),
      }),
      'Licence changes and the community forks that followed. All four forks now live under the Linux Foundation.',
      { scroll: true },
    );
  },

  'zt5g-sba'() {
    const p = 'dg-sb';
    const above = [
      ['NRF', 180],
      ['AUSF', 310],
      ['UDM', 440],
      ['PCF', 570],
    ];
    const body = [
      markers(p),
      zone(150, 20, 596, 362, 'KUBERNETES CLUSTER · NAMESPACE core5g'),
      line('M176 150H722', 'acc', { thick: true }),
      text(722, 140, 'SBI · HTTP/2', { anchor: 'end', cls: 'dg-sub dg-acc' }),
      ...above.map(([name, x]) => `${line(`M${x + 50} 106V148`, 'acc')}${box(x, 66, 100, 40, name)}`),
      line('M250 152V192', 'acc'),
      line('M520 152V192', 'acc'),
      box(200, 192, 100, 40, 'AMF'),
      box(470, 192, 100, 40, 'SMF'),
      box(470, 290, 100, 40, 'UPF'),
      box(16, 210, 100, 52, 'gNB', { sub: 'radio site', kind: 'mut', dashed: true }),
      line('M520 232V290', 'ok'),
      pill(520, 261, 'N4 · PFCP/UDP', 'ok'),
      line('M116 226C150 226 166 212 200 212', 'ok'),
      pill(158, 219, 'N2 · SCTP', 'ok'),
      line('M116 250C230 250 300 310 470 310', 'ok'),
      pill(276, 284, 'N3 · GTP-U/UDP', 'ok'),
      swatch(p, 176, 352, 'acc', 'HTTP/2 APIs: the mesh can authorize each request (L7)'),
      swatch(p, 176, 372, 'ok', 'SCTP and UDP: only the CNI can filter them (L3/L4)'),
    ];
    return figure(
      'zt5g-sba',
      svg({
        w: 760,
        h: 392,
        wide: true,
        label:
          'A 5G core running in a Kubernetes namespace. NRF, AUSF, UDM, PCF, AMF and SMF are connected to the service-based interface bus, which is HTTP/2: a service mesh can authorize each request. The gNB, outside the cluster, reaches the AMF on N2 over SCTP and the UPF on N3 over GTP-U on UDP, and the SMF controls the UPF on N4 over PFCP on UDP: only the CNI can filter those.',
        body: body.join(''),
      }),
      'A 5G core as pods. The control plane speaks HTTP/2, where a mesh sees every request; N2, N3 and N4 do not, and only the CNI can police them.',
      { scroll: true },
    );
  },

  'zt-gates'() {
    const p = 'dg-zg';
    const body = [
      markers(p),
      box(16, 40, 210, 48, 'SMF', { sub: 'GET …/sm-data' }),
      box(16, 126, 210, 48, 'SMF', { sub: 'GET …/am-data' }),
      box(16, 212, 210, 48, 'Compromised pod', { sub: 'any request', kind: 'bad', dashed: true }),
      `<g class="dg-gate is-ok"><rect x="286" y="26" width="40" height="248" rx="20"/></g>`,
      `<g class="dg-gate is-acc"><rect x="446" y="26" width="40" height="248" rx="20"/></g>`,
      text(306, 16, 'Cilium', { anchor: 'middle', cls: 'dg-t dg-ok' }),
      text(306, 292, 'L3/L4 identity', { anchor: 'middle' }),
      text(466, 16, 'Istio', { anchor: 'middle', cls: 'dg-t dg-acc' }),
      text(466, 292, 'L7 mTLS + path', { anchor: 'middle' }),
      box(596, 124, 148, 52, 'UDM', { sub: 'subscriber data', kind: 'acc' }),
      arrow(p, 'M228 64H540C566 64 566 142 592 142', 'acc'),
      badge.check(306, 64),
      badge.check(466, 64),
      pill(516, 64, '200', 'ok'),
      line('M228 150H444', 'acc'),
      badge.check(306, 150),
      badge.cross(466, 150),
      pill(530, 150, '403 Forbidden', 'bad'),
      line('M228 236H284', 'bad', { dashed: true }),
      badge.cross(306, 236),
      pill(372, 236, 'dropped', 'bad'),
    ];
    return figure(
      'zt-gates',
      svg({
        w: 760,
        h: 300,
        wide: true,
        label:
          'Three requests to the UDM pass two gates. The SMF asking for session management data passes Cilium, which checks identity and port, and Istio, which checks the mTLS identity and the path: 200. The SMF asking for access and mobility data passes Cilium but Istio answers 403 Forbidden. A compromised pod is dropped by Cilium before any request is made.',
        body: body.join(''),
      }),
      'Two gates, two questions. The CNI decides whether a connection may exist; the mesh decides whether this identity may make this request.',
      { scroll: true },
    );
  },

  'pipeline-flow'() {
    const p = 'dg-pf';
    const body = [
      markers(p),
      box(16, 146, 96, 40, 'git push', { mono: true, rx: 20, kind: 'acc' }),
      zone(140, 18, 434, 294, 'CI-CD.YML · EVERY PUSH AND PULL REQUEST'),
      box(160, 58, 124, 44, 'Lint', { sub: 'code, CI, manifests' }),
      box(160, 144, 124, 44, 'Build', { sub: 'EN + FR, reproducible' }),
      box(160, 230, 124, 44, 'Audit', { sub: 'Trivy, npm audit' }),
      box(318, 100, 124, 44, 'Test', { sub: 'Playwright + axe' }),
      box(318, 188, 124, 44, 'Lighthouse', { sub: 'budgets' }),
      box(476, 144, 84, 44, 'Deploy', { sub: 'Pages', kind: 'acc' }),
      arrow(p, 'M114 160C136 160 132 80 156 80'),
      arrow(p, 'M114 166H156'),
      arrow(p, 'M114 172C136 172 132 252 156 252'),
      arrow(p, 'M286 160C300 160 300 122 314 122'),
      arrow(p, 'M286 172C300 172 300 210 314 210'),
      arrow(p, 'M286 80H498C518 80 518 108 518 140', 'acc'),
      arrow(p, 'M286 252H498C518 252 518 222 518 192', 'acc'),
      arrow(p, 'M444 122C460 122 458 158 472 158', 'acc'),
      arrow(p, 'M444 210C460 210 458 174 472 174', 'acc'),
      zone(600, 18, 144, 294, 'IN PARALLEL'),
      box(610, 56, 124, 56, 'Container image', { sub: 'signed, with SBOM' }),
      box(610, 138, 124, 56, 'Zero Trust e2e', { sub: 'kind + Cilium + k6' }),
      box(610, 220, 124, 56, 'CodeQL', { sub: 'code and workflows' }),
    ];
    return figure(
      'pipeline-flow',
      svg({
        w: 760,
        h: 326,
        wide: true,
        label:
          'The pipeline. A git push starts Lint, Build and Audit. Build feeds Test, with Playwright and axe, and Lighthouse. Deploy to GitHub Pages runs only when Lint, Test, Lighthouse and Audit have passed. In parallel, the same push builds the signed container image with its SBOM, runs the Zero Trust end-to-end test on kind with Cilium and k6, and runs CodeQL.',
        body: body.join(''),
      }),
      'One push, four parallel workflows. Deploy waits for every check in its own workflow.',
      { scroll: true },
    );
  },

  'pipeline-zt-test'() {
    const p = 'dg-pz';
    const body = [
      markers(p),
      zone(10, 10, 576, 338, 'KIND CLUSTER · CILIUM'),
      zone(26, 42, 196, 290, 'NAMESPACE edge', { dashed: true }),
      zone(290, 42, 280, 160, 'NAMESPACE portfolio', { dashed: true }),
      zone(290, 222, 280, 110, 'NAMESPACE other', { dashed: true }),
      box(46, 84, 156, 48, 'gateway', { sub: 'labelled as the gateway', kind: 'acc' }),
      box(46, 248, 156, 48, 'pod', { sub: 'no gateway label', kind: 'bad', dashed: true }),
      box(330, 96, 200, 56, 'site', { sub: 'nginx, default deny' }),
      box(330, 262, 200, 48, 'pod', { sub: 'another namespace', kind: 'bad', dashed: true }),
      box(620, 98, 124, 52, 'internet', { kind: 'mut', dashed: true }),
      arrow(p, 'M204 100C262 100 270 112 326 112', 'acc'),
      pill(262, 104, 'GET 200', 'ok'),
      line('M204 120C246 120 270 138 312 138', 'acc'),
      badge.cross(322, 138),
      pill(258, 129, 'POST 403', 'bad'),
      line('M204 272C246 272 262 214 284 198', 'bad', { dashed: true }),
      badge.cross(292, 192),
      text(308, 196, 'timeout', { cls: 'dg-sub dg-bad' }),
      line('M430 260V222', 'bad', { dashed: true }),
      badge.cross(430, 212),
      text(446, 216, 'timeout', { cls: 'dg-sub dg-bad' }),
      line('M532 124H610', 'bad', { dashed: true }),
      badge.cross(586, 124),
      text(586, 152, 'timeout', { anchor: 'middle', cls: 'dg-sub dg-bad' }),
    ];
    return figure(
      'pipeline-zt-test',
      svg({
        w: 760,
        h: 358,
        wide: true,
        label:
          'The Zero Trust test in a kind cluster with Cilium. The gateway pod in the edge namespace gets 200 for GET and 403 for POST from the site in the portfolio namespace. A pod in the edge namespace without the gateway label, a pod in another namespace, and the site calling the internet all time out.',
        body: body.join(''),
      }),
      'What the e2e job tries on every change. One request is allowed, one is refused by the L7 proxy, and three connections never get an answer.',
      { scroll: true },
    );
  },
};

export const DIAGRAM_NAMES = Object.keys(DIAGRAMS);

export function diagram(name) {
  const render = DIAGRAMS[name];
  if (!render) throw new Error(`unknown diagram "${name}" (known: ${DIAGRAM_NAMES.join(', ')})`);
  return render();
}
