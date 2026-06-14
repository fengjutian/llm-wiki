import { useState, useCallback, DragEvent, useRef, useEffect, lazy, Suspense } from 'react'
import { api } from '../api/client'
import { useToastStore } from '../stores/toastStore'

const RawFilesPage = lazy(() => import('./RawFilesPage'))

type TabId = 'upload' | 'documents' | 'monitor'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'upload',    label: '上传文件',   icon: '📥' },
  { id: 'documents', label: '文档管理',   icon: '📄' },
  { id: 'monitor',   label: '文件夹监控', icon: '👁️' },
]

interface QueueItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface WatchFolder {
  folder: string
  enabled: boolean
  auto_ingest: boolean
  active: boolean
  files_watched: number
  events_count: number
  error?: string
}

export default function IngestPage() {
  const [activeTab, setActiveTab] = useState<TabId>('upload')

  // ---- Upload state ----
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [folder, setFolder] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useToastStore((s) => s.add)

  // ---- Monitor state ----
  const [watchedFolders, setWatchedFolders] = useState<WatchFolder[]>([])
  const [watchLoading, setWatchLoading] = useState(false)
  const [watchFolder, setWatchFolder] = useState('')

  // ---- Upload handlers ----
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

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const handleUpload = useCallback(async () => {
    setIngesting(true)
    for (const item of queue.filter((i) => i.status === 'pending')) {
      setQueue((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' as const } : i)))
      try {
        const form = new FormData()
        form.append('file', item.file)
        if (folder.trim()) form.append('folder', folder.trim())
        const res = await fetch('/api/raw/upload', { method: 'POST', body: form })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error((errData as any).error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (data.filename) {
          try {
            const ingRes = await api.post<{ status: string; new_pages: string[] }>('/api/wiki/ingest', {
              source_path: data.filename,
            })
            addToast(`Ingested "${data.filename}": ${ingRes.new_pages?.length || 0} new pages`)
          } catch {
            addToast(`Uploaded "${data.filename}" (ingest skipped)`)
          }
        }
        setQueue((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'done' as const } : i)))
      } catch (e) {
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error' as const, error: (e as Error).message } : i)),
        )
      }
    }
    setIngesting(false)
  }, [queue, folder, addToast])

  // ---- Monitor handlers ----
  const loadWatchStatus = useCallback(async () => {
    try {
      const data = await api.get<{ folders: WatchFolder[] }>('/api/watch/folders')
      setWatchedFolders(data.folders || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadWatchStatus() }, [loadWatchStatus])

  const startWatch = async () => {
    const f = watchFolder.trim()
    if (!f) { addToast('请输入要监控的文件夹路径'); return }
    setWatchLoading(true)
    try {
      await api.post('/api/watch/start', { folder: f, auto_ingest: true })
      addToast(`Started watching: ${f || '/'}`)
      loadWatchStatus()
    } catch { addToast(`Failed to start watching: ${f}`) }
    setWatchLoading(false)
  }

  const stopWatch = async (f: string) => {
    try {
      await api.post('/api/watch/stop', { folder: f })
      addToast(`Stopped watching: ${f || '/'}`)
      loadWatchStatus()
    } catch { addToast(`Failed to stop watching: ${f}`) }
  }

  const pendingCount = queue.filter((i) => i.status === 'pending').length
  const doneCount = queue.filter((i) => i.status === 'done').length
  const errorCount = queue.filter((i) => i.status === 'error').length

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div>
      {/* ---- Tab bar ---- */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 dark:bg-gray-800/60 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ==================================================================== */}
      {/* Tab: Upload */}
      {/* ==================================================================== */}
      {activeTab === 'upload' && (
        <div className="animate-fade-in">
          {/* Folder picker */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                Target Folder (within raw/)
              </label>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. papers/  (leave empty for root)"
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => { setFolder(''); setQueue([]) }}
              className="mt-5 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer mb-6 ${
              dragOver
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-4xl block mb-2">📁</span>
            <p className="text-gray-600 dark:text-gray-400">
              Drop files here, or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              .md .txt .pdf .html .json .yaml .csv .py .js .ts
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt,.pdf,.html,.json,.yaml,.yml,.csv,.py,.js,.ts,.tsx"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* Upload Queue */}
          {queue.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Upload Queue ({queue.length})
                </h2>
                <span className="text-xs text-gray-400">
                  {pendingCount} pending · {doneCount} done{errorCount > 0 ? ` · ${errorCount} errors` : ''}
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="flex-1 truncate font-medium">{item.file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        item.status === 'done'
                          ? 'text-green-500 dark:text-green-400'
                          : item.status === 'error'
                            ? 'text-red-500 dark:text-red-400'
                            : item.status === 'uploading'
                              ? 'text-cyan-500 dark:text-cyan-400'
                              : 'text-gray-500'
                      }`}
                    >
                      {item.status === 'done'
                        ? '✓ Done'
                        : item.status === 'error'
                          ? '✗ Error'
                          : item.status === 'uploading'
                            ? 'Uploading...'
                            : 'Pending'}
                    </span>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                    {item.error && (
                      <span
                        className="text-xs text-red-500 dark:text-red-400 truncate max-w-[120px]"
                        title={item.error}
                      >
                        {item.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleUpload}
                  disabled={ingesting || pendingCount === 0}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
                >
                  {ingesting ? 'Ingesting...' : `Upload & Ingest (${pendingCount})`}
                </button>
                <button
                  onClick={() => setQueue([])}
                  disabled={ingesting}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {queue.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-sm font-medium mb-1">队列为空</p>
              <p className="text-xs">拖放文件到上方区域或点击选择文件开始上传</p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab: Documents */}
      {/* ==================================================================== */}
      {activeTab === 'documents' && (
        <Suspense
          fallback={
            <div className="space-y-6 animate-fade-in">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 border-t border-gray-100 dark:border-gray-800/50 first:border-t-0"
                  >
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
          }
        >
          <RawFilesPage />
        </Suspense>
      )}

      {/* ==================================================================== */}
      {/* Tab: Monitor */}
      {/* ==================================================================== */}
      {activeTab === 'monitor' && (
        <div className="animate-fade-in">
          {/* Start new watch */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
              Start New Monitor
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={watchFolder}
                onChange={(e) => setWatchFolder(e.target.value)}
                placeholder="Sub-folder to watch (e.g. papers/ — leave empty for root)"
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={startWatch}
                disabled={watchLoading}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
              >
                {watchLoading ? 'Starting...' : '▶ Start Watch'}
              </button>
            </div>
          </div>

          {/* Active monitors */}
          {watchedFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              <span className="text-5xl mb-4">👁️</span>
              <p className="text-sm font-medium mb-1">暂无活跃监控</p>
              <p className="text-xs">
                输入 raw/ 下的子文件夹路径，点击 "Start Watch" 开始自动监控
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-2">
                  <span>👁️</span>
                  Active Monitors
                  <span className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs px-2 py-0.5 rounded-full">
                    {watchedFolders.length}
                  </span>
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {watchedFolders.map((w) => (
                  <div
                    key={w.folder}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          w.active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">
                          {w.folder || '/'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {w.files_watched} files watched · {w.events_count} events
                        </span>
                      </div>
                      {w.error && (
                        <span
                          className="text-xs text-red-500 truncate max-w-[140px]"
                          title={w.error}
                        >
                          ⚠ {w.error}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => stopWatch(w.folder)}
                      className="ml-3 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      Stop
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                  监控运行时，文件夹内新增或修改的{' '}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-[11px]">.md</code>{' '}
                  /{' '}
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-[11px]">.txt</code>{' '}
                  文件将自动被 ingest 到 wiki 知识库中。
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
