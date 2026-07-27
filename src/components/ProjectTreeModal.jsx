import { useState, useEffect, useCallback } from 'react';
import { getProjectTree, exportBlock } from '../lib/bridgeApi';

const TYPE_COLOR = {
  FB:  '#3fb950',
  FC:  '#58a6ff',
  OB:  '#d29922',
  DB:  '#bc8cff',
  UDT: '#8b949e',
};

// Bridge JSON is PascalCase (Newtonsoft default) — normalize access
const p = (obj, key) => obj?.[key] ?? obj?.[key[0].toLowerCase() + key.slice(1)];

function BlockRow({ block, onExport, onAnalyze, busy }) {
  const name = p(block, 'Name');
  const number = p(block, 'Number');
  const blockType = p(block, 'BlockType');
  const language = p(block, 'Language');
  const consistent = p(block, 'IsConsistent');
  const color = TYPE_COLOR[blockType] || '#8b949e';

  return (
    <div className="flex items-center gap-2 px-2 py-1 hover:bg-hover/50 rounded group">
      <span
        className="text-[10px] font-mono font-semibold w-8 shrink-0 text-center rounded"
        style={{ color, background: color + '18' }}
      >
        {blockType}
      </span>
      <span className="text-xs font-mono text-text truncate flex-1" title={name}>
        {name}
      </span>
      <span className="text-[10px] font-mono text-muted shrink-0">
        {blockType}{number} · {language}
      </span>
      {consistent === false && (
        <span className="text-[10px] font-mono text-yellow shrink-0" title="Block not compiled — export may fail">
          ⚠
        </span>
      )}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onExport(block)}
          disabled={busy}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-40"
          title="Export XML to Output panel"
        >
          export
        </button>
        <button
          onClick={() => onAnalyze(block)}
          disabled={busy}
          className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted hover:text-green hover:border-green transition-colors disabled:opacity-40"
          title="Export and analyze with Claude for Schaeffler compliance"
        >
          analyze
        </button>
      </div>
    </div>
  );
}

function Group({ group, depth, onExport, onAnalyze, busy }) {
  const [open, setOpen] = useState(depth < 2);
  const name = p(group, 'Name');
  const blocks = p(group, 'Blocks') || [];
  const subGroups = p(group, 'SubGroups') || [];

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full text-left px-1 py-1 text-xs font-mono text-muted hover:text-text transition-colors"
      >
        <span className="text-[10px]">{open ? '▾' : '▸'}</span>
        <span className="text-yellow">🗀</span>
        <span className="truncate">{name}</span>
        <span className="text-[10px] text-muted">({blocks.length})</span>
      </button>
      {open && (
        <div className="border-l border-border ml-2 pl-1">
          {subGroups.map((g, i) => (
            <Group key={i} group={g} depth={depth + 1} onExport={onExport} onAnalyze={onAnalyze} busy={busy} />
          ))}
          {blocks.map((b, i) => (
            <BlockRow key={i} block={b} onExport={onExport} onAnalyze={onAnalyze} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectTreeModal({ onClose, onExported, onAnalyze }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const t = await getProjectTree();
      setTree(t);
    } catch (err) {
      setError(err.message || 'Failed to load project tree');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  async function doExport(block, thenAnalyze = false) {
    const name = p(block, 'Name');
    setBusy(true);
    setStatusMsg(`Exporting ${name}...`);
    try {
      const dto = await exportBlock(name);
      const xml = p(dto, 'XmlContent');
      if (!xml) throw new Error('Bridge returned empty XML');
      onExported({
        name: p(dto, 'Name') || name,
        blockType: p(dto, 'BlockType'),
        number: p(dto, 'Number'),
        language: p(dto, 'Language'),
        xmlContent: xml,
      });
      if (thenAnalyze) {
        onAnalyze({ name: p(dto, 'Name') || name, xmlContent: xml });
        onClose();
        return;
      }
      setStatusMsg(`✓ ${name} exported to Output panel`);
    } catch (err) {
      setStatusMsg(`✕ ${name}: ${err.message}`);
    }
    setBusy(false);
  }

  const projectName = p(tree || {}, 'ProjectName');
  const devices = p(tree || {}, 'Devices') || [];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-text font-mono text-sm font-semibold">TIA Project Tree</h3>
            {projectName && (
              <span className="text-xs font-mono text-green">● {projectName}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadTree}
              disabled={loading}
              className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-text transition-colors disabled:opacity-40"
            >
              ⟳ refresh
            </button>
            <button
              onClick={onClose}
              className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-red hover:border-red transition-colors"
            >
              ✕ close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 min-h-[200px]">
          {loading && (
            <p className="text-muted text-xs font-mono animate-pulse">Loading project tree from bridge...</p>
          )}
          {error && (
            <div>
              <p className="text-red text-xs font-mono mb-2">✕ {error}</p>
              <p className="text-muted text-xs font-mono">Check: TiaBridge.exe running, TIA project open, Live Mode connected.</p>
            </div>
          )}
          {!loading && !error && devices.map((dev, di) => (
            <div key={di} className="mb-2">
              <div className="text-xs font-mono text-accent px-1 py-1">
                ▣ {p(dev, 'Name')} <span className="text-muted">({p(dev, 'TypeIdentifier') || 'device'})</span>
              </div>
              {(p(dev, 'PlcList') || []).map((plc, pi) => (
                <div key={pi} className="ml-2">
                  <div className="text-xs font-mono text-text px-1 py-1">⚙ {p(plc, 'Name')}</div>
                  <div className="ml-2">
                    {(p(plc, 'Groups') || []).map((g, gi) => (
                      <Group
                        key={gi}
                        group={g}
                        depth={0}
                        onExport={b => doExport(b, false)}
                        onAnalyze={b => doExport(b, true)}
                        busy={busy}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {!loading && !error && devices.length === 0 && (
            <p className="text-muted text-xs font-mono">No devices found in project.</p>
          )}
        </div>

        {/* Status bar */}
        {statusMsg && (
          <div className="px-4 py-2 border-t border-border shrink-0">
            <span className="text-xs font-mono text-muted">{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
