import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

// Eagerly load core pages (first paint)
import WikiBrowserPage from './pages/WikiBrowserPage'
import IngestPage from './pages/IngestPage'
import QueryPage from './pages/QueryPage'

// Lazy load heavier or less-frequently-used pages
const GraphPage = lazy(() => import('./pages/GraphPage'))
const LintPage = lazy(() => import('./pages/LintPage'))
const ConfigPage = lazy(() => import('./pages/ConfigPage'))
const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const LogPage = lazy(() => import('./pages/LogPage'))
const RawFilesPage = lazy(() => import('./pages/RawFilesPage'))
const WorkbenchPage = lazy(() => import('./pages/WorkbenchPage'))
const PageDetail = lazy(() => import('./pages/PageDetail'))

function PageLoader() {
  return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
}

function Lazy({children}: {children: React.ReactNode}) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/wiki" replace />} />
          <Route path="/wiki" element={<WikiBrowserPage />} />
          <Route path="/wikifile" element={<WikiBrowserPage />} />
          <Route path="/page/:name" element={<Lazy><PageDetail /></Lazy>} />
          <Route path="/ingest" element={<IngestPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/graph" element={<Lazy><GraphPage /></Lazy>} />
          <Route path="/lint" element={<Lazy><LintPage /></Lazy>} />
          <Route path="/config" element={<Lazy><ConfigPage /></Lazy>} />
          <Route path="/branches" element={<Lazy><BranchesPage /></Lazy>} />
          <Route path="/log" element={<Lazy><LogPage /></Lazy>} />
          <Route path="/raw" element={<Lazy><RawFilesPage /></Lazy>} />
          <Route path="/workbench" element={<Lazy><WorkbenchPage /></Lazy>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
