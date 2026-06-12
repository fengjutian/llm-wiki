const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  platform: process.platform,
  isElectron: true,

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content, defaultName) => ipcRenderer.invoke('dialog:saveFile', content, defaultName),

  // Notifications
  notify: (title, body) => ipcRenderer.send('notify', title, body),

  // Menu / shortcut events from main process
  onNewPage: (callback) => ipcRenderer.on('menu:new-page', () => callback()),
  onShortcutNewPage: (callback) => ipcRenderer.on('shortcut:new-page', () => callback()),

  // Theme events
  onThemeChange: (callback) => ipcRenderer.on('theme:changed', (_, theme) => callback(theme)),

  // Remove listeners (cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
