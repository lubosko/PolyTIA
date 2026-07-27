// Language display config
export const LANG_CONFIG = {
  scl:   { label: 'SCL',   color: '#3fb950', bgColor: '#3fb95018', ext: 'scl'  },
  xml:   { label: 'XML',   color: '#58a6ff', bgColor: '#58a6ff18', ext: 'xml'  },
  fbd:   { label: 'FBD',   color: '#58a6ff', bgColor: '#58a6ff18', ext: 'xml'  },
  graph: { label: 'GRAPH', color: '#bc8cff', bgColor: '#bc8cff18', ext: 'md'   },
  json:  { label: 'JSON',  color: '#d29922', bgColor: '#d2992218', ext: 'json' },
  text:  { label: 'TEXT',  color: '#8b949e', bgColor: '#8b949e18', ext: 'txt'  },
};

// Parse code blocks from Claude response text
export function parseOutputFiles(text) {
  const files = [];
  // Match ```language\ncontents``` blocks
  const blockRegex = /```(\w+)\n([\s\S]*?)```/g;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const lang = match[1].toLowerCase();
    const rawContent = match[2];

    // Skip non-file blocks (plain text, bash, etc.)
    if (!['scl', 'xml', 'fbd', 'graph', 'json'].includes(lang)) continue;

    // Extract filename from first-line comment
    let filename = null;
    let content = rawContent;

    const sclFileMatch = rawContent.match(/^\/\/ FILE: (.+?)\s*\n/);
    const xmlFileMatch = rawContent.match(/^<!-- FILE: (.+?) -->\s*\n/);
    const graphFileMatch = rawContent.match(/^\/\/ FILE: (.+?)\s*\n/);

    if (sclFileMatch) {
      filename = sclFileMatch[1].trim();
      content = rawContent.slice(sclFileMatch[0].length);
    } else if (xmlFileMatch) {
      filename = xmlFileMatch[1].trim();
      content = rawContent.slice(xmlFileMatch[0].length);
    } else if (graphFileMatch) {
      filename = graphFileMatch[1].trim();
      content = rawContent.slice(graphFileMatch[0].length);
    } else {
      // Auto-name
      const cfg = LANG_CONFIG[lang] || LANG_CONFIG.text;
      filename = `output_${files.length + 1}.${cfg.ext}`;
    }

    files.push({
      id: `${Date.now()}_${files.length}`,
      filename,
      language: lang,
      content: content.trimEnd(),
    });
  }

  return files;
}

// Render message text — replace code blocks with placeholder markers for display
export function renderMessageParts(text) {
  const parts = [];
  const blockRegex = /```(\w+)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    const lang = match[1].toLowerCase();
    const content = match[2];
    const fileMatch = content.match(/^(?:\/\/|<!--) FILE: (.+?)(?:\s*-->)?\s*\n/);
    const filename = fileMatch ? fileMatch[1].trim() : null;
    parts.push({ type: 'code', lang, content, filename });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
