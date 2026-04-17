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

// ── LocalStorage keys ──────────────────────────────────────────
export const LS_CHECKLIST_LOGS = 'checklist_logs'
export const LS_DECLUTTER_RECORDS = 'declutter_records'
export const LS_CHALLENGE_DATA = 'challenge_data'

// ── Persist helpers ────────────────────────────────────────────
export function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveLS<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* ignore quota */ }
}
