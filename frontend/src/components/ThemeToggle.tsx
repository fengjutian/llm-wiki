import { useThemeStore } from '../stores/themeStore'

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
    >
      <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
      <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
