import { useState } from 'react';
import { relativeTime } from '../lib/sessions';

export default function HistoryPanel({ sessions, currentId, onOpen, onNew, onRename, onDelete, onClose }) {
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');

  function startRename(s) {
    setRenaming(s.id);
    setRenameVal(s.title);
  }
  function commitRename(id) {
    const v = renameVal.trim();
    if (v) onRename(id, v);
    setRenaming(null);
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        className="absolute top-12 left-64 w-80 max-h-[70vh] bg-panel border border-border rounded-lg shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <span className="text-xs font-mono font-semibold text-text uppercase tracking-wider">Chat History</span>
          <button
            onClick={onNew}
            className="text-xs font-mono px-2 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
          >+ New chat</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <p className="px-3 py-3 text-xs font-mono text-muted">No saved chats yet.</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-3 py-2 border-b border-border/40 group hover:bg-hover transition-colors ${
                s.id === currentId ? 'bg-hover' : ''
              }`}
            >
              {renaming === s.id ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(s.id); if (e.key === 'Escape') setRenaming(null); }}
                  onBlur={() => commitRename(s.id)}
                  className="flex-1 bg-bg border border-accent rounded px-2 py-1 text-xs font-mono text-text focus:outline-none"
                />
              ) : (
                <button onClick={() => onOpen(s.id)} className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    {s.id === currentId && <span className="text-green text-xs">●</span>}
                    <span className="text-xs font-mono text-text truncate">{s.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted">
                    {relativeTime(s.updatedAt)} · {s.messages?.filter(m => m.role !== 'assistant' || m.id !== 'welcome').length || 0} msgs
                  </span>
                </button>
              )}
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startRename(s)}
                  className="text-muted hover:text-text text-xs"
                  title="Rename"
                >✎</button>
                <button
                  onClick={() => { if (window.confirm(`Delete chat "${s.title}"?`)) onDelete(s.id); }}
                  className="text-red/60 hover:text-red text-xs"
                  title="Delete"
                >×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
