// The interactive terminal on the home page (src/templates/term.mjs). Output is built with DOM
// nodes and textContent only, never innerHTML, so nothing typed can inject markup.

const COMMANDS = ['help', 'whoami', 'neofetch', 'skills', 'experience', 'projects', 'research', 'blog', 'contact', 'cv', 'clear', 'sudo hire-me', 'ls', 'pwd', 'uname -a', 'date', 'cat about.md', 'exit'];

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href, text, { download = false } = {}) {
  const a = el('a', 't-link', text);
  a.href = href;
  if (download) a.setAttribute('download', '');
  if (/^https?:/.test(href)) a.rel = 'noopener';
  return a;
}

export function initTerminal() {
  const root = document.querySelector('[data-term]');
  const source = document.getElementById('term-data');
  if (!root || !source) return;
  let d;
  try {
    d = JSON.parse(source.textContent);
  } catch {
    return;
  }
  const out = root.querySelector('[data-term-out]');
  const form = root.querySelector('[data-term-form]');
  const input = form.querySelector('input');
  const screen = root.querySelector('[data-term-screen]');
  const history = [];
  let cursor = 0;

  const print = (...parts) => {
    const row = el('span', 't-line');
    for (const part of parts) row.append(typeof part === 'string' ? document.createTextNode(part) : part);
    out.append(row);
    return row;
  };
  const kv = (key, value) => print(el('span', 't-key', key.padEnd(16, ' ')), value);
  const dim = (text) => out.append(el('span', 't-line t-dim', text));
  const echo = (command) => {
    const row = el('span', 't-line t-cmd');
    row.append(el('span', 't-ps', d.prompt), document.createTextNode(` ${command}`));
    out.append(row);
  };

  const run = (raw) => {
    const command = raw.trim().replace(/\s+/g, ' ');
    echo(command);
    const [name, ...args] = command.split(' ');
    switch (command.toLowerCase()) {
      case '':
        return;
      case 'help':
        for (const [c, desc] of d.ui.commands) kv(c, desc);
        return;
      case 'whoami':
        print(`${d.name}: ${d.role}, ${d.employer}. ${d.location}.`);
        dim(d.headline);
        return;
      case 'neofetch':
        print(el('span', 't-ok', `${d.name.toLowerCase().replace(' ', '@')}`));
        for (const [k, v] of d.glance) kv(k, v);
        return;
      case 'skills':
      case 'kubectl get skills':
        for (const s of d.skills) {
          print(el('span', 't-ok', `● ${s.title}`));
          print(`  ${d.ui.production}: ${s.tools.join(', ')}`);
        }
        return;
      case 'experience':
      case 'git log':
        for (const j of d.experience) print(el('span', 't-warn', j.when.padEnd(22, ' ')), `${j.role} @ ${j.org}`);
        return;
      case 'projects':
      case 'ls projects':
      case 'ls ~/projects':
        for (const p of d.projects) print(el('span', 't-blue', 'drwxr-xr-x  '), p);
        return;
      case 'research':
        print(el('span', 't-ok', d.paper.venue), ` ${d.paper.title}`);
        print('DOI ', link(`https://doi.org/${d.paper.doi}`, d.paper.doi), '  ', link(d.paper.url, 'open access'));
        return;
      case 'blog':
      case 'ls blog':
      case 'ls ~/blog':
        for (const p of d.posts) print(el('span', 't-dim', `${p.date}  `), link(p.href, p.title));
        return;
      case 'contact':
        kv('email', link(`mailto:${d.email}`, d.email));
        kv('linkedin', link(d.linkedin, d.linkedin.replace(/^https:\/\/(www\.)?/, '')));
        kv('github', link(d.github, d.github.replace(/^https:\/\//, '')));
        return;
      case 'cv':
        print(link(d.resume, d.ui.download, { download: true }));
        return;
      case 'sudo hire-me':
        print(el('span', 't-ok', d.ui.hire));
        setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 700);
        return;
      case 'hire-me':
        print(d.ui.hireDenied);
        return;
      case 'clear':
        out.replaceChildren();
        return;
      case 'ls':
        print(el('span', 't-blue', 'about.md  blog/  cv.pdf  experience/  projects/  research/  skills.yaml'));
        return;
      case 'pwd':
        print('/home/nawal');
        return;
      case 'uname -a':
        print('Linux guerd 6.12.0-devops #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
        return;
      case 'date':
        print(new Date().toString());
        return;
      case 'cat about.md':
        for (const para of d.about) print(para);
        return;
      case 'exit':
      case 'logout':
        print(d.ui.exit);
        return;
      default:
        if (name === 'echo') {
          print(args.join(' '));
          return;
        }
        print(el('span', 't-bad', d.ui.notFound.replace('{c}', name)));
    }
  };

  form.hidden = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    if (value.trim()) history.push(value);
    cursor = history.length;
    input.value = '';
    run(value);
    screen.scrollTop = screen.scrollHeight;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor];
    } else if (event.key === 'ArrowDown' && history.length) {
      event.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] ?? '';
    } else if (event.key === 'Tab' && input.value) {
      const match = COMMANDS.find((c) => c.startsWith(input.value.toLowerCase()));
      if (match) {
        event.preventDefault();
        input.value = match;
      }
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      out.replaceChildren();
    }
  });
  // Clicking anywhere on the screen focuses the prompt, as in a real terminal (but not on links).
  screen.addEventListener('click', (event) => {
    if (!event.target.closest('a') && !window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });
}
