import { useMemo } from 'react'
import type { GraphFilters, GraphFilterOptions, GraphData } from '../api/types'

/* ====================================================================
   helpers
   ==================================================================== */

/** Derive available filter options from graph data. */
export function extractFilterOptions(data: GraphData): GraphFilterOptions {
  const pageTypeSet = new Set<string>()
  const statusSet = new Set<string>()
  const confidenceSet = new Set<string>()
  const relationTypeSet = new Set<string>()
  let inMin = Infinity, inMax = -Infinity
  let outMin = Infinity, outMax = -Infinity

  for (const n of data.nodes) {
    if (n.page_type) pageTypeSet.add(n.page_type)
    if (n.status) statusSet.add(n.status)
    if (n.confidence) confidenceSet.add(n.confidence)
    if (n.in_degree < inMin) inMin = n.in_degree
    if (n.in_degree > inMax) inMax = n.in_degree
    if (n.out_degree < outMin) outMin = n.out_degree
    if (n.out_degree > outMax) outMax = n.out_degree
  }
  for (const e of data.edges) {
    if (e.relation_type) relationTypeSet.add(e.relation_type)
  }

  if (!isFinite(inMin)) { inMin = 0; inMax = 0 }
  if (!isFinite(outMin)) { outMin = 0; outMax = 0 }

  return {
    pageTypes: [...pageTypeSet].sort(),
    statuses: [...statusSet].sort(),
    confidences: [...confidenceSet].sort(),
    relationTypes: [...relationTypeSet].sort(),
    inDegreeRange: [inMin, inMax],
    outDegreeRange: [outMin, outMax],
  }
}

/** Apply filters to graph data. Returns filtered nodes and edges. */
export function applyFilters(
  data: GraphData,
  filters: GraphFilters
): { nodes: GraphData['nodes']; edges: GraphData['edges'] } {
  const hasPageType = filters.pageTypes.length > 0
  const hasStatus = filters.statuses.length > 0
  const hasConfidence = filters.confidences.length > 0
  const hasRelation = filters.relationTypes.length > 0
  const hasSearch = filters.search.trim().length > 0

  const searchLower = hasSearch ? filters.search.toLowerCase() : ''

  const filteredNodes = data.nodes.filter((n) => {
    if (hasSearch && !n.title.toLowerCase().includes(searchLower)) return false
    if (hasPageType && !filters.pageTypes.includes(n.page_type)) return false
    if (hasStatus && !filters.statuses.includes(n.status)) return false
    if (hasConfidence && !filters.confidences.includes(n.confidence)) return false
    if (n.in_degree < filters.inDegreeMin || n.in_degree > filters.inDegreeMax) return false
    if (n.out_degree < filters.outDegreeMin || n.out_degree > filters.outDegreeMax) return false
    // orphansOnly: only keep nodes with in_degree === 0
    if (filters.orphansOnly && n.in_degree !== 0) return false
    return true
  })

  const nodeIds = new Set(filteredNodes.map((n) => n.id))

  const filteredEdges = data.edges.filter((e) => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false
    if (hasRelation && !filters.relationTypes.includes(e.relation_type)) return false
    return true
  })

  return { nodes: filteredNodes, edges: filteredEdges }
}

/* ====================================================================
   label helpers
   ==================================================================== */

const PAGE_TYPE_LABELS: Record<string, string> = {
  entity: '实体', concept: '概念', source_summary: '源摘要', overview: '综述', comparison: '对比',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿', active: '活跃', stale: '陈旧', contradicted: '冲突', archived: '归档',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: '高', medium: '中', low: '低',
}

const RELATION_LABELS: Record<string, string> = {
  references: '引用', supports: '支持', contradicts: '矛盾', extends: '扩展', supersedes: '取代',
}

/* ====================================================================
   component
   ==================================================================== */

interface Props {
  filters: GraphFilters
  options: GraphFilterOptions
  onChange: (next: GraphFilters) => void
  resultCount: { nodes: number; edges: number }
  totalCount: { nodes: number; edges: number }
}

export default function GraphFilterBar({ filters, options, onChange, resultCount, totalCount }: Props) {
  const anyActive =
    filters.pageTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.confidences.length > 0 ||
    filters.relationTypes.length > 0 ||
    filters.search.trim().length > 0 ||
    filters.inDegreeMin > options.inDegreeRange[0] ||
    filters.inDegreeMax < options.inDegreeRange[1] ||
    filters.outDegreeMin > options.outDegreeRange[0] ||
    filters.outDegreeMax < options.outDegreeRange[1] ||
    filters.orphansOnly

  const activeLabel = useMemo(() => {
    const parts: string[] = []
    if (filters.search.trim()) parts.push(`搜索: "${filters.search}"`)
    if (filters.pageTypes.length) parts.push(`类型: ${filters.pageTypes.map((v) => PAGE_TYPE_LABELS[v] || v).join(', ')}`)
    if (filters.statuses.length) parts.push(`状态: ${filters.statuses.map((v) => STATUS_LABELS[v] || v).join(', ')}`)
    if (filters.confidences.length) parts.push(`置信: ${filters.confidences.map((v) => CONFIDENCE_LABELS[v] || v).join(', ')}`)
    if (filters.relationTypes.length) parts.push(`关系: ${filters.relationTypes.map((v) => RELATION_LABELS[v] || v).join(', ')}`)
    if (filters.inDegreeMin > options.inDegreeRange[0] || filters.inDegreeMax < options.inDegreeRange[1])
      parts.push(`入度: ${filters.inDegreeMin}–${filters.inDegreeMax}`)
    if (filters.outDegreeMin > options.outDegreeRange[0] || filters.outDegreeMax < options.outDegreeRange[1])
      parts.push(`出度: ${filters.outDegreeMin}–${filters.outDegreeMax}`)
    if (filters.orphansOnly) parts.push('仅孤立节点')
    return parts.join('  ·  ')
  }, [filters, options])

  /* helper to produce a chip-toggler button */
  const Chip = (
    key: string,
    label: string,
    active: boolean,
    onClick: () => void,
    activeClass = 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-200',
  ) => (
    <button
      key={key}
      onClick={onClick}
      className={`px-2 py-0.5 rounded text-xs border transition-colors ${active
        ? activeClass
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  )

  /* reset to initial state */
  const reset = () =>
    onChange({
      search: '',
      pageTypes: [],
      statuses: [],
      confidences: [],
      relationTypes: [],
      inDegreeMin: options.inDegreeRange[0],
      inDegreeMax: options.inDegreeRange[1],
      outDegreeMin: options.outDegreeRange[0],
      outDegreeMax: options.outDegreeRange[1],
      orphansOnly: false,
    })

  return (
    <div className="space-y-2 text-sm select-none">

      {/* ── Row 1: search + page type ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="搜索节点标题..."
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 w-48"
        />

        {options.pageTypes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">类型</span>
            {options.pageTypes.map((pt) =>
              Chip(pt, PAGE_TYPE_LABELS[pt] || pt, filters.pageTypes.includes(pt), () =>
                onChange({
                  ...filters,
                  pageTypes: filters.pageTypes.includes(pt)
                    ? filters.pageTypes.filter((v) => v !== pt)
                    : [...filters.pageTypes, pt],
                }),
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Row 2: status + confidence + relation ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {options.statuses.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">状态</span>
            {options.statuses.map((st) =>
              Chip(st, STATUS_LABELS[st] || st, filters.statuses.includes(st), () =>
                onChange({
                  ...filters,
                  statuses: filters.statuses.includes(st)
                    ? filters.statuses.filter((v) => v !== st)
                    : [...filters.statuses, st],
                }),
              ),
            )}
          </div>
        )}

        {options.confidences.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">置信</span>
            {options.confidences.map((cf) =>
              Chip(cf, CONFIDENCE_LABELS[cf] || cf, filters.confidences.includes(cf), () =>
                onChange({
                  ...filters,
                  confidences: filters.confidences.includes(cf)
                    ? filters.confidences.filter((v) => v !== cf)
                    : [...filters.confidences, cf],
                }),
                'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200',
              ),
            )}
          </div>
        )}

        {options.relationTypes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">关系</span>
            {options.relationTypes.map((rt) =>
              Chip(rt, RELATION_LABELS[rt] || rt, filters.relationTypes.includes(rt), () =>
                onChange({
                  ...filters,
                  relationTypes: filters.relationTypes.includes(rt)
                    ? filters.relationTypes.filter((v) => v !== rt)
                    : [...filters.relationTypes, rt],
                }),
                'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 text-purple-800 dark:text-purple-200',
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Row 3: degree ranges + orphans ── */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* In-degree range */}
        {options.inDegreeRange[0] < options.inDegreeRange[1] && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">入度</span>
            <input
              type="number"
              min={options.inDegreeRange[0]}
              max={filters.inDegreeMax}
              value={filters.inDegreeMin}
              onChange={(e) => {
                const v = Math.max(options.inDegreeRange[0], Math.min(Number(e.target.value), filters.inDegreeMax))
                onChange({ ...filters, inDegreeMin: v })
              }}
              className="w-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="number"
              min={filters.inDegreeMin}
              max={options.inDegreeRange[1]}
              value={filters.inDegreeMax}
              onChange={(e) => {
                const v = Math.max(filters.inDegreeMin, Math.min(Number(e.target.value), options.inDegreeRange[1]))
                onChange({ ...filters, inDegreeMax: v })
              }}
              className="w-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Out-degree range */}
        {options.outDegreeRange[0] < options.outDegreeRange[1] && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">出度</span>
            <input
              type="number"
              min={options.outDegreeRange[0]}
              max={filters.outDegreeMax}
              value={filters.outDegreeMin}
              onChange={(e) => {
                const v = Math.max(options.outDegreeRange[0], Math.min(Number(e.target.value), filters.outDegreeMax))
                onChange({ ...filters, outDegreeMin: v })
              }}
              className="w-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="number"
              min={filters.outDegreeMin}
              max={options.outDegreeRange[1]}
              value={filters.outDegreeMax}
              onChange={(e) => {
                const v = Math.max(filters.outDegreeMin, Math.min(Number(e.target.value), options.outDegreeRange[1]))
                onChange({ ...filters, outDegreeMax: v })
              }}
              className="w-14 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Orphans toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.orphansOnly}
            onChange={(e) => onChange({ ...filters, orphansOnly: e.target.checked })}
            className="accent-cyan-500"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">仅孤立节点</span>
        </label>
      </div>

      {/* ── Active summary + reset ── */}
      {anyActive && (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate max-w-lg">{activeLabel}</span>
          <button onClick={reset} className="text-cyan-600 dark:text-cyan-400 hover:underline shrink-0">
            重置筛选
          </button>
        </div>
      )}
    </div>
  )
}
