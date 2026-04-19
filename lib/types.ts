export type Decision = 'keep' | 'donate' | 'toss'

export type DeclutterItem = {
  id: string
  name: string
  decision: Decision | null
  category?: string
  disposeDate?: string
  tossMemo?: string
}

export type TossEntry = {
  id: string
  name: string
  memo: string
  date: string
  photo?: string
}

export type DeclutterRecord = {
  savedAt: string
  items: DeclutterItem[]
  tossEntries: TossEntry[]
}

export type ChecklistLog = {
  id: string
  date: string
  space: string
  note: string
  beforePhotos: string[]
  afterPhotos: string[]
  duration: number
  targetMinutes: number
}

export type ChallengeEntry = {
  day: number
  item: string
  origin: string
  reason: string
  feeling: string
  date: string
}

export const SHARE_BTNS = [
  { id: 'threads', label: 'Threads', color: '#000000' },
  { id: 'line', label: 'LINE', color: '#06C755' },
  { id: 'copy', label: '複製', color: '#888888' },
]

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
  document.body.appendChild(el)
  el.focus()
  el.select()
  try { document.execCommand('copy'); alert('已複製！') } catch { /* 無法複製 */ }
  document.body.removeChild(el)
}

export function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert('已複製！')).catch(() => fallbackCopy(text))
  } else {
    fallbackCopy(text)
  }
}

export function shareToSocial(platform: string, text: string) {
  if (platform === 'copy') {
    copyText(text)
    return
  }
  const urls: Record<string, string> = {
    threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
    line: `https://line.me/R/msg/text/?${encodeURIComponent(text)}`,
  }
  const url = urls[platform]
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 將 canvas.toBlob 轉成 Promise
export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob failed'))
    }, type)
  })
}

// 儲存/分享圖片：統一入口
export async function saveOrShareImage(canvas: HTMLCanvasElement, filename: string, shareText?: string) {
  try {
    const blob = await canvasToBlob(canvas)
    const file = new File([blob], filename, { type: 'image/png' })
    if (shareText && navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: shareText })
      return
    }
    // 下載
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error('saveOrShareImage error:', err)
    if (shareText) copyText(shareText)
  }
}

export const LS_CHECKLIST_LOGS = 'checklist_logs'
export const LS_DECLUTTER_RECORDS = 'declutter_records'
export const LS_CHALLENGE_DATA = 'challenge_data'

const IDB_NAME = 'organizer_photos'
const IDB_STORE = 'photos'
const IDB_VERSION = 1

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePhoto(key: string, dataUrl: string): Promise<void> {
  const db = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadPhoto(key: string): Promise<string | undefined> {
  const db = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => resolve(req.result as string | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function deletePhoto(key: string): Promise<void> {
  const db = await openPhotoDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function loadLS<T>(key: string, fallback: T, userId?: string): T {
  if (typeof window === 'undefined') return fallback
  try {
    const k = userId ? `${key}__${userId}` : key
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveLS<T>(key: string, value: T, userId?: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const k = userId ? `${key}__${userId}` : key
    if (value === null || value === undefined) {
      localStorage.removeItem(k)
    } else {
      localStorage.setItem(k, JSON.stringify(value))
    }
    return true
  } catch {
    try {
      const k = userId ? `${key}__${userId}` : key
      localStorage.removeItem(k)
      if (value !== null && value !== undefined) {
        localStorage.setItem(k, JSON.stringify(value))
      }
      return true
    } catch {
      console.warn('saveLS: localStorage quota exceeded for key:', key)
      return false
    }
  }
}