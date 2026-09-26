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

/**
 * savePhoto：
 * - 有 email（登入中）→ 上傳至 Supabase Storage，IDB 存 public URL
 * - 無 email（未登入）→ IDB 存 base64（本機用）
 * 回傳最終可顯示的 src（URL 或 base64）
 */
export async function savePhoto(
  key: string,
  dataUrl: string,
  email?: string
): Promise<string | undefined> {
  if (email) {
    // 上傳至 Supabase Storage
    const { uploadPhoto } = await import('./photos')
    const url = await uploadPhoto(email, key, dataUrl)
    if (url) {
      // IDB 存 public URL，讓同裝置後續快速讀取
      try {
        const db = await openPhotoDB()
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(IDB_STORE, 'readwrite')
          tx.objectStore(IDB_STORE).put(url, key)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch { /* IDB 失敗不影響主流程 */ }
      return url
    }
    // Storage 上傳失敗 → fallback 存 base64 到 IDB
  }
  // 未登入或 Storage 失敗：存 base64 到 IDB
  try {
    const db = await openPhotoDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(dataUrl, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* 靜默失敗 */ }
  return dataUrl
}

/**
 * loadPhoto：
 * 1. 先查 IDB（可能是 URL 或 base64）
 * 2. IDB 沒有 + 有 email → 組 Supabase Storage public URL（跨裝置存取）
 */
export async function loadPhoto(
  key: string,
  email?: string
): Promise<string | undefined> {
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
  // IDB 沒有（換裝置）→ Supabase Storage public URL
  if (email) {
    const { getRemotePhotoUrl } = await import('./photos')
    return getRemotePhotoUrl(email, key)
  }
}

/**
 * deletePhoto：刪除 IDB 快取 + 雲端（有 email 時）
 */
export async function deletePhoto(key: string, email?: string): Promise<void> {
  try {
    const db = await openPhotoDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch { /* 靜默失敗 */ }
  if (email) {
    const { deleteRemotePhoto } = await import('./photos')
    await deleteRemotePhoto(email, key)
  }
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
// 照片以原始比例完整顯示（等比例縮放、不裁切、不變形），並限制最大高度
const CL_PHOTO_MAX_H_SINGLE = 360   // 單張照片最大高度
const CL_PHOTO_MAX_H_DOUBLE = 260   // 兩張並排時每張最大高度
const CL_PHOTO_GAP = 8

type PhotoBox = { img: HTMLImageElement; x: number; y: number; w: number; h: number }

// 依圖片比例計算一組（最多 2 張）照片的位置，回傳每張的繪製框與該列高度
function layoutPhotoRow(imgs: HTMLImageElement[], left: number, areaW: number): { boxes: PhotoBox[]; rowH: number } {
  if (imgs.length === 0) return { boxes: [], rowH: 0 }
  const cols = imgs.length === 1 ? 1 : 2
  const cellW = cols === 1 ? areaW : (areaW - CL_PHOTO_GAP) / 2
  const maxH = cols === 1 ? CL_PHOTO_MAX_H_SINGLE : CL_PHOTO_MAX_H_DOUBLE
  const sized = imgs.map(img => {
    const ratio = img.height / img.width
    let w = cellW, h = cellW * ratio
    if (h > maxH) { h = maxH; w = maxH / ratio }
    return { img, w, h }
  })
  const rowH = Math.max(...sized.map(s => s.h))
  const boxes = sized.map((s, i) => ({
    img: s.img,
    x: left + i * (cellW + CL_PHOTO_GAP) + (cellW - s.w) / 2,  // 在格子內水平置中
    y: (rowH - s.h) / 2,                                        // 相對列頂端，垂直置中
    w: s.w, h: s.h,
  }))
  return { boxes, rowH }
}

function drawLoadedPhoto(ctx: CanvasRenderingContext2D, b: PhotoBox, top: number, r: number, borderColor?: string) {
  const y = top + b.y
  ctx.save()
  roundRect(ctx, b.x, y, b.w, b.h, r)
  ctx.clip()
  ctx.drawImage(b.img, b.x, y, b.w, b.h)
  ctx.restore()
  if (borderColor) {
    ctx.save()
    roundRect(ctx, b.x, y, b.w, b.h, r)
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

async function loadImages(srcs: string[]): Promise<HTMLImageElement[]> {
  const results = await Promise.all(srcs.map(src => loadImage(src).catch(() => null)))
  return results.filter((x): x is HTMLImageElement => x !== null)
}

export async function drawChecklistCard(entry: {
  space: string; date: string; duration: number
  beforePhotos: string[]; afterPhotos: string[]; note: string
}): Promise<HTMLCanvasElement> {
  const W = 375
  const LINE_H  = 20
  const LABEL_H = 26
  const areaW = W - PAD * 2
  // duration 單位為「秒」；格式與 ChecklistTab / MemberTab 的 fmtMins 一致
  const fmtMins = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} 分 ${sec} 秒` : `${m} 分鐘` }

  // 先載入照片（最多各 2 張，與原本一致），無法載入的照片略過
  const beforeImgs = await loadImages(entry.beforePhotos.slice(0, 2))
  const afterImgs  = await loadImages(entry.afterPhotos.slice(0, 2))
  const beforeRow = layoutPhotoRow(beforeImgs, PAD, areaW)
  const afterRow  = layoutPhotoRow(afterImgs, PAD, areaW)
  const hasB = beforeRow.boxes.length > 0
  const hasA = afterRow.boxes.length > 0

  // 先算高度（與下方繪製的位移一致）
  const ctx0 = document.createElement('canvas').getContext('2d')!
  ctx0.font = '13px sans-serif'
  const noteLines = entry.note ? wrapText(ctx0, entry.note, areaW - 24) : []
  const noteH = entry.note ? noteLines.length * LINE_H + 24 : 0

  let H = PAD + 28 + 22 + 14            // 標題 + 日期 + 分隔
  if (hasB) H += LABEL_H + beforeRow.rowH + 14
  if (hasA) H += LABEL_H + afterRow.rowH + 14
  if (entry.note) H += noteH + 12
  H += 14 + PAD                         // 浮水印 + 底部

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
    ctx.font = '700 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#EDE2CC'
    roundRect(ctx, W/2 - 36, y, 72, 20, 10)
    ctx.fill()
    ctx.strokeStyle = '#CDB98A'; ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#7A6A50'
    ctx.fillText('BEFORE', W/2, y + 14)
    ctx.textAlign = 'left'
    y += LABEL_H

    beforeRow.boxes.forEach(b => drawLoadedPhoto(ctx, b, y, 8))
    y += beforeRow.rowH + 14
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
    y += LABEL_H

    afterRow.boxes.forEach(b => drawLoadedPhoto(ctx, b, y, 8, C_SG))
    y += afterRow.rowH + 14
  }

  // 備註
  if (entry.note) {
    ctx.fillStyle = C_CR
    roundRect(ctx, PAD, y, areaW, noteH, 10)
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
