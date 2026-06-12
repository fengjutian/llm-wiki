import { useState, useEffect } from 'react'

export default function HealthBadge() {
  const [status, setStatus] = useState<string>('...')
  useEffect(() => {
    fetch('/api/graph/stats')
      .then((r) => r.json())
      .then((d) => setStatus(`${d.nodes}p ${d.edges}l`))
      .catch(() => setStatus('offline'))
  }, [])
  return (
    <div className="text-xs text-gray-500 text-center">
      {status === 'offline' ? '⚪ Offline' : `📊 ${status}`}
    </div>
  )
}
