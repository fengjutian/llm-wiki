import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useToastStore } from '../stores/toastStore'

export default function WorkspaceSwitcher() {
  const { projects, active, loading, load, activate } = useWorkspaceStore()
  const addToast = useToastStore(s => s.add)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => { load() }, [load])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleActivate = async (name: string) => {
    try {
      await activate(name)
      addToast(`已切换到「${name}」`)
      setOpen(false)
      // Reload so all pages re-fetch data from the new workspace
      setTimeout(() => window.location.reload(), 300)
    } catch {
      addToast('切换失败')
    }
  }

  const activeProject = projects.find(p => p.name === active)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-300 hover:text-gray-100 hover:bg-gray-800"
      >
        <span className="text-base">📁</span>
        <span className="flex-1 text-left truncate">
          {loading ? '加载中...' : activeProject ? activeProject.name : '未选择工作目录'}
        </span>
        <span className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Active indicator */}
          {activeProject && (
            <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-700">
              当前工作目录 · {activeProject.page_count} 个页面
            </div>
          )}

          {/* Project list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {projects.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                暂无工作目录
              </div>
            ) : (
              projects.map(p => (
                <button
                  key={p.name}
                  onClick={() => p.name !== active && handleActivate(p.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                    p.name === active
                      ? 'bg-cyan-500/10 text-cyan-400 cursor-default'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                >
                  <span>📁</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.name === active && <span className="text-xs text-cyan-500">●</span>}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700">
            <button
              onClick={() => { setOpen(false); navigate('/workbench') }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
            >
              <span>＋</span>
              <span>管理工作目录...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
