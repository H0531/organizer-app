// S2-01～S2-10：POST /api/photos/sign（案例定義見 S2 第一階段報告 B-2）
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fake from './fakeSupabase'
import { A, B, OTHER, OWN, loadSignRoute, makeRequest } from './helpers'

vi.mock('@supabase/supabase-js', async () => {
  const f = await import('./fakeSupabase')
  return { createClient: f.createClient }
})

type SignResult = { path: unknown; signedUrl?: string; expiresIn?: number; error?: string }

async function sign(token: string | undefined, body: unknown) {
  const { POST } = await loadSignRoute()
  const res = await POST(makeRequest('/api/photos/sign', 'POST', { token, body }))
  const json = (await res.json()) as { results?: SignResult[]; error?: string }
  return { status: res.status, json, cacheControl: res.headers.get('cache-control') }
}

function expectNoStorageCall() {
  expect(fake.from).not.toHaveBeenCalled()
  expect(fake.createSignedUrls).not.toHaveBeenCalled()
}

beforeEach(() => fake.resetCallLogs())

describe('POST /api/photos/sign', () => {
  it('前提：route 以假設定建立 client，身分由伺服器端 getUser 驗證', async () => {
    await sign('token-a', { paths: [OWN] })
    expect(fake.createClient).toHaveBeenCalledWith(
      'http://127.0.0.1:9',
      'fake-service-role-key-for-s2-tests',
      expect.anything()
    )
    expect(fake.getUser).toHaveBeenCalledWith('token-a')
  })

  it('S2-01 A 請求 B 的標準路徑 → forbidden，不呼叫 createSignedUrls', async () => {
    const r = await sign('token-a', { paths: [OTHER] })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual([{ path: OTHER, error: 'forbidden' }])
    expect(r.json.results?.[0]).not.toHaveProperty('signedUrl')
    expectNoStorageCall()
  })

  it('S2-02 A 請求自己的標準路徑（對照組）→ signedUrl、expiresIn 900；Storage 只收到該路徑與 900', async () => {
    const r = await sign('token-a', { paths: [OWN] })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual([
      { path: OWN, signedUrl: `https://signed.example.test/${OWN}?ttl=900`, expiresIn: 900 },
    ])
    expect(fake.from).toHaveBeenCalledWith('photos')
    expect(fake.createSignedUrls).toHaveBeenCalledTimes(1)
    expect(fake.createSignedUrls).toHaveBeenCalledWith([OWN], 900)
  })

  it('S2-03 相似路徑（大寫、前導空白、全形＠、.evil 網域）→ 各項 forbidden，不呼叫 Storage', async () => {
    const similar = [
      'A@example.test/checklist_1_before_0.jpg',
      ` ${A}/checklist_1_before_0.jpg`,
      'a＠example.test/checklist_1_before_0.jpg',
      'a@example.test.evil/checklist_1_before_0.jpg',
    ]
    const r = await sign('token-a', { paths: similar })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual(similar.map(p => ({ path: p, error: 'forbidden' })))
    expectNoStorageCall()
  })

  it('S2-03 補充觀察：路徑結尾有空白 → 被拒（實際為 invalid，非 forbidden），不呼叫 Storage', async () => {
    const trailing = `${OWN} `
    const r = await sign('token-a', { paths: [trailing] })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual([{ path: trailing, error: 'invalid' }])
    expectNoStorageCall()
  })

  it('S2-04 路徑異常（../、/../、./、..、//、三層）→ 各項 invalid，不呼叫 Storage', async () => {
    const odd = [
      '../b@example.test/x.jpg',
      `${A}/../checklist_1_before_0.jpg`,
      './checklist_1_before_0.jpg',
      '..',
      '../checklist_1_before_0.jpg',
      `${A}//checklist_1_before_0.jpg`,
      `${A}/sub/checklist_1_before_0.jpg`,
    ]
    const r = await sign('token-a', { paths: odd })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual(odd.map(p => ({ path: p, error: 'invalid' })))
    expectNoStorageCall()
  })

  it('S2-05 編碼與特殊字元（%40、%2F、%2e%2e、\\、控制字元）→ 各項 invalid，不呼叫 Storage', async () => {
    const encoded = [
      'a%40example.test/checklist_1_before_0.jpg',
      `${A}%2Fchecklist_1_before_0.jpg`,
      `${A}/checklist_1_before_0%2Ejpg`,
      '%2e%2e/checklist_1_before_0.jpg',
      `${A}\\checklist_1_before_0.jpg`,
      `${A}\u0000/checklist_1_before_0.jpg`,
      `${A}/checklist_1_before_0.jpg\u001f`,
    ]
    const r = await sign('token-a', { paths: encoded })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual(encoded.map(p => ({ path: p, error: 'invalid' })))
    expectNoStorageCall()
  })

  it('S2-06 檔名不在白名單（other、before_5、.jpeg、.JPG、.gif）→ 各項 invalid', async () => {
    const names = [
      `${A}/other.jpg`,
      `${A}/checklist_1_before_5.jpg`,
      `${A}/checklist_1_before_0.jpeg`,
      `${A}/checklist_1_before_0.JPG`,
      `${A}/checklist_1_before_0.gif`,
    ]
    const r = await sign('token-a', { paths: names })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual(names.map(p => ({ path: p, error: 'invalid' })))
    expectNoStorageCall()
  })

  it('S2-07 混合批次 → 逐項結果正確、順序一致；Storage 只收到自己的路徑一次', async () => {
    const r = await sign('token-a', { paths: [OWN, OTHER, 'not-a-path', 123, OWN] })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual([
      { path: OWN, signedUrl: `https://signed.example.test/${OWN}?ttl=900`, expiresIn: 900 },
      { path: OTHER, error: 'forbidden' },
      { path: 'not-a-path', error: 'invalid' },
      { path: null, error: 'invalid' },
    ])
    expect(fake.createSignedUrls).toHaveBeenCalledTimes(1)
    expect(fake.createSignedUrls).toHaveBeenCalledWith([OWN], 900)
  })

  it('S2-08 body 夾帶 email=B、userId、expiresIn → 全部忽略；有效時間仍 900；資料夾由 JWT 決定', async () => {
    const r = await sign('token-a', {
      paths: [OWN, OTHER],
      email: B,
      userId: 'user-b-id',
      expiresIn: 999999,
      ttl: 999999,
    })
    expect(r.status).toBe(200)
    expect(r.json.results).toEqual([
      { path: OWN, signedUrl: `https://signed.example.test/${OWN}?ttl=900`, expiresIn: 900 },
      { path: OTHER, error: 'forbidden' },
    ])
    expect(fake.createSignedUrls).toHaveBeenCalledTimes(1)
    expect(fake.createSignedUrls).toHaveBeenCalledWith([OWN], 900)
  })

  it('S2-09 token 驗證失敗、使用者沒有 email → 401 unauthorized，不呼叫 Storage', async () => {
    for (const token of ['token-invalid', 'token-noemail']) {
      fake.resetCallLogs()
      const r = await sign(token, { paths: [OWN] })
      expect(r.status).toBe(401)
      expect(r.json).toEqual({ error: 'unauthorized' })
      expect(r.cacheControl).toBe('no-store')
      expect(fake.getUser).toHaveBeenCalledWith(token)
      expectNoStorageCall()
    }
  })

  it('S2-10 paths 不是陣列／空陣列／超過 20 個 → 400／400／413，不呼叫 Storage', async () => {
    const notArray = await sign('token-a', { paths: OWN })
    expect(notArray.status).toBe(400)
    expect(notArray.json).toEqual({ error: 'invalid request' })

    const empty = await sign('token-a', { paths: [] })
    expect(empty.status).toBe(400)
    expect(empty.json).toEqual({ error: 'invalid paths' })

    const tooMany = await sign('token-a', { paths: Array.from({ length: 21 }, () => OWN) })
    expect(tooMany.status).toBe(413)
    expect(tooMany.json).toEqual({ error: 'too many paths' })

    expectNoStorageCall()
  })
})
