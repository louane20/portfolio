#!/usr/bin/env node
// Development loop: build, serve, and rebuild whenever content/ or src/ changes.
// (No live reload script is injected: the Content-Security-Policy would block it. Refresh.)
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT ?? '4173';

function build() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/build.mjs', '--drafts'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, SITE_URL: process.env.SITE_URL ?? `http://127.0.0.1:${PORT}/` },
    });
    child.on('exit', (code) => resolve(code === 0));
  });
}

let timer;
let running = false;
let again = false;
async function rebuild() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  const ok = await build();
  console.log(ok ? '\nrebuilt, refresh the page' : '\nbuild failed, fix the error above');
  running = false;
  if (again) {
    again = false;
    rebuild();
  }
}

await build();
const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist', PORT], { cwd: ROOT, stdio: 'inherit' });
for (const dir of ['content', 'src']) {
  watch(path.join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}
console.log(`watching content/ and src/ (drafts included); Ctrl+C to stop`);
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
