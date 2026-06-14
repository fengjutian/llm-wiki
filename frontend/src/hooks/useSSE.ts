import { useState, useRef, useCallback } from 'react'

interface SSEResult {
  text: string
  done: boolean
  error: string | null
  sources: any[]
  wikiSources: string[]
  start: (body: Record<string, unknown>) => void
  stop: () => void
}

/**
 * Generic SSE hook that parses ``data:`` lines from a POST-based
 * streaming endpoint and handles sentinel markers:
 *
 * - ``[DONE]``  鈫?sets *done* to true
 * - ``[ERROR] ...``  鈫?captures the error message
 * - ``JSON array of objects``  鈫?captured as *sources* (RAG chunks)
 * - ``{"wiki_sources": [...], "rag_sources": [...]}``  鈫?captured as
 *   *wikiSources* / *sources*
 */
export function useSSE(url: string): SSEResult {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<any[]>([])
  const [wikiSources, setWikiSources] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback((body: Record<string, unknown>) => {
    // Reset state
    setText('')
    setDone(false)
    setError(null)
    setSources([])
    setWikiSources([])
    abortRef.current?.abort()

    const controller = new AbortController()
    abortRef.current = controller

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text().catch(() => res.statusText)
          throw new Error(`HTTP ${res.status}: ${msg}`)
        }
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No body')
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          // Process complete SSE events (each ends with \n\n)
          const parts = buffer.split('\n\n')
          // Keep the last (possibly incomplete) segment in buffer
          buffer = parts.pop() || ''
          for (const part of parts) {
            if (!part.trim()) continue
            // Extract data lines: each is "data: <content>"
            const lines = part.split('\n')
            const payloadLines: string[] = []
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                payloadLines.push(line.slice(6))
              } else if (line.startsWith('data:')) {
                payloadLines.push(line.slice(5))
              }
            }
            const payload = payloadLines.join('\n')

            // Sentinel markers
            if (payload === '[DONE]') {
              // Finalize - any remaining buffer is ignored
              buffer = ''
              continue
            }
            if (payload.startsWith('[ERROR]')) {
              setError(payload.slice(7).trim())
              continue
            }
            // Try to parse as sources JSON
            const trimmed = payload.trim()
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const obj = JSON.parse(trimmed)
                if (Array.isArray(obj)) {
                  // RAG sources array
                  setSources(obj)
                  continue
                }
                if (obj.wiki_sources !== undefined || obj.rag_sources !== undefined) {
                  // Hybrid metadata
                  setWikiSources(obj.wiki_sources || [])
                  setSources(obj.rag_sources || [])
                  continue
                }
              } catch {
                // Not valid JSON 鈥?treat as text
              }
            }
            // Regular text content
            if (payload) {
              setText((prev) => prev + payload)
            }
          }
        }
      })
      .then(() => setDone(true))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
  }, [url])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { text, done, error, sources, wikiSources, start, stop }
}
