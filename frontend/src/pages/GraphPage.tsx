import { useState, useEffect, useRef, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { api } from '../api/client'
import type { GraphData, GraphNode } from '../api/types'

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const graphRef = useRef<any>(null)

  useEffect(() => {
    api.get<GraphData>('/api/graph').then(d => { setData(d); setLoading(false) })
  }, [])

  const nodeColor = useCallback((n: any) => {
    const colors: Record<string, string> = { entity: '#58a6ff', concept: '#3fb950', source_summary: '#d29922', overview: '#f78166', comparison: '#bc8cff' }
    return colors[n.page_type] || '#8b949e'
  }, [])

  const handleNodeClick = useCallback((n: any) => setSelectedNode(n as GraphNode), [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter nodes..." className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500 w-48"/>
        {data && <span className="text-xs text-gray-500">{data.nodes.length} nodes, {data.edges.length} edges</span>}
        <button onClick={() => graphRef.current?.zoomToFit(400)} className="text-xs text-gray-500 hover:text-cyan-400">Fit view</button>
      </div>

      {loading ? <p className="text-gray-500">Loading graph...</p> : data ? (
        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative">
          <ForceGraph2D
            ref={graphRef}
            graphData={{
              nodes: data.nodes.filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase())),
              links: data.edges.map(e => ({ source: e.source, target: e.target, relation_type: e.relation_type })),
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
              const r = Math.max(3, 6 / Math.sqrt(scale))
              ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
              ctx.fill()
              ctx.fillStyle = '#e0e0e0'
              ctx.fillText(label, n.x!, n.y! + r + fontSize * 0.6)
            }}
            linkColor={() => '#30363d'}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            onNodeClick={handleNodeClick}
            backgroundColor="transparent"
            width={800}
            height={600}
          />
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl max-w-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">{selectedNode.title}</h3>
                <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-gray-300">&times;</button>
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Type: {selectedNode.page_type}</div>
                <div>Status: {selectedNode.status}</div>
                <div>In-links: {selectedNode.in_degree}</div>
                <div>Out-links: {selectedNode.out_degree}</div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
