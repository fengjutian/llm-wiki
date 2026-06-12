import { useMemo } from 'react'
import type { GraphFilters, GraphFilterOptions, GraphData } from '../api/types'

/** Derive available filter options from graph data. */
export function extractFilterOptions(data: GraphData): GraphFilterOptions {
  const pageTypeSet = new Set<string>()
  const statusSet = new Set<string>()
  const relationTypeSet = new Set<string>()
  for (const n of data.nodes) {
    if (n.page_type) pageTypeSet.add(n.page_type)
    if (n.status) statusSet.add(n.status)
  }
  for (const e of data.edges) {
    if (e.relation_type) relationTypeSet.add(e.relation_type)
  }
  return {
    pageTypes: [...pageTypeSet].sort(),
    statuses: [...statusSet].sort(),
    relationTypes: [...relationTypeSet].sort(),
  }
}

/** Apply filters to graph data. Returns filtered nodes and edges. */
export function applyFilters(
  data: GraphData,
  filters: GraphFilters
): { nodes: GraphData['nodes']; edges: GraphData['edges'] } {
  const hasPageType = filters.pageTypes.length > 0
  const hasStatus = filters.statuses.length > 0
  const hasRelation = filters.relationTypes.length > 0
  const hasSearch = filters.search.trim().length > 0

  const searchLower = hasSearch ? filters.search.toLowerCase() : ''

  const filteredNodes = data.nodes.filter((n) => {
    if (hasSearch && !n.title.toLowerCase().includes(searchLower)) return false
    if (hasPageType && !filters.pageTypes.includes(n.page_type)) return false
    if (hasStatus && !filters.statuses.includes(n.status)) return false
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

/* ---------- label helpers ---------- */

const PAGE_TYPE_LABELS: Record<string, string> = {
  entity: '实体',
  concept: '概念',
  source_summary: '源摘要',
  overview: '综述',
  comparison: '对比',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '活跃',
  stale: '陈旧',
  contradicted: '冲突',
  archived: '归档',
}

const RELATION_LABELS: Record<string, string> = {
  references: '引用',
  supports: '支持',
  contradicts: '矛盾',
  extends: '扩展',
  supersedes: '取代',
}

/* ---------- component ---------- */

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
    filters.relationTypes.length > 0 ||
    filters.search.trim().length > 0

  const activeLabel = useMemo(() => {
    const parts: string[] = []
    if (filters.search.trim()) parts.push(`搜索: "${filters.search}"`)
    if (filters.pageTypes.length) parts.push(`类型: ${filters.pageTypes.map((v) => PAGE_TYPE_LABELS[v] || v).join(', ')}`)
    if (filters.statuses.length) parts.push(`状态: ${filters.statuses.map((v) => STATUS_LABELS[v] || v).join(', ')}`)
    if (filters.relationTypes.length) parts.push(`关系: ${filters.relationTypes.map((v) => RELATION_LABELS[v] || v).join(', ')}`)
    return parts.join('  ·  ')
  }, [filters])

  return (
    <div className="space-y-2 text-sm select-none">
      {/* Search row */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="搜索节点标题..."
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 w-48"
        />

        {/* Page type chips */}
        {options.pageTypes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">类型</span>
            {options.pageTypes.map((pt) => {
              const active = filters.pageTypes.includes(pt)
              return (
                <button
                  key={pt}
                  onClick={() =>
                    onChange({
                      ...filters,
                      pageTypes: active ? filters.pageTypes.filter((v) => v !== pt) : [...filters.pageTypes, pt],
                    })
                  }
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                    active
                      ? 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-200'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {PAGE_TYPE_LABELS[pt] || pt}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Status + Relation chips row */}
      <div className="flex items-center gap-3 flex-wrap">
        {options.statuses.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">状态</span>
            {options.statuses.map((st) => {
              const active = filters.statuses.includes(st)
              return (
                <button
                  key={st}
                  onClick={() =>
                    onChange({
                      ...filters,
                      statuses: active ? filters.statuses.filter((v) => v !== st) : [...filters.statuses, st],
                    })
                  }
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                    active
                      ? 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-200'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {STATUS_LABELS[st] || st}
                </button>
              )
            })}
          </div>
        )}

        {options.relationTypes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">关系</span>
            {options.relationTypes.map((rt) => {
              const active = filters.relationTypes.includes(rt)
              return (
                <button
                  key={rt}
                  onClick={() =>
                    onChange({
                      ...filters,
                      relationTypes: active ? filters.relationTypes.filter((v) => v !== rt) : [...filters.relationTypes, rt],
                    })
                  }
                  className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                    active
                      ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 text-purple-800 dark:text-purple-200'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {RELATION_LABELS[rt] || rt}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Active summary + reset */}
      {anyActive && (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate max-w-lg">{activeLabel}</span>
          <button
            onClick={() => onChange({ search: '', pageTypes: [], statuses: [], relationTypes: [] })}
            className="text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
          >
            重置筛选
          </button>
        </div>
      )}
    </div>
  )
}
