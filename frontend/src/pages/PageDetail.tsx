import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../api/client'
import type { WikiPage } from '../api/types'

export default function PageDetail() {
  const { name } = useParams<{ name: string }>()
  const [page, setPage] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!name) return
    api.get<WikiPage>(`/api/wiki/pages/${encodeURIComponent(name)}`)
      .then(setPage).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [name])

  if (loading) return <p className="text-gray-500">Loading...</p>
  if (error) return <p className="text-red-400">{error}</p>
  if (!page) return <p className="text-gray-500">Page not found</p>

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">{page.title}</h1>
      <div className="flex gap-3 text-xs text-gray-500 mb-6">
        <span>{page.frontmatter?.page_type}</span>
        <span>{page.frontmatter?.status}</span>
        {page.frontmatter?.confidence && <span>confidence: {page.frontmatter.confidence}</span>}
      </div>
      {page.frontmatter?.summary && (
        <div className="bg-cyan-500/5 border-l-4 border-cyan-500 px-4 py-3 mb-6 rounded-r-lg text-sm text-gray-400">{page.frontmatter.summary}</div>
      )}
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
      </div>
    </div>
  )
}
