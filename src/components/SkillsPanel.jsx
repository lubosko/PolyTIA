import { useRef, useState } from 'react';
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS } from '../lib/skillManager';
import { draftSkillFromText } from '../lib/claudeApi';
import { extractPdfText } from '../lib/pdfText';

function PackRow({ pack, isActive, onActivate, onRemove, onToggleSkill }) {
  const [open, setOpen] = useState(false);
  const activeCount = pack.skills.filter(s => s.active).length;

  return (
    <div className={`${isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 group hover:bg-hover transition-colors">
        <button
          onClick={onActivate}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          title={isActive ? 'Click to deactivate pack' : 'Click to activate pack (deactivates other packs)'}
        >
          <span className={`text-xs shrink-0 ${isActive ? 'text-green' : 'text-muted'}`}>
            {isActive ? '●' : '○'}
          </span>
          <span className="text-xs font-mono text-text truncate flex-1" title={pack.name}>
            {pack.name}
          </span>
          <span className="text-xs text-muted font-mono shrink-0">
            {activeCount}/{pack.skills.length}
          </span>
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-muted hover:text-text text-xs shrink-0"
          title="Show pack skills"
        >
          {open ? '▾' : '▸'}
        </button>
        <button
          onClick={onRemove}
          className="text-red/50 hover:text-red text-xs opacity-0 group-hover:opacity-100 shrink-0"
          title="Remove pack"
        >
          ×
        </button>
      </div>
      {open && pack.skills.map(skill => (
        <div key={skill.id} className="flex items-center gap-2 pl-8 pr-3 py-1 hover:bg-hover transition-colors">
          <button
            onClick={() => onToggleSkill(skill.id)}
            className={`w-7 h-4 rounded-full transition-colors shrink-0 ${
              skill.active ? 'bg-accent' : 'bg-border'
            }`}
          >
            <span
              className={`block w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${
                skill.active ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs font-mono text-text truncate flex-1" title={skill.name}>
            {skill.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SkillsPanel({
  skills, onToggle, onAddCustom, provider, model, width,
  packs = [], activePackName, onActivatePack, onRemovePack, onTogglePackSkill, onImportPack, onOpenPlan,
}) {
  const hasKey = provider && (provider.id === 'ollama' || !!provider.key);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const standardInputRef = useRef(null);
  const packInputRef = useRef(null);
  const [draftingStandard, setDraftingStandard] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  async function handlePackUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) await onImportPack(files);
    e.target.value = '';
  }

  // Flatten every imported project-pack .md file with its disk path
  const projectFiles = packs.flatMap(pack =>
    pack.skills.map(s => ({
      pack: pack.name,
      name: s.fileName || s.name,
      path: s.sourcePath || s.fileName || s.name,
    }))
  );

  function openFile(path) {
    if (window.electronBridge?.showItemInFolder) {
      window.electronBridge.showItemInFolder(path);
    } else {
      alert('File location:\n' + path);
    }
  }

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = skills.filter(s => s.category === cat);
    return acc;
  }, {});

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    onAddCustom(text, file.name);
    e.target.value = '';
  }

  // Which section the + ADD button targets (set on click). 'standards' | 'analyzers'
  const addCategoryRef = useRef('standards');

  async function handleStandardUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const category = addCategoryRef.current || 'standards';
    const catLabel = category.toUpperCase();
    const isPdf = /\.pdf$/i.test(file.name);
    const isMd = /\.md$/i.test(file.name);

    try {
      // .md → load directly into the target category
      if (isMd) {
        const text = await file.text();
        onAddCustom(text, file.name, category);
        return;
      }

      // .pdf / .txt → extract text, draft skill via active provider, review, add
      if (!hasKey) { alert('Set an API key first (⚙ Settings) to draft from a document.'); return; }

      setDraftingStandard(true);
      const docText = isPdf ? await extractPdfText(file) : await file.text();
      const skillMd = await draftSkillFromText({ provider, model, documentText: docText, filename: file.name });

      const confirmed = window.confirm(
        `Drafted from "${file.name}".\n\nPreview (first 600 chars):\n\n${skillMd.slice(0, 600)}\n\n...\n\nAdd to ${catLabel}?`
      );
      if (confirmed) {
        onAddCustom(skillMd, file.name.replace(/\.[^.]+$/, '') + `_${category}.md`, category);
      }
    } catch (err) {
      alert('Error processing file: ' + (err?.message || err));
    } finally {
      setDraftingStandard(false);
      e.target.value = '';
    }
  }

  function triggerAdd(category) {
    addCategoryRef.current = category;
    standardInputRef.current?.click();
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!hasKey) { alert('Set an API key first (⚙ Settings)'); return; }

    const text = await file.text();
    try {
      const skillMd = await draftSkillFromText({ provider, model, documentText: text, filename: file.name });
      // Show draft in a simple prompt for review
      const confirmed = window.confirm(
        `Skill draft generated from "${file.name}".\n\nPreview (first 500 chars):\n${skillMd.slice(0, 500)}\n\n...\n\nAdd to custom skills?`
      );
      if (confirmed) onAddCustom(skillMd, file.name.replace(/\.[^.]+$/, '') + '_skill.md');
    } catch (err) {
      alert('Error drafting skill: ' + err.message);
    }
    e.target.value = '';
  }

  return (
    <aside
      className="shrink-0 flex flex-col border-r border-border bg-panel overflow-hidden"
      style={{ width }}
    >
      {/* Header — clickable, toggles the project files window */}
      <button
        onClick={() => setShowFiles(v => !v)}
        className="flex items-center justify-between w-full px-3 py-2 border-b border-border hover:bg-hover transition-colors"
        title="Show imported project .md files and their locations"
      >
        <span className="text-xs font-mono font-semibold text-muted uppercase tracking-widest">📁 Skills</span>
        <span className="text-xs text-muted">
          {projectFiles.length > 0 && <span className="mr-1 text-accent">{projectFiles.length}</span>}
          {showFiles ? '▾' : '▸'}
        </span>
      </button>

      {/* Project files window */}
      {showFiles && (
        <div className="border-b border-border bg-bg/50 max-h-48 overflow-y-auto">
          {projectFiles.length === 0 ? (
            <p className="px-3 py-2 text-xs font-mono text-muted">
              No project files. Use <span className="text-green">⊞ Import project pack</span> to add .md files.
            </p>
          ) : (
            projectFiles.map((f, i) => (
              <button
                key={i}
                onClick={() => openFile(f.path)}
                className="flex flex-col items-start w-full text-left px-3 py-1.5 hover:bg-hover transition-colors group"
                title={`Open folder — ${f.path}`}
              >
                <span className="text-xs font-mono text-text truncate w-full">
                  📄 {f.name} <span className="text-muted">· {f.pack}</span>
                </span>
                <span className="text-[10px] font-mono text-muted truncate w-full group-hover:text-accent">
                  {f.path}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Skill list */}
      <div className="flex-1 overflow-y-auto">
        {/* Project packs */}
        {packs.length > 0 && (
          <div className="mb-1">
            <div className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-green">
              Project Packs
            </div>
            {packs.map(pack => (
              <PackRow
                key={pack.name}
                pack={pack}
                isActive={pack.name === activePackName}
                onActivate={() => onActivatePack(pack.name)}
                onRemove={() => onRemovePack(pack.name)}
                onToggleSkill={(skillId) => onTogglePackSkill(pack.name, skillId)}
              />
            ))}
          </div>
        )}
        {CATEGORY_ORDER.map(cat => {
          const catSkills = grouped[cat];
          // standards & analyzers always render (so their + ADD button stays available even when empty)
          const alwaysShow = cat === 'standards' || cat === 'analyzers';
          if (!catSkills?.length && !alwaysShow) return null;
          const canAdd = cat === 'standards' || cat === 'analyzers';
          return (
            <div key={cat} className="mb-1">
              <div className={`flex items-center justify-between px-3 py-1.5 text-xs font-mono uppercase tracking-wider ${CATEGORY_COLORS[cat] || 'text-muted'}`}>
                <span>{CATEGORY_LABELS[cat]}</span>
                {canAdd && (
                  <button
                    onClick={() => triggerAdd(cat)}
                    disabled={draftingStandard}
                    className="text-yellow hover:bg-yellow/10 border border-yellow/40 rounded px-1.5 leading-none py-0.5 transition-colors disabled:opacity-50"
                    title={`Add ${cat === 'analyzers' ? 'analyzer' : 'standard'} from .md, .pdf or .txt`}
                  >
                    {draftingStandard ? '⟳ …' : '+ ADD'}
                  </button>
                )}
              </div>
              {!catSkills?.length && (
                <p className="px-3 py-1.5 text-[10px] font-mono text-muted italic">none — use + ADD to load one</p>
              )}
              {catSkills.map(skill => (
                <div
                  key={skill.id}
                  className={`flex items-center gap-2 px-3 py-1.5 group transition-colors ${
                    skill.active ? 'hover:bg-hover' : 'hover:bg-hover opacity-50'
                  }`}
                >
                  {/* Toggle */}
                  {skill.canToggle ? (
                    <button
                      onClick={() => onToggle(skill.id)}
                      className={`w-7 h-4 rounded-full transition-colors shrink-0 skill-toggle ${
                        skill.active ? 'bg-accent' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`block w-3 h-3 rounded-full bg-white mx-0.5 transition-transform ${
                          skill.active ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="w-7 h-4 rounded-full bg-accent/30 shrink-0 flex items-center justify-center">
                      <span className="block w-3 h-3 rounded-full bg-accent" />
                    </div>
                  )}

                  {/* Name */}
                  <span className="text-xs font-mono text-text truncate flex-1" title={skill.name}>
                    {skill.name}
                  </span>

                  {/* Version */}
                  <span className="text-xs text-muted font-mono shrink-0 opacity-0 group-hover:opacity-100">
                    v{skill.version}
                  </span>

                  {/* Remove custom */}
                  {!skill.builtin && (
                    <button
                      onClick={() => onToggle(skill.id, true)}
                      className="text-red/50 hover:text-red text-xs opacity-0 group-hover:opacity-100 shrink-0"
                      title="Remove skill"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border p-3 flex flex-col gap-2">
        <input ref={fileInputRef} type="file" accept=".md" className="hidden" onChange={handleFileUpload} />
        <input ref={standardInputRef} type="file" accept=".md,.pdf,.txt" className="hidden" onChange={handleStandardUpload} />
        <input ref={docInputRef} type="file" accept=".md,.txt" className="hidden" onChange={handleDocUpload} />
        <input ref={packInputRef} type="file" accept=".md" multiple className="hidden" onChange={handlePackUpload} />

        <button
          onClick={() => packInputRef.current?.click()}
          className="w-full text-xs font-mono py-1.5 rounded border border-green/40 text-green hover:bg-green/10 transition-colors"
          title="Import multiple .md skills as one project pack"
        >
          ⊞ Import project pack
        </button>
        <button
          onClick={onOpenPlan}
          className="w-full text-xs font-mono py-1.5 rounded border border-purple/40 text-purple hover:bg-purple/10 transition-colors"
          title="Plan and draft a new skill / project .md file"
        >
          📝 Plan skill / .md
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full text-xs font-mono py-1.5 rounded border border-border text-muted hover:text-text hover:border-accent transition-colors"
        >
          + Load skill (.md)
        </button>
        <button
          onClick={() => docInputRef.current?.click()}
          className="w-full text-xs font-mono py-1.5 rounded border border-border text-muted hover:text-text hover:border-yellow transition-colors"
        >
          ⬆ Draft from doc (.txt)
        </button>
      </div>
    </aside>
  );
}
