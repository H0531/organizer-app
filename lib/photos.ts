// ── Supabase Storage 照片工具 ─────────────────────────────────
// 所有操作透過 /api/photos server route，避免在 client 暴露 service key

// 上傳照片（dataUrl → Supabase Storage），回傳 public URL
export async function uploadPhoto(
  email: string,
  key: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, key, dataUrl }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.url ?? null
  } catch {
    return null
  }
}

// 刪除雲端照片（靜默失敗）
export async function deleteRemotePhoto(email: string, key: string): Promise<void> {
  try {
    await fetch('/api/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, key }),
    })
  } catch {
    // 靜默失敗
  }
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
