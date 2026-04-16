export type Decision = 'keep' | 'toss' | 'pending' | 'donate' | null

export type DeclutterItem = {
  id: string
  name: string
  decision?: Decision
  memo?: string
  date?: string
  category?: string
  disposeDate?: string
}

export type TossEntry = {
  id: string
  name: string
  memo?: string
  date: string
}

export type DeclutterRecord = {
  savedAt: string
  items: DeclutterItem[]
  tossEntries: TossEntry[]
}

export type ChecklistItem = {
  id: string
  text: string
  badge?: string
}

export const SHARE_BTNS = [
  { id: 'line', label: 'LINE', color: '#06C755' },
  { id: 'copy', label: '複製', color: '#888888' },
]

export function shareToSocial(platform: string, text: string) {
  if (platform === 'line') {
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`)
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(text)
  }
}
