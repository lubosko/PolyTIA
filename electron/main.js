const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

// ── Splash window ───────────────────────────────────────────────────────────
function createSplash() {
  const splashPng = path.join(__dirname, '../public/splash.png');
  if (!fs.existsSync(splashPng)) return null; // no splash asset — skip gracefully

  const splash = new BrowserWindow({
    width: 500,
    height: 500,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '../public/icon.png'),
  });
  splash.setMenuBarVisibility(false);

  const dataUri = 'data:image/png;base64,' + fs.readFileSync(splashPng).toString('base64');
  const html =
    `<html><body style="margin:0;background:transparent;overflow:hidden">` +
    `<img src="${dataUri}" style="width:100%;height:100%;object-fit:contain" /></body></html>`;
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  return splash;
}

function createWindow() {
  const splash = createSplash();

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false, // reveal only after content ready (with splash)
    backgroundColor: '#0d1117',
    title: 'PolyTIA',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow Anthropic SDK's dangerouslyAllowBrowser to work in renderer
      webSecurity: true,
    },
  });

  // Hide menu bar (engineering tool — no menu needed)
  win.setMenuBarVisibility(false);

  // Reveal main window, close splash after brief hold
  win.once('ready-to-show', () => {
    const reveal = () => {
      if (splash && !splash.isDestroyed()) splash.close();
      win.show();
    };
    // Keep splash visible min 1.2s so it's not a flash
    setTimeout(reveal, 1200);
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    // win.webContents.openDevTools(); // uncomment to debug
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser, not Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Bridge status check ───────────────────────────────────────────────
// Renderer calls window.electronBridge.checkBridge() via preload
ipcMain.handle('bridge:check', async () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5001/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ ok: true, ...JSON.parse(data) }); }
        catch { resolve({ ok: false, error: 'Parse error' }); }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ ok: false, error: 'Timeout' }); });
  });
});

// ── IPC: App version ───────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());

// ── IPC: Reveal a file in the OS file manager ───────────────────────────────
ipcMain.handle('shell:showItem', (_e, filePath) => {
  try {
    if (filePath) shell.showItemInFolder(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Save-as dialog → write a file ──────────────────────────────────────
ipcMain.handle('dialog:saveFile', async (_e, defaultName, content) => {
  try {
    const res = await dialog.showSaveDialog({
      defaultPath: defaultName || 'untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    fs.writeFileSync(res.filePath, content ?? '', 'utf8');
    return { path: res.filePath };
  } catch (err) {
    return { error: err.message };
  }
});

// ── IPC: Cross-project memory (.md file) ─────────────────────────────────────
const MEMORY_HEADER = '# PolyTIA Memory — Lessons Learned\n';
const memoryConfigPath = () => path.join(app.getPath('userData'), 'polytia-memory-config.json');

function memoryFilePath() {
  try {
    const cfg = JSON.parse(fs.readFileSync(memoryConfigPath(), 'utf8'));
    if (cfg.path) return cfg.path;
  } catch {}
  return path.join(app.getPath('userData'), 'polytia-memory.md');
}

ipcMain.handle('memory:getPath', () => ({ path: memoryFilePath() }));

ipcMain.handle('memory:setPath', (_e, newPath) => {
  try {
    fs.writeFileSync(memoryConfigPath(), JSON.stringify({ path: newPath }, null, 2), 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('memory:read', () => {
  try {
    return { content: fs.readFileSync(memoryFilePath(), 'utf8') };
  } catch {
    return { content: '' };
  }
});

ipcMain.handle('memory:write', (_e, text) => {
  try {
    fs.writeFileSync(memoryFilePath(), text, 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('memory:append', (_e, entry) => {
  try {
    const p = memoryFilePath();
    let cur = '';
    try { cur = fs.readFileSync(p, 'utf8'); } catch {}
    const base = cur.trim() ? cur : MEMORY_HEADER;
    fs.writeFileSync(p, base.replace(/\s*$/, '') + '\n\n' + String(entry).trim() + '\n', 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
