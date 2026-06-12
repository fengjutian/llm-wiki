import { useState, useCallback, DragEvent, useRef } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../stores/toastStore'

interface QueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function IngestPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.add)

  const addFiles = useCallback((files: FileList | File[]) => {
    setQueue((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        status: 'pending' as const,
      })),
    ])
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleUpload = useCallback(async () => {
    setIngesting(true)
    setResult(null)
    for (const item of queue.filter((i) => i.status === 'pending')) {
      setQueue((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' as const } : i)))
      try {
        const form = new FormData()
        form.append('file', item.file)
        const res = await fetch('/api/raw/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        // Auto-ingest after upload
        if (data.filename) {
          const ingRes = await api.post<{ status: string; new_pages: string[] }>('/api/wiki/ingest', {
            source_path: data.filename ?? item.file.name,
          })
          addToast(`Ingested: ${ingRes.new_pages.length} new pages`)
        }
        setQueue((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'done' as const } : i)))
      } catch (e) {
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error' as const, error: (e as Error).message } : i)),
        )
      }
    }
    setIngesting(false)
  }, [queue, addToast])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Ingest Source Files</h1>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer mb-6 ${
          dragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-700 hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="text-4xl block mb-2">📁</span>
        <p className="text-gray-400">Drop .md / .txt files here, or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Upload Queue ({queue.length})</h2>
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 truncate font-medium">{item.file.name}</span>
                <span className="text-xs text-gray-500">{(item.file.size / 1024).toFixed(1)} KB</span>
                <span className={`text-xs font-semibold ${
                  item.status === 'done' ? 'text-green-400' : item.status === 'error' ? 'text-red-400' : item.status === 'uploading' ? 'text-cyan-400' : 'text-gray-500'
                }`}>
                  {item.status === 'done' ? 'Done' : item.status === 'error' ? 'Error' : item.status === 'uploading' ? 'Uploading...' : 'Pending'}
                </span>
                {item.error && <span className="text-xs text-red-400 truncate max-w-[120px]" title={item.error}>{item.error}</span>}
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={ingesting || queue.every((i) => i.status !== 'pending')}
            className="mt-3 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
          >
            {ingesting ? 'Ingesting...' : 'Upload & Ingest All'}
          </button>
        </div>
      )}

      {result && <pre className="bg-gray-900 rounded-xl p-4 text-xs text-gray-300 overflow-x-auto">{result}</pre>}
    </div>
  )
}
