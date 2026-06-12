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

  // --- Wiki file actions ---

  const viewWiki = useCallback(async (title: string) => {
    setModalTarget(title)
    setModal('viewWiki')
    setModalLoading(true)
    try {
      const d = await api.get<{content: string; title: string}>('/api/wiki/preview/' + encodeURIComponent(title))
      setModalContent(d.content || '')
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

  const isViewing = modal === 'viewRaw' || modal === 'viewWiki'
  const isEditing = modal === 'editRaw' || modal === 'editWiki'

  return (
    <div className="space-y-6">
      {/* Raw source files section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">📁 Raw 源文件 ({rawFiles.length})</h1>
          {selected.size > 0 && (
            <button onClick={ingestSelected} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold">
              🤖 Ingest {selected.size} selected
            </button>
          )}
        </div>
        {loading ? <p className="text-gray-500">Loading...</p> : rawFiles.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">暂无文件，请通过 Ingest 页面上传源文档。</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 text-xs uppercase">
                <th className="p-3 w-8"></th>
                <th className="p-3">File</th>
                <th className="p-3 w-20">Size</th>
                <th className="p-3 w-24">Hash</th>
                <th className="p-3 w-20">Status</th>
                <th className="p-3">Wiki Pages</th>
                <th className="p-3 w-28 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {rawFiles.map(f => (
                  <tr key={f.path} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3"><input type="checkbox" checked={selected.has(f.path)} onChange={() => toggle(f.path)}/></td>
                    <td className="p-3 font-medium text-cyan-600 dark:text-cyan-400">{f.path}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{formatSize(f.size)}</td>
                    <td className="p-3 text-gray-500 font-mono text-xs">{f.hash}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === 'ingested' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                        f.status === 'modified' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' :
                        'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                      }`}>{statusLabels[f.status] || f.status}</span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-xs">
                      {f.wiki_pages.length > 0
                        ? f.wiki_pages.map(p => <span key={p} className="inline-block mr-1 text-cyan-600 dark:text-cyan-300">[[{p}]]</span>)
                        : <span className="text-gray-500 dark:text-gray-600">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => viewRaw(f.path)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="查看">👁</button>
                        <button onClick={() => editRaw(f.path)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="编辑">✏️</button>
                        <button onClick={() => deleteRaw(f.path)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-800 text-gray-700 dark:text-gray-300 dark:hover:text-red-300" title="删除">🗑</button>
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
      {wikiFiles.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">📝 已生成 Wiki 页面 ({wikiFiles.length})</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 text-xs uppercase">
                <th className="p-3">Title</th>
                <th className="p-3 w-24">Type</th>
                <th className="p-3 w-20">Status</th>
                <th className="p-3 w-20">Size</th>
                <th className="p-3">Summary</th>
                <th className="p-3 w-28 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {wikiFiles.map(w => (
                  <tr key={w.title} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-3 font-medium text-purple-600 dark:text-purple-400">{w.title}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{w.page_type}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        w.status === 'active' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                        w.status === 'draft' ? 'bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400' :
                        'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400'
                      }`}>{w.status}</span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{formatSize(w.size)}</td>
                    <td className="p-3 text-gray-500 text-xs truncate max-w-xs">{w.summary}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => viewWiki(w.title)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="查看">👁</button>
                        <button onClick={() => editWiki(w.title)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" title="编辑">✏️</button>
                        <button onClick={() => deleteWiki(w.title)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-800 text-gray-700 dark:text-gray-300 dark:hover:text-red-300" title="删除">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <h3 className="font-semibold text-sm">
                {isViewing ? '👁 ' : '✏️ '}
                {modal === 'viewRaw' || modal === 'editRaw' ? 'Raw: ' : 'Wiki: '}
                <span className="text-cyan-600 dark:text-cyan-400">{modalTarget}</span>
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden p-5">
              {modalLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : isViewing ? (
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono h-full max-h-[65vh] overflow-y-auto">{modalContent}</pre>
              ) : (
                <textarea
                  value={modalContent}
                  onChange={e => setModalContent(e.target.value)}
                  className="w-full h-full min-h-[400px] max-h-[65vh] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 font-mono resize-none focus:outline-none focus:border-cyan-500"
                  spellCheck={false}
                />
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">
                关闭
              </button>
              {isEditing && (
                <button onClick={modal === 'editRaw' ? saveRaw : saveWiki}
                  className="px-4 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
                  保存
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
