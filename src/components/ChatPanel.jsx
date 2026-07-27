import { useState, useRef, useEffect } from 'react';
import { renderMessageParts, LANG_CONFIG } from '../lib/outputParser';

const QUICK_ACTIONS = {
  scl: [
    { label: 'Station 0030 (SCL)', prompt: 'Create complete station 0030 under transport 0000. Generate all required blocks and DBs in SCL.' },
    { label: 'Motor FB template', prompt: 'Generate a standard motor FB template for station 0010 following Schaeffler naming conventions.' },
    { label: 'Add C1 fault message', prompt: 'Add fault message C1_PartMissing to station 0020 FaultMessages block.' },
    { label: 'Analyze station', prompt: 'Analyze the following station for Schaeffler standard compliance. List all PASS/FAIL/WARNING findings:\n\n[Paste station block list or code here]' },
  ],
  fbd: [
    { label: 'FBD: AND enable coil', prompt: 'Create FBD network: Enable AND NOT Fault drives Running coil. Generate SimaticML XML.' },
    { label: 'FBD: TON timer 5s', prompt: 'Create FBD network with TON timer, IN=Enable, PT=T#5s, Q output drives TimerDone coil. Generate SimaticML XML.' },
    { label: 'FBD: SR flip-flop', prompt: 'Create FBD set-reset flip-flop network: SetCondition drives SCoil, ResetCondition drives RCoil, both on statOutput variable.' },
    { label: 'FBD: FB call', prompt: 'Create FBD network calling FB_Motor instance statMotor with Enable and Reset inputs, Running output to coil.' },
  ],
  graph: [
    { label: 'GRAPH: 3-step sequence', prompt: 'Create GRAPH sequence for station 0030 with 3 process steps: wait for part, clamp, process. Include transitions and GraphInterface connections.' },
    { label: 'GRAPH: with fault branch', prompt: 'Create GRAPH sequence for station 0010 with a fault handling branch (S900) that returns to S000 on reset.' },
    { label: 'GRAPH: assembly station', prompt: 'Create GRAPH for a 4-step assembly station: home position, pick part, assemble, return home. Include timer-based transitions.' },
  ],
};

function CodeBlock({ lang, content, filename }) {
  const [copied, setCopied] = useState(false);
  const cfg = LANG_CONFIG[lang] || LANG_CONFIG.text;

  function copy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="my-2 rounded border overflow-hidden" style={{ borderColor: cfg.color + '40', background: cfg.bgColor }}>
      <div className="flex items-center justify-between px-3 py-1 border-b" style={{ borderColor: cfg.color + '30' }}>
        <span className="text-xs font-mono font-semibold" style={{ color: cfg.color }}>
          {cfg.label}{filename ? ` · ${filename}` : ''}
        </span>
        <button
          onClick={copy}
          className="text-xs font-mono text-muted hover:text-text transition-colors"
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre className="text-xs font-mono text-text p-3 overflow-x-auto whitespace-pre max-h-48 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

function Message({ msg, onSaveLesson }) {
  const isUser = msg.role === 'user';
  const parts = renderMessageParts(msg.content);
  const canSaveLesson = !isUser && !msg.streaming && msg.id !== 'welcome' && onSaveLesson;

  return (
    <div className={`msg-in flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-bold ${
        isUser ? 'bg-accent/20 text-accent' : 'bg-hover text-muted border border-border'
      }`}>
        {isUser ? 'U' : '⚙'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col group`}>
        <div className={`px-3 py-2 rounded text-sm leading-relaxed ${
          isUser
            ? 'bg-accent/15 border border-accent/30 text-text'
            : 'bg-hover border border-border text-text'
        }`}>
          {parts.map((part, i) => (
            part.type === 'text'
              ? <span key={i} className="whitespace-pre-wrap">{part.content}</span>
              : <CodeBlock key={i} lang={part.lang} content={part.content} filename={part.filename} />
          ))}
          {msg.streaming && <span className="cursor-blink" />}
        </div>
        {canSaveLesson && (
          <button
            onClick={() => onSaveLesson(msg)}
            className="mt-1 text-xs font-mono text-muted hover:text-yellow opacity-0 group-hover:opacity-100 transition-opacity"
            title="Extract a lesson from this exchange into cross-project memory"
          >
            💾 save lesson
          </button>
        )}
      </div>
    </div>
  );
}

const EPLAN_QUICK_ACTIONS = [
  { label: '⚡ Generate TIA from Eplan', prompt: 'Generate complete TIA project structure from the Eplan data: PLC variable table XML, station folder, Functions block with I/O mapping, and DbFaultMessages.' },
  { label: '⚡ PLC tag table only', prompt: 'Generate only the PLC variable table SimaticML XML from the Eplan I/O signals.' },
  { label: '⚡ Functions I/O mapping', prompt: 'Generate the Functions block SCL that maps Eplan I/O addresses to station DB variables.' },
  { label: '⚡ DbFaultMessages from Eplan', prompt: 'Generate DbFaultMessages SCL with C1_/C2_ fault bits derived from Eplan safety/fault signals.' },
];

export default function ChatPanel({ messages, onSend, isStreaming, activeLanguage, onLanguageChange, eplanData, onSaveLesson, sessionTitle, onOpenHistory, onNewChat, planFirst, onTogglePlanFirst }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit() {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setInput('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const quickActions = QUICK_ACTIONS[activeLanguage] || QUICK_ACTIONS.scl;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Session bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
        <button
          onClick={onOpenHistory}
          className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-text hover:border-accent transition-colors"
          title="Chat history"
        >🕘 History</button>
        <button
          onClick={onNewChat}
          className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-text hover:border-accent transition-colors"
          title="Start a new chat"
        >+ New</button>
        <span className="text-xs font-mono text-text truncate min-w-0" title={sessionTitle}>{sessionTitle}</span>
        <button
          onClick={onTogglePlanFirst}
          className={`ml-auto text-xs font-mono px-2 py-1 rounded border transition-colors ${
            planFirst ? 'border-purple text-purple bg-purple/10' : 'border-border text-muted hover:text-text'
          }`}
          title="Plan first: get an implementation plan to approve before code is generated"
        >📋 Plan first {planFirst ? 'ON' : 'OFF'}</button>
      </div>

      {/* Language selector */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        {['scl', 'fbd', 'graph'].map(lang => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-3 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider transition-colors ${
              activeLanguage === lang
                ? lang === 'scl'   ? 'bg-green/20 text-green border border-green/40'
                : lang === 'fbd'   ? 'bg-accent/20 text-accent border border-accent/40'
                :                    'bg-purple/20 text-purple border border-purple/40'
                : 'text-muted hover:text-text border border-transparent hover:border-border'
            }`}
          >
            {lang}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted font-mono">
          {isStreaming ? '⟳ generating...' : 'ready'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">⚙</span>
            <p className="text-muted text-sm font-mono">PolyTIA ready.</p>
            <p className="text-muted text-xs max-w-xs">Ask me to generate SCL/FBD/GRAPH code or analyze station compliance.</p>
          </div>
        )}
        {messages.map(msg => <Message key={msg.id} msg={msg} onSaveLesson={onSaveLesson} />)}
        {planFirst && !isStreaming && messages.length > 1 &&
          messages[messages.length - 1].role === 'assistant' &&
          messages[messages.length - 1].id !== 'welcome' && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => onSend('Proceed — generate the full code for the plan above.')}
              className="text-xs font-mono px-4 py-2 rounded border border-green text-green hover:bg-green/10 transition-colors"
            >✓ Approve &amp; Generate</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Eplan context badge */}
      {eplanData && (
        <div className="px-3 py-1.5 border-t border-yellow/30 bg-yellow/5 shrink-0 flex items-center gap-2 flex-wrap">
          <span className="text-yellow text-xs font-mono font-semibold">⚡ EPLAN:</span>
          <span className="text-xs font-mono text-text">{eplanData.filename}</span>
          <span className="text-xs font-mono text-muted">{eplanData.summary}</span>
          <div className="flex gap-1 flex-wrap ml-auto">
            {EPLAN_QUICK_ACTIONS.map(qa => (
              <button
                key={qa.label}
                onClick={() => onSend(qa.prompt)}
                disabled={isStreaming}
                className="text-xs font-mono px-2 py-0.5 rounded border border-yellow/40 text-yellow hover:bg-yellow/10 transition-colors disabled:opacity-40"
              >
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-3 py-2 border-t border-border flex flex-wrap gap-1.5 shrink-0">
        {quickActions.map(qa => (
          <button
            key={qa.label}
            onClick={() => onSend(qa.prompt)}
            disabled={isStreaming}
            className="text-xs font-mono px-2 py-1 rounded border border-border text-muted hover:text-text hover:border-accent/50 transition-colors disabled:opacity-40"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex gap-2 items-end border border-border rounded bg-hover focus-within:border-accent transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask about TIA V20 / ${activeLanguage.toUpperCase()} code...`}
            rows={2}
            className="flex-1 bg-transparent resize-none px-3 py-2 text-sm font-mono text-text placeholder:text-muted focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || isStreaming}
            className="m-2 px-3 py-1.5 rounded bg-accent text-bg text-xs font-mono font-semibold disabled:opacity-40 hover:bg-accent/80 transition-colors"
          >
            {isStreaming ? '...' : '▶'}
          </button>
        </div>
        <p className="text-muted text-xs font-mono mt-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
