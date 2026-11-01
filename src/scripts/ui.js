// Small shared UI helpers: theme switch, toast, copy buttons, phone reveal, help dialog.

const THEME_KEY = 'guerd-theme';

export function initTheme() {
  const root = document.documentElement;
  const buttons = [...document.querySelectorAll('[data-theme-set]')];
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  const sync = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.themeSet === current()));
  };
  const set = (theme) => {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage can be unavailable (private mode); the choice then lasts for this page only */
    }
    sync();
    document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  };
  for (const b of buttons) b.addEventListener('click', () => set(b.dataset.themeSet));
  system.addEventListener('change', sync);
  sync();
  return { set, current, toggle: () => set(current() === 'dark' ? 'light' : 'dark') };
}

export function createToast() {
  const el = document.querySelector('[data-toast]');
  let timer;
  return (message, ms = 3200) => {
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

export function initCopy(strings) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-copy]');
    if (!button) return;
    const ok = await copyText(button.dataset.copy);
    button.dataset.label ??= button.textContent;
    button.textContent = ok ? strings.copied : strings.copyFailed;
    button.dataset.state = ok ? 'done' : 'fail';
    clearTimeout(Number(button.dataset.timer));
    button.dataset.timer = String(
      setTimeout(() => {
        button.textContent = button.dataset.label;
        delete button.dataset.state;
      }, 1800),
    );
  });
}

/** The phone number ships base64-encoded and is only decoded on request. */
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

export function initHelp() {
  const dialog = document.querySelector('[data-help]');
  return {
    open() {
      if (dialog && !dialog.open) dialog.showModal();
    },
  };
}

/** A key event the page shortcuts should ignore (typing, modifiers, open dialogs). */
export function isTyping(event) {
  const el = event.target;
  if (event.altKey || event.ctrlKey || event.metaKey) return true;
  if (document.querySelector('dialog[open]')) return true;
  if (!(el instanceof Element)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
}
