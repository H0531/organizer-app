// S3-B：前端 lib/photoSigner.ts 帳號隔離（Node 環境＋假 window／假 session／假 fetch，不連網）
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 預設測試正式 lib；S3_SIGNER_DIR 只用於測試靈敏度檢查的暫時變異複本
const SIGNER_DIR = process.env.S3_SIGNER_DIR ?? path.resolve(process.cwd(), 'lib')

// 若真的載入了瀏覽器 Supabase client，代表 mock 沒有生效
const guard = vi.hoisted(() => ({ realClientCreated: 0 }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    guard.realClientCreated++
    throw new Error('real Supabase client must not be created in S3-B tests')
  },
}))

type Session = { access_token: string; user: { email: string } }
const SESSIONS: Record<'a' | 'b', Session> = {
  a: { access_token: 'token-a', user: { email: 'a@example.test' } },
  b: { access_token: 'token-b', user: { email: 'b@example.test' } },
}

let current: Session | null = null
let authListener: ((event: string, session: Session | null) => void) | null = null
const getSession = vi.fn(async () => ({ data: { session: current } }))
const onAuthStateChange = vi.fn((cb: (event: string, session: Session | null) => void) => {
  authListener = cb
  return { data: { subscription: { unsubscribe() {} } } }
})

type FetchCall = { url: string; token: string | null; paths: string[] }
let calls: FetchCall[] = []
let respond: (call: FetchCall, n: number) => Promise<Response> = async () => new Response('{}', { status: 500 })
const fakeFetch = vi.fn(async (input: unknown, init?: RequestInit) => {
  const headers = new Headers(init?.headers)
  const call: FetchCall = {
    url: String(input),
    token: headers.get('Authorization'),
    paths: (JSON.parse(String(init?.body ?? '{}')).paths ?? []) as string[],
  }
  calls.push(call)
  return respond(call, calls.length)
})

// 假簽名 API：回傳帶有 token 名稱的 signed URL，方便辨認是哪個帳號拿到的
function okResponse(call: FetchCall): Response {
  const who = call.token?.replace('Bearer ', '') ?? 'none'
  return new Response(
    JSON.stringify({ results: call.paths.map(p => ({ path: p, signedUrl: `https://signed.example.test/${who}/${p}`, expiresIn: 900 })) }),
    { status: 200 }
  )
}

type Signer = typeof import('../../lib/photoSigner')
let signer: Signer & { __S3_MUTANT__?: string }

const P = 'a@example.test/checklist_1_before_0.jpg'

function switchTo(who: 'a' | 'b' | null) {
  current = who ? SESSIONS[who] : null
  authListener?.('SIGNED_IN', current)
}

beforeEach(async () => {
  calls = []
  current = SESSIONS.a
  authListener = null
  respond = async call => okResponse(call)
  getSession.mockClear()
  onAuthStateChange.mockClear()
  fakeFetch.mockClear()
  vi.stubGlobal('window', {})
  vi.stubGlobal('fetch', fakeFetch)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.resetModules()
  vi.doMock(path.join(SIGNER_DIR, 'supabase.ts'), () => ({ supabase: { auth: { getSession, onAuthStateChange } } }))
  signer = (await import(/* @vite-ignore */ path.join(SIGNER_DIR, 'photoSigner.ts'))) as typeof signer
})

afterEach(() => {
  // 每個測試都必須只呼叫假的簽名 API，且沒有建立真的 Supabase client
  for (const c of calls) {
    expect(c.url).toBe('/api/photos/sign')
    expect(c.url).not.toContain('/object/public/')
  }
  expect(guard.realClientCreated).toBe(0)
  vi.restoreAllMocks()
})

describe('S3-B photoSigner 帳號隔離', () => {
  it('前提：載入的是預期的 photoSigner（正式檔或指定的變異複本），並使用假 Supabase', async () => {
    expect(signer.__S3_MUTANT__).toBe(process.env.S3_EXPECT_MUTANT)
    await signer.getSignedPhotoUrl(P)
    expect(getSession).toHaveBeenCalled()
    expect(onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('S3-B1 A 取得 URL 後切換到 B（登入狀態事件）→ 快取清空；重新請求帶 B 的 token', async () => {
    const urlA = await signer.getSignedPhotoUrl(P)
    expect(urlA).toBe(`https://signed.example.test/token-a/${P}`)
    expect(signer.peekSignedPhotoUrl(P)).toBe(urlA)

    switchTo('b')
    expect(signer.peekSignedPhotoUrl(P)).toBeNull()

    const urlB = await signer.getSignedPhotoUrl(P)
    expect(urlB).toBe(`https://signed.example.test/token-b/${P}`)
    expect(urlB).not.toBe(urlA)
    expect(calls.map(c => c.token)).toEqual(['Bearer token-a', 'Bearer token-b'])
  })

  it('S3-B1 補充：以 setPhotoCacheOwner 切換帳號，同樣清空快取', async () => {
    const urlA = await signer.getSignedPhotoUrl(P)
    signer.setPhotoCacheOwner('b@example.test')
    expect(signer.peekSignedPhotoUrl(P)).toBeNull()
    current = SESSIONS.b
    const urlB = await signer.getSignedPhotoUrl(P)
    expect(urlB).not.toBe(urlA)
    expect(calls[1].token).toBe('Bearer token-b')
  })

  it('S3-B2 A 的請求送出後、回應前切換到 B → 回傳 null，舊回應不寫入快取', async () => {
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    respond = async call => { await gate; return okResponse(call) }

    const pending = signer.getSignedPhotoUrl(P)
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0].token).toBe('Bearer token-a')

    switchTo('b')
    release()
    await expect(pending).resolves.toBeNull()
    await new Promise(r => setTimeout(r, 0))
    expect(signer.peekSignedPhotoUrl(P)).toBeNull()

    // B 之後再要同一張，必須重新請求，不能沿用 A 晚回來的結果
    respond = async call => okResponse(call)
    const urlB = await signer.getSignedPhotoUrl(P)
    expect(urlB).toBe(`https://signed.example.test/token-b/${P}`)
  })

  it('S3-B3 簽名 API 持續回 401 → fetch 剛好 2 次（重試一次），結果 null', async () => {
    // 前 5 次都回 401，之後回 500，避免錯誤的實作無限重試而卡住
    respond = async (_call, n) => new Response('{"error":"unauthorized"}', { status: n <= 5 ? 401 : 500 })
    const url = await signer.getSignedPhotoUrl(P)
    expect(url).toBeNull()
    expect(calls).toHaveLength(2)
    expect(getSession).toHaveBeenCalledTimes(2)
  })

  it('S3-B4 第一次 401、重試成功 → fetch 2 次，回傳正確 URL', async () => {
    respond = async (call, n) => (n === 1 ? new Response('{"error":"unauthorized"}', { status: 401 }) : okResponse(call))
    const url = await signer.getSignedPhotoUrl(P)
    expect(url).toBe(`https://signed.example.test/token-a/${P}`)
    expect(calls).toHaveLength(2)
  })

  it.each([
    ['500', async () => new Response('{"error":"internal error"}', { status: 500 })],
    ['網路錯誤', async () => { throw new TypeError('network down') }],
    ['單筆 forbidden', async (c: FetchCall) => new Response(JSON.stringify({ results: [{ path: c.paths[0], error: 'forbidden' }] }), { status: 200 })],
    ['單筆 not_found', async (c: FetchCall) => new Response(JSON.stringify({ results: [{ path: c.paths[0], error: 'not_found' }] }), { status: 200 })],
  ])('S3-B5 失敗（%s）→ 回傳 null，不改用 public URL', async (_label, responder) => {
    respond = responder as typeof respond
    const url = await signer.getSignedPhotoUrl(P)
    expect(url).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('/api/photos/sign')
  })

  it('S3-B6 一次要 25 個不同路徑（含重複）→ 去重後分 2 批（20＋5），每批不超過 20', async () => {
    const unique = Array.from({ length: 25 }, (_, i) => `a@example.test/checklist_${i + 1}_before_0.jpg`)
    const result = await signer.getSignedPhotoUrls([...unique, unique[0], unique[1], unique[2]])
    expect(calls.map(c => c.paths.length).sort((x, y) => y - x)).toEqual([20, 5])
    expect(calls.every(c => c.paths.length <= 20)).toBe(true)
    expect(new Set(calls.flatMap(c => c.paths))).toEqual(new Set(unique))
    expect(result.size).toBe(25)
  })
})
