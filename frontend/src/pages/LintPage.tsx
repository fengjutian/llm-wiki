import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { LintReport, LintIssue } from '../api/types'

type FilterKey = 'all' | 'critical' | 'warning' | 'info'
type GroupKey = 'severity' | 'type' | 'none'
type SortKey = 'severity' | 'type' | 'pages'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 }
const SEVERITY_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: '严重', color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-300 dark:border-red-800',     dot: 'bg-red-500' },
  warning:  { label: '警告', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  info:     { label: '提示', color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/20',   border: 'border-blue-300 dark:border-blue-800',   dot: 'bg-blue-500' },
}
const SCORE_META: Record<string, { label: string; color: string; ring: string; gradient: string }> = {
  A: { label: '完美状态',   color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800', gradient: 'from-emerald-400 to-cyan-400' },
  B: { label: '基本健康',   color: 'text-cyan-600 dark:text-cyan-400',       ring: 'ring-cyan-200 dark:ring-cyan-800',       gradient: 'from-cyan-400 to-blue-400' },
  C: { label: '需要注意',   color: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-200 dark:ring-amber-800',     gradient: 'from-amber-400 to-orange-400' },
  D: { label: '问题较多',   color: 'text-orange-600 dark:text-orange-400',   ring: 'ring-orange-200 dark:ring-orange-800',   gradient: 'from-orange-400 to-red-400' },
  F: { label: '需立即修复', color: 'text-red-600 dark:text-red-400',         ring: 'ring-red-200 dark:ring-red-800',         gradient: 'from-red-500 to-pink-500' },
}

export default function LintPage() {
  const [report, setReport] = useState<LintReport | null>(null)
  const [running, setRunning] = useState(false)
  const [autoFix, setAutoFix] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [groupBy, setGroupBy] = useState<GroupKey>('severity')
  const [sortBy, setSortBy] = useState<SortKey>('severity')
  const [search, setSearch] = useState('')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('lint_last_result')
      if (stored) setReport(JSON.parse(stored))
    } catch {}
  }, [])

  const runLint = async () => {
    setRunning(true); setError(''); setSelectedIdx(null)
    try {
      const res = await api.post<{ task_id: string }>('/api/wiki/lint', { async: true, auto_fix: autoFix })
      const taskId = res.task_id
      sessionStorage.setItem('lint_pending_task', JSON.stringify({ taskId, autoFix }))
      const poll = setInterval(async () => {
        try {
          const status = await api.get<{ status: string; result?: LintReport; error?: string }>(`/api/wiki/lint/status/${taskId}`)
          if (status.status === 'done' && status.result) {
            clearInterval(poll)
            sessionStorage.removeItem('lint_pending_task')
            sessionStorage.setItem('lint_last_result', JSON.stringify(status.result))
            setReport(status.result)
            setRunning(false)
            window.dispatchEvent(new CustomEvent('lint-done', { detail: status.result }))
          } else if (status.status === 'error') {
            clearInterval(poll)
            sessionStorage.removeItem('lint_pending_task')
            setError(status.error || 'Lint failed')
            setRunning(false)
          }
        } catch {
          // network blip — keep polling
        }
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start lint')
      setRunning(false)
    }
  }

  const counts = useMemo(() => {
    const issues = report?.issues || []
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      warning:  issues.filter(i => i.severity === 'warning').length,
      info:     issues.filter(i => i.severity === 'info').length,
      total:    issues.length,
    }
  }, [report])

  const filtered = useMemo(() => {
    const issues = report?.issues || []
    let list = issues.slice()
    if (filter !== 'all') list = list.filter(i => i.severity === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        (i.type || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.suggestion || '').toLowerCase().includes(q) ||
        (i.affected_pages || []).some(p => p.toLowerCase().includes(q))
      )
    }
    list.sort((a, b) => {
      if (sortBy === 'severity') return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      if (sortBy === 'type')     return (a.type || '').localeCompare(b.type || '')
      if (sortBy === 'pages')    return (b.affected_pages?.length || 0) - (a.affected_pages?.length || 0)
      return 0
    })
    return list
  }, [report, filter, search, sortBy])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '所有问题', items: filtered }]
    if (groupBy === 'severity') {
      const order: FilterKey[] = ['critical', 'warning', 'info']
      return order
        .filter(s => filtered.some(i => i.severity === s))
        .map(s => ({ key: s, label: SEVERITY_META[s].label, items: filtered.filter(i => i.severity === s) }))
    }
    // type
    const map = new Map<string, LintIssue[]>()
    filtered.forEach(i => {
      const k = i.type || 'unknown'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(i)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, items]) => ({ key: k, label: k, items }))
  }, [filtered, groupBy])

  const selected = selectedIdx !== null ? report?.issues?.[selectedIdx] : null

  return (
    <div className="flex flex-col h-full -m-6">
      {/* ===== Action bar ===== */}
      <div className="px-6 pt-6 pb-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">🔍 Lint 仪表盘</h1>
        <span className="text-xs text-gray-500 dark:text-gray-400">结构检查 + LLM 语义分析</span>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input type="checkbox" checked={autoFix} onChange={e => setAutoFix(e.target.checked)}
            className="accent-cyan-500" />
          <span>自动修复</span>
        </label>
        <button onClick={runLint} disabled={running}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white shadow-sm">
          {running ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              检查中…
            </span>
          ) : '🔍 运行健康检查'}
        </button>
      </div>

      {error && (
        <div className="mx-6 mb-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* ===== Empty / loading state ===== */}
      {!report && !running && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
          <div className="text-6xl">🩺</div>
          <p className="text-base">点击「运行健康检查」开始</p>
          <p className="text-xs">检查时会切换其他页面，完成后会自动通知</p>
        </div>
      )}

      {!report && running && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-200 dark:border-cyan-900 border-t-cyan-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">{autoFix ? '正在检查并自动修复…' : '正在运行健康检查…'}</h3>
            <p className="text-sm text-gray-500">LLM 语义分析 + 图谱结构检查，预计 30–60 秒</p>
          </div>
        </div>
      )}

      {/* ===== Report ===== */}
      {report && (
        <>
          {/* Dashboard row */}
          <div className="px-6 pb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <ScoreCard score={report.health_score} summary={report.summary} />
            <StatsCard stats={(report as any).stats} />
            <CountsCard counts={counts} />
          </div>

          {/* Toolbar */}
          <div className="px-6 pb-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="🔎 搜索问题（描述 / 类型 / 页面名）"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-cyan-500" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/60">
                <Chip active={filter === 'all'}      onClick={() => setFilter('all')}      dot="bg-gray-400"   label="全部" count={counts.total} />
                <Chip active={filter === 'critical'} onClick={() => setFilter('critical')} dot="bg-red-500"    label="严重" count={counts.critical} />
                <Chip active={filter === 'warning'}  onClick={() => setFilter('warning')}  dot="bg-amber-500"  label="警告" count={counts.warning} />
                <Chip active={filter === 'info'}     onClick={() => setFilter('info')}     dot="bg-blue-500"   label="提示" count={counts.info} />
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span>显示 <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> / {counts.total} 个</span>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <Group label="分组" value={groupBy} onChange={setGroupBy} options={[
                { v: 'severity', l: '严重度' }, { v: 'type', l: '类型' }, { v: 'none', l: '平铺' }
              ]} />
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <Group label="排序" value={sortBy} onChange={setSortBy} options={[
                { v: 'severity', l: '严重度' }, { v: 'type', l: '类型' }, { v: 'pages', l: '页数' }
              ]} />
            </div>
          </div>

          {/* Two-pane body */}
          <div className="flex-1 min-h-0 px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="text-5xl">🎉</div>
                <p>没有匹配的问题</p>
                {counts.total === 0 && <p className="text-xs">Wiki 完全健康</p>}
              </div>
            ) : (
              <div className="h-full grid grid-cols-1 lg:grid-cols-5 gap-3 min-h-0">
                {/* Issues list (scrollable) */}
                <div className="lg:col-span-3 min-h-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/40">
                    <span className="text-sm font-semibold">📋 问题列表</span>
                    <span className="text-xs text-gray-500">{filtered.length} 项</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
                    {grouped.map(g => (
                      <div key={g.key}>
                        {groupBy !== 'none' && (
                          <div className="flex items-center gap-2 px-2 pt-2 pb-1.5 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-10">
                            <span className={`w-2 h-2 rounded-full ${SEVERITY_META[g.key]?.dot || 'bg-gray-400'}`} />
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">{g.label}</span>
                            <span className="text-xs text-gray-400">{g.items.length}</span>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {g.items.map((i, localIdx) => {
                            const realIdx = (report.issues || []).indexOf(i)
                            const sev = i.severity || 'info'
                            const meta = SEVERITY_META[sev]
                            return (
                              <button key={localIdx} onClick={() => setSelectedIdx(realIdx)}
                                className={`w-full text-left rounded-lg border p-3 transition-all ${meta.border} ${meta.bg} hover:shadow-sm ${
                                  selectedIdx === realIdx
                                    ? 'ring-2 ring-cyan-500 border-cyan-400 shadow-sm'
                                    : 'hover:border-cyan-300 dark:hover:border-cyan-700'
                                }`}>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text