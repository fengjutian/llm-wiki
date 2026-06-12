import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <h1 className="text-6xl font-bold text-gray-600 mb-4">404</h1>
      <h2 className="text-xl text-gray-400 mb-2">Page not found</h2>
      <p className="text-sm text-gray-500 mb-6">The page you are looking for does not exist.</p>
      <Link to="/wiki" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold transition-colors">
        Back to Wiki
      </Link>
    </div>
  )
}
