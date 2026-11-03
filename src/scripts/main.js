// Progressive enhancement. Every page works without JavaScript; this adds the theme switch,
// the mobile menu, the active section in the navigation, copy buttons, the local time
// and the live status of the delivery pipeline.
import { initTheme, initMenu, initScrollSpy, createToast, initCopy, initPhoneReveal, initLocalTime } from './ui.js';
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
  // Links from older versions of the site (blog.html, posts/*.html) point to the articles now.
  const suggest = document.querySelector('[data-404-suggest]');
  const link = document.querySelector('[data-404-suggest-link]');
  let target = null;
  const note = data.notes.find((n) => path.includes(n.href.split('/').filter(Boolean).pop()));
  if (note) target = { href: note.href, text: note.title };
  else if (/blog|post|notes?|article/i.test(path)) target = { href: `${data.home}#writing`, text: data.ui.notes };
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
  const toast = createToast();
  initTheme();
  initMenu();
  initScrollSpy();
  initCopy(data.ui, toast);
  initPhoneReveal();
  initLocalTime(data.lang);
  initNotFound(data);
  const pipe = document.querySelector('[data-pipeline]');
  if (pipe) {
    // The API call is not needed for the first screen: wait until the section comes close.
    const start = () => initPipeline(pipe, data.ui.pipe);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            io.disconnect();
            start();
          }
        },
        { rootMargin: '600px 0px' },
      );
      io.observe(pipe);
    } else {
      start();
    }
  }
}

main();
