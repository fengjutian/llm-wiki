import { useEffect, useState } from 'react'
import { api } from '../api/client'

interface TasksStatus {
  tasks: { task_id: string; status: string; error: string | null; type: string; label: string }[]
  running: number
  done: number
  error: number
  watchers: { total: number; active: number; folders: string[] }
  git: { branch: string; dirty: boolean }
  page_count: number
  project: string
}

const BAR_BG = 'bg-[#007acc]'

function StatusItem({ icon, label, title, onClick, pulse, dim }: {
  icon?: string
  label: string
  title?: string
  onClick?: () => void
  pulse?: boolean
  dim?: boolean
}) {
  return (
    <span
      title={title ?? label}
      onClick={onClick}
      className={`flex items-center gap-1 px-2 h-full cursor-pointer hover:bg-white/20 transition-colors ${onClick ? '' : 'cursor-default'} ${dim ? 'opacity-70' : ''}`}
      role={onClick ? 'button' : undefined}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      {icon && !pulse && <span className="text-xs leading-none">{icon}</span>}
      <span>{label}</span>
    </span>
  )
}

export default function StatusBar() {
  const [status, setStatus] = useState<Partial<TasksStatus>>({})
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      // Try the unified /api/tasks endpoint first
      try {
        const data = await api.get<TasksStatus>('/api/tasks')
        if (!active) return
        setStatus(data)
        setBackendOnline(true)
        return
      } catch { /* fall through to individual endpoints */ }

      // Fallback: check /health
      try {
        await api.get<{ status: string }>('/health')
        if (!active) return
        setBackendOnline(true)
      } catch {
        if (active) setBackendOnline(false)
        return
      }

      // Fetch individual endpoints
      const updates: Partial<TasksStatus> = {}
      try {
        const w = await api.get<{ sessions?: Record<string, unknown>; total?: number }>('/api/watch/status')
        if (active) {
          const folders = w.sessions ? Object.values(w.sessions).filter((s: any) => s.active).map((s: any) => s.folder) : []
          updates.watchers = { total: w.total ?? 0, active: folders.length, folders }
        }
      } catch { /* ignore */ }
      try {
        const p = await api.get<{ pages: unknown[]; count: number }>('/api/wiki/pages')
        if (active) updates.page_count = p.count
      } catch { /* ignore */ }
      if (active) setStatus(prev => ({ ...prev, ...updates }))
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  const hasRunning = (status.running ?? 0) > 0
  const hasErrors = (status.error ?? 0) > 0
  const runningTasks = status.tasks?.filter(t => t.status === 'running') ?? []
  const watchersActive = status.watchers?.active ?? 0
  const gitBranch = status.git?.branch ?? null
  const gitDirty = status.git?.dirty ?? false
  const pageCount = status.page_count ?? 0
  const project = status.project ?? ''

  return (
    <div className={`flex items-center h-[22px] text-[12px] text-white ${BAR_BG} select-none shrink-0 font-sans`}>
      {/* -- Left items -- */}

      {/* Backend */}
      {backendOnline === false && (
        <StatusItem icon="⚠" label="Offline" title="Backend not reachable" />
      )}
      {backendOnline === null && (
        <StatusItem icon="⟳" label="Connecting..." title="Connecting to backend" />
      )}
      {backendOnline && !hasRunning && watchersActive === 0 && (
        <StatusItem icon="✓" label="Ready" title="Backend online" />
      )}

      {/* Running task */}
      {hasRunning && (
        <StatusItem pulse
          label={runningTasks.map(t => t.label || t.type).join(', ')}
          title={runningTasks.map(t => `${t.label || t.type}: ${t.status}`).join('\n')}
        />
      )}

      {/* Git branch */}
      {backendOnline && gitBranch && (
        <StatusItem icon={gitDirty ? '⎇*' : '⎇'} label={gitBranch}
          title={gitDirty ? `Branch: ${gitBranch} (uncommitted)` : `Branch: ${gitBranch}`} dim={gitDirty} />
      )}

      {/* Watchers */}
      {watchersActive > 0 && (
        <StatusItem icon="👁"
          label={`Watching: ${status.watchers?.folders?.join(', ') || `${watchersActive} folder(s)`}`}
          title={`${watchersActive} active watcher(s)`} />
      )}

      {/* Project */}
      {backendOnline && project && (
        <StatusItem icon="📁" label={project} title={`Project: ${project}`} />
      )}

      <div className="flex-1" />

      {/* -- Right items -- */}

      {/* Page count */}
      {backendOnline && pageCount > 0 && (
        <StatusItem icon="📄" label={`${pageCount} pages`} title={`${pageCount} wiki pages`} />
      )}

      {/* Errors */}
      {hasErrors && (
        <StatusItem icon="✗" label={`${status.error} error(s)`}
          title={status.tasks?.filter(t => t.status === 'error').map(t => `${t.label || t.type}: ${t.error}`).join('\n')} />
      )}

      {/* Task summary */}
      {status.tasks && status.tasks.length > 0 && (
        <StatusItem icon="📋"
          label={`${status.running ?? 0}r · ${status.done ?? 0}d · ${status.error ?? 0}e`}
          title={`Running: ${status.running} | Done: ${status.done} | Failed: ${status.error}`} />
      )}
    </div>
  )
}
