import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const getInitial = (): Theme => {
  const saved = localStorage.getItem('wiki-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitial(),
  setTheme: (t) => {
    document.documentElement.className = t
    localStorage.setItem('wiki-theme', t)
    set({ theme: t })
  },
  toggle: () => {
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.className = next
      localStorage.setItem('wiki-theme', next)
      return { theme: next }
    })
  },
}))
