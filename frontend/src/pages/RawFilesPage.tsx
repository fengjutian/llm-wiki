import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../stores/toastStore'

interface RawFile { name: string; size: number; modified: string; status?: string }

export default function RawFilesPage() {
  const [files, setFiles] = useState<RawFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore(s => s.add)

  useEffect(() => { loadFiles() }, [])

  const loadFiles = () => {
    api.get<{files:RawFile[]}>('/api/raw/files').then(d => { setFiles(d.files||[]); setLoading(false) })
  }

  const toggle = (name: string) => setSelected(prev => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })

  const ingestSelected = async () => {
    for (const name of selected) {
      try {
        const res = await api.post<{status:string;new_pages:string[]}>('/api/wiki/ingest', {source_path: name})
        addToast(`Ingested ${name}: ${res.new_pages.length} new pages`)
      } catch { addToast(`Failed: ${name}`) }
    }
    setSelected(new Set())
    loadFiles()
  }

  const formatSize = (b: number) => b < 1024 ? `${b}B` : `${(b/1024).toFixed(1)}KB`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Raw Files ({files.length})</h1>
        {selected.size > 0 && (
          <button onClick={ingestSelected} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold">
            Ingest {selected.size} selected
          </button>
        )}
      </div>
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 text-xs uppercase">
              <th className="p-3 w-8"></th><th className="p-3">Name</th><th className="p-3 w-24">Size</th><th className="p-3 w-48">Modified</th>
            </tr></thead>
            <tbody>
              {files.map(f => (
                <tr key={f.name} className="border-t border-gray-800 hover:bg-gray-800/50">
                  <td className="p-3"><input type="checkbox" checked={selected.has(f.name)} onChange={() => toggle(f.name)}/></td>
                  <td className="p-3 font-medium">{f.name}</td>
                  <td className="p-3 text-gray-400">{formatSize(f.size)}</td>
                  <td className="p-3 text-gray-400">{f.modified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
