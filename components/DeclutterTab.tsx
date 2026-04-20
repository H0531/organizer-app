'use client'
import { useState, useEffect, useRef } from 'react'
import { SHARE_BTNS, shareToSocial, loadLS, saveLS, savePhoto, saveOrShareImage, saveShareLabel, isChrome, drawDeclutterCard } from '@/lib/types'
import type { DeclutterItem, TossEntry, DeclutterRecord, Decision } from '@/lib/types'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
const KEEP_CATS = ['日常用品', '季節性', '紀念品', '備用品', '工作用品']
const DRAFT_KEY = 'declutter_draft'
const STAGE_KEY = 'declutter_stage'

// ── 擴充快速輸入，分類顯示 ───────────────────────────────────
const QUICK_ITEM_GROUPS: { label: string; items: string[] }[] = [
  { label: '衣物配件', items: ['衣服', '鞋子', '包包', '配飾'] },
  { label: '3C 用品', items: ['手機充電線', '電子產品', '耳機', '舊手機'] },
  { label: '生活雜物', items: ['重複備品', '過期食品', '書籍', '文件紙張', '玩具', '餐具', '彩妝品', '保養品'] },
]

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateDonateIcs(date: string, itemName: string): string {
  const start = new Date(`${date}T10:00`)
  const end = new Date(`${date}T11:00`)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `donate-${Date.now()}@organizer-app`
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//整理小幫手//ZH', 'BEGIN:VEVENT',
    `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:送出：${itemName} — 整理小幫手`, `DESCRIPTION:今天要把「${itemName}」送出去了！記得帶出門。`,
    'BEGIN:VALARM', 'TRIGGER:-PT1D', 'ACTION:DISPLAY', 'DESCRIPTION:明天要送出物品囉！', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}
function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
function readFile(file: File): Promise<string> {
  return new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file) })
}

// ── 單張照片上傳 ─────────────────────────────────────────────
function PhotoUpload({ photo, onChange, label }: { photo?: string; onChange: (p: string | undefined) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: mf, marginBottom: 6 }}>{label}（可略）</div>
      {photo ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={photo} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: `1.5px solid ${sg}`, display: 'block' }} />
          <button onClick={() => onChange(undefined)} style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#777', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <button onClick={() => ref.current?.click()} style={{ display: 'block', width: '100%', marginTop: 4, fontSize: 11, color: sg, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left' }}>更換照片</button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} style={{ padding: '7px 14px', border: `1px dashed ${bd}`, borderRadius: 8, background: 'white', color: mf, cursor: 'pointer', fontSize: 12 }}>
          📷 附上照片
        </button>
      )}
      <input ref={ref} type="file" accept="image/*"
        {...(isChrome() ? {} : { capture: undefined })}
        style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        onChange={async e => { if (e.target.files?.[0]) { onChange(await readFile(e.target.files[0])); e.target.value = '' } }} />
    </div>
  )
}

// ── 分享 Modal ───────────────────────────────────────────────
function TossShareModal({ entry, onClose }: { entry: TossEntry; onClose: () => void }) {
  const shareText = `放手了「${entry.name}」\n${entry.memo}\n#斷捨離 #整理小幫手`
  const captureAndShare = async () => {
    try {
      const canvas = await drawDeclutterCard({ name: entry.name, memo: entry.memo, photo: entry.photo })
      await saveOrShareImage(canvas, 'farewell.png', shareText)
    } catch { shareToSocial('copy', shareText) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, color: ink, marginBottom: 14 }}>分享告別文</div>
        <div style={{ background: ww, borderRadius: 12, padding: '16px 18px', marginBottom: 14, border: `1px solid ${bd}` }}>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: ink, marginBottom: 6 }}>{entry.name}</div>
          {entry.photo && <img src={entry.photo} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
          {entry.memo && <div style={{ fontSize: 13, color: ml, lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: 8 }}>{entry.memo}</div>}
          <div style={{ fontSize: 11, color: mf, textAlign: 'right' }}>整理小幫手 #斷捨離</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={captureAndShare} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            {saveShareLabel()}
          </button>
          {SHARE_BTNS.map(p => (
            <button key={p.id} onClick={() => shareToSocial(p.id, shareText)}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: p.color, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
              {p.label}（純文字）
            </button>
          ))}
          <button onClick={onClose} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
        </div>
      </div>
    </div>
  )
}

type Stage = 'input' | 'review' | 'flow' | 'tosslist'
type Props = { onSaveToMember: (record: DeclutterRecord) => void; onGoToMember: (section?: string) => void; userEmail?: string }

export default function DeclutterTab({ onSaveToMember, onGoToMember, userEmail }: Props) {
  const [items, setItems] = useState<DeclutterItem[]>([])
  const [input, setInput] = useState('')
  const [stage, setStageRaw] = useState<Stage>('input')
  const [flowIndex, setFlowIndex] = useState(0)
  const [flowType, setFlowType] = useState<'keep' | 'donate' | 'toss'>('keep')
  const [justSaved, setJustSaved] = useState(false)
  const [showQuickGroups, setShowQuickGroups] = useState(false)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemName, setEditingItemName] = useState('')

  const [keepCat, setKeepCat] = useState('')
  const [donateDate, setDonateDate] = useState('')
  const [donateCalAdded, setDonateCalAdded] = useState(false)
  const [donateDates, setDonateDates] = useState<Record<string, string>>({})
  const [donateCalItems, setDonateCalItems] = useState<Set<string>>(new Set())
  const [donateMemo, setDonateMemo] = useState('')
  const [donatePhoto, setDonatePhoto] = useState<string | undefined>()
  const [donateMemos, setDonateMemos] = useState<Record<string, string>>({})
  const [donatePhotos, setDonatePhotos] = useState<Record<string, string>>({})

  const [tossMemo, setTossMemo] = useState('')
  const [tossPhoto, setTossPhoto] = useState<string | undefined>()
  const [tossEntries, setTossEntries] = useState<TossEntry[]>([])

  const [editKeepId, setEditKeepId] = useState<string | null>(null)
  const [editTossId, setEditTossId] = useState<string | null>(null)
  const [editTossMemo, setEditTossMemo] = useState('')
  const [editTossPhoto, setEditTossPhoto] = useState<string | undefined>()

  const [shareTossEntry, setShareTossEntry] = useState<TossEntry | null>(null)
  const [saveFlash, setSaveFlash] = useState(false)
  const isSavingRef = useRef(false)

  const setStage = (s: Stage) => { setStageRaw(s); saveLS(STAGE_KEY, s) }

  useEffect(() => {
    const draft = loadLS<{ items: DeclutterItem[]; tossEntries: TossEntry[] } | null>(DRAFT_KEY, null)
    if (draft) { setItems(draft.items); setTossEntries(draft.tossEntries) }
    const savedStage = loadLS<Stage | null>(STAGE_KEY, null)
    if (savedStage) setStageRaw(savedStage)
  }, [])

  useEffect(() => {
    if (items.length > 0) saveLS(DRAFT_KEY, { items, tossEntries })
  }, [items, tossEntries])

  const addItem = (name?: string) => {
    const v = name || input.trim(); if (!v) return
    setItems(prev => [...prev, { id: Date.now().toString(), name: v, decision: null }])
    setInput('')
  }
  const setDec = (id: string, d: Decision) =>
    setItems(prev => prev.map(x => x.id === id ? { ...x, decision: x.decision === d ? null : d } : x))
  const removeItem = (id: string) => setItems(prev => prev.filter(x => x.id !== id))
  const saveItemName = (id: string) => {
    const name = editingItemName.trim(); if (!name) return
    setItems(prev => prev.map(x => x.id === id ? { ...x, name } : x))
    setEditingItemId(null)
  }

  const undecided = items.filter(x => !x.decision)
  const keepItems = items.filter(x => x.decision === 'keep')
  const donateItems = items.filter(x => x.decision === 'donate')
  const tossItems = items.filter(x => x.decision === 'toss')
  const allDecided = items.length > 0 && undecided.length === 0

  const flowItems = items.filter(x => x.decision === flowType)
  const currentFlowItem = flowItems[flowIndex]

  const startFlow = (type: 'keep' | 'donate' | 'toss') => {
    setFlowType(type); setFlowIndex(0); setStage('flow')
    setKeepCat(''); setDonateDate(''); setDonateCalAdded(false)
    setTossMemo(''); setTossPhoto(undefined)
    setDonateMemo(''); setDonatePhoto(undefined)
  }

  const nextFlowItem = () => {
    if (flowIndex < flowItems.length - 1) {
      setFlowIndex(i => i + 1)
      setKeepCat(''); setDonateCalAdded(false)
      setTossMemo(''); setTossPhoto(undefined)
      setDonateMemo(''); setDonatePhoto(undefined)
    } else {
      setStage(flowType === 'toss' ? 'tosslist' : 'review')
    }
  }

  const saveFlowItem = () => {
    const id = currentFlowItem?.id; if (!id) return
    let nextTossEntries = tossEntries
    setItems(prev => prev.map(x => {
      if (x.id !== id) return x
      if (flowType === 'keep') return { ...x, category: keepCat }
      if (flowType === 'donate') {
        if (donateMemo) setDonateMemos(m => ({ ...m, [id]: donateMemo }))
        if (donatePhoto) setDonatePhotos(p => ({ ...p, [id]: donatePhoto }))
        return { ...x, disposeDate: donateDate }
      }
      if (flowType === 'toss') {
        const entry: TossEntry = { id, name: x.name, memo: tossMemo, date: new Date().toLocaleDateString('zh-TW'), photo: tossPhoto }
        nextTossEntries = [...tossEntries.filter(e => e.id !== id), entry]
        setTossEntries(nextTossEntries)
        return { ...x, tossMemo }
      }
      return x
    }))
    nextFlowItem()
  }

  const handleAddDonateIcs = (itemId: string, itemName: string) => {
    const date = donateDates[itemId]; if (!date) return
    const ics = generateDonateIcs(date, itemName)
    downloadIcs(ics, `donate-${itemName}.ics`)
    setDonateCalItems(prev => new Set([...prev, itemId]))
  }

  const handleSave = async () => {
    if (items.length === 0 || isSavingRef.current) return
    isSavingRef.current = true
    try {
      await Promise.all(tossEntries.filter(e => e.photo).map(e => savePhoto(`toss_photo_${e.id}`, e.photo!, userEmail)))
      const record: DeclutterRecord = {
        savedAt: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        items, tossEntries,
      }
      onSaveToMember(record)
      setSaveFlash(true)
      setTimeout(() => { setSaveFlash(false); setJustSaved(true); saveLS(DRAFT_KEY, null); saveLS(STAGE_KEY, null) }, 600)
    } finally { isSavingRef.current = false }
  }

  const resetAll = () => {
    setItems([]); setTossEntries([]); setStage('input'); setJustSaved(false)
    saveLS(DRAFT_KEY, null); saveLS(STAGE_KEY, 'input')
  }

  // ── STAGE: input ─────────────────────────────────────────────
  if (stage === 'input') return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>斷捨離決策</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 24 }}>把物品一一加入清單，再標記留 / 送 / 丟</p>

      {/* 儲存後慶賀提示 */}
      {justSaved && (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 4 }}>✅ 紀錄已儲存到會員頁</div>
          <div style={{ fontSize: 12, color: ml, marginBottom: 10 }}>
            今天你放手了 {tossItems.length + donateItems.length} 件，留下 {keepItems.length} 件，讓空間清爽了一點。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onGoToMember('declutter')} style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>查看紀錄 →</button>
            <button onClick={resetAll} style={{ fontSize: 12, color: ml, background: 'none', border: `1px solid ${bd}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>再來一輪</button>
          </div>
        </div>
      )}

      {/* 輸入區 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="輸入物品名稱，按 Enter 或新增"
            style={{ flex: 1, minWidth: 0, border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none', color: ink, background: 'white' }} />
          <button onClick={() => addItem()} style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 8, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>新增</button>
        </div>

        {/* 快速輸入（分類顯示） */}
        <div>
          <button onClick={() => setShowQuickGroups(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8, padding: 0 }}>
            {showQuickGroups ? '▾ 收起快速選項' : '▸ 快速選項（常見物品）'}
          </button>
          {showQuickGroups && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_ITEM_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 11, color: mf, marginBottom: 5, fontWeight: 500 }}>{group.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {group.items.map(q => (
                      <button key={q} onClick={() => addItem(q)}
                        style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>
                        + {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!showQuickGroups && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_ITEM_GROUPS.flatMap(g => g.items).slice(0, 8).map(q => (
                <button key={q} onClick={() => addItem(q)}
                  style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>
                  + {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 物品清單 */}
      {items.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: i < items.length - 1 ? `1px solid ${cr}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {editingItemId === item.id ? (
                  <>
                    <input autoFocus value={editingItemName} onChange={e => setEditingItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveItemName(item.id); if (e.key === 'Escape') setEditingItemId(null) }}
                      style={{ flex: 1, border: `1px solid ${sg}`, borderRadius: 6, padding: '4px 8px', fontSize: 14, outline: 'none', color: ink }} />
                    <button onClick={() => saveItemName(item.id)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>✓</button>
                    <button onClick={() => setEditingItemId(null)} style={{ fontSize: 12, color: mf, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 14, color: ink, cursor: 'text' }}
                      onClick={() => { setEditingItemId(item.id); setEditingItemName(item.name) }}>
                      {item.name}
                    </span>
                    {(['keep', 'donate', 'toss'] as Decision[]).map(d => (
                      <button key={d} onClick={() => setDec(item.id, d)} style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: item.decision === d ? 600 : 400,
                        border: `1px solid ${item.decision === d ? (d === 'keep' ? sg : d === 'donate' ? '#4285F4' : '#C47B5A') : bd}`,
                        background: item.decision === d ? (d === 'keep' ? '#EAF2EE' : d === 'donate' ? '#EEF3FE' : '#FDF5F0') : 'white',
                        color: item.decision === d ? (d === 'keep' ? sg : d === 'donate' ? '#4285F4' : '#C47B5A') : ml,
                      }}>{d === 'keep' ? '留' : d === 'donate' ? '送' : '丟'}</button>
                    ))}
                    <button onClick={() => removeItem(item.id)} style={{ fontSize: 13, color: mf, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </>
                )}
              </div>
              {editingItemId !== item.id && <div style={{ fontSize: 11, color: mf, marginTop: 2, paddingLeft: 2 }}>點名稱可編輯</div>}
            </div>
          ))}
        </div>
      )}

      {/* 統計列 + 全部決定後的慶賀 */}
      {items.length > 0 && (
        <div style={{
          background: allDecided ? '#EAF2EE' : cr,
          border: `1px solid ${allDecided ? sg : bd}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          {undecided.length > 0 ? (
            <div style={{ fontSize: 13, color: ml }}>還有 <strong style={{ color: ink }}>{undecided.length}</strong> 件未標記</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 4 }}>
                全部 {items.length} 件已標記完成 ✦
              </div>
              <div style={{ fontSize: 12, color: ml }}>
                留下 {keepItems.length} 件 · 送出 {donateItems.length} 件 · 丟棄 {tossItems.length} 件
              </div>
            </>
          )}
        </div>
      )}

      {allDecided && (
        <button onClick={() => setStage('review')}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
          進入分流處理 →
        </button>
      )}
    </div>
  )

  // ── STAGE: review ────────────────────────────────────────────
  if (stage === 'review') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0, flex: 1 }}>分流處理</h1>
        <button onClick={() => onGoToMember('declutter')}
          style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>
          查看紀錄 →
        </button>
      </div>

      {/* 返回修改決定 — Quick Win */}
      <button onClick={() => setStage('input')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ml, background: 'none', border: `1px solid ${bd}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', marginBottom: 16 }}>
        ← 返回修改留/送/丟決定
      </button>

      {/* 儲存後慶賀 */}
      {justSaved && (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 4 }}>✅ 紀錄已儲存！</div>
          <div style={{ fontSize: 12, color: ml, marginBottom: 10 }}>
            今天你放手了 {tossItems.length + donateItems.length} 件，讓空間清爽了一點。你已經做了很好的第一步。
          </div>
          <button onClick={() => onGoToMember('declutter')} style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>前往查看 →</button>
        </div>
      )}

      {items.length === 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>♻️</div>
          <div style={{ fontSize: 15, color: ink, marginBottom: 6 }}>還沒有斷捨離項目</div>
          <div style={{ fontSize: 13, color: mf, marginBottom: 20 }}>先加入物品再開始分流</div>
          <button onClick={() => setStage('input')} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
            開始加入物品
          </button>
        </div>
      )}

      {/* 留下 */}
      {keepItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50' }}>✓ 留下（{keepItems.length} 件）</div>
            {keepItems.length > 0 && (
              <button onClick={() => startFlow('keep')} style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                指定分類
              </button>
            )}
          </div>
          {keepItems.map(item => (
            <div key={item.id} style={{ padding: '8px 0', borderBottom: `1px solid ${cr}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 14, color: ink, marginBottom: 3 }}>{item.name}</div>
                  {editKeepId === item.id ? (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {KEEP_CATS.map(cat => (
                          <button key={cat} onClick={() => setItems(prev => prev.map(x => x.id === item.id ? { ...x, category: cat } : x))}
                            style={{ padding: '5px 10px', borderRadius: 16, border: `1px solid ${item.category === cat ? sg : bd}`, background: item.category === cat ? '#EAF2EE' : 'white', color: item.category === cat ? sg : ml, fontSize: 12, cursor: 'pointer' }}>
                            {cat}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setEditKeepId(null)} style={{ fontSize: 11, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>完成</button>
                    </div>
                  ) : (
                    item.category
                      ? <span style={{ fontSize: 12, color: sg, background: '#EAF2EE', padding: '2px 8px', borderRadius: 8 }}>{item.category}</span>
                      : <span style={{ fontSize: 12, color: mf }}>點「編輯」指定分類</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setEditKeepId(editKeepId === item.id ? null : item.id)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {editKeepId === item.id ? '收起' : '編輯'}
                  </button>
                  <button onClick={() => removeItem(item.id)} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 送出 */}
      {donateItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4285F4' }}>📦 送出（{donateItems.length} 件）</div>
            <button onClick={() => startFlow('donate')} style={{ fontSize: 12, color: '#4285F4', background: 'none', border: '1px solid #4285F4', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
              設定提醒
            </button>
          </div>
          {donateItems.map(item => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: `1px solid ${cr}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>{item.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <input type="date" min={todayStr()} value={donateDates[item.id] || ''}
                      onChange={e => setDonateDates(prev => ({ ...prev, [item.id]: e.target.value }))}
                      style={{ border: `1px solid ${bd}`, borderRadius: 8, padding: '5px 8px', fontSize: 12, color: ink, outline: 'none', background: 'white' }} />
                    <button onClick={() => handleAddDonateIcs(item.id, item.name)} disabled={!donateDates[item.id]}
                      style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${donateDates[item.id] ? '#4285F4' : bd}`, background: donateCalItems.has(item.id) ? '#EEF3FE' : 'white', color: donateDates[item.id] ? '#4285F4' : mf, fontSize: 12, cursor: donateDates[item.id] ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
                      {donateCalItems.has(item.id) ? '✅ 已加入' : '📅 加入行事曆'}
                    </button>
                  </div>
                  {donateMemos[item.id] && <div style={{ fontSize: 12, color: mf, marginTop: 3 }}>{donateMemos[item.id]}</div>}
                  {donatePhotos[item.id] && <img src={donatePhotos[item.id]} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, marginTop: 6, border: `1px solid ${bd}` }} />}
                </div>
                <button onClick={() => removeItem(item.id)} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 丟棄 */}
      {tossItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#C47B5A' }}>🗑 丟棄（{tossItems.length} 件）</div>
            <button onClick={() => startFlow('toss')} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: '1px solid #C47B5A', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
              寫告別文
            </button>
          </div>
          {tossItems.map(item => {
            const entry = tossEntries.find(e => e.id === item.id)
            const isEditing = editTossId === item.id
            return (
              <div key={item.id} style={{ padding: '10px 0', borderBottom: `1px solid ${cr}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: ink, marginBottom: 4 }}>{item.name}</div>
                    {isEditing ? (
                      <div>
                        <textarea value={editTossMemo} onChange={e => setEditTossMemo(e.target.value)}
                          placeholder="告別的話（可略）"
                          style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 60, marginBottom: 8 }} />
                        <PhotoUpload photo={editTossPhoto} onChange={setEditTossPhoto} label="附上照片" />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => {
                            const updated: TossEntry = { id: item.id, name: item.name, memo: editTossMemo, date: entry?.date || new Date().toLocaleDateString('zh-TW'), photo: editTossPhoto }
                            setTossEntries(prev => [...prev.filter(e => e.id !== item.id), updated])
                            setEditTossId(null)
                          }} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                          <button onClick={() => setEditTossId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {entry?.memo && <p style={{ fontSize: 12, color: mf, margin: '0 0 4px', lineHeight: 1.6 }}>{entry.memo}</p>}
                        {entry?.photo && <img src={entry.photo} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${bd}` }} />}
                        {!entry && <span style={{ fontSize: 12, color: mf }}>點「編輯」寫告別文（可略）</span>}
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => { setEditTossId(item.id); setEditTossMemo(entry?.memo || ''); setEditTossPhoto(entry?.photo) }}
                        style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>編輯</button>
                      {entry && <button onClick={() => setShareTossEntry(entry)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>分享</button>}
                      <button onClick={() => removeItem(item.id)} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {items.length > 0 && (
        <button onClick={handleSave}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: saveFlash ? sg : ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600, marginTop: 8, transition: 'background 0.3s' }}>
          {saveFlash ? '✅ 已儲存整理成果！' : '💾 儲存斷捨離紀錄'}
        </button>
      )}

      {shareTossEntry && <TossShareModal entry={shareTossEntry} onClose={() => setShareTossEntry(null)} />}
    </div>
  )

  // ── STAGE: flow ──────────────────────────────────────────────
  if (stage === 'flow') {
    const isLast = flowIndex >= flowItems.length - 1
    const isDone = !currentFlowItem
    const flowTypeLabel = flowType === 'keep' ? '留下' : flowType === 'donate' ? '送出' : '丟棄'
    const flowColor = flowType === 'keep' ? sg : flowType === 'donate' ? '#4285F4' : '#C47B5A'

    return (
      <div>
        {/* 標題列 + 返回 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← 返回</button>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: flowColor }}>
            {flowTypeLabel}流程
          </div>
          {!isDone && (
            <div style={{ fontSize: 13, color: mf, background: cr, padding: '3px 10px', borderRadius: 20 }}>
              {flowIndex + 1} / {flowItems.length}
            </div>
          )}
        </div>

        {isDone ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, color: sg, fontFamily: "'Noto Serif TC', serif", marginBottom: 12 }}>全部處理完成！</div>
            {flowType === 'donate' && <div style={{ fontSize: 14, color: ml, marginBottom: 20, lineHeight: 1.8, padding: '12px 16px', background: '#EEF3FE', borderRadius: 10 }}>廣結善緣並把愛傳下去，你超棒的 💙</div>}
            {flowType === 'toss' && <div style={{ fontSize: 14, color: ml, marginBottom: 20, lineHeight: 1.8, padding: '12px 16px', background: cr, borderRadius: 10 }}>辛苦了！道別是為迎接更美好的未來，你做的很棒 🌱</div>}
            <button onClick={() => setStage(flowType === 'toss' ? 'tosslist' : 'review')}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer' }}>
              {flowType === 'toss' ? '查看告別紀念文' : '返回分流處理總覽'}
            </button>
          </div>
        ) : (
          <div>
            {/* 當前物品卡 */}
            <div style={{ background: ww, border: `1.5px solid ${flowColor}22`, borderRadius: 14, padding: '24px 24px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: flowColor, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 6 }}>{flowTypeLabel}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: ink, fontFamily: "'Noto Serif TC', serif" }}>{currentFlowItem.name}</div>
            </div>

            {/* 留：指定分類 */}
            {flowType === 'keep' && (
              <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>這件物品要放在哪一區？（可略過）</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {KEEP_CATS.map(cat => (
                    <button key={cat} onClick={() => setKeepCat(keepCat === cat ? '' : cat)}
                      style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${keepCat === cat ? sg : bd}`, background: keepCat === cat ? '#EAF2EE' : 'white', color: keepCat === cat ? sg : ml, fontSize: 13, cursor: 'pointer' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 送：日期 + 行事曆 + 備忘 */}
            {flowType === 'donate' && (
              <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: ml, marginBottom: 10 }}>預計送出日期（可略）</div>
                <input type="date" min={todayStr()} value={donateDate} onChange={e => setDonateDate(e.target.value)}
                  style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: ink, outline: 'none', background: 'white', boxSizing: 'border-box', marginBottom: 10 }} />
                {donateDate && (
                  <button onClick={() => { const ics = generateDonateIcs(donateDate, currentFlowItem.name); downloadIcs(ics, `donate-${currentFlowItem.name}.ics`); setDonateCalAdded(true) }}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${donateCalAdded ? sg : '#4285F4'}`, background: donateCalAdded ? '#EAF2EE' : 'white', color: donateCalAdded ? sg : '#4285F4', fontSize: 13, cursor: 'pointer', fontWeight: 500, marginBottom: 12 }}>
                    {donateCalAdded ? '✅ 行事曆已加入' : '📅 加入行事曆提醒'}
                  </button>
                )}
                <div style={{ height: 1, background: cr, margin: '4px 0 12px' }} />
                <div style={{ fontSize: 13, color: ml, marginBottom: 6 }}>寫一句話給下一個主人（可略）</div>
                <textarea value={donateMemo} onChange={e => setDonateMemo(e.target.value)} placeholder="例：希望你也喜歡它，好好使用它！"
                  style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: ink, minHeight: 60, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <PhotoUpload photo={donatePhoto} onChange={setDonatePhoto} label="附上照片" />
              </div>
            )}

            {/* 丟：告別文 */}
            {flowType === 'toss' && (
              <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: ml, marginBottom: 4 }}>寫一句告別的話（可略過）</div>
                <div style={{ fontSize: 11, color: mf, marginBottom: 10 }}>例：謝謝你陪伴了我三年，現在換個地方繼續發揮你的用處吧。</div>
                <textarea value={tossMemo} onChange={e => setTossMemo(e.target.value)} placeholder="感謝、回憶、或祝福…"
                  style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: ink, minHeight: 80, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <PhotoUpload photo={tossPhoto} onChange={setTossPhoto} label="附上照片" />
              </div>
            )}

            <button onClick={saveFlowItem}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
              {isLast ? '完成' : '下一件 →'}
            </button>
            {isLast && flowType === 'donate' && <div style={{ textAlign: 'center', fontSize: 12, color: mf, marginTop: 12 }}>廣結善緣並把愛傳下去，你超棒的 💙</div>}
            {isLast && flowType === 'toss' && <div style={{ textAlign: 'center', fontSize: 12, color: mf, marginTop: 12 }}>辛苦了！道別是為迎接更美好的未來，你做的很棒 🌱</div>}
          </div>
        )}
      </div>
    )
  }

  // ── STAGE: tosslist ──────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700, color: ink, margin: 0 }}>告別紀念文</h1>
      </div>

      {tossEntries.length === 0 ? (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: mf }}>沒有告別文</div>
        </div>
      ) : tossEntries.map(entry => (
        <div key={entry.id} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{entry.name}</span>
              <span style={{ fontSize: 12, color: mf, marginLeft: 8 }}>{entry.date}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShareTossEntry(entry)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>分享</button>
              <button onClick={() => { setEditTossId(entry.id); setEditTossMemo(entry.memo); setEditTossPhoto(entry.photo) }}
                style={{ fontSize: 12, color: mf, background: 'none', border: 'none', cursor: 'pointer' }}>編輯</button>
            </div>
          </div>
          {editTossId === entry.id ? (
            <div>
              <textarea value={editTossMemo} onChange={e => setEditTossMemo(e.target.value)}
                style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 60 }} />
              <PhotoUpload photo={editTossPhoto} onChange={setEditTossPhoto} label="附上照片" />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={() => {
                  setTossEntries(prev => prev.map(e => e.id === entry.id ? { ...e, memo: editTossMemo, photo: editTossPhoto } : e))
                  setEditTossId(null)
                }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                <button onClick={() => setEditTossId(null)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
              </div>
            </div>
          ) : (
            <>
              {entry.photo && <img src={entry.photo} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
              <p style={{ fontSize: 13, color: ml, lineHeight: 1.7, margin: 0 }}>{entry.memo || '（未寫告別文）'}</p>
            </>
          )}
        </div>
      ))}

      <button onClick={() => setStage('review')}
        style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
        返回分流處理總覽 →
      </button>
      <div style={{ textAlign: 'center', fontSize: 13, color: ml, marginTop: 14, lineHeight: 1.8 }}>
        辛苦了！道別是為迎接更美好的未來，你做的很棒 🌱
      </div>

      {shareTossEntry && <TossShareModal entry={shareTossEntry} onClose={() => setShareTossEntry(null)} />}
    </div>
  )
}
