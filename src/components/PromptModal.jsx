import { useState, useEffect, useRef } from 'react';

/** In-app text prompt (Electron has no working window.prompt). */
export default function PromptModal({ title, label, defaultValue = '', placeholder, onSubmit, onCancel }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  function submit() {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-panel border border-border rounded-lg w-96 p-5">
        <h3 className="text-text font-mono text-sm font-semibold mb-1">{title}</h3>
        {label && <p className="text-muted text-xs mb-3">{label}</p>}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
          placeholder={placeholder}
          className="w-full bg-bg border border-border rounded px-3 py-2 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted hover:text-text transition-colors"
          >Cancel</button>
          <button
            onClick={submit}
            className="text-xs font-mono px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
          >Save</button>
        </div>
      </div>
    </div>
  );
}
