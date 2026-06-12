/**
 * Single source of truth for the shape of `window.electronAPI` exposed by
 * electron/preload.js. Every component that needs to call into the main
 * process should import `ElectronAPI` from here and use the matching
 * `declare global` augmentation so the types stay in sync.
 */

export interface ElectronAPI {
  platform?: string
  isElectron?: boolean

  // Window controls
  minimize?: () => void
  maximize?: () => void
  close?: () => void

  // App-level actions invoked from the custom top bar / keyboard shortcuts
  reload?: () => void
  toggleDevTools?: () => void
  quit?: () => void
  openExternal?: (url: string) => void
  showAbout?: () => Promise<unknown>

  // File dialogs
  openFile?: () => Promise<string | null>
  saveFile?: (content: string, defaultName?: string) => Promise<string | null>

  // Notifications
  notify?: (title: string, body: string) => void

  // Menu / shortcut events from main process — returns unsubscribe function
  onNewPage?: (cb: () => void) => () => void
  onShortcutNewPage?: (cb: () => void) => () => void
  onOpenWorkbench?: (cb: () => void) => () => void

  // Theme events — returns unsubscribe function
  onThemeChange?: (cb: (t: 'dark' | 'light') => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
