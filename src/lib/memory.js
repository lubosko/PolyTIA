// Cross-project memory — a global, human-readable .md file of lessons learned.
// Backed by a real file via Electron IPC (electronBridge.memory). Falls back to
// localStorage in the dev browser preview where no Electron bridge exists.

const LS_KEY = 'tia_memory_fallback';
const mem = () => (typeof window !== 'undefined' ? window.electronBridge?.memory : null);

const HEADER = '# PolyTIA Memory — Lessons Learned\n';

export async function loadMemory() {
  const m = mem();
  if (m) {
    try { return (await m.read())?.content || ''; } catch { return ''; }
  }
  return localStorage.getItem(LS_KEY) || '';
}

export async function writeMemory(text) {
  const m = mem();
  if (m) { try { await m.write(text); } catch {} return; }
  localStorage.setItem(LS_KEY, text);
}

export async function appendLesson(entry) {
  const m = mem();
  if (m) { try { await m.append(entry); } catch {} return; }
  const cur = localStorage.getItem(LS_KEY) || '';
  const base = cur.trim() ? cur : HEADER;
  localStorage.setItem(LS_KEY, base.replace(/\s*$/, '') + '\n\n' + entry.trim() + '\n');
}

export async function getMemoryPath() {
  const m = mem();
  if (m) { try { return (await m.getPath())?.path || ''; } catch { return ''; } }
  return '(localStorage — dev preview)';
}

export async function setMemoryPath(path) {
  const m = mem();
  if (m) { try { await m.setPath(path); } catch {} }
}

/** Format one lesson as a markdown entry. id derived from timestamp. */
export function formatLesson({ title, error, rule }) {
  const date = new Date().toISOString().slice(0, 10);
  const id = 'L-' + Date.now().toString(36).toUpperCase();
  return `### ${id} (${date}) — ${title || 'Lesson'}\n` +
    `Error: ${error || '(unspecified)'}\n` +
    `Rule: ${rule || '(unspecified)'}\n`;
}

/** System-prompt block. Empty string when no lessons stored. */
export function buildMemoryPrompt(text) {
  const body = (text || '').trim();
  if (!body || body === HEADER.trim()) return '';
  return `\n\n## Memory — Lessons Learned (apply to all projects)\n` +
    `These are corrections captured from past mistakes. Follow every rule below unless the user overrides it.\n\n` +
    body;
}
