import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// service_role 只存在這個 server route；身分一律以 Supabase Auth JWT 為準
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const BUCKET = 'photos'

// 照片 key 白名單：
// - Checklist：checklist_${logId}_before_${idx} / checklist_${logId}_after_${idx}（idx 0–4）
// - Declutter：toss_photo_${id}
const KEY_PATTERN = /^(checklist_\d{1,20}_(before|after)_[0-4]|toss_photo_\d{1,20})$/

// 與 bucket 設定一致：2MB、只接受 JPEG / PNG
const MAX_BYTES = 2 * 1024 * 1024
const MAX_BASE64_LENGTH = Math.ceil(MAX_BYTES / 3) * 4
const DATA_URL_PATTERN = /^data:(image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

// 驗證 Authorization: Bearer <access_token>，回傳 JWT 驗證後的 email（小寫）
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

// body email 只用來比對，不作為 ownership；存在且與 JWT email 不一致 → false
function bodyEmailMatches(bodyEmail: unknown, authEmail: string): boolean {
  if (bodyEmail === undefined || bodyEmail === null) return true
  if (typeof bodyEmail !== 'string') return false
  return bodyEmail.trim().toLowerCase() === authEmail
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
}

function isPng(buf: Buffer): boolean {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return buf.length >= sig.length && sig.every((b, i) => buf[i] === b)
}

async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const authEmail = await getAuthenticatedEmail(req)
    if (!authEmail) return jsonError('unauthorized', 401)

    const body = await readJson(req)
    if (!body) return jsonError('invalid body', 400)
    const { email, key, dataUrl } = body

    if (!bodyEmailMatches(email, authEmail)) return jsonError('forbidden', 403)

    if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
      return jsonError('invalid key', 400)
    }

    if (typeof dataUrl !== 'string') return jsonError('invalid image', 400)
    const commaIdx = dataUrl.indexOf(',')
    if (commaIdx !== -1 && dataUrl.length - commaIdx - 1 > MAX_BASE64_LENGTH) {
      return jsonError('file too large', 413)
    }
    const dataMatch = dataUrl.match(DATA_URL_PATTERN)
    if (!dataMatch) return jsonError('invalid image', 400)

    const contentType = dataMatch[1] as 'image/jpeg' | 'image/png'
    const buffer = Buffer.from(dataMatch[2], 'base64')
    if (buffer.length === 0) return jsonError('invalid image', 400)
    if (buffer.length > MAX_BYTES) return jsonError('file too large', 413)

    const magicOk = contentType === 'image/png' ? isPng(buffer) : isJpeg(buffer)
    if (!magicOk) return jsonError('invalid image', 400)

    const ext = contentType === 'image/png' ? 'png' : 'jpg'

    // path 永遠使用 JWT email（不 encode，讓資料夾名稱與既有 public URL 一致）
    const path = `${authEmail}/${key}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true })

    if (error) {
      console.error('Storage upload error:', error)
      return jsonError('upload failed', 500)
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('POST /api/photos error:', err)
    return jsonError('server error', 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authEmail = await getAuthenticatedEmail(req)
    if (!authEmail) return jsonError('unauthorized', 401)

    const body = await readJson(req)
    if (!body) return jsonError('invalid body', 400)
    const { email, key } = body

    if (!bodyEmailMatches(email, authEmail)) return jsonError('forbidden', 403)

    if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
      return jsonError('invalid key', 400)
    }

    // 只能刪除自己 email folder 內的檔案
    const paths = [
      `${authEmail}/${key}.jpg`,
      `${authEmail}/${key}.png`,
    ]
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths)
    if (error) {
      console.error('Storage delete error:', error)
      return jsonError('delete failed', 500)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/photos error:', err)
    return jsonError('server error', 500)
  }
}
