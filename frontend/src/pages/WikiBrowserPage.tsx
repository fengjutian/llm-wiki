import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { WikiPage } from '../api/types'
import { useToastStore } from '../stores/toastStore'

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  entity: { icon: '🏷️', label: 'Entity', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  concept: { icon: '💡', label: 'Concept', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  source_summary: { icon: '📄', label: 'Source', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  overview: { icon: '🗂️', label: 'Overview', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  comparison: { icon: '⚖️', label: 'Compare', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  active: { icon: '●', label: 'Active', color: 'text-emerald-500' },
  draft: { icon: '◐', label: 'Draft', color: 'text-amber-500' },
  stale: { icon: '○', label: 'Stale', color: 'text-gray-400' },
  contradicted: { icon: '⚠', label: 'Contradicted', color: 'text-red-500' },
  archived: { icon: '▽', label: 'Archived', color: 'text-gray-500' },
}

export default function WikiBrowserPage() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore(s => s.add)

  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = () => {
    api.get<{ pages: WikiPage[] }>('/api/wiki/pages')
      .then(d => setPages(d.pages || []))
      .finally(() => setLoading(false))
  }

  const handleDelete = async (title: string) => {
    if (!confirm(`确认删除 Wiki 页面 "${title}"？此操作不可撤销。`)) return
    try {
      await api.del('/api/wiki/pages/' + encodeURIComponent(title))
      addToast(`Deleted: ${title}`)
      if (preview?.title === title) setPreview(null)
      loadPages()
    } catch {
      addToast(`Failed to delete: ${title}`)
    }
  }

  const startEdit = (page: WikiPage) => {
    setEditing(true)
    setEditContent(page.content || '')
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditContent('')
  }

  const saveEdit = async () => {
    if (!preview) return
    try {
      await api.put('/api/wiki/pages/' + encodeURIComponent(preview.title), { content: editContent })
      addToast(`Saved: ${preview.title}`)
      setEditing(false)
      const updated = await api.get<WikiPage>('/api/wiki/pages/' + encodeURIComponent(preview.title))
      setPreview(updated)
      loadPages()
    } catch {
      addToast(`Failed to save: ${preview.title}`)
    }
  }

  const filtered = pages.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-4">📚 Wiki Browser</h1>
          <div className="w-full h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 animate-pulse">
                <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-14 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---- Empty state ----
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-bold mb-2">Wiki Browser</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">还没有任何 Wiki 页面。</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">通过 Ingest 页面导入源文件来生成 Wiki 页面。</p>
      </div>
    )
  }

  const typeCfg = preview ? TYPE_CONFIG[preview.frontmatter?.page_type] : null
  const statusCfg = preview ? STATUS_CONFIG[preview.frontmatter?.status] : null

  return (
    <div className="flex gap-0 h-full">
      {/* ---- Left: Page list ---- */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            📚 Wiki Browser
            <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">({filtered.length}{filtered.length !== pages.length ? ` / ${pages.length}` : ''})</span>
          </h1>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索页面标题..."
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-shadow"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Page list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-gray-500 dark:text-gray-400 text-sm">没有找到匹配 "{search}" 的页面。</p>
            </div>
          ) : (
            filtered.map((p, i) => {
              const tcfg = TYPE_CONFIG[p.frontmatter?.page_type] || { icon: '❓', label: '?', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
              const scfg = STATUS_CONFIG[p.frontmatter?.status] || { icon: '?', label: p.frontmatter?.status || '?', color: 'text-gray-400' }
              const isActive = preview?.title === p.title
              return (
                <button
                  key={p.title}
                  onClick={() => { setPreview(p); setEditing(false) }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-sm group
                    ${isActive
                      ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 shadow-sm'
                      : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm'
                    }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Type badge */}
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${tcfg.color}`}>
                    <span>{tcfg.icon}</span>
                    <span className="hidden xl:inline">{tcfg.label}</span>
                  </span>

                  {/* Title */}
                  <span className="flex-1 truncate font-medium text-gray-800 dark:text-gray-200">{p.title}</span>

                  {/* Summary preview on hover */}
                  {p.frontmatter?.summary && (
                    <span className="hidden group-hover:hidden truncate max-w-[160px] text-xs text-gray-400 dark:text-gray-500 italic">
                      {p.frontmatter.summary}
                    </span>
                  )}

                  {/* Status dot */}
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium ${scfg.color}`}>
                    <span>{scfg.icon}</span>
                    <span className="hidden md:inline">{scfg.label}</span>
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ---- Right: Preview panel ---- */}
      {preview && (
        <div className="w-[460px] shrink-0 border-l border-gray-200 dark:border-gray-800 pl-6 animate-drawer-in flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{preview.title}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                {typeCfg && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${typeCfg.color}`}>
                    {typeCfg.icon} {typeCfg.label}
                  </span>
                )}
                {statusCfg && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => { setPreview(null); setEditing(false) }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
            >
              &times;
            </button>
          </div>

          {/* Summary */}
          {preview.frontmatter?.summary && !editing && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Summary</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{preview.frontmatter.summary}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            {!editing ? (
              <>
                <button onClick={() => startEdit(preview)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors">
                  ✏️ <span>Edit</span>
                </button>
                <button onClick={() => handleDelete(preview.title)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors">
                  🗑 <span>Delete</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={saveEdit} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-sm">
                  💾 <span>Save</span>
                </button>
                <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors">
                  <span>Cancel</span>
                </button>
              </>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden">
            {editing ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full h-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                spellCheck={false}
                placeholder="输入页面内容..."
              />
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-full overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{preview.content?.slice(0, 5000)}</pre>
                {(preview.content?.length || 0) > 5000 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    内容已截断（显示前 5000 字符，共 {preview.content!.length.toLocaleString()} 字符）
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
