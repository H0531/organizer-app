// 上傳照片到 Supabase Storage，回傳 public URL
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

// 刪除雲端照片
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

// 取得雲端照片 URL（用 public URL 組法）
export function getRemotePhotoUrl(email: string, key: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/photos/${encodeURIComponent(email)}/${key}.jpg`
}
