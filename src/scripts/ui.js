// Small UI behaviours: theme, mobile menu, active section, copy buttons, phone reveal, local time.

const THEME_KEY = 'ng-theme';

export function initTheme() {
  const root = document.documentElement;
  const button = document.querySelector('[data-theme-toggle]');
  // Dark by default (the console look); light only when chosen.
  const current = () => root.dataset.theme || 'dark';
  const sync = () => {
    if (!button) return;
    const dark = current() === 'dark';
    button.setAttribute('aria-label', dark ? button.dataset.labelLight : button.dataset.labelDark);
  };
  const set = (theme) => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage can be unavailable (private mode); the choice then lasts for this page */
    }
    sync();
  };
  button?.addEventListener('click', () => set(current() === 'dark' ? 'light' : 'dark'));
  sync();
}

export function initMenu() {
  const button = document.querySelector('[data-menu]');
  const nav = document.querySelector('[data-nav]');
  if (!button || !nav) return;
  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? button.dataset.labelClose : button.dataset.labelOpen);
    nav.dataset.open = String(open);
  };
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia('(width >= 1200px)').addEventListener('change', () => setOpen(false));
}

/** Highlights the section in view in the navigation, and keeps the language links on the same section. */
export function initScrollSpy() {
  const links = new Map([...document.querySelectorAll('[data-nav-link]')].map((a) => [a.dataset.navLink, a]));
  const langLinks = [...document.querySelectorAll('[data-lang-link]')].map((a) => [a, a.getAttribute('href').split('#')[0]]);
  const sections = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const probe = window.innerHeight * 0.35;
    let active = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= probe) active = section.id;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = sections.at(-1).id;
    for (const [id, a] of links) {
      if (id === active) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    for (const [a, base] of langLinks) a.setAttribute('href', active ? `${base}#${active}` : base);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
}

export function createToast() {
  const el = document.querySelector('[data-toast]');
  let timer;
  return (message, ms = 2600) => {
    if (!el) return;
    el.textContent = message;
    el.dataset.show = 'true';
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.dataset.show = 'false';
    }, ms);
  };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** Copy buttons: `data-copy` holds the text; `data-copy-code` copies the code block it belongs to. */
export function initCopy(strings, toast) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-copy], button[data-copy-code]');
    if (!button) return;
    const isCode = button.hasAttribute('data-copy-code');
    const text = isCode ? (button.closest('.codeblock')?.querySelector('code')?.textContent ?? '') : button.dataset.copy;
    const ok = await copyText(text);
    const label = button.querySelector('span') ?? button;
    button.dataset.label ??= label.textContent;
    label.textContent = ok ? strings.copied : strings.copyFailed;
    button.dataset.state = ok ? 'done' : 'fail';
    if (ok) {
      if (isCode) toast(strings.codeCopied);
      else if (button.dataset.toastText) toast(button.dataset.toastText);
      else if (text.includes('@') && !text.includes(' ')) toast(strings.emailCopied);
    }
    clearTimeout(Number(button.dataset.timer));
    button.dataset.timer = String(
      setTimeout(() => {
        label.textContent = button.dataset.label;
        delete button.dataset.state;
      }, 1800),
    );
  });
}

/** The phone number ships base64-encoded and is decoded only on request. */
export function initPhoneReveal() {
  for (const button of document.querySelectorAll('[data-reveal-phone]')) {
    button.addEventListener('click', () => {
      const phone = atob(button.dataset.revealPhone);
      const link = document.createElement('a');
      link.href = `tel:${phone.replace(/\s+/g, '')}`;
      link.textContent = phone;
      button.replaceWith(link);
      link.focus();
    });
  }
}

/** "09:14 local time" next to the location, updated every minute. */
export function initLocalTime(locale) {
  for (const el of document.querySelectorAll('[data-local-time], [data-clock]')) {
    let format;
    try {
      format = new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: el.dataset.tz,
      });
    } catch {
      continue;
    }
    const tick = () => {
      el.textContent = `${format.format(new Date())} ${el.dataset.suffix}`;
    };
    tick();
    setInterval(tick, 30_000);
  }
}
