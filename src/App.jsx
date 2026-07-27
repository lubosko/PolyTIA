import { useState, useEffect, useRef } from 'react';
import TopBar from './components/TopBar';
import SkillsPanel from './components/SkillsPanel';
import ChatPanel from './components/ChatPanel';
import OutputPanel from './components/OutputPanel';
import ProjectTreeModal from './components/ProjectTreeModal';
import ResizeHandle from './components/ResizeHandle';
import SettingsModal from './components/SettingsModal';
import PromptModal from './components/PromptModal';
import HistoryPanel from './components/HistoryPanel';
import PlanModal from './components/PlanModal';
import { listSessions, loadSession, saveSession, deleteSession, newSession, deriveTitle, getLastSessionId, setLastSessionId } from './lib/sessions';
import { loadBuiltinSkills, parseCustomSkill, buildSystemPrompt } from './lib/skillManager';
import { streamMessage } from './lib/claudeApi';
import { TIA_TOOLS, TIA_TOOLS_PROMPT, executeTiaTool } from './lib/tiaTools';
import { providerSupportsTools, completeWithProvider, DEFAULT_MODEL_BY_PROVIDER } from './lib/providers';
import { loadMemory, appendLesson, writeMemory, formatLesson, buildMemoryPrompt, getMemoryPath, setMemoryPath } from './lib/memory';
import { parseOutputFiles } from './lib/outputParser';
import { eplanToContext, eplanSummary } from './lib/eplanParser';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: `PolyTIA ready.

I know the Schaeffler standard and can generate SCL, FBD, and GRAPH code for TIA Portal V20.

**Quick start:**
- Create a station: *"Create station 0030 under transport 0000"*
- Generate a block: *"Write SCL for 0010Functions with movement routines"*
- Check compliance: *"Analyze this station for standard violations"*
- Import Eplan XML: use **⬆ IMPORT EPLAN** button → then ask *"Generate TIA structure from Eplan data"*

Open **⚙ Settings** (top right) to pick a provider (Anthropic / OpenAI / local Ollama) and set your key.`,
  streaming: false,
};

export default function App() {
  // Multi-provider keys/selection (migrate legacy tia_api_key → anthropic slot)
  const [providerKeys, setProviderKeys] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('tia_provider_keys') || '{}');
      const legacy = localStorage.getItem('tia_api_key');
      if (legacy && !stored.anthropic) stored.anthropic = legacy;
      return stored;
    } catch { return {}; }
  });
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('tia_active_provider') || 'anthropic');
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem('tia_active_model') || 'claude-sonnet-4-5');
  const [showSettings, setShowSettings] = useState(false);

  // Chat sessions — restore last on startup (computed once)
  const initialSessionRef = useRef(null);
  if (!initialSessionRef.current) {
    const last = getLastSessionId();
    initialSessionRef.current = (last && loadSession(last)) || newSession();
  }
  const initialSession = initialSessionRef.current;
  const [sessionId, setSessionId] = useState(initialSession.id);
  const [sessionList, setSessionList] = useState(() => listSessions());
  const [showHistory, setShowHistory] = useState(false);

  const [messages, setMessages] = useState(
    initialSession.messages?.length ? initialSession.messages : [WELCOME]
  );
  const [skills, setSkills] = useState(() => loadBuiltinSkills());
  const [outputFiles, setOutputFiles] = useState(initialSession.outputFiles || []);
  const [activeLanguage, setActiveLanguage] = useState(initialSession.activeLanguage || 'scl');
  const [isStreaming, setIsStreaming] = useState(false);
  const [planFirst, setPlanFirst] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [pendingPack, setPendingPack] = useState(null); // { skills, defaultName }
  const [eplanData, setEplanData] = useState(null);   // { data, filename, context }
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [showProjectTree, setShowProjectTree] = useState(false);
  const streamAccumRef = useRef('');

  // Project packs — skill groups per TIA project, only one pack active at a time
  const [packs, setPacks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tia_project_packs') || '[]'); }
    catch { return []; }
  });
  const [activePackName, setActivePackName] = useState(
    () => localStorage.getItem('tia_active_pack') || ''
  );
  const bridgeProjectRef = useRef('');
  const packsRef = useRef(packs);
  packsRef.current = packs;

  // Panel widths (resizable)
  const [leftWidth, setLeftWidth] = useState(
    () => Number(localStorage.getItem('tia_left_width')) || 256
  );
  const [rightWidth, setRightWidth] = useState(
    () => Number(localStorage.getItem('tia_right_width')) || 384
  );

  // Cross-project memory
  const [memory, setMemory] = useState('');
  const [memoryPath, setMemoryPathState] = useState('');
  const [consolidating, setConsolidating] = useState(false);
  const memoryRef = useRef('');
  memoryRef.current = memory;

  const provider = { id: activeProvider, key: providerKeys[activeProvider] || '' };
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const modelRef = useRef(activeModel);
  modelRef.current = activeModel;

  // Persist provider settings
  useEffect(() => { localStorage.setItem('tia_provider_keys', JSON.stringify(providerKeys)); }, [providerKeys]);
  useEffect(() => { localStorage.setItem('tia_active_provider', activeProvider); }, [activeProvider]);
  useEffect(() => { localStorage.setItem('tia_active_model', activeModel); }, [activeModel]);

  // Load memory + path on mount
  useEffect(() => {
    loadMemory().then(setMemory);
    getMemoryPath().then(setMemoryPathState);
  }, []);

  // Persist the active chat session whenever its contents change (skip empty welcome-only state)
  useEffect(() => {
    const hasRealContent = messages.some(m => m.id !== 'welcome') || outputFiles.length > 0;
    if (!hasRealContent) return;
    const existing = loadSession(sessionId);
    const session = {
      id: sessionId,
      title: deriveTitle(messages),
      messages,
      outputFiles,
      activeLanguage,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    saveSession(session);
    setLastSessionId(sessionId);
    setSessionList(listSessions());
  }, [messages, outputFiles, activeLanguage, sessionId]);

  function newChat() {
    const s = newSession();
    setSessionId(s.id);
    setMessages([WELCOME]);
    setOutputFiles([]);
    setActiveLanguage('scl');
    setLastSessionId(s.id);
    setShowHistory(false);
  }

  function openSession(id) {
    const s = loadSession(id);
    if (!s) return;
    setSessionId(s.id);
    setMessages(s.messages?.length ? s.messages : [WELCOME]);
    setOutputFiles(s.outputFiles || []);
    setActiveLanguage(s.activeLanguage || 'scl');
    setLastSessionId(s.id);
    setShowHistory(false);
  }

  function renameSession(id, title) {
    const s = loadSession(id);
    if (s) { saveSession({ ...s, title }); setSessionList(listSessions()); }
  }

  function removeSession(id) {
    deleteSession(id);
    setSessionList(listSessions());
    if (id === sessionId) newChat();
  }

  function saveProviderKey(id, value) {
    setProviderKeys(prev => ({ ...prev, [id]: value }));
  }
  function removeProviderKey(id) {
    setProviderKeys(prev => { const n = { ...prev }; delete n[id]; return n; });
  }
  function selectProvider(id) {
    setActiveProvider(id);
    setActiveModel(DEFAULT_MODEL_BY_PROVIDER[id] || '');
  }
  async function changeMemoryPath(p) {
    await setMemoryPath(p);
    const np = await getMemoryPath();
    setMemoryPathState(np);
    setMemory(await loadMemory());
  }

  async function saveLesson(assistantMsg) {
    const idx = messages.findIndex(m => m.id === assistantMsg.id);
    const userMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!provider.key && activeProvider !== 'ollama') { alert('Set an API key first (⚙ Settings).'); return; }
    const prompt = `From this TIA engineering exchange, extract ONE concise lesson learned (a correction to remember for future code generation). ` +
      `Respond ONLY as JSON: {"title":"short title","error":"what went wrong","rule":"the rule to always follow"}.\n\n` +
      `USER: ${userMsg?.content?.slice(0, 2000) || '(none)'}\n\nASSISTANT: ${assistantMsg.content.slice(0, 4000)}`;
    try {
      const raw = await completeWithProvider({ providerId: provider.id, apiKeyOrEndpoint: provider.key, model: activeModel, prompt });
      const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
      const entry = formatLesson(json);
      if (!window.confirm(`Save this lesson to memory?\n\n${entry}`)) return;
      await appendLesson(entry);
      setMemory(await loadMemory());
    } catch (err) {
      alert('Could not extract lesson: ' + (err?.message || err));
    }
  }

  async function consolidateMemory() {
    if (!memory.trim()) { alert('Memory is empty.'); return; }
    if (!provider.key && activeProvider !== 'ollama') { alert('Set an API key first (⚙ Settings).'); return; }
    setConsolidating(true);
    try {
      const prompt = `Consolidate this PolyTIA memory file: merge duplicate lessons, drop obsolete/contradictory ones, keep the markdown format with "### L-... (date) — title" entries and "Error:"/"Rule:" lines. Keep the top "# PolyTIA Memory — Lessons Learned" header. Output ONLY the cleaned markdown.\n\n${memory}`;
      const cleaned = await completeWithProvider({ providerId: provider.id, apiKeyOrEndpoint: provider.key, model: activeModel, prompt });
      const md = cleaned.replace(/^```(?:markdown|md)?\n?/, '').replace(/```\s*$/, '').trim();
      if (!window.confirm('Replace memory with consolidated version?\n\n' + md.slice(0, 600) + '\n...')) return;
      await writeMemory(md);
      setMemory(await loadMemory());
    } catch (err) {
      alert('Consolidate failed: ' + (err?.message || err));
    } finally {
      setConsolidating(false);
    }
  }

  // Persist custom skills
  useEffect(() => {
    const custom = skills.filter(s => !s.builtin);
    localStorage.setItem('tia_custom_skills', JSON.stringify(custom));
  }, [skills]);

  // Load saved custom skills
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('tia_custom_skills') || '[]');
      if (saved.length) {
        setSkills(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const toAdd = saved.filter(s => !existingIds.has(s.id));
          return [...prev, ...toAdd];
        });
      }
    } catch {}
  }, []);

  // Persist packs + active pack + panel widths
  useEffect(() => {
    localStorage.setItem('tia_project_packs', JSON.stringify(packs));
  }, [packs]);
  useEffect(() => {
    localStorage.setItem('tia_active_pack', activePackName);
  }, [activePackName]);
  useEffect(() => {
    localStorage.setItem('tia_left_width', String(leftWidth));
  }, [leftWidth]);
  useEffect(() => {
    localStorage.setItem('tia_right_width', String(rightWidth));
  }, [rightWidth]);

  async function importPack(files) {
    if (!files?.length) return;
    const parsed = [];
    for (const file of files) {
      const text = await file.text();
      // Electron exposes the real absolute path via file.path; browser gives only the name
      parsed.push({
        ...parseCustomSkill(text, file.name),
        active: true,
        sourcePath: file.path || file.name,
        fileName: file.name,
      });
    }
    const defaultName = bridgeProjectRef.current || parsed[0]?.name || 'New Pack';
    // Electron has no working window.prompt — use in-app PromptModal
    setPendingPack({ skills: parsed, defaultName });
  }

  function commitPack(name) {
    if (pendingPack) {
      setPacks(prev => [...prev.filter(p => p.name !== name), { name, skills: pendingPack.skills }]);
      setActivePackName(name);
      setPendingPack(null);
    }
  }

  function addPlannedPack(content, fileName) {
    const skill = { ...parseCustomSkill(content, fileName), active: true, fileName, sourcePath: fileName };
    setPendingPack({ skills: [skill], defaultName: skill.name || 'Planned Pack' });
    setShowPlan(false);
  }

  function activatePack(name) {
    // Click active pack again = deactivate all packs
    setActivePackName(prev => (prev === name ? '' : name));
  }

  function removePack(name) {
    if (!window.confirm(`Remove project pack "${name}" and its skills?`)) return;
    setPacks(prev => prev.filter(p => p.name !== name));
    setActivePackName(prev => (prev === name ? '' : prev));
  }

  function togglePackSkill(packName, skillId) {
    setPacks(prev => prev.map(p =>
      p.name !== packName ? p : {
        ...p,
        skills: p.skills.map(s => s.id === skillId ? { ...s, active: !s.active } : s),
      }
    ));
  }

  // Bridge reports live project name — auto-activate matching pack
  function handleBridgeProject(projectName) {
    if (!projectName) return;
    bridgeProjectRef.current = projectName;
    const lower = projectName.toLowerCase();
    const match = packsRef.current.find(p =>
      p.name.toLowerCase() === lower ||
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(lower)
    );
    if (match) setActivePackName(match.name);
  }

  const activePack = packs.find(p => p.name === activePackName);
  const activePackSkills = activePack ? activePack.skills.filter(s => s.active) : [];

  function toggleSkill(id, remove = false) {
    setSkills(prev =>
      remove ? prev.filter(s => s.id !== id)
             : prev.map(s => s.id === id ? { ...s, active: !s.active } : s)
    );
  }

  function addCustomSkill(content, filename, forcedCategory) {
    const skill = parseCustomSkill(content, filename, forcedCategory);
    setSkills(prev => [...prev.filter(s => s.id !== skill.id), skill]);
  }

  function handleEplanImport(data, filename) {
    const context = eplanToContext(data);
    const summary = eplanSummary(data);
    setEplanData({ data, filename, context, summary });

    // Auto-activate the Eplan generator skill
    setSkills(prev => prev.map(s =>
      s.id === 'gen_from_eplan' ? { ...s, active: true } : s
    ));

    // Post a system message in chat
    const noticeMsg = {
      id: `eplan_${Date.now()}`,
      role: 'assistant',
      content: `**Eplan XML imported:** \`${filename}\`\n\n${summary}\n\nI now have your I/O signal list as context. You can:\n- *"Generate TIA structure from this Eplan data"*\n- *"Create PLC variable table from Eplan signals"*\n- *"Build station 0010 structure using these I/O signals"*`,
      streaming: false,
    };
    setMessages(prev => [...prev, noticeMsg]);
  }

  function handleBlockExported({ name, xmlContent }) {
    setOutputFiles(prev => [...prev, {
      id: `export_${Date.now()}`,
      filename: `${name}.xml`,
      language: 'xml',
      content: xmlContent,
    }]);
  }

  function handleBlockAnalyze({ name, xmlContent }) {
    sendMessage(
      `Analyze this block exported from the live TIA project for Schaeffler standard compliance:\n\n` +
      '```xml\n' + `<!-- FILE: ${name}.xml -->\n` + xmlContent + '\n```'
    );
  }

  async function sendMessage(text) {
    const needsKey = activeProvider !== 'ollama';
    if (needsKey && !provider.key) {
      alert('Set an API key first (⚙ Settings, top right).');
      setShowSettings(true);
      return;
    }
    if (isStreaming) return;

    const userMsg = { id: `u_${Date.now()}`, role: 'user', content: text, streaming: false };
    const assistantMsgId = `a_${Date.now()}`;
    const assistantMsg = { id: assistantMsgId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    streamAccumRef.current = '';

    // Build history — inject Eplan context into first user message if loaded
    const historyForApi = messages
      .filter(m => m.id !== 'welcome' && !m.streaming)
      .map(m => ({ role: m.role, content: m.content }));

    // Append Eplan context to the user message if data loaded
    let userContent = text;
    if (eplanData) {
      userContent = `${text}\n\n---\n${eplanData.context}`;
    }
    historyForApi.push({ role: 'user', content: userContent });

    const toolsActive = bridgeConnected && providerSupportsTools(activeProvider);
    let systemPrompt = buildSystemPrompt([...skills, ...activePackSkills], activeLanguage);
    systemPrompt += buildMemoryPrompt(memoryRef.current);
    if (toolsActive) systemPrompt += TIA_TOOLS_PROMPT;
    if (planFirst) {
      systemPrompt += `\n\n## Plan-First Mode\nBefore writing any code, output a concise implementation PLAN: list the blocks and DBs to create, their numbers (ProDiag = station rule, DbParameter = 10000 + station), ParentStation, and the sequence of steps. Do NOT generate code yet. End with: "Reply *proceed* to generate the code."`;
    }

    try {
      await streamMessage({
        provider,
        model: activeModel,
        messages: historyForApi,
        systemPrompt,
        tools: toolsActive ? TIA_TOOLS : undefined,
        executeTool: toolsActive ? executeTiaTool : undefined,
        onDelta: (delta) => {
          streamAccumRef.current += delta;
          setMessages(prev =>
            prev.map(m => m.id === assistantMsgId
              ? { ...m, content: streamAccumRef.current }
              : m
            )
          );
        },
        onComplete: (fullText) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantMsgId
              ? { ...m, content: fullText, streaming: false }
              : m
            )
          );
          const newFiles = parseOutputFiles(fullText);
          if (newFiles.length > 0) setOutputFiles(prev => [...prev, ...newFiles]);
          setIsStreaming(false);
          streamAccumRef.current = '';
        },
        onError: (errMsg) => {
          setMessages(prev =>
            prev.map(m => m.id === assistantMsgId
              ? { ...m, content: `Error: ${errMsg}`, streaming: false }
              : m
            )
          );
          setIsStreaming(false);
          streamAccumRef.current = '';
        },
      });
    } catch {
      setIsStreaming(false);
    }
  }

  const activeSkillCount = skills.filter(s => s.active).length + activePackSkills.length;
  const totalSkillCount = skills.length + (activePack ? activePack.skills.length : 0);

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <TopBar
        hasKey={activeProvider === 'ollama' || !!provider.key}
        providerLabel={activeProvider}
        onOpenSettings={() => setShowSettings(true)}
        skillCount={totalSkillCount}
        activeSkillCount={activeSkillCount}
        onEplanImport={handleEplanImport}
        eplanLoaded={!!eplanData}
        onBridgeChange={setBridgeConnected}
        bridgeConnected={bridgeConnected}
        onOpenProjectTree={() => setShowProjectTree(true)}
        onBridgeProject={handleBridgeProject}
      />
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          providerKeys={providerKeys}
          onSaveKey={saveProviderKey}
          onRemoveKey={removeProviderKey}
          activeProvider={activeProvider}
          onSetProvider={selectProvider}
          activeModel={activeModel}
          onSetModel={setActiveModel}
          memoryPath={memoryPath}
          onSetMemoryPath={changeMemoryPath}
          onConsolidate={consolidateMemory}
          consolidating={consolidating}
        />
      )}
      {showProjectTree && (
        <ProjectTreeModal
          onClose={() => setShowProjectTree(false)}
          onExported={handleBlockExported}
          onAnalyze={handleBlockAnalyze}
        />
      )}
      {showHistory && (
        <HistoryPanel
          sessions={sessionList}
          currentId={sessionId}
          onOpen={openSession}
          onNew={newChat}
          onRename={renameSession}
          onDelete={removeSession}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showPlan && (
        <PlanModal
          provider={provider}
          model={activeModel}
          onClose={() => setShowPlan(false)}
          onAddAsPack={addPlannedPack}
        />
      )}
      {pendingPack && (
        <PromptModal
          title="Name this project pack"
          label="Groups the imported .md file(s) under one project."
          defaultValue={pendingPack.defaultName}
          placeholder="e.g. M-10631571AA-SK"
          onSubmit={commitPack}
          onCancel={() => setPendingPack(null)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        <SkillsPanel
          skills={skills}
          onToggle={toggleSkill}
          onAddCustom={addCustomSkill}
          provider={provider}
          model={activeModel}
          width={leftWidth}
          packs={packs}
          activePackName={activePackName}
          onActivatePack={activatePack}
          onRemovePack={removePack}
          onTogglePackSkill={togglePackSkill}
          onImportPack={importPack}
          onOpenPlan={() => setShowPlan(true)}
        />
        <ResizeHandle onResize={(dx) =>
          setLeftWidth(w => Math.min(480, Math.max(180, w + dx)))
        } />
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          isStreaming={isStreaming}
          activeLanguage={activeLanguage}
          onLanguageChange={setActiveLanguage}
          eplanData={eplanData}
          onSaveLesson={saveLesson}
          sessionTitle={sessionList.find(s => s.id === sessionId)?.title || 'New chat'}
          onOpenHistory={() => setShowHistory(true)}
          onNewChat={newChat}
          planFirst={planFirst}
          onTogglePlanFirst={() => setPlanFirst(v => !v)}
        />
        <ResizeHandle onResize={(dx) =>
          setRightWidth(w => Math.min(700, Math.max(260, w - dx)))
        } />
        <OutputPanel
          outputFiles={outputFiles}
          activeLanguage={activeLanguage}
          width={rightWidth}
        />
      </div>
    </div>
  );
}
