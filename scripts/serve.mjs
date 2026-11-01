#!/usr/bin/env node
// Tiny static server for dist/, used by `npm run serve`, the dev loop and the e2e tests.
// Serves the site under the same base path as production (read from build-info.json)
// and sends the same security headers as the nginx image.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? process.env.PORT ?? 4173);
const info = JSON.parse(await readFile(path.join(dir, 'build-info.json'), 'utf8').catch(() => '{}'));
const base = process.env.BASE_PATH ?? info.basePath ?? '/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.1': 'text/plain; charset=utf-8',
};

const HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

async function resolveFile(urlPath) {
  const rel = decodeURIComponent(urlPath.slice(base.length - 1)).replace(/\/+/g, '/');
  const file = path.normalize(path.join(dir, rel));
  if (!file.startsWith(dir)) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!urlPath.endsWith('/')) return { redirect: `${urlPath}/` };
      return { file: path.join(file, 'index.html') };
    }
    return { file };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok\n');
    return;
  }
  if (!url.pathname.startsWith(base)) {
    res.writeHead(302, { Location: base }).end();
    return;
  }
  const found = await resolveFile(url.pathname);
  if (found?.redirect) {
    res.writeHead(301, { Location: found.redirect + url.search }).end();
    return;
  }
  try {
    const body = await readFile(found?.file ?? '');
    const type = TYPES[path.extname(found.file)] ?? 'application/octet-stream';
    const immutable = found.file.includes(`${path.sep}assets${path.sep}`);
    res.writeHead(200, {
      ...HEADERS,
      'Content-Type': type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    const body = await readFile(path.join(dir, '404.html')).catch(() => 'Not found');
    res.writeHead(404, { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8' }).end(body);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${path.relative(process.cwd(), dir) || '.'} at http://127.0.0.1:${port}${base}`);
});
