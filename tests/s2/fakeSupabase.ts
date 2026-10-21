// 取代 @supabase/supabase-js 的假 client：不連線，只記錄呼叫
// Storage 假函式刻意「什麼路徑都接受」，授權若有漏洞，測試會看到不該出現的呼叫或 signedUrl
import { vi } from 'vitest'

export const FAKE_USERS: Record<string, { id: string; email?: string }> = {
  'token-a': { id: 'user-a-id', email: 'a@example.test' },
  'token-b': { id: 'user-b-id', email: 'b@example.test' },
  'token-noemail': { id: 'user-noemail-id' },
}

export const getUser = vi.fn(async (token?: string) => {
  const user = token ? FAKE_USERS[token] : undefined
  if (!user) return { data: { user: null }, error: { name: 'AuthApiError', message: 'invalid token', status: 401 } }
  return { data: { user: { ...user } }, error: null }
})

export const upload = vi.fn(async (path: string, _body: unknown, _opts?: unknown) => ({ data: { path }, error: null }))

export const remove = vi.fn(async (paths: string[]) => ({ data: paths.map(name => ({ name })), error: null }))

export const createSignedUrls = vi.fn(async (paths: string[], expiresIn: number) => ({
  data: paths.map(path => ({ path, signedUrl: `https://signed.example.test/${path}?ttl=${expiresIn}`, error: null })),
  error: null,
}))

export const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://public.example.test/${path}` } }))

export const from = vi.fn((_bucket: string) => ({ upload, remove, createSignedUrls, getPublicUrl }))

export const createClient = vi.fn((_url: string, _key: string, _opts?: unknown) => ({
  auth: { getUser },
  storage: { from },
}))

// 每個測試前清除呼叫紀錄（保留實作）；createClient 只在 route 載入時呼叫一次，不清除
export function resetCallLogs() {
  for (const fn of [getUser, upload, remove, createSignedUrls, getPublicUrl, from]) fn.mockClear()
}

export function storageCallCount() {
  return from.mock.calls.length + upload.mock.calls.length + remove.mock.calls.length + createSignedUrls.mock.calls.length
}
