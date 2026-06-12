import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore } from '../../stores/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('adds a toast with id', () => {
    useToastStore.getState().add('Test message')
    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Test message')
    expect(toasts[0].id).toBeTruthy()
  })

  it('adds toast with link', () => {
    useToastStore.getState().add('Done', '/lint', 'View')
    const t = useToastStore.getState().toasts[0]
    expect(t.link).toBe('/lint')
    expect(t.linkText).toBe('View')
  })

  it('removes a toast by id', async () => {
    useToastStore.getState().add('First')
    await new Promise(r => setTimeout(r, 2))
    useToastStore.getState().add('Second')
    expect(useToastStore.getState().toasts).toHaveLength(2)
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().remove(id)
    expect(useToastStore.getState().toasts).toHaveLength(1)
    expect(useToastStore.getState().toasts[0].message).toBe('Second')
  })

  it('generates valid string ids', () => {
    useToastStore.getState().add('A')
    const id = useToastStore.getState().toasts[0].id
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})
