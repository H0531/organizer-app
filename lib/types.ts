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

export function shareToSocial(platform: string, text: string) {
  if (platform === 'threads') {
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`)
  } else if (platform === 'line') {
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`)
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(text)
  }
}

export const LS_CHECKLIST_LOGS = 'checklist_logs'
export const LS_DECLUTTER_RECORDS = 'declutter_records'
export const LS_CHALLENGE_DATA = 'challenge_data'

// ── IndexedDB photo storage ───────────────────────────────────
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
  } catch (e) {
    // Quota exceeded: try removing the key first then retry once
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