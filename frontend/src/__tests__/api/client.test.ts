import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, ApiError } from '../../api/client'

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('api.get returns parsed JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'hello' }),
    } as Response)
    const result = await api.get<{ data: string }>('/test')
    expect(result).toEqual({ data: 'hello' })
    expect(fetch).toHaveBeenCalledWith('/test', undefined)
  })

  it('api.post sends JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    } as Response)
    const result = await api.post<{ id: number }>('/test', { name: 'x' })
    expect(result).toEqual({ id: 1 })
    expect(fetch).toHaveBeenCalledWith('/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    })
  })

  it('api throws ApiError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal error'),
    } as Response)
    try {
      await api.get('/test')
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(500)
    }
  })
})
