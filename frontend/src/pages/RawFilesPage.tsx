import { useState, useEffect } from 'react'
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

export default function RawFilesPage() {
  const [rawFiles, setRawFiles] = useState<RawFile[]>([])
  const [wikiFiles, setWikiFiles] = useState<WikiFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore(s => s.add)

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

  const formatSize = (b: number) => b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`

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
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 text-xs uppercase">
                <th className="p-3 w-8"></th>
                <th className="p-3">File</th>
                <th className="p-3 w-20">Size</th>
                <th className="p-3 w-24">Hash</th>
                <th className="p-3 w-20">Status</th>
                <th className="p-3">Wiki Pages</th>
              </tr></thead>
              <tbody>
                {rawFiles.map(f => (
                  <tr key={f.path} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3"><input type="checkbox" checked={selected.has(f.path)} onChange={() => toggle(f.path)}/></td>
                    <td className="p-3 font-medium text-cyan-400">{f.path}</td>
                    <td className="p-3 text-gray-400">{formatSize(f.size)}</td>
                    <td className="p-3 text-gray-500 font-mono text-xs">{f.hash}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === 'ingested' ? 'bg-green-900/50 text-green-400' :
                        f.status === 'modified' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-blue-900/50 text-blue-400'
                      }`}>{statusLabels[f.status] || f.status}</span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">
                      {f.wiki_pages.length > 0
                        ? f.wiki_pages.map(p => <span key={p} className="inline-block mr-1 text-cyan-300">[[{p}]]</span>)
                        : <span className="text-gray-600">—</span>}
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
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 text-xs uppercase">
                <th className="p-3">Title</th>
                <th className="p-3 w-24">Type</th>
                <th className="p-3 w-20">Status</th>
                <th className="p-3 w-20">Size</th>
                <th className="p-3">Summary</th>
              </tr></thead>
              <tbody>
                {wikiFiles.map(w => (
                  <tr key={w.title} className="border-t border-gray-800 hover:bg-gray-800/50">
                    <td className="p-3 font-medium text-purple-400">{w.title}</td>
                    <td className="p-3 text-gray-400">{w.page_type}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        w.status === 'active' ? 'bg-green-900/50 text-green-400' :
                        w.status === 'draft' ? 'bg-gray-700/50 text-gray-400' :
                        'bg-yellow-900/50 text-yellow-400'
                      }`}>{w.status}</span>
                    </td>
                    <td className="p-3 text-gray-400">{formatSize(w.size)}</td>
                    <td className="p-3 text-gray-500 text-xs truncate max-w-xs">{w.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
