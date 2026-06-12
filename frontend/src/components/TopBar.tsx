import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '../stores/themeStore'

type MenuKey = 'file' | 'edit' | 'view' | 'workbench' | 'help'

interface MenuAction {
  id: string
  label: string
  hint?: string
  separator?: false
  disabled?: boolean
}
type MenuItem = MenuAction | { separator: true; id: string }

const HOST = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
const PORT = 8080

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

function menuItems(key: MenuKey): MenuItem[] {
  switch (key) {
    case 'file':
      return [
        { id: 'new', label: 'New Page', hint: 'Ctrl+N' },
        { id: 'open', label: 'Open File…', hint: 'Ctrl+O' },
        { id: 'sep1', separator: true },
        ...(isMac
          ? [{ id: 'close', label: 'Close Window', hint: '⌘W' }]
          : [{ id: 'exit', label: 'Exit', hint: 'Alt+F4' }]),
      ]
    case 'edit':
      return [
        { id: 'undo', label: 'Undo', hint: 'Ctrl+Z' },
        { id: 'redo', label: 'Redo', hint: 'Ctrl+Shift+Z' },
        { id: 'sep1', separator: true },
        { id: 'cut', label: 'Cut', hint: 'Ctrl+X' },
        { id: 'copy', label: 'Copy', hint: 'Ctrl+C' },
        { id: 'paste', label: 'Paste', hint: 'Ctrl+V' },
        { id: 'selectAll', label: 'Select All', hint: 'Ctrl+A' },
      ]
    case 'view':
      return [
        { id: 'reload', label: 'Reload', hint: 'Ctrl+R' },
        { id: 'devtools', label: 'Toggle Developer Tools', hint: 'Ctrl+Shift+I' },
        { id: 'sep1', separator: true },
        { id: 'zoomIn', label: 'Zoom In', hint: 'Ctrl+=' },
        { id: 'zoomOut', label: 'Zoom Out', hint: 'Ctrl+-' },
        { id: 'resetZoom', label: 'Reset Zoom', hint: 'Ctrl+0' },
        { id: 'sep2', separator: true },
        { id: 'fullscreen', label: 'Toggle Fullscreen', hint: 'F11' },
      ]
    case 'workbench':
      return [
        { id: 'manage', label: 'Manage Projects…' },
        { id: 'sep1', separator: true },
        { id: 'ingest', label: 'Ingest a Document' },
        { id: 'query', label: 'Open Query' },
      ]
    case 'help':
      return [
        { id: 'about', label: 'About LLM Wiki' },
        { id: 'sep1', separator: true },
        { id: 'apiDocs', label: 'API Documentation' },
      ]
  }
}

export default function TopBar() {
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!openMenu) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openMenu])

  const api = typeof window !== 'undefined' ? window.electronAPI : undefined
  const inElectron = !!api?.isElectron

  function run(action: string) {
    setOpenMenu(null)
    switch (action) {
      case 'new':
        api?.onNewPage && window.dispatchEvent(new CustomEvent('app:new-page'))
        break
      case 'open':
        api?.openFile?.()
        break
      case 'close':
        api?.close?.()
        break
      case 'exit':
        api?.quit?.()
        break
      case 'undo':
        document.execCommand('undo')
        break
      case 'redo':
        document.execCommand('redo')
        break
      case 'cut':
        document.execCommand('cut')
        break
      case 'copy':
        document.execCommand('copy')
        break
      case 'paste':
        document.execCommand('paste')
        break
      case 'selectAll':
        document.execCommand('selectAll')
        break
      case 'reload':
        api?.reload?.()
        break
      case 'devtools':
        api?.toggleDevTools?.()
        break
      case 'zoomIn':
        api && (window.electronAPI as unknown as { zoomIn?: () => void }).zoomIn?.()
        break
      case 'zoomOut':
        api && (window.electronAPI as unknown as { zoomOut?: () => void }).zoomOut?.()
        break
      case 'resetZoom':
        api && (window.electronAPI as unknown as { resetZoom?: () => void }).resetZoom?.()
        break
      case 'fullscreen':
        // Browser fullscreen is fine; the WebContents handles it.
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
        break
      case 'manage':
        navigate('/workbench')
        break
      case 'ingest':
        navigate('/ingest')
        break
      case 'query':
        navigate('/query')
        break
      case 'about':
        api?.showAbout?.()
        break
      case 'apiDocs':
        api?.openExternal?.(`http://${HOST}:${PORT}/docs`)
        break
    }
  }

  function toggleMenu(key: MenuKey) {
    setOpenMenu((cur) => (cur === key ? null : key))
  }

  const menus: { key: MenuKey; label: string }[] = [
    { key: 'file', label: 'File' },
    { key: 'edit', label: 'Edit' },
    { key: 'view', label: 'View' },
    { key: 'workbench', label: 'Workbench' },
    { key: 'help', label: 'Help' },
  ]

  return (
    <div
      ref={rootRef}
      // Drag region: the whole bar is draggable so the user can move the window
      // by clicking any empty space. Interactive elements opt out individually.
      className="drag-region relative h-10 flex items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 select-none"
    >
      {/* macOS traffic lights are positioned by the OS, but we still want some
          breathing room on the left. On Windows/Linux we add a small inset too. */}
      <div className={isMac ? 'w-20 shrink-0' : 'w-3 shrink-0'} />

      {menus.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => toggleMenu(key)}
          onMouseEnter={() => openMenu && openMenu !== key && setOpenMenu(key)}
          className={`no-drag px-3 h-10 text-sm transition-colors ${
            openMenu === key
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {label}
        </button>
      ))}

      <div className="drag-region flex-1 h-10" />

      {/* Center title — purely decorative, gives the bar some identity. */}
      <div
        className="drag-region absolute left-1/2 -translate-x-1/2 text-xs font-medium text-gray-500 dark:text-gray-400 pointer-events-none"
      >
        📚 LLM Wiki
      </div>

      {/* Right cluster: theme toggle + (Win/Linux) window controls */}
      <div
        className="no-drag flex items-center gap-1 pr-2"
      >
        <button
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        {!isMac && inElectron && (
          <div className="flex items-center ml-1">
            <button
              onClick={() => api?.minimize?.()}
              aria-label="Minimize"
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg width="10" height="10" viewBox="0 0 10 10"><rect y="4" width="10" height="1.2" fill="currentColor" /></svg>
            </button>
            <button
              onClick={() => api?.maximize?.()}
              aria-label="Maximize"
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" /></svg>
            </button>
            <button
              onClick={() => api?.close?.()}
              aria-label="Close"
              className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-red-500 hover:text-white"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Dropdown panel */}
      {openMenu && (
        <div
          className="no-drag absolute top-10 min-w-[220px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg py-1 z-50"
          style={{ left: menus.findIndex((m) => m.key === openMenu) * 60 + (isMac ? 80 : 12) }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {menuItems(openMenu).map((item) =>
            item.separator ? (
              <div key={item.id} className="my-1 border-t border-gray-200 dark:border-gray-800" />
            ) : (
              <button
                key={item.id}
                onClick={() => run(item.id)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
              >
                <span>{item.label}</span>
                {item.hint && <span className="ml-4 text-xs text-gray-400 dark:text-gray-500">{item.hint}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
