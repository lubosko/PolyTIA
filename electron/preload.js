const { contextBridge, ipcRenderer } = require('electron');

// Expose safe bridge to renderer process
contextBridge.exposeInMainWorld('electronBridge', {
  /** Ping TiaBridge.exe via main process (avoids CORS in packaged app) */
  checkBridge: () => ipcRenderer.invoke('bridge:check'),

  /** Get app version */
  getVersion: () => ipcRenderer.invoke('app:version'),

  /** Cross-project memory (.md file) */
  memory: {
    read:    () => ipcRenderer.invoke('memory:read'),
    write:   (text) => ipcRenderer.invoke('memory:write', text),
    append:  (entry) => ipcRenderer.invoke('memory:append', entry),
    getPath: () => ipcRenderer.invoke('memory:getPath'),
    setPath: (p) => ipcRenderer.invoke('memory:setPath', p),
  },

  /** Reveal a file in the OS file manager (Explorer) */
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItem', filePath),

  /** Native Save-as dialog → writes content to chosen path. Returns {path} | {canceled} | {error} */
  saveFile: (defaultName, content) => ipcRenderer.invoke('dialog:saveFile', defaultName, content),

  /** True if running inside Electron */
  isElectron: true,
});
