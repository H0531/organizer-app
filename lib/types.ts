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
