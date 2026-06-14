import { useState, FormEvent, useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useSSE } from "../hooks/useSSE"
import { api } from "../api/client"

type Mode = "wiki" | "rag" | "hybrid"

interface QueryHistoryItem {
  q: string
  a: string
  mode: Mode
  sources?: any[]
}

const STORAGE_KEYS = {
  history: 'query_history',
  mode: 'query_mode',
} as const

function loadHistory(): QueryHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.history)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function loadMode(): Mode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.mode)
    if (stored && ['wiki', 'rag', 'hybrid'].includes(stored)) return stored as Mode
  } catch {}
  return 'wiki'
}

export default function QueryPage() {
  const [q, setQ] = useState("")
  const [mode, setMode] = useState<Mode>(loadMode)
  const [hist, setHist] = useState<QueryHistoryItem[]>(loadHistory)

  // Three SSE hooks – one per query mode
  const wikiSSE = useSSE("/api/wiki/query/stream")
  const ragSSE = useSSE("/api/rag/query/stream")
  const hybridSSE = useSSE("/api/rag/query/hybrid/stream")

  // Pick the active stream based on mode
  const active = useMemo(() => {
    if (mode === "wiki") return wikiSSE
    if (mode === "rag") return ragSSE
    return hybridSSE
  }, [mode, wikiSSE, ragSSE, hybridSSE])

  // Persist history and mode when they change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(hist.slice(0, 20))) } catch {}
  }, [hist])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.mode, mode) } catch {}
  }, [mode])

  // When any SSE stream completes, write the final answer into history
  useEffect(() => {
    if (active.done && active.text && hist.length > 0 && !hist[0].a) {
      const entry = hist[0]
      const mergedSources = active.wikiSources.length > 0
        ? [...active.wikiSources.map((s: string) => ({ file: s, chunk_index: 0, score: 0, text: "" })), ...active.sources]
        : active.sources
      setHist(p => [{ ...p[0], a: active.text, sources: mergedSources }, ...p.slice(1)])
    }
  }, [active.done, active.text])

  const handle = async (e: FormEvent) => {
    e.preventDefault(); if (!q.trim()) return
    const qq = q; setQ("")
    // Push a placeholder entry immediately so the user sees it
    setHist(p => [{ q: qq, a: "", mode }, ...p])
    // Start the stream for the current mode
    if (mode === "wiki") {
      wikiSSE.start({ question: qq })
    } else if (mode === "rag") {
      ragSSE.start({ question: qq, top_k: 5 })
    } else {
      hybridSSE.start({ question: qq, top_k: 5 })
    }
  }

  const cur = active.text
  const curSrc = active.sources
  const loading = !active.done && !!active.text
  const modes = [{ k: "wiki" as Mode, l: "Wiki" }, { k: "rag" as Mode, l: "RAG" }, { k: "hybrid" as Mode, l: "Hybrid" }]

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Ask the Wiki</h1>
      <div className="flex gap-1 mb-4">
        {modes.map(m => (
          <button key={m.k} onClick={() => setMode(m.k)}
            className={"px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors " + (mode === m.k ? "bg-cyan-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700")}>{m.l}</button>
        ))}
      </div>
      <form onSubmit={handle} className="flex gap-3 mb-6">
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder={mode === "wiki" ? "Ask the wiki..." : mode === "rag" ? "Search raw documents..." : "Wiki + documents..."}
          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"/>
        <button type="submit" disabled={!q.trim() || loading}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-semibold">Send</button>
      </form>
      {active.error && <div className="text-red-500 dark:text-red-400 text-sm mb-4">Error: {active.error}</div>}
      {cur && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{cur}</ReactMarkdown>
          </div>
          {loading && <span className="inline-block w-2 h-4 bg-cyan-500 dark:bg-cyan-400 animate-pulse ml-1 align-middle" />}
        </div>
      )}
      {curSrc.length > 0 && (
        <details className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-transparent rounded-xl p-4 mb-6">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">Sources ({curSrc.length})</summary>
          <div className="mt-3 space-y-2">
            {curSrc.map((s: any, i: number) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-cyan-600 dark:text-cyan-400 font-medium">{s.file}</span>
                  <span className="text-gray-500">#{s.chunk_index}</span>
                  {s.score != null && <span className="text-green-500 dark:text-green-400 ml-auto">{(s.score * 100).toFixed(0)}%</span>}
                </div>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{s.text?.slice(0, 200)}</p>
              </div>
            ))}
          </div>
        </details>
      )}
      {hist.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">History</h2>
          {hist.slice(0, 10).map((h, i) => (
            <details key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{h.mode}</span>
                {h.q}
              </summary>
              <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.a}</ReactMarkdown>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
