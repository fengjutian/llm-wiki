import { useState, FormEvent } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useSSE } from "../hooks/useSSE"
import { api } from "../api/client"
type Mode = "wiki" | "rag" | "hybrid"
export default function QueryPage() {
  const [q, setQ] = useState("")
  const [mode, setMode] = useState<Mode>("wiki")
  const [hist, setHist] = useState<any[]>([])
  const sse = useSSE("/api/wiki/query/stream")
  const [ra, setRa] = useState("")
  const [rs, setRs] = useState<any[]>([])
  const [rl, setRl] = useState(false)
  const handle = async (e: FormEvent) => {
    e.preventDefault(); if (!q.trim()) return
    const qq = q; setQ("")
    if (mode === "wiki") { setHist(p => [{ q: qq, a: "", mode: "wiki" }, ...p]); sse.start({ question: qq }) }
    else {
      setRa(""); setRs([]); setRl(true)
      try {
        const ep = mode === "rag" ? "/api/rag/query" : "/api/rag/query/hybrid"
        const r = await api.post<any>(ep, { question: qq, top_k: 5 })
        setRa(r.answer); setRs(r.sources || r.rag_sources || [])
        setHist(p => [{ q: qq, a: r.answer, mode, sources: r.sources || r.rag_sources }, ...p])
      } catch (e: any) { setRa("Error: " + (e.message || "failed")) }
      finally { setRl(false) }
    }
  }
  const cur = mode === "wiki" ? sse.text : ra
  const curSrc = mode === "wiki" ? [] : rs
  const loading = mode === "wiki" ? (!sse.done && !!sse.text) : rl
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
      {sse.error && <div className="text-red-500 dark:text-red-400 text-sm mb-4">Error: {sse.error}</div>}
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
