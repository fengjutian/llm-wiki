import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

/**
 * App-level keyboard shortcuts. We do this in the renderer (not via native
 * menu accelerators) so the same behavior ships on every platform and the
 * shortcuts respect the same focus/disabled-input rules as the rest of the UI.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const api = window.electronAPI

    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      return false
    }

    function onKey(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey
      // Don't hijack plain typing — only when a modifier is involved.
      if (!mod && !e.altKey) return
      // Allow Ctrl/Cmd+Shift+I and Ctrl/Cmd+R even inside inputs, but otherwise
      // bail when the user is typing into a field.
      const isDevtoolsCombo = mod && e.shiftKey && (e.key === 'I' || e.key === 'i')
      const isReloadCombo = mod && !e.shiftKey && (e.key === 'R' || e.key === 'r')
      if (!isDevtoolsCombo && !isReloadCombo && isTypingTarget(e.target)) return

      // New Page
      if (mod && !e.shiftKey && !e.altKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('app:new-page'))
        api?.onNewPage && api.onNewPage(() => {}) // touch to keep the API used
        return
      }
      // Open File
      if (mod && !e.shiftKey && !e.altKey && (e.key === 'O' || e.key === 'o')) {
        e.preventDefault()
        api?.openFile?.()
        return
      }
      // Open Workbench
      if (mod && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault()
        navigate('/workbench')
        return
      }
      // Reload
      if (isReloadCombo) {
        e.preventDefault()
        api?.reload?.()
        return
      }
      // DevTools
      if (isDevtoolsCombo) {
        e.preventDefault()
        api?.toggleDevTools?.()
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}
