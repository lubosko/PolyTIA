// Chat session persistence — localStorage-backed named sessions.

const SESSIONS_KEY = 'tia_sessions';
const LAST_KEY = 'tia_last_session';

export function listSessions() {
  try {
    const arr = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
    return arr.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch { return []; }
}

function writeAll(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadSession(id) {
  return listSessions().find(s => s.id === id) || null;
}

export function saveSession(session) {
  const all = listSessions().filter(s => s.id !== session.id);
  all.push({ ...session, updatedAt: Date.now() });
  writeAll(all);
}

export function deleteSession(id) {
  writeAll(listSessions().filter(s => s.id !== id));
  if (getLastSessionId() === id) setLastSessionId('');
}

export function newSession() {
  const now = Date.now();
  return {
    id: `s_${now}_${Math.random().toString(36).slice(2, 6)}`,
    title: 'New chat',
    messages: [],
    outputFiles: [],
    activeLanguage: 'scl',
    createdAt: now,
    updatedAt: now,
  };
}

/** Derive a short title from the first user message. */
export function deriveTitle(messages) {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return 'New chat';
  const t = firstUser.content.replace(/\s+/g, ' ').trim();
  return t.length > 42 ? t.slice(0, 42) + '…' : t;
}

export function getLastSessionId() { return localStorage.getItem(LAST_KEY) || ''; }
export function setLastSessionId(id) { localStorage.setItem(LAST_KEY, id || ''); }

/** Relative "2h ago" style label. */
export function relativeTime(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
