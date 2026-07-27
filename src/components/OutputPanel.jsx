import { useState } from 'react';
import { LANG_CONFIG, downloadFile, copyToClipboard } from '../lib/outputParser';

const LANG_REF = {
  scl: `## SCL Quick Reference

### Block types
FUNCTION_BLOCK "Name" ... END_FUNCTION_BLOCK
FUNCTION "Name" : Void ... END_FUNCTION
DATA_BLOCK "Name" ... END_DATA_BLOCK

### Interface sections
VAR_INPUT / VAR_OUTPUT / VAR_IN_OUT / VAR (static) / VAR_TEMP

### Timer call
#statTon(IN := #cond, PT := T#5s);
done := #statTon.Q;

### FB call
#statInstance(Enable := #en, Reset := #rst);
out := #statInstance.Output;

### DB access
"DBName".Variable := value;

### Schaeffler rules
ProDiag FB# = station int
DbParameter DB# = 10000 + station int
stat prefix for static vars
temp prefix for temp vars`,

  fbd: `## FBD SimaticML Quick Reference

### FlgNet structure
<FlgNet xmlns="...FlgNet/v4">
  <Parts>
    <Access Scope="LocalVariable" UId="1">
      <Symbol><Component Name="Enable"/></Symbol>
    </Access>
    <Part Name="And" UId="20">
      <TemplateValue Name="Card" Type="Cardinality">2</TemplateValue>
    </Part>
    <Part Name="Coil" UId="21"/>
  </Parts>
  <Wires>
    <Wire UId="30">
      <IdentCon UId="1"/>
      <NameCon UId="20" Name="in1"/>
    </Wire>
  </Wires>
</FlgNet>

### Part names
And, Or, Not, Coil, SCoil, RCoil
Contact, NContact, TON, TOF, TP, CTU
Move, Call

### Access Scope
LocalVariable  — FB/FC interface var
GlobalVariable — DB.var (nested Components)
TypedConstant  — literal (T#5s, 42, TRUE)`,

  graph: `## GRAPH Quick Reference

### Workflow
1. Copy FB_GRAPH_TEMPLATE from LIB_CopyTemplate
2. Rename to station Sequence FB
3. Add steps manually per description

### Step numbering
S000 — init
S010, S020, S030 — process (×10)

### Transition naming
T_S010_S020 (from → to)

### Message categories
Category 2 = Interlock (blocking)
Category 5 = Warning (display only)

### GraphInterface in Automatic:
"XXXXSequence"(
  OFF_SQ  := "XXXXDbAutomatic".GRAPH_SQ_OFF,
  INIT_SQ := "XXXXDbAutomatic".GRAPH_SQ_INIT
)

### Read step number:
stepNr := "XXXXDbAutomatic".Sequence[1].Step_Number;`,
};

function FileCard({ file, isActive, onClick }) {
  const cfg = LANG_CONFIG[file.language] || LANG_CONFIG.text;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 border-b border-border transition-colors ${
        isActive ? 'bg-hover' : 'hover:bg-hover/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold shrink-0" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        <span className="text-xs font-mono text-text truncate flex-1" title={file.filename}>
          {file.filename}
        </span>
      </div>
    </button>
  );
}

export default function OutputPanel({ outputFiles, activeLanguage, width }) {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'ref'
  const [activeFileId, setActiveFileId] = useState(null);
  const [copied, setCopied] = useState(false);

  const activeFile = outputFiles.find(f => f.id === activeFileId) || outputFiles[outputFiles.length - 1];
  const cfg = activeFile ? (LANG_CONFIG[activeFile.language] || LANG_CONFIG.text) : null;

  function copy() {
    if (!activeFile) return;
    copyToClipboard(activeFile.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    if (!activeFile) return;
    downloadFile(activeFile.filename, activeFile.content);
  }

  return (
    <aside
      className="shrink-0 flex flex-col border-l border-border bg-panel overflow-hidden"
      style={{ width }}
    >
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'files' ? 'text-text border-b border-accent' : 'text-muted hover:text-text'
          }`}
        >
          Output Files {outputFiles.length > 0 && `(${outputFiles.length})`}
        </button>
        <button
          onClick={() => setActiveTab('ref')}
          className={`flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            activeTab === 'ref' ? 'text-text border-b border-accent' : 'text-muted hover:text-text'
          }`}
        >
          Lang Ref
        </button>
      </div>

      {activeTab === 'files' && (
        <div className="flex flex-col flex-1 min-h-0">
          {outputFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <p className="text-muted text-xs font-mono mb-2">No files generated yet.</p>
                <p className="text-muted text-xs font-mono">Generated SCL, XML, and GRAPH files will appear here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* File list */}
              <div className="border-b border-border shrink-0 max-h-40 overflow-y-auto">
                {outputFiles.map(f => (
                  <FileCard
                    key={f.id}
                    file={f}
                    isActive={activeFile?.id === f.id}
                    onClick={() => setActiveFileId(f.id)}
                  />
                ))}
              </div>

              {/* File viewer */}
              {activeFile && (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* File header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0"
                    style={{ background: cfg?.bgColor }}
                  >
                    <span className="text-xs font-mono font-semibold truncate flex-1" style={{ color: cfg?.color }}>
                      {activeFile.filename}
                    </span>
                    <div className="flex gap-2 ml-2 shrink-0">
                      <button
                        onClick={copy}
                        className="text-xs font-mono text-muted hover:text-text transition-colors"
                      >
                        {copied ? '✓' : 'copy'}
                      </button>
                      <button
                        onClick={download}
                        className="text-xs font-mono text-muted hover:text-text transition-colors"
                      >
                        ↓ save
                      </button>
                    </div>
                  </div>
                  {/* Code content */}
                  <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-text leading-relaxed whitespace-pre">
                    {activeFile.content}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'ref' && (
        <div className="flex-1 overflow-y-auto p-3">
          <pre className="text-xs font-mono text-muted whitespace-pre-wrap leading-relaxed">
            {LANG_REF[activeLanguage] || LANG_REF.scl}
          </pre>
        </div>
      )}
    </aside>
  );
}
