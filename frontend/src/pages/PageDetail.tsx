import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api } from "../api/client"
import type { WikiPage } from "../api/types"
import { useToastStore } from "../stores/toastStore"

export default function PageDetail() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const addToast = useToastStore(s => s.add)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState("")

  const loadPage = () => {
    if (!name) return
    api.get<WikiPage>("/api/wiki/pages/" + encodeURIComponent(name))
      .then(p => { setPage(p); setError("") })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPage() }, [name])

  const handleDelete = async () => {
    if (!name || !confirm("确认删除 \"" + name + "\"？此操作不可撤销。")) return
    try {
      await api.del("/api/wiki/pages/" + encodeURIComponent(name))
      addToast("Deleted: " + name)
      navigate("/wiki")
    } catch {
      addToast("Failed to delete: " + name)
    }
  }

  const startEdit = () => {
    if (!page) return
    setEditing(true)
    setEditContent(page.content || "")
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditContent("")
  }

  const saveEdit = async () => {
    if (!name) return
    try {
      await api.put("/api/wiki/pages/" + encodeURIComponent(name), { content: editContent })
      addToast("Saved: " + name)
      setEditing(false)
      loadPage()
    } catch {
      addToast("Failed to save: " + name)
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (!page) return <p className="text-gray-500">Page not found</p>

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">{page.title}</h1>
        <div className="flex gap-2 shrink-0 ml-4">
          {!editing ? (
            <>
              <button onClick={startEdit} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">Edit</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-red-300">Delete</button>
            </>
          ) : (
            <>
              <button onClick={saveEdit} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">Save</button>
              <button onClick={cancelEdit} className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300">Cancel</button>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-3 text-xs text-gray-500 mb-6">
        <span>{page.frontmatter?.page_type}</span>
        <span>{page.frontmatter?.status}</span>
        {page.frontmatter?.confidence && <span>confidence: {page.frontmatter.confidence}</span>}
      </div>
      {page.frontmatter?.summary && !editing && (
        <div className="bg-cyan-500/5 border-l-4 border-cyan-500 px-4 py-3 mb-6 rounded-r-lg text-sm text-gray-400">{page.frontmatter.summary}</div>
      )}
      {editing ? (
        <textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          className="w-full h-[60vh] bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:border-cyan-500"
          spellCheck={false}
        />
      ) : (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
