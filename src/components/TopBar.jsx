import { useState, useRef, useEffect, useCallback } from 'react';
import { parseEplanXml } from '../lib/eplanParser';
import { checkBridge, connectBridge } from '../lib/bridgeApi';
import BridgeSetupModal from './BridgeSetupModal';

export default function TopBar({ hasKey, providerLabel, onOpenSettings, skillCount, activeSkillCount, onEplanImport, eplanLoaded, onBridgeChange, bridgeConnected, onOpenProjectTree, onBridgeProject }) {
  const [eplanError, setEplanError] = useState('');
  const eplanInputRef = useRef(null);

  // Bridge / Live Mode state
  const [liveMode, setLiveMode] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState('off'); // 'off' | 'connecting' | 'connected' | 'error'
  const [bridgeProject, setBridgeProject] = useState('');
  const [showBridgeSetup, setShowBridgeSetup] = useState(false);
  const pingRef = useRef(null);

  const pingBridge = useCallback(async () => {
    try {
      const res = await checkBridge();
      if (res.connected) {
        setBridgeStatus('connected');
        setBridgeProject(res.projectName || '');
        onBridgeChange?.(true);
        onBridgeProject?.(res.projectName || '');
      } else {
        setBridgeStatus('error');
        onBridgeChange?.(false);
      }
    } catch {
      setBridgeStatus('error');
      onBridgeChange?.(false);
    }
  }, [onBridgeChange, onBridgeProject]);

  async function toggleLiveMode() {
    if (liveMode) {
      // Turn off
      setLiveMode(false);
      setBridgeStatus('off');
      setBridgeProject('');
      clearInterval(pingRef.current);
      onBridgeChange?.(false);
    } else {
      // Turn on — try to connect
      setLiveMode(true);
      setBridgeStatus('connecting');
      try {
        await connectBridge();
        await pingBridge();
        // Poll every 10s
        pingRef.current = setInterval(pingBridge, 10000);
      } catch (err) {
        setBridgeStatus('error');
        setBridgeProject(err.message || 'Bridge not reachable');
      }
    }
  }

  useEffect(() => () => clearInterval(pingRef.current), []);

  async function handleEplanFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setEplanError('');
    try {
      const text = await file.text();
      const data = parseEplanXml(text);
      if (data.signals.length === 0) {
        setEplanError('No signals found. Check XML format.');
      } else {
        onEplanImport(data, file.name);
      }
    } catch (err) {
      setEplanError(err.message || 'Parse error');
    }
    e.target.value = '';
  }

  return (
    <>
      <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-panel shrink-0">
        {/* Left: logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-accent font-mono font-semibold text-sm tracking-wider">⚙ PolyTIA</span>
            <span className="text-xs text-muted font-mono bg-hover px-2 py-0.5 rounded border border-border">V20</span>
          </div>
          <span className="text-border">|</span>
          <span className="text-xs text-muted font-mono">GENERATOR MODE</span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-mono">
            {activeSkillCount}/{skillCount} skills
          </span>

          {/* Eplan import */}
          <input ref={eplanInputRef} type="file" accept=".xml" className="hidden" onChange={handleEplanFile} />
          <button
            onClick={() => { setEplanError(''); eplanInputRef.current?.click(); }}
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded border transition-colors ${
              eplanLoaded
                ? 'border-yellow text-yellow hover:bg-yellow/10'
                : 'border-border text-muted hover:text-text hover:border-yellow'
            }`}
            title={eplanLoaded ? 'Eplan data loaded — click to reload' : 'Import Eplan XML'}
          >
            {eplanLoaded ? '⚡ EPLAN LOADED' : '⬆ IMPORT EPLAN'}
          </button>
          {eplanError && (
            <span className="text-xs text-red font-mono" title={eplanError}>⚠ {eplanError.slice(0, 30)}</span>
          )}

          {/* Bridge setup help */}
          <button
            onClick={() => setShowBridgeSetup(true)}
            className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-green hover:border-green/50 transition-colors"
            title="TIA Bridge setup guide"
          >
            ? BRIDGE
          </button>

          {/* Project tree browser — only when bridge connected */}
          {bridgeConnected && (
            <button
              onClick={onOpenProjectTree}
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
              title="Browse TIA project blocks — export or analyze"
            >
              ⊞ TREE
            </button>
          )}

          {/* Live Mode */}
          <button
            onClick={toggleLiveMode}
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded border transition-colors ${
              bridgeStatus === 'connected' ? 'border-green text-green hover:bg-green/10'
            : bridgeStatus === 'connecting' ? 'border-yellow text-yellow animate-pulse'
            : bridgeStatus === 'error'     ? 'border-red text-red hover:bg-red/10'
            : 'border-border text-muted hover:text-text hover:border-green'
            }`}
            title={
              bridgeStatus === 'connected' ? `Live: ${bridgeProject}` :
              bridgeStatus === 'error'     ? 'Bridge not reachable — start TiaBridge.exe' :
              'Enable Live TIA Mode (requires TiaBridge.exe running)'
            }
          >
            {bridgeStatus === 'connected'  ? `● LIVE: ${(bridgeProject || '').slice(0, 16)}` :
             bridgeStatus === 'connecting' ? '⟳ CONNECTING...' :
             bridgeStatus === 'error'      ? '✕ BRIDGE ERROR' :
             '○ LIVE MODE'}
          </button>

          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded border transition-colors ${
              hasKey
                ? 'border-accent text-accent hover:bg-accent/10'
                : 'border-red text-red hover:bg-red/10 animate-pulse'
            }`}
            title={hasKey ? `Provider: ${providerLabel} — click for Settings` : 'No API key set — open Settings'}
          >
            {hasKey ? '⚙ SETTINGS' : '⚙ SET API KEY'}
          </button>
        </div>
      </header>

      {/* Bridge Setup Modal */}
      {showBridgeSetup && <BridgeSetupModal onClose={() => setShowBridgeSetup(false)} />}
    </>
  );
}
