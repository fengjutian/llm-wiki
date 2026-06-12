import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSSE } from '../../hooks/useSSE'

describe('useSSE', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('starts with empty state', () => {
    const { result } = renderHook(() => useSSE('/api/test'))
    expect(result.current.text).toBe('')
    expect(result.current.done).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('receives streamed text', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Hello '))
        controller.enqueue(new TextEncoder().encode('World'))
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true, body: stream,
    } as Response)
    const { result } = renderHook(() => useSSE('/api/test'))
    act(() => { result.current.start({ q: 'test' }) })
    await waitFor(() => { expect(result.current.text).toContain('Hello') })
    await waitFor(() => { expect(result.current.done).toBe(true) })
  })

  it('stop aborts in-progress request', async () => {
    const abortFn = vi.fn()
    const origController = globalThis.AbortController
    globalThis.AbortController = class { signal = {}; abort = abortFn } as any
    const { result } = renderHook(() => useSSE('/api/test'))
    act(() => { result.current.start({ q: 'test' }) })
    act(() => { result.current.stop() })
    expect(abortFn).toHaveBeenCalled()
    globalThis.AbortController = origController
  })
})
