import { useState, FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSSE } from '../hooks/useSSE'

export default function QueryPage() {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<{ q: string; a: string }[]>([])
  const { text, done, error, start, stop } = useSSE('/api/wiki/query/stream')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    setHistory((prev) => [{ q: question, a: '' }, ...prev])
    start({ question })
    setQuestion('')
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Ask the Wiki</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the wiki..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-semibold"
        >
          Send
        </button>
      </form>

      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      {/* Current answer streaming */}
      {text && (
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
          {!done && (
            <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse ml-1 align-middle" />
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">History</h2>
          {history.map((h, i) => (
            <details key={i} className="bg-gray-900 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-200">{h.q}</summary>
              <div className="mt-3 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.a}</ReactMarkdown>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
