import { streamWithProvider, completeWithProvider } from './providers';

/**
 * Stream a chat response via the active provider.
 * `provider` = { id, key } (key is api key or ollama endpoint), `model` = model id.
 * Tools are only honored by providers that support them (Anthropic).
 */
export async function streamMessage({
  provider, model, messages, systemPrompt, tools, executeTool, onDelta, onComplete, onError,
}) {
  return streamWithProvider({
    providerId: provider.id,
    apiKeyOrEndpoint: provider.key,
    model,
    messages,
    systemPrompt,
    tools,
    executeTool,
    onDelta,
    onComplete,
    onError,
  });
}

export async function draftSkillFromText({ provider, model, documentText, filename }) {
  const prompt = `Analyze this document and create a TIA Copilot skill .md file from it.

The skill file must use this exact format:
---
skill_id: [snake_case_id]
skill_name: [Human Readable Name]
skill_version: 1.0
skill_category: [standards|generators|analyzers|custom]
applies_to: [all]
tia_version: V20
author: Imported
last_updated: 2026-01-01
---

# [Skill Name]

## Purpose
[One sentence]

## Rules
[Numbered rules extracted from document]

## Templates
[Code templates if any]

## Validation Checklist
[Checklist items]

## Examples
[Input/output examples if applicable]

## Forbidden Actions
[What must never be done]

Document filename: ${filename}
Document content:
---
${documentText.slice(0, 30000)}
---

Generate ONLY the .md skill file content, nothing else.`;

  return completeWithProvider({
    providerId: provider.id,
    apiKeyOrEndpoint: provider.key,
    model,
    prompt,
  });
}
