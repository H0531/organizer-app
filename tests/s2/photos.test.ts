// S2-11～S2-18：POST／DELETE /api/photos（案例定義見 S2 第一階段報告 B-2）
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fake from './fakeSupabase'
import { A, B, TINY_PNG_DATA_URL, loadPhotosRoute, makeRequest } from './helpers'

vi.mock('@supabase/supabase-js', async () => {
  const f = await import('./fakeSupabase')
  return { createClient: f.createClient }
})

const KEY = 'checklist_1_before_0'

async function call(method: 'POST' | 'DELETE', token: string | undefined, body: unknown) {
  const route = await loadPhotosRoute()
  const req = makeRequest('/api/photos', method, { token, body })
  const res = await route[method](req)
  return { status: res.status, json: (await res.json()) as Record<string, unknown>, bodyUsed: req.bodyUsed }
}

beforeEach(() => fake.resetCallLogs())

describe('POST /api/photos（上傳）', () => {
  it('S2-11 A 的 token、body email 是 B → 403 forbidden，不呼叫 upload', async () => {
    const r = await call('POST', 'token-a', { email: B, key: KEY, dataUrl: TINY_PNG_DATA_URL })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'forbidden' })
    expect(fake.getUser).toHaveBeenCalledWith('token-a')
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.upload).not.toHaveBeenCalled()
  })

  it('S2-12 不帶 email、夾帶 userId／owner／path 指向 B → 200；upload 路徑是 A 的資料夾', async () => {
    const r = await call('POST', 'token-a', {
      key: KEY,
      dataUrl: TINY_PNG_DATA_URL,
      userId: 'user-b-id',
      owner: B,
      path: `${B}/${KEY}.png`,
    })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ url: `https://public.example.test/${A}/${KEY}.png` })
    expect(fake.upload).toHaveBeenCalledTimes(1)
    const [uploadPath, buffer, opts] = fake.upload.mock.calls[0]
    expect(uploadPath).toBe(`${A}/${KEY}.png`)
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(opts).toEqual({ contentType: 'image/png', upsert: true })
    expect(fake.getPublicUrl).toHaveBeenCalledWith(`${A}/${KEY}.png`)
  })

  it('S2-13 body email 大小寫與前後空白不同 → 通過比對；路徑仍是 JWT 的小寫 email', async () => {
    const r = await call('POST', 'token-a', { email: ' A@Example.test ', key: KEY, dataUrl: TINY_PNG_DATA_URL })
    expect(r.status).toBe(200)
    expect(fake.upload).toHaveBeenCalledTimes(1)
    expect(fake.upload.mock.calls[0][0]).toBe(`${A}/${KEY}.png`)
  })

  it('S2-14 key 不合法 → 400 invalid key，不呼叫 upload', async () => {
    const badKeys = ['../x', `${B}/${KEY}`, `${KEY}.jpg`, 'toss_photo_abc', '%2e%2e']
    for (const key of badKeys) {
      const r = await call('POST', 'token-a', { key, dataUrl: TINY_PNG_DATA_URL })
      expect(r.status, key).toBe(400)
      expect(r.json, key).toEqual({ error: 'invalid key' })
    }
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.upload).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/photos（刪除）', () => {
  it('S2-15 A 的 token、body email 是 B → 403，不呼叫 remove', async () => {
    const r = await call('DELETE', 'token-a', { email: B, key: KEY })
    expect(r.status).toBe(403)
    expect(r.json).toEqual({ error: 'forbidden' })
    expect(fake.getUser).toHaveBeenCalledWith('token-a')
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.remove).not.toHaveBeenCalled()
  })

  it('S2-16 合法 key、夾帶 path／userId 指向 B → 200；remove 只收到 A 資料夾的 .jpg 與 .png', async () => {
    const r = await call('DELETE', 'token-a', { key: KEY, path: `${B}/${KEY}.jpg`, userId: 'user-b-id' })
    expect(r.status).toBe(200)
    expect(r.json).toEqual({ ok: true })
    expect(fake.remove).toHaveBeenCalledTimes(1)
    expect(fake.remove).toHaveBeenCalledWith([`${A}/${KEY}.jpg`, `${A}/${KEY}.png`])
  })

  it('S2-17 key 是路徑形式或異常 → 400 invalid key，不呼叫 remove', async () => {
    const badKeys = [`${B}/${KEY}`, '../', '%2e%2e', `${KEY}%2Fx`, `..%2F${KEY}`]
    for (const key of badKeys) {
      const r = await call('DELETE', 'token-a', { key })
      expect(r.status, key).toBe(400)
      expect(r.json, key).toEqual({ error: 'invalid key' })
    }
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.remove).not.toHaveBeenCalled()
  })

  it('S2-18 token 驗證失敗 → 401；不讀 body、不呼叫 remove', async () => {
    const r = await call('DELETE', 'token-invalid', { key: KEY })
    expect(r.status).toBe(401)
    expect(r.json).toEqual({ error: 'unauthorized' })
    expect(fake.getUser).toHaveBeenCalledWith('token-invalid')
    expect(r.bodyUsed).toBe(false)
    expect(fake.from).not.toHaveBeenCalled()
    expect(fake.remove).not.toHaveBeenCalled()
  })
})
