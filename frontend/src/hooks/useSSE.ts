import { useState, useRef, useCallback } from 'react'

export function useSSE(url: string) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const start = useCallback((body: Record<string, unknown>) => {
    setText('')
    setDone(false)
    setError(null)
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No body')
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText((prev) => prev + decoder.decode(value, { stream: true }))
        }
      })
      .then(() => setDone(true))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
  }, [url])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  return { text, done, error, start, stop }
}
