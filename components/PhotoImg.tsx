'use client'
// ── PhotoImg：照片 reference → 可顯示的 <img> ──────────────────
// - empty / invalid：不 render、不發 request
// - data URL：直接顯示，不 signing
// - Storage path / Supabase Public URL：解析成 path → signed URL（crossOrigin="anonymous"）
// - signed URL 只存在這個元件的 state 與 photoSigner 的 memory cache，不會寫回任何資料
// - 圖片載入失敗時最多重新 sign 一次，之後交給呼叫端的 onError

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentPropsWithoutRef, SyntheticEvent } from 'react'
import { parsePhotoRef } from '@/lib/photoRef'
import {
  getPhotoCacheGeneration,
  getSignedPhotoUrl,
  invalidateSignedPhotoUrl,
  peekSignedPhotoUrl,
  subscribePhotoCacheOwner,
} from '@/lib/photoSigner'

export type PhotoImgProps = Omit<ComponentPropsWithoutRef<'img'>, 'src'> & {
  src?: string | null
}

type Resolved = { path: string; generation: number; attempt: number; url: string | null }

const getServerGeneration = () => 0

export default function PhotoImg({ src, alt = '', onError, crossOrigin, ...rest }: PhotoImgProps) {
  const ref = useMemo(() => parsePhotoRef(src), [src])
  const path = ref.type === 'storage' ? ref.path : null

  const generation = useSyncExternalStore(subscribePhotoCacheOwner, getPhotoCacheGeneration, getServerGeneration)
  const [attempt, setAttempt] = useState(0)
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const retriedRef = useRef<string | null>(null)

  // 只採用屬於目前 path、目前帳號 generation、目前嘗試次數的結果
  const current =
    resolved && resolved.path === path && resolved.generation === generation && resolved.attempt === attempt
      ? resolved
      : null
  // 首次 render 先用 cache（避免閃爍）；之後以 state 中的 URL 為準（cache 過期也不會讓已顯示的圖片消失）
  const signedUrl = path ? (current ? current.url : peekSignedPhotoUrl(path)) : null

  useEffect(() => {
    if (!path) return
    let active = true
    getSignedPhotoUrl(path).then(url => {
      if (active) setResolved({ path, generation, attempt, url })
    })
    return () => { active = false }
  }, [path, generation, attempt])

  const handleError = useCallback((e: SyntheticEvent<HTMLImageElement, Event>) => {
    const key = path ? `${generation}:${path}` : null
    // signed URL 可能已過期：同一 path 最多重新 sign 一次
    if (key && retriedRef.current !== key) {
      retriedRef.current = key
      invalidateSignedPhotoUrl(path!)
      setAttempt(a => a + 1)
      return
    }
    onError?.(e)
  }, [path, generation, onError])

  // signed URL 為短效 credential，不經過 next/image 最佳化 proxy
  if (ref.type === 'data') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...rest} alt={alt} crossOrigin={crossOrigin} src={ref.value} onError={onError} />
  }
  if (!path || !signedUrl) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} alt={alt} src={signedUrl} crossOrigin="anonymous" onError={handleError} />
}
