// ── Signed URL resolver（client-side、memory-only）───────────
// storage path → POST /api/photos/sign → signed URL
// - cache 只存在 module memory，不寫入 localStorage / sessionStorage / IndexedDB / cookie
// - cache 綁定帳號（owner），帳號改變時清除並增加 generation，晚回來的結果一律丟棄
// - 不 throw 到呼叫端：失敗回傳 null
// - log 不包含 access token、signed URL、完整 email、完整 path

import { supabase } from './supabase'
import { parsePhotoRef } from './photoRef'

const SIGN_ENDPOINT = '/api/photos/sign'
const MAX_BATCH = 20
const SIGNED_URL_TTL_MS = 900 * 1000
const REFRESH_BUFFER_MS = 120 * 1000
const NEGATIVE_TTL_MS = 60 * 1000
const MAX_CACHE_ENTRIES = 300

type CacheEntry = { signedUrl: string; expiresAt: number }
type Deferred = {
  promise: Promise<string | null>
  resolve: (url: string | null) => void
  generation: number
}
type SignItem = { path?: unknown; signedUrl?: unknown; expiresIn?: unknown; error?: unknown }

// undefined = 尚未得知帳號；null = Guest / 未登入
let owner: string | null | undefined = undefined
let generation = 0

const cache = new Map<string, CacheEntry>()
const negative = new Map<string, number>()
const inflight = new Map<string, Deferred>()
let pending = new Map<string, Deferred>()
let flushScheduled = false

const ownerListeners = new Set<() => void>()
let authSubscribed = false

function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase()
  return e ? e : null
}

function clearAll() {
  cache.clear()
  negative.clear()
  for (const d of inflight.values()) d.resolve(null)
  inflight.clear()
  for (const d of pending.values()) d.resolve(null)
  pending = new Map()
}

// 帳號改變（Guest → A、A → B、A → Guest…）時呼叫：清除所有 cache 並增加 generation
export function setPhotoCacheOwner(email: string | null): void {
  const next = normalizeEmail(email)
  if (owner === next) return
  const wasUnknown = owner === undefined
  owner = next
  // 第一次得知帳號：cache 只會在 owner 確定後才寫入，因此沒有需要清除的舊帳號資料
  if (wasUnknown) return
  generation++
  clearAll()
  for (const l of ownerListeners) l()
}

// 目前的 cache generation（PhotoImg 用來丟棄舊帳號的結果）
export function getPhotoCacheGeneration(): number {
  return generation
}

export function subscribePhotoCacheOwner(listener: () => void): () => void {
  ensureAuthSubscription()
  ownerListeners.add(listener)
  return () => { ownerListeners.delete(listener) }
}

// 即使呼叫端尚未接上 setPhotoCacheOwner，也跟著 Supabase Auth 身分切換 cache owner
function ensureAuthSubscription() {
  if (authSubscribed || typeof window === 'undefined') return
  authSubscribed = true
  try {
    supabase.auth.onAuthStateChange((_event, session) => {
      setPhotoCacheOwner(session?.user?.email ?? null)
    })
  } catch {
    authSubscribed = false
  }
}

function isFresh(entry: CacheEntry, now = Date.now()): boolean {
  return entry.expiresAt - now > REFRESH_BUFFER_MS
}

function isValidStoragePath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  const ref = parsePhotoRef(path)
  return ref.type === 'storage' && ref.path === path
}

function remember(path: string, entry: CacheEntry) {
  cache.delete(path)
  cache.set(path, entry)
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

// 同步讀取：cache 中仍有效的 signed URL；沒有 → null（不發 request）
export function peekSignedPhotoUrl(path: string): string | null {
  const entry = cache.get(path)
  return entry && isFresh(entry) ? entry.signedUrl : null
}

// 圖片載入失敗（例如 URL 已過期）時，讓下一次取得重新 sign
export function invalidateSignedPhotoUrl(path: string): void {
  cache.delete(path)
  negative.delete(path)
}

function createDeferred(): Deferred {
  let resolve!: (url: string | null) => void
  const promise = new Promise<string | null>(r => { resolve = r })
  let settled = false
  return {
    promise,
    resolve: url => { if (!settled) { settled = true; resolve(url) } },
    generation,
  }
}

async function getAccess(): Promise<{ token: string; email: string } | null> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const email = normalizeEmail(data.session?.user?.email)
    return token && email ? { token, email } : null
  } catch {
    return null
  }
}

async function postSign(paths: string[], token: string): Promise<Response | null> {
  try {
    return await fetch(SIGN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths }),
      cache: 'no-store',
    })
  } catch {
    return null
  }
}

async function signChunk(batch: [string, Deferred][]) {
  const settleAll = (url: string | null) => {
    for (const [path, d] of batch) {
      d.resolve(url)
      if (inflight.get(path) === d) inflight.delete(path)
    }
  }

  let access = await getAccess()
  if (!access) { settleAll(null); return }

  // cache 一律屬於「實際送出 request 的 session 帳號」
  if (owner !== access.email) setPhotoCacheOwner(access.email)
  const gen = generation
  // 帳號在排隊期間已改變 → 這批屬於舊帳號，全部放棄
  if (batch.some(([, d]) => d.generation !== gen)) { settleAll(null); return }

  const paths = batch.map(([p]) => p)
  const startedAt = Date.now()
  let res = await postSign(paths, access.token)

  // 401：重新取得 session 後最多重試一次
  if (res && res.status === 401) {
    access = await getAccess()
    if (!access || access.email !== owner || generation !== gen) { settleAll(null); return }
    res = await postSign(paths, access.token)
  }

  if (!res || !res.ok) {
    console.error('[photoSigner] sign request failed', { status: res?.status ?? 'network' })
    settleAll(null)
    return
  }

  let items: SignItem[] = []
  try {
    const json = (await res.json()) as { results?: unknown }
    if (Array.isArray(json.results)) items = json.results as SignItem[]
  } catch {
    console.error('[photoSigner] invalid sign response')
    settleAll(null)
    return
  }

  // 等待期間帳號改變 → 丟棄結果，不寫入 cache
  if (generation !== gen) { settleAll(null); return }

  const byPath = new Map<string, SignItem>()
  for (const item of items) {
    if (item && typeof item.path === 'string') byPath.set(item.path, item)
  }

  for (const [path, d] of batch) {
    const item = byPath.get(path)
    let url: string | null = null
    if (item && typeof item.signedUrl === 'string' && item.signedUrl) {
      const ttlSec = typeof item.expiresIn === 'number' && item.expiresIn > 0 ? item.expiresIn : 900
      const expiresAt = startedAt + Math.min(ttlSec * 1000, SIGNED_URL_TTL_MS)
      remember(path, { signedUrl: item.signedUrl, expiresAt })
      url = item.signedUrl
    } else if (item && (item.error === 'not_found' || item.error === 'invalid' || item.error === 'forbidden')) {
      negative.set(path, Date.now() + NEGATIVE_TTL_MS)
    }
    d.resolve(url)
    if (inflight.get(path) === d) inflight.delete(path)
  }
}

function flush() {
  flushScheduled = false
  const entries = [...pending.entries()]
  pending = new Map()
  for (let i = 0; i < entries.length; i += MAX_BATCH) {
    void signChunk(entries.slice(i, i + MAX_BATCH)).catch(() => {
      for (const [path, d] of entries.slice(i, i + MAX_BATCH)) {
        d.resolve(null)
        if (inflight.get(path) === d) inflight.delete(path)
      }
    })
  }
}

// 單一 path 的取得流程：cache → negative cache → 共用 in-flight → 排入下一批
function requestPath(path: string): Promise<string | null> {
  ensureAuthSubscription()
  const entry = cache.get(path)
  if (entry && isFresh(entry)) return Promise.resolve(entry.signedUrl)
  if (entry) cache.delete(path)

  const until = negative.get(path)
  if (until !== undefined) {
    if (until > Date.now()) return Promise.resolve(null)
    negative.delete(path)
  }

  const existing = inflight.get(path)
  if (existing && existing.generation === generation) return existing.promise

  const d = createDeferred()
  inflight.set(path, d)
  pending.set(path, d)
  if (!flushScheduled) {
    flushScheduled = true
    setTimeout(flush, 0)
  }
  return d.promise
}

// 取得單一 Storage path 的 signed URL；無 session、不合法、失敗 → null
export async function getSignedPhotoUrl(path: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!isValidStoragePath(path)) return null
  try {
    return await requestPath(path)
  } catch {
    return null
  }
}

// 批次取得：重複 path 只送一次；回傳 path → signed URL（失敗的 path 不在 Map 中）
export async function getSignedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (typeof window === 'undefined' || !Array.isArray(paths)) return result
  const unique = [...new Set(paths)].filter(isValidStoragePath)
  const urls = await Promise.all(unique.map(p => requestPath(p).catch(() => null)))
  unique.forEach((p, i) => {
    const url = urls[i]
    if (url) result.set(p, url)
  })
  return result
}
