const BASE = 'http://localhost:5001';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/** Ping bridge. Returns {connected, projectName} or throws. */
export async function checkBridge() {
  return request('/status');
}

/** Connect bridge to running TIA instance. */
export async function connectBridge() {
  return request('/connect', { method: 'POST' });
}

/** Get full project block tree. */
export async function getProjectTree() {
  return request('/project/tree');
}

/** Export named block as SimaticML XML. Returns {name, number, blockType, language, xmlContent}. */
export async function exportBlock(blockName) {
  return request(`/blocks/export/${encodeURIComponent(blockName)}`);
}

/**
 * Import XML block into TIA project.
 * @param {string} folderPath  e.g. "0030Station"
 * @param {string} xmlContent  SimaticML XML string
 * @param {boolean} override   Replace existing block
 */
export async function importBlock(folderPath, xmlContent, override = true) {
  return request('/blocks/import', {
    method: 'POST',
    body: JSON.stringify({ folderPath, xmlContent, override }),
  });
}

/**
 * Compile PLC.
 * @param {string|null} deviceName  Specific device or null = all
 */
export async function compileDevice(deviceName = null) {
  return request('/blocks/compile', {
    method: 'POST',
    body: JSON.stringify({ device: deviceName }),
  });
}
