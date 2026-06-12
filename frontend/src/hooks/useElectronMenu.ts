import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

declare global {
  interface Window {
    electronAPI?: {
      onOpenWorkbench: (cb: () => void) => () => void
      onNewPage: (cb: () => void) => () => void
      [key: string]: unknown
    }
  }
}

/** Listen for native menu / shortcut events from Electron main process. */
export function useElectronMenu() {
  const navigate = useNavigate()

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onOpenWorkbench) return

    const unsub = api.onOpenWorkbench(() => {
      navigate('/workbench')
    })

    return unsub
  }, [navigate])
}
