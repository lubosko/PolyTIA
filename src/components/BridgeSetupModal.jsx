export default function BridgeSetupModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-panel border border-border rounded w-[580px] max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-green font-mono font-semibold text-sm">⚙ TIA Bridge Setup</span>
            <span className="text-xs text-muted font-mono bg-hover px-2 py-0.5 rounded border border-border">localhost:5001</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-lg leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-5 text-xs font-mono">

          {/* Step 1 */}
          <Step n="1" title="Add user to Siemens TIA Openness group" once>
            <p className="text-muted mb-2">Run once as Administrator, then log out and back in:</p>
            <Code>net localgroup "Siemens TIA Openness" {window.username || '%USERNAME%'} /add</Code>
          </Step>

          {/* Step 2 */}
          <Step n="2" title="Register HTTP port" once>
            <p className="text-muted mb-2">Run once as Administrator:</p>
            <Code>netsh http add urlacl url=http://localhost:5001/ user=Everyone</Code>
          </Step>

          {/* Step 3 */}
          <Step n="3" title="Enable Openness API in TIA Portal" once>
            <p className="text-muted">TIA Portal → <span className="text-text">Options</span> → <span className="text-text">Settings</span> → <span className="text-text">General</span> → <span className="text-text">Openness API</span> → check <span className="text-green">Enable</span></p>
          </Step>

          {/* Step 4 */}
          <Step n="4" title="Start TIA Portal V20 + open project">
            <p className="text-muted">Project must be open before starting bridge.</p>
          </Step>

          {/* Step 5 */}
          <Step n="5" title="Start TIA Bridge">
            <p className="text-muted mb-2">Double-click:</p>
            <Code>bridge\TiaBridge\bin\Debug\TiaBridge.exe</Code>
            <p className="text-muted mt-2">Console should show:</p>
            <Code variant="output">● Connected to project: YourProject{'\n'}● Bridge listening on http://localhost:5001/</Code>
          </Step>

          {/* Step 6 */}
          <Step n="6" title="Allow access in TIA Portal">
            <p className="text-muted">TIA Portal shows popup: <span className="text-yellow">"Allow external application access?"</span></p>
            <p className="text-text mt-1">→ Click <span className="text-green font-semibold">Allow</span></p>
          </Step>

          {/* Step 7 */}
          <Step n="7" title="Enable Live Mode in PolyTIA">
            <p className="text-muted">Click <span className="text-green font-semibold">○ LIVE MODE</span> button (top bar).</p>
            <p className="text-muted">Turns green → <span className="text-green">● LIVE: ProjectName</span></p>
          </Step>

          {/* Troubleshoot */}
          <div className="border-t border-border pt-4">
            <p className="text-muted uppercase tracking-widest text-xs mb-3">Troubleshoot</p>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {[
                  ['Bridge "Access denied"', 'Run netsh urlacl command as Admin (Step 2)'],
                  ['TIA dialog never appears', 'Enable Openness API in TIA Portal settings (Step 3)'],
                  ['Bridge hangs on start', 'Open TIA Portal + project BEFORE starting bridge'],
                  ['"Not in Openness group"', 'Log out/in after adding user to group (Step 1)'],
                  ['LIVE MODE stays grey', 'Check TiaBridge.exe running, bridge listening on 5001'],
                ].map(([prob, fix]) => (
                  <tr key={prob}>
                    <td className="py-1.5 pr-4 text-red/80 w-1/2">{prob}</td>
                    <td className="py-1.5 text-muted">{fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-mono px-4 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, once, children }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xs">
        {n}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-text font-semibold">{title}</span>
          {once && <span className="text-xs text-yellow border border-yellow/40 rounded px-1.5 py-0.5">one-time</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Code({ children, variant }) {
  function copy() { navigator.clipboard.writeText(children); }
  return (
    <div className={`relative rounded border ${variant === 'output' ? 'border-green/30 bg-green/5' : 'border-border bg-hover'} px-3 py-2 group`}>
      <pre className="text-text whitespace-pre-wrap break-all">{children}</pre>
      {variant !== 'output' && (
        <button
          onClick={copy}
          className="absolute top-1.5 right-2 text-muted hover:text-text opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        >
          copy
        </button>
      )}
    </div>
  );
}
