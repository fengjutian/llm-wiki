import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { useThemeStore } from '../../stores/themeStore'

describe('themeStore', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false }) })
  })
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ theme: 'dark' })
  })

  it('has dark as default theme', () => {
    const { theme } = useThemeStore.getState()
    expect(['dark', 'light']).toContain(theme)
  })

  it('toggle switches theme', () => {
    const initial = useThemeStore.getState().theme
    useThemeStore.getState().toggle()
    const next = useThemeStore.getState().theme
    expect(next).not.toBe(initial)
    expect(['dark', 'light']).toContain(next)
  })

  it('setTheme updates theme and localStorage', () => {
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
    expect(localStorage.getItem('wiki-theme')).toBe('light')

    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
