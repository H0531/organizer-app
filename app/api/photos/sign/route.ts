import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// service_role 只存在這個 server route；身分一律以 Supabase Auth JWT 為準
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const BUCKET = 'photos'

// signed URL 有效時間固定由 server 決定（秒），client 不可指定
const SIGNED_URL_TTL = 900

const MAX_PATHS = 20
const MAX_PATH_LENGTH = 320

// 與 P0-3B（app/api/photos/route.ts）完全相同的照片 key 白名單
const KEY_PATTERN = /^(checklist_\d{1,20}_(before|after)_[0-4]|toss_photo_\d{1,20})$/

// 只允許 folder/filename.ext 兩層
const PATH_PATTERN = /^([^/]+)\/([^/]+)\.(jpg|png)$/

// 拒絕 percent encoding、backslash、控制字元（\x00–\x1F、\x7F）
const FORBIDDEN_CHARS = /[%\\\x00-\x1F\x7F]/

type SignResult =
  | { path: unknown; signedUrl: string; expiresIn: number }
  | { path: unknown; error: 'invalid' | 'forbidden' | 'not_found' }

// 所有 response 都不允許被 cache（signed URL 是短效 credential）
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function jsonError(error: string, status: number) {
  return json({ error }, status)
}

// 驗證 Authorization: Bearer <access_token>，回傳 JWT 驗證後的 email（trim + 小寫）
async function getAuthenticatedEmail(req: NextRequest): Promise<string | null> {
  const header = req.headers.get('authorization') ?? ''
  const match = header.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(match[1])
    if (error || !data.user) return null
    const email = data.user.email?.trim().toLowerCase()
    return email || null
  } catch {
    return null
  }
}

async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

// 單一 path 檢查：格式不合法 → invalid；不是自己的 folder → forbidden；通過 → null
// server 不做 decode / normalize / lowercase：client path 必須與 server 重建的 canonical path 逐字相等
function checkPath(path: unknown, authEmail: string): 'invalid' | 'forbidden' | null {
  if (typeof path !== 'string') return 'invalid'
  if (path.length > MAX_PATH_LENGTH) return 'invalid'
  if (FORBIDDEN_CHARS.test(path)) return 'invalid'

  const match = path.match(PATH_PATTERN)
  if (!match) return 'invalid'
  const [, folder, filename, ext] = match

  // 相對路徑 segment（../file.jpg、./file.jpg）屬於格式錯誤，不是 ownership 問題
  if (folder === '.' || folder === '..') return 'invalid'
  if (!KEY_PATTERN.test(filename)) return 'invalid'

  const canonicalPath = `${authEmail}/${filename}.${ext}`
  if (folder !== authEmail || path !== canonicalPath) return 'forbidden'

  return null
}

export async function POST(req: NextRequest) {
  try {
    const authEmail = await getAuthenticatedEmail(req)
    if (!authEmail) return jsonError('unauthorized', 401)

    // 只讀取 paths；其他欄位（email、expiresIn、ttl…）一律忽略，不作為權限或 TTL 依據
    const body = await readJson(req)
    if (!body) return jsonError('invalid request', 400)
    const { paths } = body
    if (!Array.isArray(paths)) return jsonError('invalid request', 400)
    if (paths.length === 0) return jsonError('invalid paths', 400)
    if (paths.length > MAX_PATHS) return jsonError('too many paths', 413)

    // 同一 request 內完全相同的 path 只處理一次
    const uniquePaths = Array.from(new Set<unknown>(paths))
    if (uniquePaths.length === 0) return jsonError('invalid paths', 400)

    // 先完成所有格式與 ownership 檢查；只有自己的 canonical path 才會送進 Storage
    const results = new Map<unknown, SignResult>()
    const validPaths: string[] = []
    for (const p of uniquePaths) {
      const problem = checkPath(p, authEmail)
      if (problem) {
        results.set(p, { path: typeof p === 'string' ? p : null, error: problem })
      } else {
        validPaths.push(p as string)
      }
    }

    if (validPaths.length > 0) {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrls(validPaths, SIGNED_URL_TTL)

      if (error || !data) {
        // 不記錄 token / email / path，也不把內部錯誤回傳給 client
        console.error('POST /api/photos/sign: storage sign failed', {
          name: error?.name,
          status: (error as { status?: unknown } | null)?.status,
          count: validPaths.length,
        })
        return jsonError('internal error', 500)
      }

      const byPath = new Map<string, (typeof data)[number]>()
      for (const item of data) {
        if (item && typeof item.path === 'string') byPath.set(item.path, item)
      }

      for (const p of validPaths) {
        const item = byPath.get(p)
        if (item && !item.error && typeof item.signedUrl === 'string' && item.signedUrl) {
          results.set(p, { path: p, signedUrl: item.signedUrl, expiresIn: SIGNED_URL_TTL })
        } else {
          results.set(p, { path: p, error: 'not_found' })
        }
      }
    }

    // 依 request 中（去重後）的原始順序回傳
    return json({ results: uniquePaths.map(p => results.get(p)!) })
  } catch (err) {
    console.error('POST /api/photos/sign error:', err instanceof Error ? err.name : 'unknown')
    return jsonError('internal error', 500)
  }
}
