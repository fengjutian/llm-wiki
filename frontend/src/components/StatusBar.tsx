import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface TaskInfo {
  task_id: string
  status: 'running' | 'done' | 'error'
  error: string | null
  type: string
  label: string
}

interface TasksStatus {
  tasks: TaskInfo[]
  running: number
  done: number
  error: number
  watchers: {
    total: number
    active: number
    folders: string[]
  }
}

export default function StatusBar() {
  const [status, setStatus] = useState<TasksStatus | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const data = await api.get<TasksStatus>('/api/tasks')
        if (!active) return
        setStatus(data)
        // Keep visible if anything is running, or if there are active watchers
        if (data.running > 0 || data.watchers.active > 0) {
          setVisible(true)
        } else if (data.tasks.length === 0 && data.watchers.active === 0) {
          // Keep showing for a few seconds then hide
          setVisible(false)
        }
      } catch {
        // Backend not available or error — hide quietly
        if (active) setVisible(false)
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const hasRunning = status && status.running > 0
  const hasErrors = status && status.error > 0
  const runningTasks = status?.tasks.filter(t => t.status === 'running') ?? []
  const watchersActive = status?.watchers.active ?? 0

  if (!visible) return null

  return (
    <div className="flex items-center h-7 px-4 text-xs border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 gap-4 select-none">
      {/* Running indicator */}
      {hasRunning && (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {runningTasks.map(t => t.label || t.type).join(', ')}
          </span>
        </div>
      )}

      {/* Watchers */}
      {watchersActive > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Watching {status?.watchers.folders.join(', ') || `${watchersActive} folder(s)`}</span>
        </div>
      )}

      {/* Errors */}
      {hasErrors && (
        <button
          title={status?.tasks.filter(t => t.status === 'error').map(t => t.error).join('\n')}
          className="flex items-center gap-1 text-red-500 hover:text-red-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{status?.error} error(s)</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Summary counts */}
      {status && status.tasks.length > 0 && (
        <span className="text-gray-400 dark:text-gray-500">
          Tasks: {status.running} running, {status.done} done
          {status.error > 0 && <>, {status.error} failed</>}
        </span>
      )}
    </div>
  )
}
