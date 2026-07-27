import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// ── Provider registry (renderer-side, adapted from SchematicAI) ──────────────
export const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic',     keyHint: 'sk-ant-api03-...',       requiresKey: true  },
  { id: 'openai',    label: 'OpenAI',         keyHint: 'sk-proj-...',            requiresKey: true  },
  { id: 'ollama',    label: 'Ollama (Local)', keyHint: 'http://localhost:11434', requiresKey: false, isLocal: true },
];

export const AVAILABLE_MODELS = [
  // Anthropic — tool use (Live Mode) supported
  { id: 'claude-sonnet-4-5',         label: 'Claude Sonnet 4.5 — balanced', provider: 'anthropic' },
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6 — most capable', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest',   provider: 'anthropic' },
  // OpenAI — generation only (no Live Mode tools)
  { id: 'gpt-4o',      label: 'GPT-4o — capable',   provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini — fast', provider: 'openai' },
  // Ollama models are dynamic — fetched from the endpoint via listOllamaModels()
];

export const DEFAULT_MODEL_BY_PROVIDER = {
  anthropic: 'claude-sonnet-4-5',
  openai:    'gpt-4o',
  ollama:    '',
};

const MAX_TOOL_TURNS = 6;
const MAX_TOKENS = 8192;

/** True when this provider supports the Live Mode tool-use loop. */
export function providerSupportsTools(providerId) {
  return providerId === 'anthropic';
}

/** List installed Ollama models. Returns [] if unreachable. */
export async function listOllamaModels(endpoint) {
  try {
    const base = (endpoint || 'http://localhost:11434').replace(/\/$/, '');
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? []).map(m => m.name).sort();
  } catch {
    return [];
  }
}

// ── Anthropic streaming with tool-use loop ───────────────────────────────────
async function streamAnthropic({ apiKeyOrEndpoint, model, messages, systemPrompt, tools, executeTool, onDelta }) {
  const client = new Anthropic({ apiKey: apiKeyOrEndpoint, dangerouslyAllowBrowser: true });
  const convo = messages.map(m => ({ role: m.role, content: m.content }));
  let fullText = '';

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const stream = client.messages.stream({
      model: model || 'claude-sonnet-4-5',
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: convo,
      ...(tools?.length ? { tools } : {}),
    });

    stream.on('text', (text) => {
      fullText += text;
      onDelta(text);
    });

    const final = await stream.finalMessage();

    if (final.stop_reason === 'tool_use' && executeTool) {
      convo.push({ role: 'assistant', content: final.content });
      const results = [];
      for (const block of final.content) {
        if (block.type !== 'tool_use') continue;
        const label = block.input?.blockName ? `${block.name}: ${block.input.blockName}` : block.name;
        const notice = `\n\n> ⚙ *reading TIA project — ${label}*\n\n`;
        fullText += notice;
        onDelta(notice);
        let result;
        try {
          result = await executeTool(block.name, block.input);
        } catch (err) {
          result = { error: err?.message || 'Tool execution failed' };
        }
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      }
      convo.push({ role: 'user', content: results });
      continue;
    }

    return fullText;
  }
  return fullText;
}

// ── OpenAI-compatible streaming (OpenAI + Ollama) — no tools ──────────────────
async function streamOpenAICompatible({ providerId, apiKeyOrEndpoint, model, messages, systemPrompt, onDelta }) {
  let client, modelName;
  if (providerId === 'ollama') {
    const base = (apiKeyOrEndpoint || 'http://localhost:11434').replace(/\/$/, '');
    client = new OpenAI({ apiKey: 'ollama', baseURL: `${base}/v1`, dangerouslyAllowBrowser: true });
    modelName = model?.startsWith('ollama:') ? model.slice(7) : model;
  } else {
    client = new OpenAI({ apiKey: apiKeyOrEndpoint, dangerouslyAllowBrowser: true });
    modelName = model;
  }

  const convo = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  let fullText = '';
  const stream = await client.chat.completions.create({
    model: modelName,
    stream: true,
    max_tokens: MAX_TOKENS,
    messages: convo,
  });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) {
      fullText += token;
      onDelta(token);
    }
  }
  return fullText;
}

/**
 * Unified streaming entry point. Routes by providerId.
 * Anthropic supports the tool-use loop; OpenAI/Ollama do plain generation.
 */
export async function streamWithProvider({
  providerId, apiKeyOrEndpoint, model, messages, systemPrompt,
  tools, executeTool, onDelta, onComplete, onError,
}) {
  try {
    let fullText;
    if (providerId === 'anthropic') {
      fullText = await streamAnthropic({ apiKeyOrEndpoint, model, messages, systemPrompt, tools, executeTool, onDelta });
    } else {
      fullText = await streamOpenAICompatible({ providerId, apiKeyOrEndpoint, model, messages, systemPrompt, onDelta });
    }
    onComplete(fullText);
    return fullText;
  } catch (err) {
    onError(err?.message || 'Unknown API error');
    throw err;
  }
}

/** One-shot completion (no streaming) via the active provider. Used for skill drafting + memory ops. */
export async function completeWithProvider({ providerId, apiKeyOrEndpoint, model, prompt }) {
  if (providerId === 'anthropic') {
    const client = new Anthropic({ apiKey: apiKeyOrEndpoint, dangerouslyAllowBrowser: true });
    const res = await client.messages.create({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.content[0]?.text || '';
  }
  // OpenAI / Ollama
  let client, modelName;
  if (providerId === 'ollama') {
    const base = (apiKeyOrEndpoint || 'http://localhost:11434').replace(/\/$/, '');
    client = new OpenAI({ apiKey: 'ollama', baseURL: `${base}/v1`, dangerouslyAllowBrowser: true });
    modelName = model?.startsWith('ollama:') ? model.slice(7) : model;
  } else {
    client = new OpenAI({ apiKey: apiKeyOrEndpoint, dangerouslyAllowBrowser: true });
    modelName = model;
  }
  const res = await client.chat.completions.create({
    model: modelName,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.choices[0]?.message?.content || '';
}
