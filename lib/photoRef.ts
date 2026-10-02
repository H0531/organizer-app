// ── 照片 reference 解析（純函式）──────────────────────────────
// 把 DB / LocalStorage / IndexedDB 中可能出現的照片值統一解析成：
// - data：data:image/...;base64,...（Guest、上傳失敗的 fallback）
// - storage：Supabase Storage path（folder/filename），來源可能是
//     · 標準 Public URL（getPublicUrl，'@' 未編碼）
//     · 編碼過的 Public URL（getRemotePhotoUrl，'@' 為 %40）
//     · 直接的 Storage path
// - empty：null / undefined / 空字串 / 只有空白
// - invalid：其他所有值（外部 URL、其他 bucket、javascript:、blob:、file:、非圖片 data URL…）
//
// 只負責「辨識與還原」，不負責 ownership（由 /api/photos/sign 依 JWT 驗證）。
// 不做 network、不讀 session、不 lowercase email、不修改原始資料。

export type PhotoRef =
  | { type: 'data'; value: string }
  | { type: 'storage'; path: string }
  | { type: 'empty' }
  | { type: 'invalid'; value: string }

const BUCKET = 'photos'
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`
const MAX_PATH_LENGTH = 320

// 只接受圖片類型的 base64 data URL（不接受 svg、text/html 等）
const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp|gif|heic|heif|avif|bmp);base64,/i

// 任何 URL scheme（http:、javascript:、blob:、file:…）
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i

// segment 內不允許：/、\、%、控制字元
const BAD_SEGMENT_CHARS = /[/\\%\x00-\x1F\x7F]/

function supabaseOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  try {
    return new URL(base).origin
  } catch {
    return null
  }
}

// 兩個 segment 組成 path：folder/filename；每個 segment 都必須是安全、非空、非 . / ..
function joinSegments(segments: string[]): string | null {
  if (segments.length !== 2) return null
  for (const s of segments) {
    if (!s || s === '.' || s === '..' || BAD_SEGMENT_CHARS.test(s)) return null
  }
  const path = `${segments[0]}/${segments[1]}`
  return path.length <= MAX_PATH_LENGTH ? path : null
}

// Supabase Public URL → Storage path（每個 segment 只 decode 一次）
function pathFromPublicUrl(raw: string): string | null {
  const origin = supabaseOrigin()
  if (!origin) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.origin !== origin) return null
  if (!url.pathname.startsWith(PUBLIC_PREFIX)) return null

  const rest = url.pathname.slice(PUBLIC_PREFIX.length)
  const decoded: string[] = []
  for (const seg of rest.split('/')) {
    try {
      decoded.push(decodeURIComponent(seg))
    } catch {
      return null
    }
  }
  return joinSegments(decoded)
}

// 直接的 Storage path：保持原樣，不 decode、不 lowercase
function pathFromStoragePath(raw: string): string | null {
  return joinSegments(raw.split('/'))
}

export function parsePhotoRef(value: unknown): PhotoRef {
  if (value === null || value === undefined) return { type: 'empty' }
  if (typeof value !== 'string') return { type: 'invalid', value: String(value) }
  if (value.trim() === '') return { type: 'empty' }

  // 前後有空白 → 不自動修正
  if (value !== value.trim()) return { type: 'invalid', value }

  if (value.startsWith('data:')) {
    return DATA_URL_PATTERN.test(value) ? { type: 'data', value } : { type: 'invalid', value }
  }

  if (SCHEME_PATTERN.test(value)) {
    if (!/^https?:/i.test(value)) return { type: 'invalid', value }
    const path = pathFromPublicUrl(value)
    return path ? { type: 'storage', path } : { type: 'invalid', value }
  }

  const path = pathFromStoragePath(value)
  return path ? { type: 'storage', path } : { type: 'invalid', value }
}
