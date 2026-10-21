// S3-A：伺服器端 Storage 錯誤處理（重用 tests/s2 的假 Supabase 與載入工具，不修改它們）
import { inspect } from 'node:util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fake from '../s2/fakeSupabase'
import { A, OWN, loadPhotosRoute, loadSignRoute, makeRequest } from '../s2/helpers'

vi.mock('@supabase/supabase-js', async () => {
  const f = await import('../s2/fakeSupabase')
  return { createClient: f.createClient }
})

const KEY = 'checklist_1_before_0'
const OWN2 = `${A}/checklist_1_after_0.jpg`
const FAKE_TOKEN = 'token-a'
const INTERNAL = 'INTERNAL-SECRET-DETAIL-7f3a'
// 測試用敏感內容：只要出現在回應或 log，就代表內部資訊被帶出
const SENSITIVE = [A, `${A}/${KEY}`, FAKE_TOKEN, INTERNAL]

function sensitiveError(path: string) {
  return {
    name: 'StorageApiError',
    status: 500,
    message: `${INTERNAL} bucket=photos path=${path} user=${A} token=${FAKE_TOKEN}`,
  }
}

let logSpies: ReturnType<typeof vi.spyOn>[] = []
function capturedLogs(): string {
  return logSpies
    .flatMap(spy => spy.mock.calls)
    .map(args => args.map(a => (typeof a === 'string' ? a : inspect(a, { depth: 6 }))).join(' '))
    .join('\n')
}
function leaked(text: string): string[] {
  return SENSITIVE.filter(s => text.includes(s))
}

beforeEach(() => {
  fake.resetCallLogs()
  logSpies = (['error', 'warn', 'log', 'info'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}))
})
afterEach(() => {
  for (const spy of logSpies) spy.mockRestore()
})

async function signRaw(paths: string[]) {
  const { POST } = await loadSignRoute()
  const res = await POST(makeRequest('/api/photos/sign', 'POST', { token: FAKE_TOKEN, body: { paths } }))
  return { status: res.status, text: await res.text() }
}
async function photosRaw(method: 'POST' | 'DELETE', body: unknown) {
  const route = await loadPhotosRoute()
  const res = await route[method](makeRequest('/api/photos', method, { token: FAKE_TOKEN, body }))
  return { status: res.status, text: await res.text() }
}

// 1×1 以內的合法 PNG data URL（只需通過 magic bytes 檢查）
const PNG = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64')

describe('S3-A 伺服器端 Storage 錯誤處理', () => {
  it('前提：載入的是預期的 route 模組（正式檔或指定的變異複本）', async () => {
    const sign = (await loadSignRoute()) as unknown as Record<string, unknown>
    const photos = (await loadPhotosRoute()) as unknown as Record<string, unknown>
    const expected = process.env.S3_EXPECT_MUTANT
    const markers = [sign.__S3_MUTANT__, photos.__S3_MUTANT__]
    if (expected) expect(markers).toContain(expected)
    else expect(markers).toEqual([undefined, undefined])
  })

  it('S3-A1 簽名：Storage 整批回錯誤 → 500 internal error；回應與 log 不含敏感內容', async () => {
    fake.createSignedUrls.mockResolvedValueOnce({ data: null, error: sensitiveError(OWN) } as never)
    const r = await signRaw([OWN])
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'internal error' })
    expect(leaked(r.text)).toEqual([])
    expect(leaked(capturedLogs())).toEqual([])
  })

  it('S3-A2 簽名：Storage 拋出例外 → 500 internal error；log 只有錯誤名稱', async () => {
    fake.createSignedUrls.mockRejectedValueOnce(new Error(sensitiveError(OWN).message))
    const r = await signRaw([OWN])
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'internal error' })
    expect(leaked(r.text)).toEqual([])
    expect(leaked(capturedLogs())).toEqual([])
  })

  it('S3-A3 簽名：兩張中一張 Storage 回錯誤 → 該張 not_found，另一張正常', async () => {
    fake.createSignedUrls.mockResolvedValueOnce({
      data: [
        { path: OWN, signedUrl: null, error: 'Object not found' },
        { path: OWN2, signedUrl: `https://signed.example.test/${OWN2}`, error: null },
      ],
      error: null,
    } as never)
    const r = await signRaw([OWN, OWN2])
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toEqual({
      results: [
        { path: OWN, error: 'not_found' },
        { path: OWN2, signedUrl: `https://signed.example.test/${OWN2}`, expiresIn: 900 },
      ],
    })
  })

  it('S3-A4 簽名：Storage 回傳資料缺少某張 → 該張 not_found', async () => {
    fake.createSignedUrls.mockResolvedValueOnce({
      data: [{ path: OWN2, signedUrl: `https://signed.example.test/${OWN2}`, error: null }],
      error: null,
    } as never)
    const r = await signRaw([OWN, OWN2])
    expect(r.status).toBe(200)
    expect(JSON.parse(r.text)).toEqual({
      results: [
        { path: OWN, error: 'not_found' },
        { path: OWN2, signedUrl: `https://signed.example.test/${OWN2}`, expiresIn: 900 },
      ],
    })
  })

  it('S3-A5 上傳：Storage 回錯誤 → 500 upload failed；回應不含敏感內容', async () => {
    fake.upload.mockResolvedValueOnce({ data: null, error: sensitiveError(`${A}/${KEY}.png`) } as never)
    const r = await photosRaw('POST', { key: KEY, dataUrl: PNG })
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'upload failed' })
    expect(leaked(r.text)).toEqual([])
  })

  it('S3-A6 刪除：Storage 回錯誤 → 500 delete failed；回應不含敏感內容', async () => {
    fake.remove.mockResolvedValueOnce({ data: null, error: sensitiveError(`${A}/${KEY}.jpg`) } as never)
    const r = await photosRaw('DELETE', { key: KEY })
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'delete failed' })
    expect(leaked(r.text)).toEqual([])
  })

  describe('S3-A7 上傳／刪除的 log 不得含測試用敏感內容', () => {
    // 除了不得含敏感內容，log 仍須保留錯誤名稱（避免以刪除 log 的方式「通過」）
    it('S3-A7a 上傳：Storage 回錯誤時的 log', async () => {
      fake.upload.mockResolvedValueOnce({ data: null, error: sensitiveError(`${A}/${KEY}.png`) } as never)
      const r = await photosRaw('POST', { key: KEY, dataUrl: PNG })
      expect(r.status).toBe(500)
      const logs = capturedLogs()
      expect(leaked(logs)).toEqual([])
      expect(logs).toContain("name: 'StorageApiError'")
      expect(logs).toContain('status: 500')
    })

    it('S3-A7b 上傳：Storage 拋出例外時的 log', async () => {
      fake.upload.mockRejectedValueOnce(new Error(sensitiveError(`${A}/${KEY}.png`).message))
      const r = await photosRaw('POST', { key: KEY, dataUrl: PNG })
      expect(r.status).toBe(500)
      expect(JSON.parse(r.text)).toEqual({ error: 'server error' })
      const logs = capturedLogs()
      expect(leaked(logs)).toEqual([])
      expect(logs).toContain("name: 'Error'")
    })

    it('S3-A7c 刪除：Storage 回錯誤時的 log', async () => {
      fake.remove.mockResolvedValueOnce({ data: null, error: sensitiveError(`${A}/${KEY}.jpg`) } as never)
      const r = await photosRaw('DELETE', { key: KEY })
      expect(r.status).toBe(500)
      const logs = capturedLogs()
      expect(leaked(logs)).toEqual([])
      expect(logs).toContain("name: 'StorageApiError'")
      expect(logs).toContain('status: 500')
    })

    it('S3-A7d 刪除：Storage 拋出例外時的 log', async () => {
      fake.remove.mockRejectedValueOnce(new Error(sensitiveError(`${A}/${KEY}.jpg`).message))
      const r = await photosRaw('DELETE', { key: KEY })
      expect(r.status).toBe(500)
      expect(JSON.parse(r.text)).toEqual({ error: 'server error' })
      const logs = capturedLogs()
      expect(leaked(logs)).toEqual([])
      expect(logs).toContain("name: 'Error'")
    })

    it('S3-A7e 錯誤摘要不採用異常的 name／status（任意字串不得當成名稱或狀態碼輸出）', async () => {
      const hostile = [
        // name 夾帶路徑、status 夾帶內部訊息 → name 記為 unknown、status 不輸出
        { name: `${A}/${KEY}.png`, status: `${INTERNAL} ${A}`, expectName: 'unknown', expectStatus: null },
        // 3 位數字字串 → 轉成數字輸出
        { name: 'StorageApiError', status: '404', expectName: 'StorageApiError', expectStatus: 404 },
        // 超出 HTTP 範圍的數字、非 3 位數字串 → 不輸出
        { name: 'StorageApiError', status: 9999, expectName: 'StorageApiError', expectStatus: null },
        { name: 'StorageApiError', status: '5000', expectName: 'StorageApiError', expectStatus: null },
      ]
      for (const h of hostile) {
        for (const spy of logSpies) spy.mockClear()
        fake.remove.mockResolvedValueOnce({
          data: null,
          error: { name: h.name, status: h.status, message: sensitiveError(`${A}/${KEY}.jpg`).message },
        } as never)
        const r = await photosRaw('DELETE', { key: KEY })
        expect(r.status).toBe(500)
        const logs = capturedLogs()
        expect(leaked(logs), JSON.stringify(h)).toEqual([])
        expect(logs).toContain(`name: '${h.expectName}'`)
        if (h.expectStatus === null) expect(logs).not.toContain('status:')
        else expect(logs).toContain(`status: ${h.expectStatus}`)
      }
    })
  })
})

describe('S3-A8／A9 簽名 API 的 log 不採用異常的 name／status', () => {
  it('S3-A8 簽名：Storage 回錯誤且 name／status 夾帶敏感字串 → log 不含原值；name 為 unknown、不輸出 status、保留 count', async () => {
    fake.createSignedUrls.mockResolvedValueOnce({
      data: null,
      error: {
        name: `${A}/${KEY}.jpg`,
        status: `${INTERNAL} user=${A} token=${FAKE_TOKEN}`,
        message: sensitiveError(OWN).message,
      },
    } as never)
    const r = await signRaw([OWN, OWN2])
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'internal error' })
    expect(leaked(r.text)).toEqual([])

    const logs = capturedLogs()
    expect(leaked(logs)).toEqual([])
    expect(logs).not.toContain(`${A}/${KEY}.jpg`)
    expect(logs).toContain("name: 'unknown'")
    expect(logs).not.toContain('status:')
    expect(logs).toContain('count: 2')
  })

  it('S3-A9 簽名：Storage 拋出 Error 且 name 夾帶 email／路徑／token → log 不含原值；name 為 unknown', async () => {
    const thrown = new Error(sensitiveError(OWN).message)
    thrown.name = `${A}/${KEY}.jpg token=${FAKE_TOKEN}`
    fake.createSignedUrls.mockRejectedValueOnce(thrown)
    const r = await signRaw([OWN])
    expect(r.status).toBe(500)
    expect(JSON.parse(r.text)).toEqual({ error: 'internal error' })
    expect(leaked(r.text)).toEqual([])

    const logs = capturedLogs()
    expect(leaked(logs)).toEqual([])
    expect(logs).not.toContain(thrown.name)
    expect(logs).toContain("name: 'unknown'")
  })
})
