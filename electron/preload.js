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

  // Menu / shortcut events from main process — returns unsubscribe function
  onNewPage: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:new-page', handler)
    return () => ipcRenderer.removeListener('menu:new-page', handler)
  },
  onShortcutNewPage: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('shortcut:new-page', handler)
    return () => ipcRenderer.removeListener('shortcut:new-page', handler)
  },

  // Menu: open workbench page
  onOpenWorkbench: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('menu:open-workbench', handler)
    return () => ipcRenderer.removeListener('menu:open-workbench', handler)
  },

  // Theme events — returns unsubscribe function
  onThemeChange: (callback) => {
    const handler = (_, theme) => callback(theme)
    ipcRenderer.on('theme:changed', handler)
    return () => ipcRenderer.removeListener('theme:changed', handler)
  },
});
