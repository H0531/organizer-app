'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { SHARE_BTNS, shareToSocial, loadLS, saveLS, LS_CHECKLIST_LOGS, saveOrShareImage, saveShareLabel, isChrome, drawChecklistCard } from '@/lib/types'
import type { ChecklistLog } from '@/lib/types'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

const SP: Record<string, { label: string; items: { text: string; badge?: string }[] }> = {
  living:   { label: '玄關客廳整理清單', items: [{ text: '外出用品歸位', badge: '必做' }, { text: '清查公共備品是否過多' }, { text: '影音設備線材整理綁好' }, { text: '沙發雜物清空' }, { text: '鞋櫃清查過多的鞋' }, { text: '玄關只留今日外出用品' }] },
  bedroom:  { label: '臥室整理清單', items: [{ text: '床頭雜物清空只留睡前必用品', badge: '必做' }, { text: '床底下清查囤放物品' }, { text: '寢具確認數量只留兩套' }, { text: '個人用品歸回固定位置' }, { text: '地板淨空無散落物品' }, { text: '梳妝台只留每日使用的保養品' }] },
  wardrobe: { label: '衣櫃整理清單', items: [{ text: '全部衣物取出攤開', badge: '必做' }, { text: '分類為上衣、褲子、外套' }, { text: '超過一年未穿考慮送出' }, { text: '破損變形衣物直接淘汰' }, { text: '常穿放前方少穿放後方' }, { text: '折疊統一方式直立收納' }] },
  kitchen:  { label: '廚房整理清單', items: [{ text: '清查過期食品與調味料', badge: '必做' }, { text: '餐具統計過多的送出' }, { text: '常用鍋具放瓦斯爐旁' }, { text: '塑膠袋只留10個' }, { text: '清潔用品集中一區' }, { text: '冰箱門背貼購物清單欄' }] },
  study:    { label: '書房整理清單', items: [{ text: '清空桌面所有物品', badge: '必做' }, { text: '分類文件文具雜物' }, { text: '丟棄過期收據廢紙' }, { text: '書籍只留會再翻的' }, { text: '電線整理貼上標籤' }, { text: '桌面只留今日必要物品' }] },
  bathroom: { label: '浴室整理清單', items: [{ text: '清查過期保養品藥品', badge: '必做' }, { text: '只留1套備用備品' }, { text: '毛巾超過3條斷捨離' }, { text: '瓶瓶罐罐整理到收納架' }, { text: '清除水垢黴菌' }, { text: '確認每樣物品有固定位置' }] },
  storage:  { label: '儲藏室整理清單', items: [{ text: '清查超過一年未動的物品', badge: '必做' }, { text: '依類型分區工具備品季節物品' }, { text: '過期囤貨直接丟棄' }, { text: '箱子貼標籤標明內容物' }, { text: '清出走道保持通道順暢' }, { text: '只留有明確用途的物品' }] },
  bag:      { label: '包包整理清單', items: [{ text: '倒出所有東西', badge: '必做' }, { text: '丟棄發票廢紙屑' }, { text: '零錢集中到錢包' }, { text: '超過3個購物袋只留一個' }, { text: '藥品確認是否過期' }, { text: '常用物品分區放小包' }] },
  digital:  { label: '數位整理清單', items: [{ text: '截圖資料夾整理或刪除', badge: '必做' }, { text: '手機App超過3頁刪一輪' }, { text: '相簿備份到雲端' }, { text: '訂閱email取消不需要的' }, { text: '桌面資料夾分類命名' }, { text: '清除瀏覽器書籤' }] },
}
const SI: Record<string, string> = { living: '🛋', bedroom: '🛏', wardrobe: '👕', kitchen: '🍳', study: '📚', bathroom: '🪥', storage: '📦', bag: '👜', digital: '📱' }
const SN: Record<string, string> = { living: '玄關客廳', bedroom: '臥室', wardrobe: '衣櫃', kitchen: '廚房', study: '書房', bathroom: '浴室', storage: '儲藏室', bag: '包包', digital: '數位' }
const SE: Record<string, string> = { living: '20–40 分鐘', bedroom: '30–60 分鐘', wardrobe: '60–90 分鐘', kitchen: '45–60 分鐘', study: '30–50 分鐘', bathroom: '20–30 分鐘', storage: '60–120 分鐘', bag: '10–20 分鐘', digital: '30–60 分鐘' }

const PRESET_MINS = [10, 30, 60, 90, 120]
const MAX_PHOTOS = 5
const APP_URL = typeof window !== 'undefined' ? window.location.origin + '/?tab=checklist' : 'https://organizer-app.vercel.app/?tab=checklist'

type PhotoSet = string[]
type CustomItem = { text: string; id: string }

const fmtSecs = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const fmtMins = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} 分 ${sec} 秒` : `${m} 分鐘` }
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

type ScheduledItem = {
  id: string; space: string; date: string; time: string; durationMins: number
  beforePhotos: string[]; skipBefore: boolean
}

function generateIcs(date: string, time: string, spaceName: string, durationMins: number, appUrl: string): string {
  const start = new Date(`${date}T${time}`)
  const end = new Date(start.getTime() + durationMins * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `organizer-${Date.now()}@organizer-app`
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//整理小幫手//ZH', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:整理${spaceName} — 整理小幫手`,
    `DESCRIPTION:整理小幫手提醒：今天要整理了！\\\\\\\\n開啟整理清單：${appUrl}`,
    'BEGIN:VALARM', 'TRIGGER:-PT1D', 'ACTION:DISPLAY', 'DESCRIPTION:明天要整理囉！', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
function downloadIcs(icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'organizer-schedule.ics'
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function PhotoEditor({ src, onDone, onCancel }: { src: string; onDone: (edited: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 })
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => { imgRef.current = img; drawPreview() }
    img.src = src
  }, [src])

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current; const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')!
    const size = 280
    canvas.width = size; canvas.height = size
    ctx.clearRect(0, 0, size, size)
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore()
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    const cx = crop.x * size, cy = crop.y * size, cw = crop.w * size, ch = crop.h * size
    ctx.fillRect(0, 0, size, cy); ctx.fillRect(0, cy + ch, size, size - cy - ch)
    ctx.fillRect(0, cy, cx, ch); ctx.fillRect(cx + cw, cy, size - cx - cw, ch)
    ctx.strokeStyle = sg; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, cw, ch)
  }, [rotation, crop])

  useEffect(() => { drawPreview() }, [drawPreview])

  const applyAndDone = () => {
    const img = imgRef.current; if (!img) return
    const out = document.createElement('canvas'); const size = 560
    out.width = size; out.height = size
    const ctx = out.getContext('2d')!
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore()
    const cx = crop.x * size, cy = crop.y * size, cw = crop.w * size, ch = crop.h * size
    const cropped = document.createElement('canvas')
    cropped.width = cw; cropped.height = ch
    cropped.getContext('2d')!.drawImage(out, cx, cy, cw, ch, 0, 0, cw, ch)
    onDone(cropped.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: ink, marginBottom: 16 }}>裁切 / 旋轉照片</div>
        <canvas ref={canvasRef} style={{ width: 280, height: 280, borderRadius: 10, display: 'block', margin: '0 auto 14px', border: `1px solid ${bd}` }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {([['左邊界', 'x', 0, 1 - crop.w], ['上邊界', 'y', 0, 1 - crop.h], ['寬度', 'w', 0.2, 1 - crop.x], ['高度', 'h', 0.2, 1 - crop.y]] as [string, keyof typeof crop, number, number][]).map(([label, key, min, max]) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: mf, marginBottom: 3 }}>{label}</div>
              <input type="range" min={min} max={max} step={0.01} value={crop[key]}
                onChange={e => setCrop(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
                style={{ width: '100%' }} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: mf, marginBottom: 3 }}>旋轉 {rotation}°</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 90, 180, 270].map(r => (
              <button key={r} onClick={() => setRotation(r)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: `1px solid ${rotation === r ? sg : bd}`, background: rotation === r ? '#EAF2EE' : 'white', color: rotation === r ? sg : ml, fontSize: 11, cursor: 'pointer' }}>
                {r === 0 ? '原圖' : `${r}°`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={applyAndDone} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>套用</button>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>取消</button>
        </div>
      </div>
    </div>
  )
}

function PhotoStrip({ photos, onAdd, onRemove, onEdit, skipped, onSkip, label, color }: {
  photos: string[]; onAdd: (f: FileList) => void; onRemove: (i: number) => void; onEdit: (i: number) => void
  skipped: boolean; onSkip: () => void; label: string; color: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: ml, fontWeight: 500 }}>{label}</div>
        <button onClick={onSkip} style={{ fontSize: 12, color: skipped ? sg : mf, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          {skipped ? '取消略過' : '不上傳照片'}
        </button>
      </div>
      {skipped ? (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: cr, fontSize: 13, color: mf, textAlign: 'center' }}>已略過照片上傳</div>
      ) : (
        <>
          {photos.length === 0 && (
            <div style={{ border: `1px dashed ${bd}`, borderRadius: 10, padding: 16, background: 'white', textAlign: 'center', marginBottom: 10 }}>
              <svg width="52" height="38" viewBox="0 0 52 38" fill="none" style={{ display: 'block', margin: '0 auto 8px' }}>
                <rect x="2" y="9" width="48" height="27" rx="4" fill={cr} stroke={bd} strokeWidth="1.5" />
                <circle cx="26" cy="22.5" r="8.5" fill="white" stroke={mf} strokeWidth="1.5" />
                <circle cx="26" cy="22.5" r="5" fill={cr} stroke={mf} strokeWidth="1" />
                <rect x="17" y="4" width="18" height="8" rx="2.5" fill={bd} />
                <circle cx="41" cy="14" r="2.5" fill={mf} />
              </svg>
              <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>站在空間正前方，平行拍攝整體<br />上傳後可裁切旋轉</div>
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 82, height: 82, objectFit: 'cover', borderRadius: 8, border: `2px solid ${color}`, display: 'block' }} />
                  <button onClick={() => onEdit(i)} style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)', background: '#fff', border: `1px solid ${sg}`, borderRadius: 8, fontSize: 10, color: sg, padding: '1px 6px', cursor: 'pointer' }}>編輯</button>
                  <button onClick={() => onRemove(i)} style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#777', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS ? (
            <>
              <button onClick={() => ref.current?.click()} style={{ padding: '7px 16px', border: `1px dashed ${color}`, borderRadius: 8, background: 'white', color: color, cursor: 'pointer', fontSize: 13 }}>
                ＋ 上傳照片{photos.length > 0 ? `（${photos.length}/${MAX_PHOTOS}）` : ''}
              </button>
              <input ref={ref} type="file" accept="image/*"
                {...(isChrome() ? {} : { capture: undefined })}
                multiple
                style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                onChange={e => { if (e.target.files) { onAdd(e.target.files); e.target.value = '' } }} />
            </>
          ) : (
            <div style={{ fontSize: 12, color: mf }}>已達上限（{MAX_PHOTOS} 張）</div>
          )}
        </>
      )}
    </div>
  )
}

function PageDots({ page }: { page: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[1, 2, 3].map(p => <div key={p} style={{ width: p === page ? 22 : 7, height: 7, borderRadius: 4, background: p === page ? sg : cr, transition: 'all 0.3s' }} />)}
    </div>
  )
}

function SavedPopup({ entry, onShare, onClose }: { entry: ChecklistLog; onShare: () => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.55)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: ww, borderRadius: 20, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 8, fontWeight: 700 }}>
          {entry.space}整理完成囉！
        </div>
        <div style={{ fontSize: 13, color: ml, lineHeight: 1.8, marginBottom: 20 }}>
          整理紀錄已製成圖卡 📸<br />
          可以點左上角分享、儲存圖片，<br />
          或到<strong style={{ color: sg }}>會員區</strong>隨時回顧每次整理成果。
        </div>
        <button onClick={onShare}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600, marginBottom: 10 }}>
          📷 查看並分享整理圖卡
        </button>
        <button onClick={onClose}
          style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>
          先到成果紀錄看看
        </button>
      </div>
    </div>
  )
}

const CL_PAGE_KEY = 'checklist_page'
const CL_DRAFT_KEY = 'checklist_draft'  // 整理中草稿

type ChecklistDraft = {
  space: string
  checked: Record<string, boolean[]>
  beforePhotos: string[]
  afterPhotos: string[]
  skipBefore: boolean
  skipAfter: boolean
  note: string
  accumulatedSecs: number   // 已計時的秒數（暫停前累積）
  startedAt: number | null  // 目前計時段的開始 timestamp（null = 暫停中）
  targetMins: number
  useCustom: boolean
  customMins: string
}
type Props = { onSaveLog: (log: ChecklistLog) => void; onDeleteLog?: (id: string) => void; onEditLog?: (id: string, note: string) => void; initialLogs?: ChecklistLog[]; userId?: string }

export default function ChecklistTab({ onSaveLog, onDeleteLog, onEditLog, initialLogs, userId }: Props) {
  const [page, setPageRaw] = useState<1 | 2 | 3>(1)
  const setPage = (p: 1 | 2 | 3) => { setPageRaw(p); saveLS(CL_PAGE_KEY, p) }

  const [space, setSpace] = useState('living')
  const [checked, setChecked] = useState<Record<string, boolean[]>>({})
  const [customItems, setCustomItems] = useState<Record<string, CustomItem[]>>({})
  const [newItemText, setNewItemText] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)

  const [beforePhotos, setBeforePhotos] = useState<PhotoSet>([])
  const [afterPhotos, setAfterPhotos] = useState<PhotoSet>([])
  const [skipBefore, setSkipBefore] = useState(false)
  const [skipAfter, setSkipAfter] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState<{ type: 'before' | 'after'; index: number; src: string } | null>(null)

  const [targetMins, setTargetMins] = useState(30)
  const [customMins, setCustomMins] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)
  // 計時：accumulatedSecs = 暫停前已累積的秒數；startedAt = 本段計時開始的 timestamp
  const [accumulatedSecs, setAccumulatedSecs] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSavingRef = useRef(false)
  const timerSectionRef = useRef<HTMLDivElement>(null)
  // elapsedSecs：即時計算，供顯示和儲存用
  const elapsedSecs = timerRunning && startedAt !== null
    ? accumulatedSecs + Math.floor((Date.now() - startedAt) / 1000)
    : accumulatedSecs

  const [note, setNote] = useState('')
  const [saveFlash, setSaveFlash] = useState(false)
  const [isSavingUI, setIsSavingUI] = useState(false)

  const [showCalModal, setShowCalModal] = useState(false)
  const [calDate, setCalDate] = useState('')
  const [calTime, setCalTime] = useState('')
  const [calError, setCalError] = useState('')
  const [scheduledItems, setScheduledItems] = useState<ScheduledItem[]>([])
  const [expandScheduled, setExpandScheduled] = useState(false)

  const [logs, setLogs] = useState<ChecklistLog[]>([])
  const [shareEntry, setShareEntry] = useState<ChecklistLog | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [savedPopupEntry, setSavedPopupEntry] = useState<ChecklistLog | null>(null)

  // 同步外部傳入的 logs（登入後 Supabase 載入完成時）
  useEffect(() => {
    if (initialLogs !== undefined) setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    if (initialLogs === undefined) {
      const saved = loadLS<ChecklistLog[]>(LS_CHECKLIST_LOGS, [], userId)
      setLogs(saved)
    }
    const sched = loadLS<ScheduledItem[]>('checklist_scheduled', [])
    setScheduledItems(sched)
    const savedCustom = loadLS<Record<string, CustomItem[]>>('checklist_custom_items', {})
    setCustomItems(savedCustom)
    const savedPage = loadLS<number>(CL_PAGE_KEY, 1)
    const existingLogs = initialLogs ?? loadLS<ChecklistLog[]>(LS_CHECKLIST_LOGS, [], userId)
    if (savedPage === 3 || (existingLogs.length > 0 && savedPage !== 2)) {
      setPageRaw(3)
    } else if (savedPage === 2) {
      // 恢復整理中草稿
      const draft = loadLS<ChecklistDraft | null>(CL_DRAFT_KEY, null)
      if (draft) {
        setSpace(SP[draft.space] ? draft.space : 'living')
        setChecked(draft.checked)
        setBeforePhotos(draft.beforePhotos ?? [])
        setAfterPhotos(draft.afterPhotos ?? [])
        setSkipBefore(draft.skipBefore ?? false)
        setSkipAfter(draft.skipAfter ?? false)
        setNote(draft.note ?? '')
        setTargetMins(draft.targetMins ?? 30)
        setUseCustom(draft.useCustom ?? false)
        setCustomMins(draft.customMins ?? '')
        // 計算重整時已過的時間：若之前在計時中，把離開到現在的時間也加進來
        const savedAcc = draft.accumulatedSecs ?? (draft as unknown as {elapsedSecs?: number}).elapsedSecs ?? 0
        const savedStartedAt = draft.startedAt ?? null
        const restoredAcc = savedStartedAt !== null
          ? savedAcc + Math.floor((Date.now() - savedStartedAt) / 1000)
          : savedAcc
        setAccumulatedSecs(restoredAcc)
        setStartedAt(null)        // 恢復後一律暫停，讓使用者主動按繼續
        setTimerRunning(false)
        const tMins = draft.targetMins ?? 30
        const remaining = Math.max(0, tMins * 60 - restoredAcc)
        setTimeLeft(remaining)
        setTimerDone(remaining === 0)
        setPageRaw(2)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const effectiveMins = useCustom ? Math.max(1, parseInt(customMins) || 1) : targetMins
  const totalSecs = effectiveMins * 60
  const beforeReady = skipBefore || beforePhotos.length > 0
  const afterReady = skipAfter || afterPhotos.length > 0

  const allItems = [
    ...SP[space].items,
    ...(customItems[space] || []).map(ci => ({ text: ci.text, id: ci.id })),
  ]
  const getC = () => {
    const c = checked[space] || []
    if (c.length < allItems.length) return [...c, ...Array(allItems.length - c.length).fill(false)]
    return c
  }
  const toggleC = (i: number) => {
    const c = getC(); const n = [...c]; n[i] = !n[i]
    setChecked({ ...checked, [space]: n })
  }
  const done = getC().filter(Boolean).length
  const total = allItems.length
  const checklistDone = done === total && total > 0
  const canSave = checklistDone && afterReady

  const addCustomItem = () => {
    if (!newItemText.trim()) return
    const newItem: CustomItem = { text: newItemText.trim(), id: Date.now().toString() }
    const next = { ...customItems, [space]: [...(customItems[space] || []), newItem] }
    setCustomItems(next); saveLS('checklist_custom_items', next)
    setNewItemText(''); setShowAddItem(false)
  }
  const removeCustomItem = (id: string) => {
    const spaceCustom = (customItems[space] || []).filter(ci => ci.id !== id)
    const next = { ...customItems, [space]: spaceCustom }
    setCustomItems(next); saveLS('checklist_custom_items', next)
    const presetLen = SP[space].items.length
    const c = getC().slice(0, presetLen + spaceCustom.length)
    setChecked({ ...checked, [space]: c })
  }

  const draftTickRef = useRef(0)
  useEffect(() => {
    if (timerRunning && startedAt !== null) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { setTimerRunning(false); setTimerDone(true); clearInterval(timerRef.current!); return 0 }
          return t - 1
        })
        draftTickRef.current += 1
        // 每 30 秒存一次草稿（含目前的 startedAt，讓重整後能繼續計算）
        if (draftTickRef.current % 30 === 0) {
          saveLS(CL_DRAFT_KEY, {
            space, checked, beforePhotos, afterPhotos,
            skipBefore, skipAfter, note,
            accumulatedSecs, startedAt,
            targetMins, useCustom, customMins,
          } as ChecklistDraft)
        }
      }, 1000)
    } else { if (timerRef.current) clearInterval(timerRef.current) }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning, startedAt, space, checked, beforePhotos, afterPhotos, skipBefore, skipAfter, note, accumulatedSecs, targetMins, useCustom, customMins])

  const addPhotos = (type: 'before' | 'after', files: FileList) => {
    const cur = type === 'before' ? beforePhotos : afterPhotos
    const set = type === 'before' ? setBeforePhotos : setAfterPhotos
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - cur.length)
    Promise.all(toAdd.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(f) }))).then(res => {
      const next = [...cur, ...res]
      set(next)
      if (page === 2) saveLS(CL_DRAFT_KEY, {
        space, checked,
        beforePhotos: type === 'before' ? next : beforePhotos,
        afterPhotos: type === 'after' ? next : afterPhotos,
        skipBefore, skipAfter, note,
        accumulatedSecs: elapsedSecs, startedAt: null,
        targetMins, useCustom, customMins,
      } as ChecklistDraft)
    })
  }
  const removePhoto = (type: 'before' | 'after', i: number) => {
    if (type === 'before') setBeforePhotos(p => p.filter((_, idx) => idx !== i))
    else setAfterPhotos(p => p.filter((_, idx) => idx !== i))
  }
  const openPhotoEditor = (type: 'before' | 'after', i: number) => {
    const photos = type === 'before' ? beforePhotos : afterPhotos
    setEditingPhoto({ type, index: i, src: photos[i] })
  }
  const applyPhotoEdit = (edited: string) => {
    if (!editingPhoto) return
    const { type, index } = editingPhoto
    if (type === 'before') setBeforePhotos(p => p.map((x, i) => i === index ? edited : x))
    else setAfterPhotos(p => p.map((x, i) => i === index ? edited : x))
    setEditingPhoto(null)
  }

  // 載入預約：恢復整理前照片、空間、計時設定
  const loadScheduled = (item: ScheduledItem) => {
    setSpace(item.space)
    if (item.beforePhotos && item.beforePhotos.length > 0) {
      setBeforePhotos(item.beforePhotos); setSkipBefore(false)
    } else if (item.skipBefore) {
      setSkipBefore(true); setBeforePhotos([])
    }
    setTargetMins(item.durationMins); setUseCustom(false)
    setExpandScheduled(false)
  }

  // 整理中草稿：暫停時存 accumulatedSecs（不存 startedAt，重整後視為暫停）
  const saveDraft = (overrides: Partial<ChecklistDraft> = {}) => {
    const draft: ChecklistDraft = {
      space, checked,
      beforePhotos, afterPhotos,
      skipBefore, skipAfter, note,
      accumulatedSecs: elapsedSecs,  // 存入即時 elapsed（含目前計時段）
      startedAt: null,               // 重整後一律暫停
      targetMins, useCustom, customMins,
      ...overrides,
    }
    saveLS(CL_DRAFT_KEY, draft)
  }
  const clearDraft = () => saveLS(CL_DRAFT_KEY, null)

  const startTimer = () => {
    const now = Date.now()
    setTimeLeft(totalSecs)
    setAccumulatedSecs(0)
    setStartedAt(now)
    setTimerDone(false)
    setTimerRunning(true)
    setPage(2)
    // 進入整理中頁面後，捲動到計時器位置
    setTimeout(() => {
      timerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    saveLS(CL_DRAFT_KEY, {
      space, checked, beforePhotos, afterPhotos: [],
      skipBefore, skipAfter: false, note: '',
      accumulatedSecs: 0, startedAt: now,
      targetMins: effectiveMins, useCustom, customMins,
    } as ChecklistDraft)
  }

  const saveLog = async () => {
    if (!canSave || isSavingRef.current) return
    isSavingRef.current = true
    setIsSavingUI(true)
    const defaultNote = `完成了${SN[space]}整理，用時 ${fmtMins(elapsedSecs)}。`

    // 壓縮 → dataUrl
    const compressPhoto = (src: string): Promise<string> => new Promise(res => {
      const img = new Image(); img.onload = () => {
        const c = document.createElement('canvas')
        const max = 800; const r = Math.min(max / img.width, max / img.height, 1)
        c.width = img.width * r; c.height = img.height * r
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        res(c.toDataURL('image/jpeg', 0.5))
      }; img.src = src
    })

    // 上傳至 Supabase Storage（有 userId 時），回傳 URL 或 fallback dataUrl
    const logId = Date.now().toString()
    const uploadOrCompress = async (src: string, idx: number, prefix: 'before' | 'after'): Promise<string> => {
      const compressed = await compressPhoto(src)
      if (userId) {
        const { uploadPhoto } = await import('@/lib/photos')
        const url = await uploadPhoto(userId, `checklist_${logId}_${prefix}_${idx}`, compressed)
        if (url) return url
      }
      return compressed
    }

    const bp = skipBefore ? [] : await Promise.all(beforePhotos.map((s, i) => uploadOrCompress(s, i, 'before')))
    const ap = skipAfter  ? [] : await Promise.all(afterPhotos.map((s, i) => uploadOrCompress(s, i, 'after')))
    const entry: ChecklistLog = {
      id: logId, date: new Date().toLocaleDateString('zh-TW'),
      space: SN[space], note: note.trim() || defaultNote,
      beforePhotos: bp, afterPhotos: ap,
      duration: elapsedSecs, targetMinutes: effectiveMins,
    }
    const next = [entry, ...logs]
    setLogs(next); onSaveLog(entry)
    setNote(''); setBeforePhotos([]); setAfterPhotos([]); setSkipBefore(false); setSkipAfter(false)
    setChecked({ ...checked, [space]: allItems.map(() => false) })
    setTimerDone(false); setAccumulatedSecs(0); setStartedAt(null); setTimeLeft(0)
    clearDraft()  // 儲存成功後清除草稿
    setSaveFlash(true)
    isSavingRef.current = false
    setIsSavingUI(false)
    setTimeout(() => {
      setSaveFlash(false); setPage(3)
      setTimeout(() => setSavedPopupEntry(entry), 150)
    }, 600)
  }

  const validateAndDownloadIcs = () => {
    setCalError('')
    if (!calDate || !calTime) { setCalError('請選擇日期和時間'); return }
    if (new Date(`${calDate}T${calTime}`) <= new Date()) { setCalError('請選擇當下之後的時間'); return }
    const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/?tab=checklist` : APP_URL
    const ics = generateIcs(calDate, calTime, SN[space], effectiveMins, appUrl)
    downloadIcs(ics)
    const newItem: ScheduledItem = {
      id: Date.now().toString(), space, date: calDate, time: calTime,
      durationMins: effectiveMins, beforePhotos: [...beforePhotos], skipBefore,
    }
    const next = [newItem, ...scheduledItems]; setScheduledItems(next); saveLS('checklist_scheduled', next)
    setShowCalModal(false)
  }
  const removeScheduled = (id: string) => {
    const next = scheduledItems.filter(s => s.id !== id); setScheduledItems(next); saveLS('checklist_scheduled', next)
  }
  const saveEdit = () => {
    if (!editingId) return
    const next = logs.map(l => l.id === editingId ? { ...l, note: editNote } : l)
    setLogs(next)
    if (onEditLog) onEditLog(editingId, editNote)
    else saveLS(LS_CHECKLIST_LOGS, next, userId)
    setEditingId(null)
  }
  const deleteLog = (id: string) => {
    const next = logs.filter(l => l.id !== id)
    setLogs(next)
    if (onDeleteLog) onDeleteLog(id)
    else saveLS(LS_CHECKLIST_LOGS, next, userId)
    setConfirmDeleteId(null); if (shareEntry?.id === id) setShareEntry(null)
  }
  const shareText = (e: ChecklistLog) => `我完成了${e.space}整理！用時 ${fmtMins(e.duration)} ✨\n${e.note}\n#整理小幫手 #生活整理`
  const shareCardRef = useRef<HTMLDivElement>(null)
  const captureAndShare = async (entry: ChecklistLog) => {
    try {
      const canvas = await drawChecklistCard({ space: entry.space, date: entry.date, duration: entry.duration, beforePhotos: entry.beforePhotos, afterPhotos: entry.afterPhotos, note: entry.note })
      await saveOrShareImage(canvas, 'organizer-diary.png', shareText(entry))
    } catch { shareToSocial('copy', shareText(entry)) }
  }

  // ── PAGE 1 ───────────────────────────────────────────────
  if (page === 1) return (
    <div>
      {/* 繼續未完成整理的提示 */}
      {(() => {
        const draft = loadLS<ChecklistDraft | null>(CL_DRAFT_KEY, null)
        if (!draft || !draft.space) return null
        const SN_MAP: Record<string, string> = { desk: '書桌', wardrobe: '衣櫃', kitchen: '廚房', bathroom: '浴室', bag: '包包', digital: '數位' }
        const spName = SN_MAP[draft.space] ?? draft.space
        const doneCount = Object.values(draft.checked[draft.space] ?? []).filter(Boolean).length
        const totalCount = (SP[draft.space]?.items.length ?? 0) + ((draft.checked[draft.space]?.length ?? 0) - (SP[draft.space]?.items.length ?? 0))
        return (
          <div style={{ background: '#FDF9F0', border: '1.5px solid #C4953A', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#7A5E2A', marginBottom: 3 }}>
                ⏸ 上次 {spName} 整理還沒完成
              </div>
              <div style={{ fontSize: 12, color: ml }}>
                清單完成 {doneCount} / {totalCount > 0 ? totalCount : '?'} 項
                {((draft.accumulatedSecs ?? (draft as unknown as {elapsedSecs?: number}).elapsedSecs ?? 0) > 0) && `・已計時 ${Math.floor((draft.accumulatedSecs ?? (draft as unknown as {elapsedSecs?: number}).elapsedSecs ?? 0) / 60)} 分`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => {
                const acc = draft.accumulatedSecs ?? (draft as unknown as {elapsedSecs?: number}).elapsedSecs ?? 0
                const sAt = draft.startedAt ?? null
                const restored = sAt !== null ? acc + Math.floor((Date.now() - sAt) / 1000) : acc
                setSpace(draft.space)
                setChecked(draft.checked)
                setBeforePhotos(draft.beforePhotos ?? [])
                setAfterPhotos(draft.afterPhotos ?? [])
                setSkipBefore(draft.skipBefore ?? false)
                setSkipAfter(draft.skipAfter ?? false)
                setNote(draft.note ?? '')
                setAccumulatedSecs(restored)
                setStartedAt(null)
                setTargetMins(draft.targetMins ?? 30)
                setUseCustom(draft.useCustom ?? false)
                setCustomMins(draft.customMins ?? '')
                setTimeLeft(Math.max(0, (draft.targetMins ?? 30) * 60 - restored))
                setTimerDone(restored >= (draft.targetMins ?? 30) * 60)
                setTimerRunning(false)
                setPageRaw(2)
                saveLS(CL_PAGE_KEY, 2)
              }} style={{ fontSize: 12, color: 'white', background: '#C4953A', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
                繼續整理
              </button>
              <button onClick={() => saveLS(CL_DRAFT_KEY, null)} style={{ fontSize: 12, color: mf, background: 'none', border: `1px solid ${bd}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                放棄
              </button>
            </div>
          </div>
        )
      })()}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, color: ink, margin: 0 }}>今天整理哪裡？</h1>
        {logs.length > 0 && (
          <button onClick={() => setPage(3)} style={{ fontSize: 13, color: sg, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
            整理紀錄 {logs.length} 筆 →
          </button>
        )}
      </div>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20 }}>選空間、拍整理前照片、設好時間，再開始</p>
      <PageDots page={1} />

      {/* 預約整理 — 可點擊載入並提前整理 */}
      {scheduledItems.length > 0 && (
        <div style={{ background: '#EAF2EE', border: `1.5px solid ${sg}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expandScheduled ? 10 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50' }}>📅 預約整理（{scheduledItems.length} 筆）</div>
            <button onClick={() => setExpandScheduled(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>{expandScheduled ? '收起' : '查看'}</button>
          </div>
          {expandScheduled && scheduledItems.map(s => (
            <div key={s.id} style={{ borderTop: `1px solid ${sg}22`, paddingTop: 10, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{SN[s.space] || s.space}整理</span>
                  <span style={{ fontSize: 12, color: ml, marginLeft: 8 }}>{s.date} {s.time}</span>
                  <span style={{ fontSize: 11, color: mf, marginLeft: 6 }}>· {s.durationMins} 分</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => loadScheduled(s)}
                    style={{ fontSize: 12, color: 'white', background: sg, border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>
                    {new Date(`${s.date}T${s.time}`) > new Date() ? '提前整理' : '開始整理'}
                  </button>
                  <button onClick={() => removeScheduled(s.id)} style={{ fontSize: 11, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>移除</button>
                </div>
              </div>
              {s.beforePhotos && s.beforePhotos.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {s.beforePhotos.slice(0, 3).map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, border: `1px solid ${bd}` }} />
                  ))}
                  {s.beforePhotos.length > 3 && <div style={{ width: 52, height: 40, borderRadius: 6, background: cr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: mf }}>+{s.beforePhotos.length - 3}</div>}
                </div>
              )}
              {s.skipBefore && <div style={{ fontSize: 11, color: mf, marginTop: 4 }}>整理前照片：已略過</div>}
            </div>
          ))}
        </div>
      )}

      {/* 空間選擇 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {Object.keys(SP).map(k => (
          <button key={k} onClick={() => setSpace(k)} style={{
            padding: '14px 10px 12px', border: space === k ? `2px solid ${sg}` : `1px solid ${bd}`,
            borderRadius: 10, background: space === k ? '#EAF2EE' : ww, cursor: 'pointer', textAlign: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{SI[k]}</span>
            <span style={{ fontSize: 13, color: ink, display: 'block', marginBottom: 3 }}>{SN[k]}</span>
            <span style={{ fontSize: 10, color: mf, display: 'block' }}>{SE[k]}</span>
          </button>
        ))}
      </div>

      {/* 整理前照片 */}
      <div style={{ background: ww, border: `1px solid ${beforeReady ? bd : '#E8A87C'}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <PhotoStrip photos={beforePhotos} onAdd={f => addPhotos('before', f)} onRemove={i => removePhoto('before', i)} onEdit={i => openPhotoEditor('before', i)}
          skipped={skipBefore} onSkip={() => { setSkipBefore(s => !s); setBeforePhotos([]) }} label="📷 整理前照片" color={mf} />
        {!beforeReady && <div style={{ fontSize: 12, color: '#C47B5A', marginTop: 8 }}>請上傳照片或選擇「不上傳照片」才能繼續</div>}
      </div>

      {/* 計時設定 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>⏱ 設定整理時間</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESET_MINS.map(m => (
            <button key={m} onClick={() => { setTargetMins(m); setUseCustom(false) }} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${!useCustom && targetMins === m ? sg : bd}`, background: !useCustom && targetMins === m ? sg : 'white', color: !useCustom && targetMins === m ? 'white' : ml, fontSize: 13, cursor: 'pointer' }}>
              {m} 分
            </button>
          ))}
          <button onClick={() => setUseCustom(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${useCustom ? sg : bd}`, background: useCustom ? sg : 'white', color: useCustom ? 'white' : ml, fontSize: 13, cursor: 'pointer' }}>自訂</button>
        </div>
        {useCustom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input type="number" min={1} value={customMins} onChange={e => setCustomMins(e.target.value)} placeholder="輸入分鐘數"
              style={{ width: 120, border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', color: ink }} />
            <span style={{ fontSize: 13, color: ml }}>分鐘</span>
          </div>
        )}
        <div style={{ fontSize: 12, color: mf, marginTop: 6 }}>已設定：<strong style={{ color: ink }}>{effectiveMins} 分鐘</strong></div>
      </div>

      {/* 預約行事曆 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 8 }}>📅 預約整理時間</div>
        <div style={{ fontSize: 13, color: ml, marginBottom: 14, lineHeight: 1.6 }}>選好日期時間，下載行事曆加入手機。預約時的空間選擇、整理前照片都會一起儲存，當天可直接從預約清單開始整理。</div>
        <button onClick={() => setShowCalModal(true)} style={{ padding: '9px 18px', border: '1.5px solid #4285F4', borderRadius: 8, background: 'white', color: '#4285F4', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          📅 預約並加入行事曆
        </button>
      </div>

      <button onClick={startTimer} disabled={!beforeReady}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: beforeReady ? ink : '#C8C2B8', color: 'white', fontSize: 16, cursor: beforeReady ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
        {beforeReady ? '開始整理 ▶' : '請先處理整理前照片'}
      </button>

      {showCalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 6 }}>預約整理</div>
            <p style={{ fontSize: 13, color: ml, marginBottom: 20, lineHeight: 1.6 }}>設定日期與時間，下載 .ics 後點開加入行事曆。前一天系統會提醒，行事曆內含整理清單連結。當前的整理前照片與設定也會一起保存，到時可直接開始。</p>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: ink, marginBottom: 6, fontWeight: 500 }}>整理日期</div>
              <input type="date" value={calDate} min={todayStr()} onChange={e => setCalDate(e.target.value)}
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: ink, marginBottom: 6, fontWeight: 500 }}>開始時間</div>
              <input type="time" value={calTime} onChange={e => setCalTime(e.target.value)}
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
            </div>
            {calError && <div style={{ fontSize: 12, color: '#C47B5A', marginBottom: 10 }}>⚠️ {calError}</div>}
            <button onClick={validateAndDownloadIcs} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
              📥 下載行事曆並儲存預約
            </button>
            <button onClick={() => { setShowCalModal(false); setCalError('') }} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}
      {editingPhoto && <PhotoEditor src={editingPhoto.src} onDone={applyPhotoEdit} onCancel={() => setEditingPhoto(null)} />}
    </div>
  )

  // ── PAGE 2 ───────────────────────────────────────────────
  if (page === 2) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => {
          // 暫停並存草稿
          const elapsed = timerRunning && startedAt !== null ? Math.floor((Date.now() - startedAt) / 1000) : 0
          const newAcc = accumulatedSecs + elapsed
          setTimerRunning(false)
          saveLS(CL_DRAFT_KEY, {
            space, checked, beforePhotos, afterPhotos,
            skipBefore, skipAfter, note,
            accumulatedSecs: newAcc, startedAt: null,
            targetMins, useCustom, customMins,
          } as ChecklistDraft)
          setPage(1)
        }} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>整理中</h1>
      </div>
      <PageDots page={2} />

      {/* 計時器 */}
      <div ref={timerSectionRef} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 12px' }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r="54" fill="none" stroke={cr} strokeWidth="9" />
            <circle cx="65" cy="65" r="54" fill="none" stroke={timerDone ? '#C47B5A' : sg} strokeWidth="9"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (timeLeft / (totalSecs || 1))}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {timerDone
              ? <div style={{ fontSize: 14, fontWeight: 700, color: '#C47B5A' }}>時間到！</div>
              : <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: ink }}>{fmtSecs(timeLeft)}</div>
            }
            <div style={{ fontSize: 10, color: mf, marginTop: 2 }}>目標 {effectiveMins} 分</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: mf, marginBottom: 14 }}>
          已用 {fmtMins(elapsedSecs)}
          {!timerRunning && !timerDone && elapsedSecs > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#C4953A', background: '#FDF9F0', padding: '2px 8px', borderRadius: 10, border: '1px solid #C4953A44' }}>⏸ 暫停中</span>
          )}
        </div>
        {!timerDone && (
          <button onClick={() => {
            if (timerRunning) {
              // 暫停：把本段計時累積進去，清除 startedAt
              const elapsed = startedAt !== null ? Math.floor((Date.now() - startedAt) / 1000) : 0
              const newAcc = accumulatedSecs + elapsed
              setAccumulatedSecs(newAcc)
              setStartedAt(null)
              setTimerRunning(false)
              // 立刻存草稿（暫停狀態，startedAt = null）
              saveLS(CL_DRAFT_KEY, {
                space, checked, beforePhotos, afterPhotos,
                skipBefore, skipAfter, note,
                accumulatedSecs: newAcc, startedAt: null,
                targetMins, useCustom, customMins,
              } as ChecklistDraft)
            } else {
              // 繼續：記錄新的 startedAt
              setStartedAt(Date.now())
              setTimerRunning(true)
            }
          }} style={{ padding: '8px 22px', borderRadius: 8, border: `1px solid ${sg}`, background: timerRunning ? sg : 'white', color: timerRunning ? 'white' : sg, fontSize: 13, cursor: 'pointer' }}>
            {timerRunning ? '⏸ 暫停' : '▶ 繼續'}
          </button>
        )}
      </div>

      {/* 整理清單 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>{SP[space].label}</div>
          <span style={{ fontSize: 12, color: mf }}>{done} / {total}</span>
        </div>
        {allItems.map((item, i) => {
          const isCustom = i >= SP[space].items.length
          const customId = isCustom ? (customItems[space] || [])[i - SP[space].items.length]?.id : undefined
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < total - 1 ? `1px solid ${cr}` : 'none' }}>
              <div onClick={() => toggleC(i)} style={{ width: 20, height: 20, border: getC()[i] ? 'none' : `1.5px solid ${bd}`, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: getC()[i] ? sg : 'white', cursor: 'pointer' }}>
                {getC()[i] && <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
              <span onClick={() => toggleC(i)} style={{ fontSize: 14, flex: 1, textDecoration: getC()[i] ? 'line-through' : 'none', color: getC()[i] ? mf : ink, cursor: 'pointer' }}>{item.text}</span>
              {'badge' in item && item.badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F0E2C0', color: '#C4953A', fontWeight: 500 }}>{item.badge}</span>}
              {isCustom && customId && (
                <button onClick={() => removeCustomItem(customId)} style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }} title="移除此項目">✕</button>
              )}
            </div>
          )
        })}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${bd}` }}>
          {!showAddItem ? (
            <button onClick={() => setShowAddItem(true)} style={{ fontSize: 12, color: sg, background: 'none', border: `1px dashed ${sg}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', width: '100%' }}>
              ＋ 新增自訂整理項目
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                placeholder="例：整理抽屜雜物"
                style={{ flex: 1, border: `1px solid ${sg}`, borderRadius: 8, padding: '7px 10px', fontSize: 16, outline: 'none', color: ink }} />
              <button onClick={addCustomItem} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 13, cursor: 'pointer' }}>加入</button>
              <button onClick={() => { setShowAddItem(false); setNewItemText('') }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>
        <div style={{ background: cr, borderRadius: 4, height: 6, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: sg, width: `${total ? Math.round(done / total * 100) : 0}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* 整理後照片 */}
      <div style={{ background: ww, border: `1px solid ${afterReady ? bd : '#E8A87C'}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <PhotoStrip photos={afterPhotos} onAdd={f => addPhotos('after', f)} onRemove={i => removePhoto('after', i)} onEdit={i => openPhotoEditor('after', i)}
          skipped={skipAfter} onSkip={() => { setSkipAfter(s => !s); setAfterPhotos([]) }} label="📷 整理後照片" color={sg} />
        {!afterReady && <div style={{ fontSize: 12, color: '#C47B5A', marginTop: 6 }}>請上傳照片或選擇「不上傳照片」才能儲存</div>}
      </div>

      {/* 整理紀念文 — 在儲存按鈕上方 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: ink, marginBottom: 4, fontWeight: 600 }}>📝 寫下這次整理的故事</div>
        <div style={{ fontSize: 12, color: sg, marginBottom: 8, lineHeight: 1.6 }}>每一次整理都值得被記住 — 哪怕只是一句話，日後回頭看都會很感動。</div>
        <div style={{ fontSize: 11, color: mf, background: cr, borderRadius: 6, padding: '7px 10px', marginBottom: 10, lineHeight: 1.6 }}>
          範例：今天清出三袋舊衣服，衣櫃左半邊空出來了！下次要整理右邊的毛衣區。
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="寫下你的整理心得、驚喜發現、或給未來自己的話⋯（不填也可以，系統會自動記錄）"
          style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: ink, minHeight: 90, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      {/* 儲存按鈕 — 在紀念文下方 */}
      {!canSave && (
        <div style={{ fontSize: 12, color: '#C47B5A', marginBottom: 8, padding: '8px 12px', background: '#FDF5F0', borderRadius: 8, border: '1px solid #E8B89A' }}>
          儲存前需完成：{!checklistDone && `整理清單（還有 ${total - done} 項）`}{!checklistDone && !afterReady && '、'}{!afterReady && '整理後照片（上傳或選擇不上傳）'}
        </div>
      )}
      {checklistDone && (
        <div style={{ background: '#EAF2EE', border: `1.5px solid ${sg}`, borderRadius: 10, padding: '10px 16px', marginBottom: 12, textAlign: 'center', fontSize: 13, color: '#2E6B50', fontWeight: 500 }}>
          🎉 清單全部完成！記得上傳整理後照片再儲存
        </div>
      )}
      <button onClick={saveLog} disabled={!canSave || isSavingUI}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: saveFlash ? sg : isSavingUI ? '#9BC4AE' : canSave ? ink : '#C8C2B8', color: 'white', fontSize: 16, cursor: (canSave && !isSavingUI) ? 'pointer' : 'not-allowed', fontWeight: 600, transition: 'background 0.3s', marginBottom: 24 }}>
        {saveFlash ? '✅ 已儲存整理成果！' : isSavingUI ? '⏳ 上傳中⋯' : '💾 儲存整理成果'}
      </button>

      {editingPhoto && <PhotoEditor src={editingPhoto.src} onDone={applyPhotoEdit} onCancel={() => setEditingPhoto(null)} />}
    </div>
  )

  // ── PAGE 3 ───────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0, flex: 1 }}>整理成果紀錄</h1>
        <div style={{ fontSize: 13, color: mf }}>{logs.length} 筆</div>
      </div>
      <PageDots page={3} />

      <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#2E6B50' }}>要開始新的整理嗎？</span>
        <button onClick={() => setPage(1)} style={{ fontSize: 13, color: sg, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>前往 →</button>
      </div>

      {logs.length === 0 ? (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📓</div>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: ink, marginBottom: 6 }}>還沒有整理紀錄</div>
          <div style={{ fontSize: 13, color: ml, marginBottom: 20, lineHeight: 1.7 }}>完成第一次整理後，Before / After 照片和日記會出現在這裡。</div>
          <button onClick={() => setPage(1)} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
            開始第一次整理 →
          </button>
        </div>
      ) : logs.map(entry => (
        <div key={entry.id} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{entry.space}整理</span>
              <span style={{ fontSize: 12, color: mf }}>{entry.date}</span>
              <span style={{ fontSize: 12, color: mf }}>· {fmtMins(entry.duration)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShareEntry(entry)} style={{ flex: 1, fontSize: 13, color: 'white', background: sg, border: 'none', borderRadius: 8, cursor: 'pointer', padding: '8px 0', fontWeight: 500 }}>檢視</button>
              <button onClick={() => { setEditingId(entry.id); setEditNote(entry.note) }} style={{ flex: 1, fontSize: 13, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 8, cursor: 'pointer', padding: '8px 0' }}>編輯</button>
              <button onClick={() => setConfirmDeleteId(entry.id)} style={{ flex: 1, fontSize: 13, color: '#C47B5A', background: 'none', border: '1px solid #C47B5A', borderRadius: 8, cursor: 'pointer', padding: '8px 0' }}>刪除</button>
            </div>
          </div>
          {editingId === entry.id ? (
            <div>
              <textarea value={editNote} onChange={e => setEditNote(e.target.value)} style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 16, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 60 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={saveEdit} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                <button onClick={() => setEditingId(null)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: ml, margin: '0 0 8px', lineHeight: 1.6 }}>{entry.note}</p>
          )}
          {(entry.beforePhotos.length > 0 || entry.afterPhotos.length > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {entry.beforePhotos.slice(0, 2).map((p, i) => (
                <div key={`b${i}`} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, filter: 'grayscale(20%)' }} />
                  <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '1px 4px', borderRadius: 3 }}>B</span>
                </div>
              ))}
              {entry.afterPhotos.slice(0, 2).map((p, i) => (
                <div key={`a${i}`} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: `1.5px solid ${sg}` }} />
                  <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: 'rgba(122,158,138,0.85)', color: 'white', padding: '1px 4px', borderRadius: 3 }}>A</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 分享 Modal */}
      {shareEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.52)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 36 }}>
            <div ref={shareCardRef} style={{ background: ww, borderRadius: 12, padding: '20px 20px 16px' }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, color: ink, marginBottom: 2 }}>{shareEntry.space}整理紀錄</div>
              <div style={{ fontSize: 12, color: mf, marginBottom: 16 }}>{shareEntry.date} · 用時 {fmtMins(shareEntry.duration)}</div>
              {shareEntry.beforePhotos.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: '#E0D8CC' }} />
                    <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 800, color: '#7A6A50', background: '#EDE2CC', padding: '4px 14px', borderRadius: 30, border: '1px solid #CDB98A' }}>BEFORE</div>
                    <div style={{ flex: 1, height: 1, background: '#E0D8CC' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {shareEntry.beforePhotos.map((p, i) => <img key={i} src={p} alt="" style={{ width: shareEntry.beforePhotos.length === 1 ? '100%' : 'calc(50% - 4px)', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10 }} />)}
                  </div>
                </div>
              )}
              {shareEntry.afterPhotos.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 1, background: '#C8DDD2' }} />
                    <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 800, color: '#2E6B50', background: '#E0F0E8', padding: '4px 14px', borderRadius: 30, border: `1.5px solid ${sg}` }}>AFTER</div>
                    <div style={{ flex: 1, height: 1, background: '#C8DDD2' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {shareEntry.afterPhotos.map((p, i) => <img key={i} src={p} alt="" style={{ width: shareEntry.afterPhotos.length === 1 ? '100%' : 'calc(50% - 4px)', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, border: `2px solid ${sg}` }} />)}
                  </div>
                </div>
              )}
              {shareEntry.note && <div style={{ background: cr, borderRadius: 10, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: ink, lineHeight: 1.8 }}>{shareEntry.note}</div>}
              <div style={{ fontSize: 11, color: mf, textAlign: 'right' }}>整理小幫手 #生活整理</div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => captureAndShare(shareEntry)} style={{ display: 'block', width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
                {saveShareLabel()}
              </button>
              {SHARE_BTNS.map(p => (
                <button key={p.id} onClick={() => shareToSocial(p.id, shareText(shareEntry))}
                  style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: p.color, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  {p.label}（純文字）
                </button>
              ))}
              <button onClick={() => setShareEntry(null)} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 14, padding: 28, maxWidth: 320, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, color: ink, marginBottom: 8 }}>確定刪除這筆紀錄？</div>
            <div style={{ fontSize: 13, color: ml, marginBottom: 24 }}>刪除後無法復原</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteLog(confirmDeleteId)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#C47B5A', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>確定刪除</button>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 14, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {savedPopupEntry && (
        <SavedPopup
          entry={savedPopupEntry}
          onShare={() => { setShareEntry(savedPopupEntry); setSavedPopupEntry(null) }}
          onClose={() => setSavedPopupEntry(null)}
        />
      )}
    </div>
  )
}
