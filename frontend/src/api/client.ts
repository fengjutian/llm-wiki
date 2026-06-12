const BASE = ''

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit, isStream?: boolean): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, msg)
  }
  if (isStream) return res as unknown as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }),
  postStream: (path: string, body?: unknown) =>
    request<Response>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }, true),
}
