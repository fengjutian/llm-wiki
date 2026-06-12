import { NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import HealthBadge from './HealthBadge'

const NAV = [
  { to: '/wiki', label: 'Wiki', icon: '📚' },
  { to: '/graph', label: 'Graph', icon: '🕸️' },
  { to: '/raw', label: 'Raw', icon: '📁' },
  { to: '/ingest', label: 'Ingest', icon: '📥' },
  { to: '/query', label: 'Query', icon: '💬' },
  { to: '/lint', label: 'Lint', icon: '🔍' },
  { to: '/branches', label: 'Branches', icon: '🌿' },
  { to: '/log', label: 'Log', icon: '📋' },
  { to: '/config', label: 'Config', icon: '⚙️' },
]

export default function Sidebar() {
  return (
    <aside className="w-[240px] bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-800">
        <NavLink to="/" className="text-lg font-bold text-cyan-400 hover:text-cyan-300">
          📚 LLM Wiki
        </NavLink>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800 space-y-2">
        <HealthBadge />
        <ThemeToggle />
      </div>
    </aside>
  )
}
