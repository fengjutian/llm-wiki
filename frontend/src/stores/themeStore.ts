import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const STORAGE_KEY = 'wiki-theme'

/** Apply a theme to <html> by toggling the .dark class (additive, doesn't blow away other classes). */
function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', t === 'dark')
  root.style.colorScheme = t
}

/** Read the initial theme from localStorage, falling back to the OS preference. */
function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitial(),
  setTheme: (t) => {
    applyTheme(t)
    localStorage.setItem(STORAGE_KEY, t)
    set({ theme: t })
  },
  toggle: () => {
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      localStorage.setItem(STORAGE_KEY, next)
      return { theme: next }
    })
  },
}))

/**
 * Sync the current store theme to the DOM. Call once at app boot, before React mounts,
 * to avoid a flash of the wrong theme. Safe to call multiple times.
 */
export function hydrateTheme() {
  applyTheme(useThemeStore.getState().theme)
}
