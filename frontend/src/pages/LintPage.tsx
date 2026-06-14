import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { LintReport, LintIssue } from '../api/types'

type FilterKey = 'all' | 'critical' | 'warning' | 'info'
type GroupKey = 'severity' | 'type' | 'none'
type SortKey = 'severity' | 'type' | 'pages'

const STORAGE_KEYS = {
  lastResult: 'lint_last_result',
  pendingTask: 'lint_pending_task',
  preferences: 'lint_preferences',
} as const

interface LintPreferences {
  autoFix: boolean
  filter: FilterKey
  groupBy: GroupKey
  sortBy: SortKey
  search: string
}

function loadPreferences(): LintPreferences {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.preferences)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { autoFix: false, filter: 'all', groupBy: 'severity', sortBy: 'severity', search: '' }
}

function savePreferences(prefs: LintPreferences) {
  try { sessionStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(prefs)) } catch {}
}

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
  const savedPrefs = loadPreferences()
  const [report, setReport] = useState<LintReport | null>(null)
  const [running, setRunning] = useState(false)
  const [autoFix, setAutoFix] = useState(savedPrefs.autoFix)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterKey>(savedPrefs.filter)
  const [groupBy, setGroupBy] = useState<GroupKey>(savedPrefs.groupBy)
  const [sortBy, setSortBy] = useState<SortKey>(savedPrefs.sortBy)
  const [search, setSearch] = useState(savedPrefs.search)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Restore last lint result
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.lastResult)
      if (stored) setReport(JSON.parse(stored))
    } catch {}
  }, [])

  // Persist preferences when they change
  useEffect(() => {
    savePreferences({ autoFix, filter, groupBy, sortBy, search })
  }, [autoFix, filter, groupBy, sortBy, search])

  const runLint = async () => {
    setRunning(true); setError(''); setSelectedIdx(null)
    try {
      const res = await api.post<{ task_id: string }>('/api/wiki/lint', { async: true, auto_fix: autoFix })
      const taskId = res.task_id
      sessionStorage.setItem(STORAGE_KEYS.pendingTask, JSON.stringify({ taskId, autoFix }))
      const poll = setInterval(async () => {
        try {
          const status = await api.get<{ status: string; result?: LintReport; error?: string }>(`/api/wiki/lint/status/${taskId}`)
          if (status.status === 'done' && status.result) {
            clearInterval(poll)
            sessionStorage.removeItem(STORAGE_KEYS.pendingTask)
            sessionStorage.setItem(STORAGE_KEYS.lastResult, JSON.stringify(status.result))
            setReport(status.result)
            setRunning(false)
            window.dispatchEvent(new CustomEvent('lint-done', { detail: status.result }))
          } else if (status.status === 'error') {
            clearInterval(poll)
            sessionStorage.removeItem(STORAGE_KEYS.pendingTask)
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
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${meta.color} bg-white/40 dark:bg-black/20 border ${meta.border}`}>
                                    {i.type || 'unknown'}
                                  </span>
                                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${meta.color}`}>
                                    {meta.label}
                                  </span>
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    · 影响 {(i.affected_pages?.length ?? 0)} 页
                                  </span>
                                </div>
                                <div className={`text-sm ${meta.color} line-clamp-2`}>
                                  {i.description || ''}
                                </div>
                                {i.suggestion && (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                    💡 {i.suggestion}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Issue detail (right pane) */}
                <div className="lg:col-span-2 min-h-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  {selected ? (
                    <>
                      <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/40">
                        <span className="text-sm font-semibold">📝 问题详情</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_META[selected.severity || 'info'].color} ${SEVERITY_META[selected.severity || 'info'].bg} border ${SEVERITY_META[selected.severity || 'info'].border}`}>
                          {SEVERITY_META[selected.severity || 'info'].label}
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">类型</div>
                          <div className="font-mono">{selected.type || 'unknown'}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">描述</div>
                          <div className="whitespace-pre-wrap">{selected.description || ''}</div>
                        </div>
                        {selected.suggestion && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">修复建议</div>
                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{selected.suggestion}</div>
                          </div>
                        )}
                        {(selected.affected_pages?.length ?? 0) > 0 && (
                          <div>
                            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">受影响的页面 ({selected.affected_pages!.length})</div>
                            <ul className="space-y-1">
                              {selected.affected_pages!.map((p, idx) => (
                                <li key={idx} className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/60 text-xs font-mono break-all">{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-2 p-6">
                      <div className="text-4xl">👈</div>
                      <p className="text-sm">选择左侧问题查看详情</p>
                                        </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function ScoreCard({ score, summary }: { score: string; summary: any }) {
  const meta = SCORE_META[score] || SCORE_META.F
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-4 ${meta.ring}`}>
      <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
        {score || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${meta.color}`}>{meta.label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {summary?.total_issues ?? 0} 个问题 · {summary?.pages_scanned ?? 0} 页扫描
        </div>
        {summary?.top_category && (
          <div className="text-[11px] text-gray-400 mt-0.5">
            主要类型：<span className="font-mono">{summary.top_category}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatsCard({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm text-gray-500">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">统计</div>
        <div>暂无数据</div>
      </div>
    )
  }
  const entries = Object.entries(stats).slice(0, 4)
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">📊 统计</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400 truncate">{k}</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CountsCard({ counts }: { counts: { critical: number; warning: number; info: number; total: number } }) {
  const items: { key: keyof typeof SEVERITY_META; meta: typeof SEVERITY_META[keyof typeof SEVERITY_META]; value: number }[] = [
    { key: 'critical', meta: SEVERITY_META.critical, value: counts.critical },
    { key: 'warning',  meta: SEVERITY_META.warning,  value: counts.warning },
    { key: 'info',     meta: SEVERITY_META.info,     value: counts.info },
  ]
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">🔢 问题计数</div>
      <div className="flex items-center gap-3">
        {items.map(({ key, meta, value }) => (
          <div key={key} className="flex-1 text-center">
            <div className={`text-2xl font-bold ${meta.color}`}>{value}</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{meta.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Chip({ active, onClick, dot, label, count }: {
  active: boolean; onClick: () => void; dot: string; label: string; count: number
}) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
      active
        ? 'bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className={`px-1 rounded text-[10px] font-mono ${active ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' : 'bg-gray-200/60 dark:bg-gray-700/60 text-gray-500'}`}>
        {count}
      </span>
    </button>
  )
}

function Group<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { v: T; l: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}：</span>
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
          value === o.v
            ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-semibold'
            : 'hover:bg-gray-200/60 dark:hover:bg-gray-700/60'
        }`}>
          {o.l}
        </button>
      ))}
    </div>
  )
}