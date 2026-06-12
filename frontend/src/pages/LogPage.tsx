import { useState, useEffect } from 'react'
import { api } from '../api/client'

interface LogEntry { timestamp: string; operation: string; title: string; branch: string; details: string }

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get<{entries:LogEntry[]}>('/api/wiki/log').then(d => setEntries(d.entries||[]))
  }, [])

  const filtered = entries.filter(e => !filter || e.operation.includes(filter) || e.title.includes(filter) || e.details?.includes(filter))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Operation Log</h1>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter..."
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:border-cyan-500"/>
      <div className="space-y-1">
        {filtered.slice(0, 100).map((e,i) => (
          <div key={i} className="bg-gray-900 rounded-lg px-4 py-3 text-sm flex items-start gap-4">
            <span className="text-xs text-gray-500 w-36 shrink-0">{e.timestamp}</span>
            <span className="font-semibold text-cyan-400 w-32 shrink-0">{e.operation}</span>
            <span className="flex-1 truncate">{e.title}</span>
            <span className="text-xs text-gray-500">{e.branch}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
