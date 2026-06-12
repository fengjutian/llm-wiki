import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { useThemeStore, hydrateTheme } from '../../stores/themeStore'

describe('themeStore', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false }) })
  })
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''
    useThemeStore.setState({ theme: 'dark' })
  })

  it('has dark or light as default theme', () => {
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

  it('setTheme toggles the .dark class on <html>', () => {
    document.documentElement.classList.remove('dark')

    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle updates the .dark class on <html>', () => {
    useThemeStore.setState({ theme: 'dark' })
    document.documentElement.classList.add('dark')

    useThemeStore.getState().toggle() // dark -> light
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    useThemeStore.getState().toggle() // light -> dark
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme does NOT clobber other classes on <html>', () => {
    document.documentElement.className = 'foo bar'
    useThemeStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('foo')).toBe(true)
    expect(document.documentElement.classList.contains('bar')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('hydrateTheme syncs the current store value to <html>', () => {
    useThemeStore.setState({ theme: 'light' })
    document.documentElement.classList.remove('dark')
    hydrateTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    useThemeStore.setState({ theme: 'dark' })
    hydrateTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
