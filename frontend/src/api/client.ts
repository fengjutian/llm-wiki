const BASE = ''
const DEFAULT_TIMEOUT = 15000

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(BASE + path, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText)
        throw new ApiError(res.status, msg)
      }
      return res.json()
    } catch (e) {
      lastError = e as Error
      if (e instanceof ApiError) throw e // Don't retry 4xx/5xx
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  clearTimeout(timeoutId)
  throw lastError ?? new Error('Request failed')
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postStream: (path: string, body?: unknown) =>
    fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
}
