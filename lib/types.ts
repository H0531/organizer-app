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

// 偵測是否為 Chrome 瀏覽器（非 Edge/Safari）
export function isChrome(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Chrome/.test(ua) && !/Edg/.test(ua) && !/OPR/.test(ua)
}

// 偵測是否為 iOS 上的 Chrome（CriOS UA）
export function isIOSChrome(): boolean {
  if (typeof navigator === 'undefined') return false
  return /CriOS/.test(navigator.userAgent)
}

// Chrome 上傳照片的 input props：只開圖庫（不彈相機選擇）
export function photoInputProps(): { accept: string; capture?: string } {
  if (isChrome()) {
    // Chrome: 不加 capture，只用 accept image/* 會開圖庫+相機
    // 要強制只能圖庫，需要用非標準方式：移除 capture 並加 data-type hint
    // 實際上 Chrome 沒辦法完全禁止相機，但不加 capture 預設會開圖庫
    return { accept: 'image/*' }
  }
  return { accept: 'image/*' }
}

// 儲存/分享按鈕文字：Chrome 顯示「儲存圖片」，其他顯示「儲存 / 分享圖片」
export function saveShareLabel(): string {
  return isChrome() ? '📸 儲存圖片' : '📸 儲存 / 分享圖片'
}


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

    // Chrome：直接觸發下載存到圖庫，不走 share sheet
    if (isChrome()) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return
    }

    // 非 Chrome：優先 Web Share API（iOS Safari 等）
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

export async function savePhoto(
  key: string,
  dataUrl: string,
  email?: string
): Promise<string | undefined> {
  // 1. 存 IndexedDB（離線可用）
  const db = await openPhotoDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  // 2. 有登入則同步上傳雲端，回傳 URL
  if (email) {
    const { uploadPhoto } = await import('./photos')
    return (await uploadPhoto(email, key, dataUrl)) ?? undefined
  }
}

export async function loadPhoto(
  key: string,
  email?: string
): Promise<string | undefined> {
  // 先查 IndexedDB
  try {
    const db = await openPhotoDB()
    const local = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result as string | undefined)
      req.onerror = () => reject(req.error)
    })
    if (local) return local
  } catch {
    // IDB 失敗時繼續嘗試雲端
  }
  // IDB 沒有（換裝置）→ 從 Supabase Storage 取得 URL
  if (email) {
    const { getRemotePhotoUrl } = await import('./photos')
    return getRemotePhotoUrl(email, key)
  }
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
// ─────────────────────────────────────────────
// Canvas 分享卡繪製（不依賴 html2canvas，iOS 相容）
// ─────────────────────────────────────────────

const C_BG    = '#FAF8F4'
const C_INK   = '#2C2820'
const C_SG    = '#7A9E8A'
const C_ML    = '#6B6358'
const C_MF    = '#A39B8E'
const C_BD    = '#DDD8CF'
const C_CR    = '#EDE8DD'
const C_SERIF = "700 italic 15px 'Georgia', serif"
const WATERMARK = '整理小幫手'
const PAD = 28

function setupCanvas(w: number, h: number, dpr = 2): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width  = w * dpr
  canvas.height = h * dpr
  canvas.style.width  = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)
  return { canvas, ctx }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const char of para) {
      const test = line + char
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = char
      } else { line = test }
    }
    lines.push(line)
  }
  return lines
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

async function drawPhoto(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number, y: number, w: number, h: number,
  r = 8,
  borderColor?: string
) {
  try {
    const img = await loadImage(src)
    ctx.save()
    roundRect(ctx, x, y, w, h, r)
    ctx.clip()
    // cover fit
    const scale = Math.max(w / img.width, h / img.height)
    const sw = img.width  * scale
    const sh = img.height * scale
    const sx = x + (w - sw) / 2
    const sy = y + (h - sh) / 2
    ctx.drawImage(img, sx, sy, sw, sh)
    ctx.restore()
    if (borderColor) {
      ctx.save()
      roundRect(ctx, x, y, w, h, r)
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  } catch { /* 跳過無法載入的圖片 */ }
}

function drawWatermark(ctx: CanvasRenderingContext2D, y: number, cw: number, tag: string) {
  ctx.font = `11px sans-serif`
  ctx.fillStyle = C_MF
  ctx.textAlign = 'right'
  ctx.fillText(`${WATERMARK} ${tag}`, cw - PAD, y)
  ctx.textAlign = 'left'
}

// ── ChecklistTab 分享卡 ──────────────────────
export async function drawChecklistCard(entry: {
  space: string; date: string; duration: number
  beforePhotos: string[]; afterPhotos: string[]; note: string
}): Promise<HTMLCanvasElement> {
  const W = 375
  const PHOTO_H = 160
  const LINE_H  = 20
  const hasB = entry.beforePhotos.length > 0
  const hasA = entry.afterPhotos.length > 0
  const fmtMins = (s: number) => s >= 60 ? `${Math.floor(s/60)}hr${s%60?` ${s%60}min`:''}` : `${s}min`

  // 先算高度
  const ctx0 = document.createElement('canvas').getContext('2d')!
  ctx0.font = '13px sans-serif'
  const noteLines = entry.note ? wrapText(ctx0, entry.note, W - PAD * 2 - 24) : []
  const noteH = entry.note ? noteLines.length * LINE_H + 24 : 0

  let H = PAD + 28 + 8 + 16  // title + date + gap
  if (hasB) H += 24 + PHOTO_H + 14
  if (hasA) H += 24 + PHOTO_H + 14
  H += noteH + 20 + PAD       // note + watermark + bottom

  const { canvas, ctx } = setupCanvas(W, H)

  // 背景
  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, W, H)

  let y = PAD

  // 標題
  ctx.font = `700 20px 'Georgia', serif`
  ctx.fillStyle = C_INK
  ctx.fillText(`${entry.space}整理紀錄`, PAD, y + 20)
  y += 28

  // 日期
  ctx.font = '12px sans-serif'
  ctx.fillStyle = C_MF
  ctx.fillText(`${entry.date} · 用時 ${fmtMins(entry.duration)}`, PAD, y + 14)
  y += 22

  // 分隔
  ctx.strokeStyle = C_BD; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 14

  // BEFORE 照片
  if (hasB) {
    // label
    ctx.font = '700 11px sans-serif'
    ctx.fillStyle = '#7A6A50'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#EDE2CC'
    roundRect(ctx, W/2 - 36, y, 72, 20, 10)
    ctx.fill()
    ctx.strokeStyle = '#CDB98A'; ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#7A6A50'
    ctx.fillText('BEFORE', W/2, y + 14)
    ctx.textAlign = 'left'
    y += 26

    const n = entry.beforePhotos.length
    if (n === 1) {
      await drawPhoto(ctx, entry.beforePhotos[0], PAD, y, W - PAD*2, PHOTO_H)
    } else {
      const colW = (W - PAD*2 - 8) / 2
      for (let i = 0; i < Math.min(n, 2); i++) {
        await drawPhoto(ctx, entry.beforePhotos[i], PAD + i*(colW+8), y, colW, PHOTO_H)
      }
    }
    y += PHOTO_H + 14
  }

  // AFTER 照片
  if (hasA) {
    ctx.font = '700 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#E0F0E8'
    roundRect(ctx, W/2 - 36, y, 72, 20, 10)
    ctx.fill()
    ctx.strokeStyle = C_SG; ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#2E6B50'
    ctx.fillText('AFTER', W/2, y + 14)
    ctx.textAlign = 'left'
    y += 26

    const n = entry.afterPhotos.length
    if (n === 1) {
      await drawPhoto(ctx, entry.afterPhotos[0], PAD, y, W - PAD*2, PHOTO_H, 8, C_SG)
    } else {
      const colW = (W - PAD*2 - 8) / 2
      for (let i = 0; i < Math.min(n, 2); i++) {
        await drawPhoto(ctx, entry.afterPhotos[i], PAD + i*(colW+8), y, colW, PHOTO_H, 8, C_SG)
      }
    }
    y += PHOTO_H + 14
  }

  // 備註
  if (entry.note) {
    ctx.fillStyle = C_CR
    roundRect(ctx, PAD, y, W - PAD*2, noteH, 10)
    ctx.fill()
    ctx.font = '13px sans-serif'
    ctx.fillStyle = C_INK
    noteLines.forEach((line, i) => ctx.fillText(line, PAD + 12, y + 20 + i * LINE_H))
    y += noteH + 12
  }

  drawWatermark(ctx, y + 14, W, '#生活整理')
  return canvas
}

// ── DeclutterTab 分享卡 ──────────────────────
export async function drawDeclutterCard(entry: {
  name: string; memo: string; photo?: string
}): Promise<HTMLCanvasElement> {
  const W = 375
  const PHOTO_H = 200

  const ctx0 = document.createElement('canvas').getContext('2d')!
  ctx0.font = '13px sans-serif'
  const memoLines = entry.memo ? wrapText(ctx0, entry.memo, W - PAD*2 - 24) : []
  const memoH = entry.memo ? memoLines.length * 20 + 24 : 0

  let H = PAD + 26 + 12
  if (entry.photo) H += PHOTO_H + 12
  H += memoH + 24 + PAD

  const { canvas, ctx } = setupCanvas(W, H)
  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, W, H)

  // 外框
  roundRect(ctx, PAD/2, PAD/2, W - PAD, H - PAD, 12)
  ctx.strokeStyle = C_BD; ctx.lineWidth = 1; ctx.stroke()

  let y = PAD

  // 物品名稱
  ctx.font = `700 18px 'Georgia', serif`
  ctx.fillStyle = C_INK
  ctx.fillText(entry.name, PAD, y + 20)
  y += 32

  // 照片
  if (entry.photo) {
    await drawPhoto(ctx, entry.photo, PAD, y, W - PAD*2, PHOTO_H)
    y += PHOTO_H + 12
  }

  // 備註
  if (entry.memo) {
    ctx.fillStyle = C_CR
    roundRect(ctx, PAD, y, W - PAD*2, memoH, 8)
    ctx.fill()
    ctx.font = '13px sans-serif'
    ctx.fillStyle = C_ML
    memoLines.forEach((line, i) => ctx.fillText(line, PAD + 12, y + 20 + i * 20))
    y += memoH + 10
  }

  drawWatermark(ctx, y + 14, W, '#斷捨離')
  return canvas
}

// ── MemberTab / 通用文字卡 ────────────────────
export async function drawTextCard(title: string, text: string): Promise<HTMLCanvasElement> {
  const W = 375
  const ctx0 = document.createElement('canvas').getContext('2d')!
  ctx0.font = '13px sans-serif'
  const lines = wrapText(ctx0, text, W - PAD*2 - 24)
  const textH = lines.length * 20 + 24

  const H = PAD + 26 + 12 + textH + 24 + PAD

  const { canvas, ctx } = setupCanvas(W, H)
  ctx.fillStyle = C_BG
  ctx.fillRect(0, 0, W, H)

  let y = PAD

  ctx.font = `700 17px 'Georgia', serif`
  ctx.fillStyle = C_INK
  ctx.fillText(title, PAD, y + 20)
  y += 32

  ctx.fillStyle = C_CR
  roundRect(ctx, PAD, y, W - PAD*2, textH, 10)
  ctx.fill()
  ctx.font = '13px sans-serif'
  ctx.fillStyle = C_ML
  lines.forEach((line, i) => ctx.fillText(line, PAD + 12, y + 20 + i * 20))
  y += textH + 10

  drawWatermark(ctx, y + 14, W, '#生活整理')
  return canvas
}
