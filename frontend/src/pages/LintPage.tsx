import { useState } from 'react'
import { api } from '../api/client'
import type { LintReport, LintIssue } from '../api/types'

export default function LintPage() {
  const [report, setReport] = useState<LintReport | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const runLint = async () => {
    setRunning(true); setError('')
    try {
      const res = await api.post<{task_id:string}>('/api/wiki/lint', {async: true})
      const taskId = res.task_id
      const poll = setInterval(async () => {
        const status = await api.get<{status:string;result:LintReport}>(`/api/wiki/lint/status/${taskId}`)
        if (status.status === 'done') { clearInterval(poll); setReport(status.result); setRunning(false) }
        else if (status.status === 'error') { clearInterval(poll); setError('Lint failed'); setRunning(false) }
      }, 2000)
    } catch { setError('Failed to start lint'); setRunning(false) }
  }

  const severityColor = (s: string) => s === 'critical' ? 'text-red-500 dark:text-red-400' : s === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-500 dark:text-blue-400'

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Wiki Lint</h1>
        <button onClick={runLint} disabled={running}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-semibold">
          {running ? 'Running...' : 'Run Lint'}
        </button>
      </div>
      {error && <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>}
      {report && (
        <div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-4 flex items-center gap-4">
            <span className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">{report.health_score}</span>
            <div><div className="font-semibold">Health Score</div><div className="text-sm text-gray-600 dark:text-gray-400">{report.summary}</div></div>
          </div>
          <div className="space-y-2">
            {report.issues?.map((i: LintIssue, idx: number) => (
              <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase ${severityColor(i.severity)}`}>{i.severity}</span>
                  <span className="text-xs text-gray-500">{i.type}</span>
                </div>
                <p className="text-sm">{i.description}</p>
                {i.affected_pages?.length > 0 && <p className="text-xs text-gray-500 mt-1">Pages: {i.affected_pages.join(', ')}</p>}
                {i.suggestion && <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">Suggestion: {i.suggestion}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
