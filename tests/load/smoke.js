// k6 load test: a short ramp against the deployed site, with service-level thresholds.
//   k6 run -e BASE_URL=http://127.0.0.1:8080 tests/load/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

export const options = {
  scenarios: {
    visitors: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '20s', target: 20 },
        { duration: '5s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    checks: ['rate>0.99'],
  },
};

const PAGES = ['/', '/fr/', '/notes/zero-trust-5g/', '/guerd.1'];

export default function visit() {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];
  const res = http.get(`${BASE_URL}${page}`, { tags: { page } });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'security headers present': (r) => Boolean(r.headers['Content-Security-Policy'] && r.headers['X-Content-Type-Options']),
  });
  sleep(Math.random() * 0.5 + 0.2);
}

export function handleSummary(data) {
  const m = data.metrics;
  const ms = (v) => `${Number(v).toFixed(1)} ms`;
  const lines = [
    '| Metric | Value |',
    '| --- | --- |',
    `| Requests | ${m.http_reqs.values.count} (${m.http_reqs.values.rate.toFixed(1)}/s) |`,
    `| Failed requests | ${(m.http_req_failed.values.rate * 100).toFixed(2)} % |`,
    `| Latency p50 / p95 / p99 | ${ms(m.http_req_duration.values.med)} / ${ms(m.http_req_duration.values['p(95)'])} / ${ms(m.http_req_duration.values['p(99)'])} |`,
    `| Checks passed | ${(m.checks.values.rate * 100).toFixed(2)} % |`,
  ];
  return {
    stdout: `${lines.join('\n')}\n`,
    'k6-summary.md': `${lines.join('\n')}\n`,
    'k6-summary.json': JSON.stringify(data, null, 2),
  };
}
