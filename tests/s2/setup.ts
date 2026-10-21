import { afterEach, expect, vi } from 'vitest'

// S2 測試一律使用假值；不讀取、不依賴任何 .env* 內容
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key-for-s2-tests'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key-for-s2-tests'

// 任何對外網路請求都視為測試失敗
export const fetchGuard = vi.fn((..._args: unknown[]): Promise<Response> => {
  throw new Error('S2 tests must not make network requests')
})
vi.stubGlobal('fetch', fetchGuard)

afterEach(() => {
  expect(fetchGuard).not.toHaveBeenCalled()
})
