/** Flat list item from GET /api/wiki/pages (no content, no nested frontmatter) */
export interface WikiPageListItem {
  title: string
  page_type: string
  status: string
  summary?: string
  updated_at?: string
}

/** Full page from GET /api/wiki/pages/{name} (content + nested frontmatter) */
export interface WikiPage {
  title: string
  content: string
  frontmatter: {
    title: string
    page_type: 'entity' | 'concept' | 'source_summary' | 'overview' | 'comparison'
    status: 'draft' | 'active' | 'stale' | 'contradicted' | 'archived'
    summary?: string
    sources?: { file: string; hash: string }[]
    confidence?: 'high' | 'medium' | 'low'
  }
}

export interface IngestResult {
  source_path: string
  source_hash: string
  status: string
  new_pages: string[]
  updated_pages: string[]
  contradictions: Record<string, unknown>[]
  dry_run: boolean
  errors: string[]
}

export interface LintReport {
  health_score: string
  issues: LintIssue[]
  summary: string
}

export interface LintIssue {
  severity: 'critical' | 'warning' | 'info'
  type: string
  description: string
  affected_pages: string[]
  suggestion: string
  auto_fixable: boolean
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  elapsed_ms: number
}

export interface GraphNode {
  id: string
  title: string
  page_type: string
  status: string
  confidence: string
  in_degree: number
  out_degree: number
}

export interface GraphEdge {
  source: string
  target: string
  relation_type: string
}

/** Active filter state for the Graph page. */
export interface GraphFilters {
  search: string
  pageTypes: string[]
  statuses: string[]
  relationTypes: string[]
}

/** Distinct filter values derived from current graph data. */
export interface GraphFilterOptions {
  pageTypes: string[]
  statuses: string[]
  relationTypes: string[]
}

export interface Branch {
  name: string
  is_active: boolean
}

export interface Project {
  name: string
  description: string
  wiki_path: string
  raw_path: string
  created_at: string
  page_count: number
}

export interface WatchSession {
  folder: string
  enabled: boolean
  auto_ingest: boolean
  events_count: number
  recent_events: { change_type: string; path: string; timestamp: string }[]
  error: string | null
  files_watched: number
  active: boolean
}
