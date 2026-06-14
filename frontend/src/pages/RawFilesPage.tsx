import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../stores/toastStore'

interface RawFile {
  path: string
  hash: string
  size: number
  status: string
  wiki_pages: string[]
}

interface WikiFile {
  title: string
  filename: string
  page_type: string
  status: string
  summary: string
  size: number
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  ingested: '已生成',
  modified: '已修改',
}

const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  pending:   { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-600 dark:text-blue-400', icon: '📥', label: '待处理' },
  ingested:  { bg: 'bg-green-50 dark:bg-green-950/60', text: 'text-green-600 dark:text-green-400', icon: '✅', label: '已生成' },
  modified:  { bg: 'bg-yellow-50 dark:bg-yellow-950/60', text: 'text-yellow-600 dark:text-yellow-400', icon: '🔄', label: '已修改' },
}

const wikiStatusConfig: Record<string, { bg: string; text: string; icon: string }> = {
  active:      { bg: 'bg-green-50 dark:bg-green-950/60', text: 'text-green-600 dark:text-green-400', icon: '●' },
  draft:       { bg: 'bg-gray-100 dark:bg-gray-800/80', text: 'text-gray-500 dark:text-gray-400', icon: '◌' },
  stale:       { bg: 'bg-yellow-50 dark:bg-yellow-950/60', text: 'text-yellow-600 dark:text-yellow-400', icon: '◐' },
  contradicted:{ bg: 'bg-red-50 dark:bg-red-950/60', text: 'text-red-600 dark:text-red-400', icon: '⚠' },
  archived:    { bg: 'bg-gray-50 dark:bg-gray-900/80', text: 'text-gray-400 dark:text-gray-500', icon: '📦' },
}

const FILE_ICONS: Record<string, string> = {
  '.md': '📝', '.txt': '📄', '.pdf': '📕', '.html': '🌐',
  '.json': '📋', '.yaml': '⚙️', '.yml': '⚙️', '.csv': '📊',
  '.py': '🐍', '.js': '🟨', '.ts': '🔷', '.tsx': '⚛️',
}

type ModalKind = 'viewRaw' | 'editRaw' | 'viewWiki' | 'editWiki' | null

export default function RawFilesPage() {
  const [rawFiles, setRawFiles] = useState<RawFile[]>([])
  const [wikiFiles, setWikiFiles] = useState<WikiFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore(s => s.add)

  // Modal state
  const [modal, setModal] = useState<ModalKind>(null)
  const [modalTarget, setModalTarget] = useState('')
  const [modalContent, setModalContent] = useState('')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalTitle, setModalTitle] = useState('')

  // New document state
  const [showNewRawForm, setShowNewRawForm] = useState(false)
  const [showNewWikiForm, setShowNewWikiForm] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [newDocFolder, setNewDocFolder] = useState('')
  const [newDocContent, setNewDocContent] = useState('')

  useEffect(() => { loadFiles() }, [])

  const loadFiles = () => {
    api.get<{raw_files: RawFile[]; wiki_files: WikiFile[]}>('/api/raw/files').then(d => {
      setRawFiles(d.raw_files || [])
      setWikiFiles(d.wiki_files || [])
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }

  const toggle = (path: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(path) ? next.delete(path) : next.add(path)
    return next
  })

  const toggleAll = () => {
    if (selected.size === rawFiles.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rawFiles.map(f => f.path)))
    }
  }

  const ingestSelected = async () => {
    for (const path of selected) {
      try {
        const res = await api.post<{status:string;new_pages:string[]}>('/api/raw/ingest/' + encodeURIComponent(path), {})
        addToast(`Ingested ${path}: ${res.new_pages?.length || 0} new pages`)
      } catch { addToast(`Failed: ${path}`) }
    }
    setSelected(new Set())
    loadFiles()
  }

  // --- Raw file actions ---

  const viewRaw = useCallback(async (path: string) => {
    setModalTarget(path)
    setModal('viewRaw')
    setModalLoading(true)
    try {
      const d = await api.get<{content: string; filename: string}>('/api/raw/preview/' + encodeURIComponent(path))
      setModalContent(d.content || '')
      setModalTitle(d.filename || path)
    } catch {
      addToast(`Failed to read: ${path}`)
      setModalContent('')
      setModal(null)
    }
    setModalLoading(false)
  }, [addToast])

  const editRaw = useCallback(async (path: string) => {
    setModalTarget(path)
    setModal('editRaw')
    setModalLoading(true)
    try {
      const d = await api.get<{content: string; filename: string}>('/api/raw/preview/' + encodeURIComponent(path))
      setModalContent(d.content || '')
      setModalTitle(d.filename || path)
    } catch {
      addToast(`Failed to read: ${path}`)
      setModalContent('')
      setModal(null)
    }
    setModalLoading(false)
  }, [addToast])

  const saveRaw = async () => {
    try {
      await api.put<{status: string}>('/api/raw/files/' + encodeURIComponent(modalTarget), { content: modalContent })
      addToast(`Saved: ${modalTarget}`)
      setModal(null)
      loadFiles()
    } catch {
      addToast(`Failed to save: ${modalTarget}`)
    }
  }

  const deleteRaw = async (path: string) => {
    if (!confirm(`确定要删除 "${path}" 吗？此操作不可撤销。`)) return
    try {
      await api.del<{status: string}>('/api/raw/files/' + encodeURIComponent(path))
      addToast(`Deleted: ${path}`)
      loadFiles()
    } catch {
      addToast(`Failed to delete: ${path}`)
    }
  }

  const newRawFile = async () => {
    const name = newDocName.trim()
    if (!name) { addToast('Please enter a filename'); return }
    try {
      await api.post<{filename: string; status: string}>('/api/raw/create', {
        filename: name, content: newDocContent, folder: newDocFolder.trim(),
      })
      addToast(`Created: ${newDocFolder ? newDocFolder + '/' : ''}${name}`)
      setShowNewRawForm(false); setNewDocName(''); setNewDocFolder(''); setNewDocContent('')
      loadFiles()
    } catch { addToast(`Failed to create: ${name}`) }
  }

  const newWikiPage = async () => {
    const name = newDocName.trim()
    if (!name) { addToast('Please enter a page title'); return }
    try {
      const fm = '---\ntitle: "' + name + '"\npage_type: concept\nstatus: draft\nsummary: ""\n---\n\n'
      await api.put<{status: string}>('/api/wiki/pages/' + encodeURIComponent(name), {
        content: fm + newDocContent,
      })
      addToast(`Created wiki page: ${name}`)
      setShowNewWikiForm(false); setNewDocName(''); setNewDocFolder(''); setNewDocContent('')
      loadFiles()
    } catch { addToast(`Failed to create: ${name}`) }
  }

  // --- Wiki file actions ---

  const viewWiki = useCallback(async (title: string) => {
    setModalTarget(title)
    setModal('viewWiki')
    setModalLoading(true)
    try {
      const d = await api.get<{content: string; title: string}>('/api/wiki/preview/' + encodeURIComponent(title))
      setModalContent(d.content || '')
      setModalTitle(d.title || title)
    } catch {
      addToast(`Failed to read: ${title}`)
      setModalContent('')
      setModal(null)
    }
    setModalLoading(false)
  }, [addToast])

  const editWiki = useCallback(async (title: string) => {
    setModalTarget(title)
    setModal('editWiki')
    setModalLoading(true)
    try {
      const d = await api.get<{content: string; title: string}>('/api/wiki/preview/' + encodeURIComponent(title))
      setModalContent(d.content || '')
      setModalTitle(d.title || title)
    } catch {
      addToast(`Failed to read: ${title}`)
      setModalContent('')
      setModal(null)
    }
    setModalLoading(false)
  }, [addToast])

  const saveWiki = async () => {
    try {
      await api.put<{status: string}>('/api/wiki/pages/' + encodeURIComponent(modalTarget), { content: modalContent })
      addToast(`Saved: ${modalTarget}`)
      setModal(null)
      loadFiles()
    } catch {
      addToast(`Failed to save: ${modalTarget}`)
    }
  }

  const deleteWiki = async (title: string) => {
    if (!confirm(`确定要删除 "${title}" 吗？此操作不可撤销。`)) return
    try {
      await api.del<{status: string}>('/api/wiki/pages/' + encodeURIComponent(title))
      addToast(`Deleted: ${title}`)
      loadFiles()
    } catch {
      addToast(`Failed to delete: ${title}`)
    }
  }

  const closeModal = () => {
    setModal(null)
    setModalContent('')
  }

  const formatSize = (b: number) => b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`

  const getFileIcon = (filename: string) => {
    const ext = filename.match(/\.[a-z]+$/i)?.[0]?.toLowerCase() || ''
    return FILE_ICONS[ext] || '📄'
  }

  const isViewing = modal === 'viewRaw' || modal === 'viewWiki'
  const isEditing = modal === 'editRaw' || modal === 'editWiki'

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border-t border-gray-100 dark:border-gray-800/50 first:border-t-0">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded flex-1" />
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-14 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Raw source files section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-3xl">📁</span>
            Raw 源文件
            <span className="text-base font-normal text-gray-400 dark:text-gray-500">({rawFiles.length})</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowNewRawForm(!showNewRawForm); setShowNewWikiForm(false); setNewDocFolder(''); setNewDocContent('') }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
              <span>➕</span> New Raw File
            </button>
            {selected.size > 0 && (
              <button onClick={ingestSelected}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200">
                <span>🤖</span> Ingest {selected.size} selected
              </button>
            )}
          </div>
        </div>

        {/* New Raw File inline form */}
        {showNewRawForm && (
          <div className="bg-white dark:bg-gray-900 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create New Raw Source File</h3>
            <div className="flex gap-2">
              <input value={newDocFolder} onChange={e => setNewDocFolder(e.target.value)}
                placeholder="Folder (e.g. drafts/)" className="w-1/3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-cyan-500" />
              <input value={newDocName} onChange={e => setNewDocName(e.target.value)}
                placeholder="Filename (e.g. notes.md)" className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-cyan-500" />
            </div>
            <textarea value={newDocContent} onChange={e => setNewDocContent(e.target.value)}
              placeholder="Initial content (optional markdown)..."
              rows={4}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 font-mono" />
            <div className="flex gap-2">
              <button onClick={newRawFile} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold transition-colors">Create</button>
              <button onClick={() => setShowNewRawForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {rawFiles.length === 0 && !showNewRawForm ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <span className="text-5xl mb-4">📭</span>
            <p className="text-sm font-medium mb-1">暂无源文件</p>
            <p className="text-xs">请通过 Ingest 页面上传源文档，或点击 "New Raw File" 新建</p>
          </div>
        ) : rawFiles.length === 0 && showNewRawForm ? null : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === rawFiles.length && rawFiles.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 font-medium">File</th>
                  <th className="p-3 w-20 font-medium">Size</th>
                  <th className="p-3 w-24 font-medium">Hash</th>
                  <th className="p-3 w-24 font-medium">Status</th>
                  <th className="p-3 font-medium">Wiki Pages</th>
                  <th className="p-3 w-32 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rawFiles.map((f, i) => (
                  <tr
                    key={f.path}
                    className={`
                      border-t border-gray-100 dark:border-gray-800/50
                      hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                      ${i === 0 ? 'border-t-0' : ''}
                    `}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(f.path)}
                        onChange={() => toggle(f.path)}
                        className="rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base flex-shrink-0">{getFileIcon(f.path)}</span>
                        <code className="font-medium text-cyan-700 dark:text-cyan-400 truncate max-w-[300px]">{f.path}</code>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-500 dark:text-gray-400 text-xs font-mono whitespace-nowrap">{formatSize(f.size)}</span>
                    </td>
                    <td className="p-3">
                      <code className="text-gray-400 dark:text-gray-500 font-mono text-[11px] whitespace-nowrap bg-gray-100 dark:bg-gray-800/60 px-1.5 py-0.5 rounded">{f.hash}</code>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[f.status]?.bg || 'bg-gray-100 dark:bg-gray-800'} ${statusConfig[f.status]?.text || 'text-gray-600 dark:text-gray-400'}`}>
                        <span>{statusConfig[f.status]?.icon || '📌'}</span>
                        {statusConfig[f.status]?.label || f.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {f.wiki_pages.length > 0
                        ? f.wiki_pages.map(p => (
                            <span key={p} className="inline-flex items-center gap-1 mr-1.5 mb-0.5 px-1.5 py-0.5 text-xs rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium">
                              <span className="text-[10px]">📄</span>
                              {p}
                            </span>
                          ))
                        : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => viewRaw(f.path)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:text-cyan-400 dark:hover:bg-cyan-950/30 transition-colors"
                          title="查看">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => editRaw(f.path)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-colors"
                          title="编辑">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteRaw(f.path)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                          title="删除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated wiki pages section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <span className="text-2xl">📝</span>
            已生成 Wiki 页面
            <span className="text-base font-normal text-gray-400 dark:text-gray-500">({wikiFiles.length})</span>
          </h2>
          <button onClick={() => { setShowNewWikiForm(!showNewWikiForm); setShowNewRawForm(false); setNewDocFolder(''); setNewDocContent('') }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
            <span>➕</span> New Wiki Page
          </button>
        </div>

        {/* New Wiki Page inline form */}
        {showNewWikiForm && (
          <div className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create New Wiki Page</h3>
            <input value={newDocName} onChange={e => setNewDocName(e.target.value)}
              placeholder="Page title (e.g. My Topic)"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-cyan-500" />
            <textarea value={newDocContent} onChange={e => setNewDocContent(e.target.value)}
              placeholder="Markdown body (frontmatter will be auto-generated)..."
              rows={5}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-cyan-500 font-mono" />
            <div className="flex gap-2">
              <button onClick={newWikiPage} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-colors">Create</button>
              <button onClick={() => setShowNewWikiForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {wikiFiles.length === 0 && !showNewWikiForm ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <span className="text-4xl mb-3">📝</span>
            <p className="text-sm font-medium mb-1">暂无 Wiki 页面</p>
            <p className="text-xs">Ingest source files to generate pages, or click "New Wiki Page" to create one manually.</p>
          </div>
        ) : wikiFiles.length === 0 && showNewWikiForm ? null : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 w-24 font-medium">Type</th>
                  <th className="p-3 w-24 font-medium">Status</th>
                  <th className="p-3 w-20 font-medium">Size</th>
                  <th className="p-3 font-medium">Summary</th>
                  <th className="p-3 w-32 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wikiFiles.map((w, i) => (
                  <tr
                    key={w.title}
                    className={`
                      border-t border-gray-100 dark:border-gray-800/50
                      hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors
                      ${i === 0 ? 'border-t-0' : ''}
                    `}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base flex-shrink-0">📄</span>
                        <span className="font-medium text-purple-700 dark:text-purple-400">{w.title}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                        {w.page_type}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${wikiStatusConfig[w.status]?.bg || 'bg-gray-100 dark:bg-gray-800'} ${wikiStatusConfig[w.status]?.text || 'text-gray-600 dark:text-gray-400'}`}>
                        <span className="text-[10px]">{wikiStatusConfig[w.status]?.icon || '●'}</span>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">{formatSize(w.size)}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-500 dark:text-gray-400 text-xs truncate block max-w-[280px]">{w.summary}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => viewWiki(w.title)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:text-cyan-400 dark:hover:bg-cyan-950/30 transition-colors"
                          title="查看">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => editWiki(w.title)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 transition-colors"
                          title="编辑">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteWiki(w.title)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                          title="删除">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
      </div>

      {/* View / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4 animate-scale-in"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <span className={`p-1.5 rounded-lg ${
                isViewing ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400' :
                'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
              }`}>
                {isViewing ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {modal === 'viewRaw' || modal === 'editRaw' ? 'Raw 文件' : 'Wiki 页面'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{modalTitle || modalTarget}</p>
              </div>
              <button onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-5">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-8 h-8 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">加载中...</p>
                </div>
              ) : isViewing ? (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono h-full max-h-[65vh] overflow-y-auto bg-gray-50 dark:bg-gray-950 rounded-lg p-4">{modalContent}</pre>
              ) : (
                <textarea
                  value={modalContent}
                  onChange={e => setModalContent(e.target.value)}
                  className="w-full h-full min-h-[400px] max-h-[65vh] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 font-mono resize-none focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  spellCheck={false}
                />
              )}
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <span className="text-xs text-gray-400">
                {isEditing ? '✏️ 编辑模式' : '👁 只读模式'}
              </span>
              <div className="flex gap-2">
                <button onClick={closeModal}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium transition-colors">
                  关闭
                </button>
                {isEditing && (
                  <button onClick={modal === 'editRaw' ? saveRaw : saveWiki}
                    className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold shadow-md shadow-cyan-500/20 transition-all">
                    保存
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
