// Load all .md skill files as raw strings via Vite glob
const rawSkills = import.meta.glob('../skills/**/*.md', { query: '?raw', import: 'default', eager: true });

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return meta;
}

export const CATEGORY_ORDER = ['core', 'standards', 'generators', 'analyzers', 'custom'];

export const CATEGORY_LABELS = {
  core:       'Core (always active)',
  standards:  'Standards',
  generators: 'Generators',
  analyzers:  'Analyzers',
  custom:     'Custom',
};

export const CATEGORY_COLORS = {
  core:       'text-accent',
  standards:  'text-yellow',
  generators: 'text-green',
  analyzers:  'text-purple',
  custom:     'text-muted',
};

export function loadBuiltinSkills() {
  return Object.entries(rawSkills).map(([path, content]) => {
    const meta = parseFrontmatter(content);
    // path looks like: '../skills/core/tia_v20_core.md'
    const parts = path.split('/');
    const skillsIdx = parts.findIndex(p => p === 'skills');
    const category = skillsIdx >= 0 ? parts[skillsIdx + 1] : 'custom';
    const filename = parts[parts.length - 1];

    return {
      id: meta.skill_id || filename.replace('.md', ''),
      name: meta.skill_name || filename.replace('.md', '').replace(/_/g, ' '),
      category,
      version: meta.skill_version || '1.0',
      content,
      active: category === 'core',
      canToggle: category !== 'core',
      builtin: true,
    };
  });
}

export function parseCustomSkill(content, filename, forcedCategory) {
  const meta = parseFrontmatter(content);
  const cat = forcedCategory
    ? forcedCategory
    : ['generators', 'analyzers', 'standards'].includes(meta.skill_category)
      ? meta.skill_category
      : 'custom';
  return {
    id: meta.skill_id || `custom_${Date.now()}`,
    name: meta.skill_name || filename.replace('.md', '').replace(/_/g, ' '),
    category: cat,
    version: meta.skill_version || '1.0',
    content,
    active: true,
    canToggle: true,
    builtin: false,
  };
}

export function buildSystemPrompt(skills, language) {
  const activeSkills = skills.filter(s => s.active);
  const skillsText = activeSkills
    .map(s => `### SKILL: ${s.name} (${s.category} v${s.version})\n${s.content}`)
    .join('\n\n---\n\n');

  const langInstructions = {
    scl: 'Generate SCL (Structured Control Language) for S7-1500. Use TON_TIME, TOF_TIME etc.',
    fbd: 'Generate FBD as SimaticML XML using FlgNet format. Produce valid XML that can be imported into TIA Portal V20.',
    graph: 'Generate S7-GRAPH descriptions in structured text format (steps, transitions, actions). GRAPH FBs cannot be imported via XML — produce human-readable implementation guide.',
  };

  return `You are PolyTIA — a precision engineering assistant for Siemens TIA Portal V20 following the Schaeffler automation standard.

## Active Output Language: ${language.toUpperCase()}
${langInstructions[language] || langInstructions.scl}

## Output File Format
Wrap every generated file in a code block. First line inside the block MUST be a filename comment:

SCL files:
\`\`\`scl
// FILE: 0030Main.scl
[code]
\`\`\`

XML / SimaticML files:
\`\`\`xml
<!-- FILE: 0030Station.xml -->
[xml]
\`\`\`

GRAPH description files:
\`\`\`graph
// FILE: 0030Sequence_graph.md
[description]
\`\`\`

You may produce multiple file blocks per response. Always use station-number-prefixed filenames.

## Loaded Skill Knowledge
${skillsText}

## Non-Negotiable Rules
- ProDiag FB number = station number (integer)
- DbParameter DB number = 10000 + station number
- typeStation / typeTransport are IMMUTABLE — never modify structure
- Static vars: "stat" prefix | Temp vars: "temp" prefix
- No %I/%Q/%M addresses inside FB/FC blocks
- No M-area flags except MB0/MB1
- ParentStation assignment is mandatory in every station`;
}
