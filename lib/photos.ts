// ── Supabase Storage 照片工具 ─────────────────────────────────
// 所有操作透過 /api/photos server route，避免在 client 暴露 service key
// 每次請求都帶 Supabase Auth access_token（Authorization: Bearer），server 以 JWT 決定照片資料夾

import { supabase } from './supabase'
import { parsePhotoRef } from './photoRef'

// 取得目前 Supabase session 的 access_token；沒有 session → null
async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}

// 上傳照片（dataUrl → Supabase Storage），回傳 public URL
export async function uploadPhoto(
  email: string,
  key: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const token = await getAccessToken()
    if (!token) return null
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, key, dataUrl }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.url ?? null
  } catch {
    return null
  }
}

// 刪除雲端照片（不 throw）：成功 → true；失敗 → false（呼叫端可忽略回傳值）
export async function deleteRemotePhoto(email: string, key: string): Promise<boolean> {
  try {
    const token = await getAccessToken()
    if (!token) return false
    const res = await fetch('/api/photos', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, key }),
    })
    return res.ok
  } catch {
    return false
  }
}

// 照片 reference → DELETE /api/photos 用的 Storage key（不含副檔名）
// 只有全部條件符合才回傳 key；null 代表「不要刪」：
// - parsePhotoRef 結果為 storage
// - folder === email（小寫）
// - 副檔名為 .jpg / .png
// - key 以 prefix 開頭（Checklist：checklist_${id}_）；exact = true 時 key 必須剛好等於 prefix（Declutter：toss_photo_${entry.id}）
export function storageKeyFromPhotoRef(
  ref: unknown,
  email: string,
  prefix: string,
  exact = false
): string | null {
  const parsed = parsePhotoRef(ref)
  if (parsed.type !== 'storage') return null
  const slash = parsed.path.indexOf('/')
  if (slash <= 0) return null
  const folder = parsed.path.slice(0, slash)
  const filename = parsed.path.slice(slash + 1)
  if (folder !== email.trim().toLowerCase()) return null
  const m = filename.match(/^(.+)\.(jpg|png)$/)
  if (!m) return null
  const key = m[1]
  if (!prefix) return null
  if (exact ? key !== prefix : !key.startsWith(prefix)) return null
  return key
}

// 取得雲端照片 public URL
export function getRemotePhotoUrl(
  email: string,
  key: string,
  ext: 'jpg' | 'png' = 'jpg'
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/photos/${encodeURIComponent(email)}/${key}.${ext}`
}

// 判斷是否為遠端 URL（非 base64）
export function isRemoteUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://')
}
