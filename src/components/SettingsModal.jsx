import { useState, useEffect } from 'react';
import { PROVIDERS, AVAILABLE_MODELS, listOllamaModels } from '../lib/providers';

export default function SettingsModal({
  onClose,
  providerKeys, onSaveKey, onRemoveKey,
  activeProvider, onSetProvider,
  activeModel, onSetModel,
  memoryPath, onSetMemoryPath, onConsolidate, consolidating,
}) {
  const [open, setOpen] = useState({ keys: true, app: false });
  const [keyInputs, setKeyInputs] = useState({});
  const [saveState, setSaveState] = useState({});
  const [ollamaEndpoint, setOllamaEndpoint] = useState(providerKeys.ollama || 'http://localhost:11434');
  const [ollamaStatus, setOllamaStatus] = useState('');
  const [ollamaModels, setOllamaModels] = useState([]);
  const [pathInput, setPathInput] = useState(memoryPath || '');

  useEffect(() => { setPathInput(memoryPath || ''); }, [memoryPath]);

  function toggle(k) { setOpen(o => ({ ...o, [k]: !o[k] })); }

  function saveKey(id) {
    const v = (keyInputs[id] || '').trim();
    if (!v) return;
    onSaveKey(id, v);
    setKeyInputs(s => ({ ...s, [id]: '' }));
    setSaveState(s => ({ ...s, [id]: 'saved' }));
    setTimeout(() => setSaveState(s => ({ ...s, [id]: '' })), 1500);
  }

  async function testOllama() {
    setOllamaStatus('Testing…');
    onSaveKey('ollama', ollamaEndpoint.trim());
    const models = await listOllamaModels(ollamaEndpoint.trim());
    setOllamaModels(models);
    setOllamaStatus(models.length
      ? `● ${models.length} model${models.length === 1 ? '' : 's'} installed`
      : '✗ Not running — start Ollama first');
  }

  // Models for the active provider (Ollama uses live-fetched list)
  const providerModels = activeProvider === 'ollama'
    ? ollamaModels.map(m => ({ id: `ollama:${m}`, label: m }))
    : AVAILABLE_MODELS.filter(m => m.provider === activeProvider);

  const cloudProviders = PROVIDERS.filter(p => !p.isLocal);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg w-[520px] max-h-[85vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-text text-base font-semibold">Settings</h3>
          <button onClick={onClose} className="text-muted hover:text-text text-lg leading-none">✕</button>
        </div>

        {/* ── API Keys ── */}
        <div className="border border-border rounded-lg mb-3 overflow-hidden">
          <button
            onClick={() => toggle('keys')}
            className="flex items-center justify-between w-full px-4 py-3 bg-bg font-mono"
          >
            <span className={`text-xs font-semibold ${open.keys ? 'text-yellow' : 'text-text'}`}>🔑 API Keys</span>
            <span className={`text-xs ${open.keys ? 'text-yellow' : 'text-muted'}`}>{open.keys ? '▼' : '▶'}</span>
          </button>

          {open.keys && (
            <div className="p-4 flex flex-col gap-5">
              {cloudProviders.map(p => (
                <div key={p.id} className="border-b border-border/50 pb-4">
                  <label className="block text-xs font-mono text-muted uppercase mb-1.5">{p.label} API Key</label>
                  {providerKeys[p.id] ? (
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-xs font-mono text-green">● Key stored</span>
                      <button
                        onClick={() => onRemoveKey(p.id)}
                        className="text-xs font-mono px-3 py-1.5 rounded border border-red text-red hover:bg-red/10 transition-colors"
                      >Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keyInputs[p.id] || ''}
                        onChange={e => setKeyInputs(s => ({ ...s, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveKey(p.id)}
                        placeholder={p.keyHint}
                        className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => saveKey(p.id)}
                        className="text-xs font-mono px-3 py-1.5 rounded border border-yellow/60 text-yellow hover:bg-yellow/10 transition-colors"
                      >{saveState[p.id] === 'saved' ? '✓' : 'Save'}</button>
                    </div>
                  )}
                </div>
              ))}

              {/* Ollama endpoint */}
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Ollama (Local) — Endpoint</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={e => setOllamaEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => onSaveKey('ollama', ollamaEndpoint.trim())}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-yellow/60 text-yellow hover:bg-yellow/10 transition-colors"
                  >Save</button>
                  <button
                    onClick={testOllama}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
                  >Test</button>
                </div>
                {ollamaStatus && (
                  <span className={`text-xs font-mono ${ollamaStatus.startsWith('✗') ? 'text-red' : 'text-green'}`}>{ollamaStatus}</span>
                )}
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  No API key needed. Install Ollama from ollama.ai, then pull a model: <span className="font-mono">ollama pull llama3.2</span>
                </p>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Keys are stored locally in this app (localStorage) and sent only to the provider you select.
              </p>
            </div>
          )}
        </div>

        {/* ── App Settings ── */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => toggle('app')}
            className="flex items-center justify-between w-full px-4 py-3 bg-bg font-mono"
          >
            <span className={`text-xs font-semibold ${open.app ? 'text-yellow' : 'text-text'}`}>⚙ App Settings</span>
            <span className={`text-xs ${open.app ? 'text-yellow' : 'text-muted'}`}>{open.app ? '▼' : '▶'}</span>
          </button>

          {open.app && (
            <div className="p-4 flex flex-col gap-5">
              {/* Active provider */}
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Active Provider</label>
                <div className="flex gap-2">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => onSetProvider(p.id)}
                      className={`flex-1 text-xs font-mono py-1.5 rounded border transition-colors ${
                        activeProvider === p.id
                          ? 'border-accent text-accent bg-accent/10'
                          : 'border-border text-muted hover:text-text'
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Model</label>
                <select
                  value={activeModel}
                  onChange={e => onSetModel(e.target.value)}
                  className="w-full bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent"
                >
                  {providerModels.length === 0 && <option value="">(no models — Test Ollama first)</option>}
                  {providerModels.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                {activeProvider !== 'anthropic' && (
                  <p className="text-xs text-muted mt-1.5">Live Mode block-reading tools work on Anthropic only.</p>
                )}
              </div>

              {/* Memory */}
              <div className="border-t border-border/50 pt-4">
                <label className="block text-xs font-mono text-muted uppercase mb-1.5">Memory File (shared lessons)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={pathInput}
                    onChange={e => setPathInput(e.target.value)}
                    placeholder="path to polytia-memory.md"
                    className="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono text-text placeholder:text-muted focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => onSetMemoryPath(pathInput.trim())}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-yellow/60 text-yellow hover:bg-yellow/10 transition-colors"
                  >Set</button>
                </div>
                <button
                  onClick={onConsolidate}
                  disabled={consolidating}
                  className="text-xs font-mono px-3 py-1.5 rounded border border-border text-muted hover:text-text hover:border-accent transition-colors disabled:opacity-50"
                >{consolidating ? '⟳ consolidating…' : '⟳ Consolidate memory (merge duplicates)'}</button>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Point this at a shared/network path to sync lessons with colleagues. Applies to every project.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
