const BASE = ""
const DEFAULT_TIMEOUT = 15000

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function request<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT)
  let lastErr: Error | null = null
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE + path, { ...init, signal: ctrl.signal })
      clearTimeout(tid)
      if (!res.ok) { const msg = await res.text().catch(() => res.statusText); throw new ApiError(res.status, msg) }
      return res.json()
    } catch (e) {
      lastErr = e as Error
      if (e instanceof ApiError) throw e
      if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  clearTimeout(tid)
  throw lastErr ?? new Error("Request failed")
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postStream: (path: string, body?: unknown) =>
    fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }),
  rag: {
    status: () => request<any>("/api/rag/status"),
    index: (f?: string, force?: boolean) => request<any>("/api/rag/index", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: f || "", force }) }),
    query: (q: string, k = 5) => request<any>("/api/rag/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, top_k: k }) }),
    hybrid: (q: string, k = 5) => request<any>("/api/rag/query/hybrid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, top_k: k }) }),
    queryStream: (q: string, k = 5) => fetch(BASE + "/api/rag/query/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, top_k: k }) }),
    hybridStream: (q: string, k = 5) => fetch(BASE + "/api/rag/query/hybrid/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, top_k: k }) }),
  },
}
