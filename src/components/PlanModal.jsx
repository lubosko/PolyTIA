import { useState } from 'react';
import { completeWithProvider } from '../lib/providers';

const SKILL_FORMAT = `---
skill_id: [snake_case_id]
skill_name: [Human Readable Name]
skill_version: 1.0
skill_category: standards
applies_to: [all]
tia_version: V20
author: PolyTIA Plan
last_updated: 2026-01-01
---

# [Skill Name]

## Purpose
[one sentence]

## Rules
[numbered rules]

## Templates
[SCL/XML code templates if relevant]

## Validation Checklist
[checklist items]

## Examples
[input → output]

## Forbidden Actions
[what must never be done]`;

export default function PlanModal({ provider, model, onClose, onAddAsPack }) {
  const [kind, setKind] = useState('skill'); // 'skill' | 'project'
  const [desc, setDesc] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const hasKey = provider && (provider.id === 'ollama' || !!provider.key);

  async function generate() {
    if (!desc.trim()) return;
    if (!hasKey) { setStatus('Set an API key first (⚙ Settings).'); return; }
    setBusy(true); setStatus('');
    try {
      const prompt = kind === 'skill'
        ? `Create a PolyTIA skill .md file for the Schaeffler TIA Portal V20 standard from this description. ` +
          `Use EXACTLY this markdown structure:\n\n${SKILL_FORMAT}\n\nDescription:\n${desc}\n\nOutput ONLY the .md content.`
        : `Create a PolyTIA project-documentation skill .md describing project structure, block/DB numbering, and logic rules ` +
          `from this description. Use the same frontmatter + ## sections style as a PolyTIA skill. Description:\n${desc}\n\nOutput ONLY the .md content.`;
      const out = await completeWithProvider({ providerId: provider.id, apiKeyOrEndpoint: provider.key, model, prompt });
      setDraft(out.replace(/^```(?:markdown|md)?\n?/, '').replace(/```\s*$/, '').trim());
    } catch (err) {
      setStatus('Error: ' + (err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  function deriveFileName() {
    const m = draft.match(/skill_id:\s*(\S+)/);
    return (m ? m[1] : 'planned_skill') + '.md';
  }

  async function saveAs() {
    if (!window.electronBridge?.saveFile) {
      setStatus('Save-as is only available in the desktop app. Use Add as pack, or copy.');
      return;
    }
    const res = await window.electronBridge.saveFile(deriveFileName(), draft);
    if (res?.path) setStatus('Saved: ' + res.path);
    else if (res?.error) setStatus('Save failed: ' + res.error);
  }

  function copy() {
    navigator.clipboard.writeText(draft).then(() => setStatus('Copied to clipboard.'));
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg w-[640px] max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text text-base font-semibold">📝 Plan a Skill / Project .md</h3>
          <button onClick={onClose} className="text-muted hover:text-text text-lg leading-none">✕</button>
        </div>

        {/* Type */}
        <div className="flex gap-2 mb-3">
          {[['skill', 'Skill'], ['project', 'Project doc']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                kind === id ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted hover:text-text'
              }`}
            >{label}</button>
          ))}
        </div>

        {/* Description */}
        <label className="block text-xs font-mono text-muted uppercase mb-1.5">Describe what to build</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={3}
          placeholder="e.g. Festo valve terminal control block: enable, extend/retract, feedback sensors, fault on timeout…"
          className="w-full bg-bg border border-border rounded px-3 py-2 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent mb-3"
        />
        <button
          onClick={generate}
          disabled={busy || !desc.trim()}
          className="text-xs font-mono px-4 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-50 mb-4"
        >{busy ? '⟳ drafting…' : '✧ Draft .md'}</button>

        {/* Draft preview (editable) */}
        {draft && (
          <>
            <label className="block text-xs font-mono text-muted uppercase mb-1.5">Preview (editable)</label>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={14}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-xs font-mono text-text focus:outline-none focus:border-accent mb-3"
            />
            <div className="flex gap-2 flex-wrap">
              <button onClick={saveAs} className="text-xs font-mono px-3 py-1.5 rounded border border-yellow/60 text-yellow hover:bg-yellow/10 transition-colors">💾 Save as file…</button>
              <button onClick={() => onAddAsPack(draft, deriveFileName())} className="text-xs font-mono px-3 py-1.5 rounded border border-green/60 text-green hover:bg-green/10 transition-colors">⊞ Add as pack</button>
              <button onClick={copy} className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted hover:text-text transition-colors">Copy</button>
            </div>
          </>
        )}

        {status && <p className="text-xs font-mono text-muted mt-3">{status}</p>}
      </div>
    </div>
  );
}
