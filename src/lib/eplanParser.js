// Parse Eplan P8 XML exports into structured TIA-usable data

export function parseEplanXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  const errors = doc.querySelector('parsererror');
  if (errors) throw new Error('Invalid XML: ' + errors.textContent.slice(0, 200));

  const result = {
    project: '',
    stations: [],    // PLC stations/CPUs found
    signals: [],     // I/O signals
    devices: [],     // field devices / components
    rawTags: [],     // all tag entries (fallback)
  };

  // Try to detect root element / Eplan version
  const root = doc.documentElement;
  result.project = root.getAttribute('ProjectName')
    || root.getAttribute('projectName')
    || root.getAttribute('name')
    || '';

  // Strategy: try multiple known Eplan XML schemas in order of likelihood

  // ── 1. Eplan P8 PLC export (XMLExport_ePlcTag) ──────────────────────────
  const plcTags = doc.querySelectorAll('PlcTag, PLC_TAG, PlcEntry, PLCTAG');
  if (plcTags.length > 0) {
    plcTags.forEach(tag => parsePlcTag(tag, result));
  }

  // ── 2. Eplan "DataPortal" / generic XML list ──────────────────────────────
  const rows = doc.querySelectorAll('Row, row, ITEM, Item');
  if (rows.length > 0 && result.signals.length === 0) {
    rows.forEach(row => parseRowTag(row, result));
  }

  // ── 3. Eplan connection/device export ─────────────────────────────────────
  const functions = doc.querySelectorAll('Function, FUNCTION');
  if (functions.length > 0 && result.signals.length === 0) {
    functions.forEach(fn => parseFunctionTag(fn, result));
  }

  // ── 4. Flat text/attr fallback — grab anything with address-like attributes
  if (result.signals.length === 0) {
    const allEls = Array.from(doc.querySelectorAll('*'));
    allEls.forEach(el => {
      const addr = el.getAttribute('Address') || el.getAttribute('address')
        || el.getAttribute('PLCAddress') || el.getAttribute('plcAddress')
        || el.textContent.trim().match(/^[EAI][QBAOW]?\s*\d+\.\d+$/)?.[0];
      if (addr) {
        result.rawTags.push({
          address: normalizeAddress(addr),
          tag: el.getAttribute('Name') || el.getAttribute('Tag') || el.getAttribute('FunctionText') || '',
          description: el.getAttribute('Description') || el.getAttribute('FunctionText') || '',
          type: guessSignalType(addr),
        });
      }
    });
  }

  // Dedupe + classify signals
  if (result.rawTags.length > 0 && result.signals.length === 0) {
    result.signals = result.rawTags;
  }

  // Group by station if we have station info
  groupByStation(result);

  return result;
}

// ─── Sub-parsers ───────────────────────────────────────────────────────────

function parsePlcTag(el, result) {
  const address = normalizeAddress(
    el.getAttribute('Address') || el.getAttribute('address')
    || el.querySelector('Address,address')?.textContent || ''
  );
  if (!address) return;

  const signal = {
    address,
    tag: el.getAttribute('Tag') || el.getAttribute('Name')
      || el.querySelector('Tag,TagName,Name')?.textContent || '',
    description: el.getAttribute('FunctionText') || el.getAttribute('Description')
      || el.querySelector('FunctionText,Description,Comment')?.textContent || '',
    type: el.getAttribute('SignalType') || el.getAttribute('Type') || guessSignalType(address),
    station: el.getAttribute('PLCName') || el.getAttribute('StationName')
      || el.querySelector('PLCName,StationName')?.textContent || '',
    eplanRef: el.getAttribute('FullName') || el.getAttribute('Designation') || '',
  };
  result.signals.push(signal);
}

function parseRowTag(el, result) {
  // Generic row: look for column children or attributes
  const address = normalizeAddress(
    getAnyAttrOrChild(el, ['Address', 'PLCAddress', 'Adresse', 'E_Adresse', 'A_Adresse'])
  );
  if (!address) return;

  result.signals.push({
    address,
    tag: getAnyAttrOrChild(el, ['Tag', 'Name', 'Symbol', 'FunctionText']),
    description: getAnyAttrOrChild(el, ['Description', 'Beschreibung', 'Comment', 'FunctionText']),
    type: guessSignalType(address),
    station: getAnyAttrOrChild(el, ['PLCName', 'Station', 'CPU']),
    eplanRef: getAnyAttrOrChild(el, ['FullName', 'Designation', 'KKS']),
  });
}

function parseFunctionTag(el, result) {
  const ref = el.getAttribute('FullName') || el.getAttribute('Name') || '';
  const address = normalizeAddress(el.getAttribute('PLCAddress') || el.getAttribute('Address') || '');
  if (!address && !ref) return;

  result.signals.push({
    address,
    tag: el.getAttribute('Tag') || el.getAttribute('Symbol') || ref,
    description: el.getAttribute('FunctionText') || el.getAttribute('Description') || ref,
    type: guessSignalType(address || ref),
    station: el.getAttribute('PLCName') || '',
    eplanRef: ref,
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getAnyAttrOrChild(el, names) {
  for (const n of names) {
    const attr = el.getAttribute(n) || el.getAttribute(n.toLowerCase());
    if (attr) return attr;
    const child = el.querySelector(n) || el.querySelector(n.toLowerCase());
    if (child?.textContent?.trim()) return child.textContent.trim();
  }
  return '';
}

// Convert German Eplan addresses (E/A) to TIA format (I/Q)
function normalizeAddress(raw) {
  if (!raw) return '';
  return raw.trim()
    .replace(/^E\s*(\d)/i, 'I$1')   // E0.0 → I0.0 (Eingang = Input)
    .replace(/^A\s*(\d)/i, 'Q$1')   // A0.0 → Q0.0 (Ausgang = Output)
    .replace(/\s+/g, '');            // remove spaces
}

function guessSignalType(addr) {
  const a = (addr || '').toUpperCase();
  if (/^(I|E)W/i.test(a)) return 'AI';   // Word input = analog in
  if (/^(Q|A)W/i.test(a)) return 'AO';   // Word output = analog out
  if (/^(I|E)/i.test(a))  return 'DI';   // Bit input = digital in
  if (/^(Q|A)/i.test(a))  return 'DO';   // Bit output = digital out
  if (/EB|IB/.test(a))    return 'DI';   // Byte input
  if (/AB|QB/.test(a))    return 'DO';   // Byte output
  return 'DI';
}

function groupByStation(result) {
  const map = {};
  result.signals.forEach(sig => {
    const key = sig.station || 'PLC';
    if (!map[key]) map[key] = { name: key, di: [], do: [], ai: [], ao: [] };
    const t = (sig.type || '').toUpperCase();
    if (t === 'AI') map[key].ai.push(sig);
    else if (t === 'AO') map[key].ao.push(sig);
    else if (t === 'DO') map[key].do.push(sig);
    else map[key].di.push(sig);
  });
  result.stations = Object.values(map);
}

// Format parsed Eplan data as a context block for Claude
export function eplanToContext(data) {
  const lines = [
    `## Imported Eplan Data`,
    `Project: ${data.project || '(unnamed)'}`,
    `Total signals: ${data.signals.length}`,
    '',
  ];

  data.stations.forEach(st => {
    lines.push(`### Station / PLC: ${st.name}`);
    lines.push(`DI: ${st.di.length}  DO: ${st.do.length}  AI: ${st.ai.length}  AO: ${st.ao.length}`);
    lines.push('');

    if (st.di.length) {
      lines.push('**Digital Inputs (DI):**');
      st.di.forEach(s => lines.push(`  ${s.address.padEnd(10)} ${s.tag.padEnd(30)} ${s.description}`));
      lines.push('');
    }
    if (st.do.length) {
      lines.push('**Digital Outputs (DO):**');
      st.do.forEach(s => lines.push(`  ${s.address.padEnd(10)} ${s.tag.padEnd(30)} ${s.description}`));
      lines.push('');
    }
    if (st.ai.length) {
      lines.push('**Analog Inputs (AI):**');
      st.ai.forEach(s => lines.push(`  ${s.address.padEnd(10)} ${s.tag.padEnd(30)} ${s.description}`));
      lines.push('');
    }
    if (st.ao.length) {
      lines.push('**Analog Outputs (AO):**');
      st.ao.forEach(s => lines.push(`  ${s.address.padEnd(10)} ${s.tag.padEnd(30)} ${s.description}`));
      lines.push('');
    }
  });

  return lines.join('\n');
}

// Summary string for UI display
export function eplanSummary(data) {
  const total = data.signals.length;
  const di = data.signals.filter(s => s.type === 'DI').length;
  const doCount = data.signals.filter(s => s.type === 'DO').length;
  const ai = data.signals.filter(s => s.type === 'AI').length;
  const ao = data.signals.filter(s => s.type === 'AO').length;
  return `${total} signals  DI:${di} DO:${doCount} AI:${ai} AO:${ao}`;
}
