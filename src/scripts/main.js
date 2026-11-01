// guerd(1): progressive enhancement. Everything works without JavaScript;
// this adds the pager, the palette, the simulator and the live pipeline status.
import { initTheme, createToast, initCopy, initPhoneReveal, initHelp } from './ui.js';
import { initPager } from './pager.js';
import { initPalette } from './palette.js';
import { initZeroTrust } from './zt.js';
import { initPipeline } from './pipeline.js';

function siteData() {
  try {
    return JSON.parse(document.getElementById('site-data').textContent);
  } catch {
    return null;
  }
}

function initNotFound(data) {
  const targets = document.querySelectorAll('[data-404-path]');
  if (!targets.length) return;
  const full = decodeURIComponent(window.location.pathname);
  const path = full.startsWith(data.home) ? full.slice(data.home.length) || '/' : full;
  for (const el of targets) el.textContent = path;
  // Links from the previous version of the site (blog.html, posts/*.html) point to the notes now.
  const suggest = document.querySelector('[data-404-suggest]');
  const link = document.querySelector('[data-404-suggest-link]');
  let target = null;
  const note = data.notes.find((n) => path.includes(n.href.split('/').filter(Boolean).pop()));
  if (note) target = { href: note.href, text: note.title };
  else if (/blog|post|notes?/i.test(path)) target = { href: `${data.home}#notes`, text: 'NOTES' };
  else if (/cv|resume|r[eé]sum[eé]/i.test(path)) target = { href: data.resume, text: data.resume.split('/').pop() };
  if (target && suggest && link) {
    link.href = target.href;
    link.textContent = target.text;
    suggest.hidden = false;
  }
}

function main() {
  const data = siteData();
  if (!data) return;
  const ui = data.ui;
  const toast = createToast();
  const theme = initTheme();
  const help = initHelp();
  initCopy(ui);
  initPhoneReveal();
  const palette = initPalette(data, { theme, toast, help });
  initPager(data, { palette, help, theme, toast });
  initNotFound(data);
  const figure = document.querySelector('[data-zt]');
  if (figure) initZeroTrust(figure, ui.zt);
  const pipe = document.querySelector('[data-pipeline]');
  if (pipe) {
    // The API call is not needed for the first paint: wait until the section is close.
    const start = () => initPipeline(pipe, ui.pipe);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          start();
        }
      }, { rootMargin: '600px 0px' });
      io.observe(pipe);
    } else {
      start();
    }
  }
}

main();
