import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { WikiPage } from '../api/types'
import { useToastStore } from '../stores/toastStore'

const TYPE_ICONS: Record<string,string> = {entity:'E',concept:'C',source_summary:'S',overview:'O',comparison:'v'}
const STATUS_COLORS: Record<string,string> = {active:'text-green-400',draft:'text-yellow-400',stale:'text-gray-500',contradicted:'text-red-400',archived:'text-gray-600'}

export default function WikiBrowserPage() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore(s => s.add)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = () => {
    api.get<{pages:WikiPage[]}>('/api/wiki/pages').then(d => setPages(d.pages || [])).finally(() => setLoading(false))
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
      // Refresh preview
      const updated = await api.get<WikiPage>('/api/wiki/pages/' + encodeURIComponent(preview.title))
      setPreview(updated)
      loadPages()
    } catch {
      addToast(`Failed to save: ${preview.title}`)
    }
  }

  const filtered = pages.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex gap-0 h-full">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Wiki Browser</h1>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search pages..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:border-cyan-500"/>
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <div className="space-y-1">
            {filtered.map(p => (
              <button key={p.title} onClick={() => { setPreview(p); setEditing(false) }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm">
                <span className="text-xs w-5 text-center">{TYPE_ICONS[p.frontmatter?.page_type]||'?'}</span>
                <span className="flex-1 truncate font-medium">{p.title}</span>
                <span className={STATUS_COLORS[p.frontmatter?.status]||'text-gray-500'}>{p.frontmatter?.status||'?'}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-gray-500 text-sm px-3">No pages found.</p>}
          </div>
        )}
      </div>
      {preview && (
        <div className="w-[420px] shrink-0 border-l border-gray-800 pl-6 animate-drawer-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{preview.title}</h2>
            <button onClick={() => { setPreview(null); setEditing(false) }} className="text-gray-500 hover:text-gray-300 text-lg">&times;</button>
          </div>
          <div className="text-xs text-gray-500 mb-3">{preview.frontmatter?.page_type} | {preview.frontmatter?.status}</div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            {!editing ? (
              <>
                <button onClick={() => startEdit(preview)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">✏️ Edit</button>
                <button onClick={() => handleDelete(preview.title)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-red-300">🗑 Delete</button>
              </>
            ) : (
              <>
                <button onClick={saveEdit} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">💾 Save</button>
                <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">Cancel</button>
              </>
            )}
          </div>

          {preview.frontmatter?.summary && !editing && <p className="text-sm text-gray-400 mb-3 italic">{preview.frontmatter.summary}</p>}

          {editing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-[55vh] bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-cyan-500"
              spellCheck={false}
            />
          ) : (
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-[70vh] overflow-y-auto">{preview.content?.slice(0,5000)}</pre>
          )}
        </div>
      )}
    </div>
  )
}
