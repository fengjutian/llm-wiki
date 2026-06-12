import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import ForceGraph2D from 'react-force-graph-2d'
import { api } from '../api/client'
import { useThemeStore } from '../stores/themeStore'
import type { GraphData, GraphNode, GraphFilters } from '../api/types'
import GraphFilterBar, { extractFilterOptions, applyFilters } from '../components/GraphFilterBar'

const EMPTY_FILTERS: GraphFilters = {
  search: '', pageTypes: [], statuses: [], confidences: [], relationTypes: [],
  inDegreeMin: 0, inDegreeMax: 0, outDegreeMin: 0, outDegreeMax: 0, orphansOnly: false,
}

/* ---------- URL ↔ filter sync helpers ---------- */

function filtersFromParams(sp: URLSearchParams): GraphFilters {
  const pageTypes = sp.get('type')?.split(',').filter(Boolean) ?? []
  const statuses = sp.get('status')?.split(',').filter(Boolean) ?? []
  const confidences = sp.get('conf')?.split(',').filter(Boolean) ?? []
  const relationTypes = sp.get('rel')?.split(',').filter(Boolean) ?? []
  return {
    search: sp.get('q') ?? '',
    pageTypes,
    statuses,
    confidences,
    relationTypes,
    inDegreeMin: Number(sp.get('idmin')) || 0,
    inDegreeMax: Number(sp.get('idmax')) || 0,
    outDegreeMin: Number(sp.get('odmin')) || 0,
    outDegreeMax: Number(sp.get('odmax')) || 0,
    orphansOnly: sp.get('orphan') === '1',
  }
}

function filtersToParams(f: GraphFilters): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.search) sp.set('q', f.search)
  if (f.pageTypes.length) sp.set('type', f.pageTypes.join(','))
  if (f.statuses.length) sp.set('status', f.statuses.join(','))
  if (f.confidences.length) sp.set('conf', f.confidences.join(','))
  if (f.relationTypes.length) sp.set('rel', f.relationTypes.join(','))
  if (f.inDegreeMin > 0) sp.set('idmin', String(f.inDegreeMin))
  if (f.inDegreeMax > 0) sp.set('idmax', String(f.inDegreeMax))
  if (f.outDegreeMin > 0) sp.set('odmin', String(f.outDegreeMin))
  if (f.outDegreeMax > 0) sp.set('odmax', String(f.outDegreeMax))
  if (f.orphansOnly) sp.set('orphan', '1')
  return sp
}

/* ---------- edge color coding ---------- */

const EDGE_COLORS: Record<string, string> = {
  references: '#8b949e',   // gray
  supports: '#3fb950',     // green
  contradicts: '#f85149',  // red
  extends: '#58a6ff',      // blue
  supersedes: '#d29922',   // orange
}

const EDGE_DARK_COLORS: Record<string, string> = {
  references: '#4a4f57',
  supports: '#2d7a3a',
  contradicts: '#b3302b',
  extends: '#3a6eb5',
  supersedes: '#9e7019',
}

export default function GraphPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<GraphFilters>(() => ({ ...EMPTY_FILTERS, ...filtersFromParams(searchParams) }))
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const graphRef = useRef<any>(null)
  const theme = useThemeStore(s => s.theme)
  const isDark = theme === 'dark'
  const firstSync = useRef(true)

  useEffect(() => {
    api.get<GraphData>('/api/graph').then(d => { setData(d); setLoading(false) })
  }, [])

  // If degree range filters are still at 0 (unset), clamp to actual data range on first load
  useEffect(() => {
    if (!data) return
    const maxIn = data.nodes.reduce((m, n) => Math.max(m, n.in_degree), 0)
    const maxOut = data.nodes.reduce((m, n) => Math.max(m, n.out_degree), 0)
    setFilters(prev => ({
      ...prev,
      inDegreeMin: prev.inDegreeMin > 0 ? prev.inDegreeMin : 0,
      inDegreeMax: prev.inDegreeMax > 0 ? prev.inDegreeMax : maxIn,
      outDegreeMin: prev.outDegreeMin > 0 ? prev.outDegreeMin : 0,
      outDegreeMax: prev.outDegreeMax > 0 ? prev.outDegreeMax : maxOut,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // URL sync: filters → URL
  useEffect(() => {
    if (firstSync.current) { firstSync.current = false; return }
    const next = filtersToParams(filters)
    const curr = filtersToParams(filtersFromParams(searchParams))
    if (next.toString() !== curr.toString()) {
      setSearchParams(next, { replace: true })
    }
  }, [filters, searchParams, setSearchParams])

  // URL sync: URL (back/forward) → filters
  useEffect(() => {
    const fromUrl = filtersFromParams(searchParams)
    setFilters(prev => {
      // Compare with current to avoid infinite loops
      if (
        prev.search === fromUrl.search &&
        arraysEqual(prev.pageTypes, fromUrl.pageTypes ?? []) &&
        arraysEqual(prev.statuses, fromUrl.statuses ?? []) &&
        arraysEqual(prev.confidences, fromUrl.confidences ?? []) &&
        arraysEqual(prev.relationTypes, fromUrl.relationTypes ?? []) &&
        prev.inDegreeMin === (fromUrl.inDegreeMin ?? 0) &&
        prev.inDegreeMax === (fromUrl.inDegreeMax ?? 0) &&
        prev.outDegreeMin === (fromUrl.outDegreeMin ?? 0) &&
        prev.outDegreeMax === (fromUrl.outDegreeMax ?? 0) &&
        prev.orphansOnly === (fromUrl.orphansOnly ?? false)
      ) {
        return prev
      }
      return { ...prev, ...fromUrl }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const filterOptions = useMemo(
    () => (data ? extractFilterOptions(data) : { pageTypes: [], statuses: [], confidences: [], relationTypes: [], inDegreeRange: [0, 0] as [number, number], outDegreeRange: [0, 0] as [number, number] }),
    [data],
  )

  const filtered = useMemo(() => {
    if (!data) return { nodes: [], edges: [] }
    return applyFilters(data, filters)
  }, [data, filters])

  // Callback ref for ResizeObserver
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    containerRef.current = node
    if (!node) return

    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setDims({ w: rect.width, h: rect.height })
    }

    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setDims({ w: width, h: height })
      }
    })
    obs.observe(node)
    observerRef.current = obs
  }, [])

  const nodeColor = useCallback((n: any) => {
    const colors: Record<string, string> = { entity: '#58a6ff', concept: '#3fb950', source_summary: '#d29922', overview: '#f78166', comparison: '#bc8cff' }
    return colors[n.page_type] || '#8b949e'
  }, [])

  const linkColor = useCallback((l: any) => {
    if (isDark) return EDGE_DARK_COLORS[l.relation_type] ?? '#4a4f57'
    return EDGE_COLORS[l.relation_type] ?? '#8b949e'
  }, [isDark])

  const handleNodeClick = useCallback((n: any) => setSelectedNode(n as GraphNode), [])

  return (
    <div className="flex flex-col h-full">
      {/* Header: title + filter bar + stats */}
      <div className="shrink-0 space-y-3 mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Knowledge Graph</h1>
          {data && (
            <span className="text-xs text-gray-500">
              {filtered.nodes.length}{filtered.nodes.length !== data.nodes.length ? ` / ${data.nodes.length}` : ''} nodes
              {' · '}
              {filtered.edges.length}{filtered.edges.length !== data.edges.length ? ` / ${data.edges.length}` : ''} edges
            </span>
          )}
          <button onClick={() => graphRef.current?.zoomToFit(400)} className="text-xs text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400">Fit view</button>
        </div>
        {data && (
          <GraphFilterBar
            filters={filters}
            options={filterOptions}
            onChange={setFilters}
            resultCount={{ nodes: filtered.nodes.length, edges: filtered.edges.length }}
            totalCount={{ nodes: data.nodes.length, edges: data.edges.length }}
          />
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading graph...</p>
      ) : data ? (
        <div ref={measureRef} className="flex-1 min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden relative">
          {dims.w > 0 && dims.h > 0 && (
            <ForceGraph2D
              ref={graphRef}
              graphData={{
                nodes: filtered.nodes,
                links: filtered.edges.map(e => ({ source: e.source, target: e.target, relation_type: e.relation_type })),
              }}
              nodeLabel={(n: any) => `${n.title}\n${n.page_type} | in:${n.in_degree} out:${n.out_degree}`}
              nodeColor={nodeColor}
              nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D, scale: number) => {
                const label = n.title.length > 20 ? n.title.slice(0, 18) + '..' : n.title
                const fontSize = Math.max(4, 12 / scale)
                ctx.font = `${fontSize}px sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillStyle = nodeColor(n)
                ctx.beginPath()
                ctx.arc(n.x!, n.y!, Math.max(3, 6 / Math.sqrt(scale)), 0, 2 * Math.PI)
                ctx.fill()
                ctx.fillStyle = isDark ? '#e0e0e0' : '#1f2937'
                ctx.fillText(label, n.x!, n.y! + Math.max(3, 6 / Math.sqrt(scale)) + fontSize * 0.6)
              }}
              linkColor={linkColor}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              backgroundColor="transparent"
              width={dims.w}
              height={dims.h}
            />
          )}
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xl max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{selectedNode.title}</h3>
                <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">&times;</button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>Type: {selectedNode.page_type}</div>
                <div>Status: {selectedNode.status}</div>
                <div>Confidence: {selectedNode.confidence}</div>
                <div>In-links: {selectedNode.in_degree} | Out-links: {selectedNode.out_degree}</div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Shallow array equality check for URL sync loop prevention. */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
