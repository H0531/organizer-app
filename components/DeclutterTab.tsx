'use client'
import { useState, useEffect } from 'react'
import { SHARE_BTNS, shareToSocial, loadLS, saveLS, LS_DECLUTTER_RECORDS } from '@/lib/types'
import type { DeclutterItem, TossEntry, DeclutterRecord, Decision } from '@/lib/types'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
const KEEP_CATS = ['日常用品', '季節性', '紀念品', '備用品', '工作用品']

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateDonateIcs(date: string, itemName: string): string {
  const start = new Date(`${date}T10:00`)
  const end = new Date(`${date}T11:00`)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `donate-${Date.now()}@organizer-app`
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//整理小幫手//ZH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:送出：${itemName} — 整理小幫手`,
    `DESCRIPTION:今天要把「${itemName}」送出去了！記得帶出門。`,
    'BEGIN:VALARM', 'TRIGGER:-PT1D', 'ACTION:DISPLAY', 'DESCRIPTION:明天要送出物品囉！', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

function downloadIcs(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type Props = {
  onSaveToMember: (record: DeclutterRecord) => void
  onGoToMember: () => void
}

export default function DeclutterTab({ onSaveToMember, onGoToMember }: Props) {
  const [items, setItems] = useState<DeclutterItem[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<'input' | 'review' | 'flow' | 'tosslist'>('input')
  const [flowIndex, setFlowIndex] = useState(0)
  const [flowType, setFlowType] = useState<'keep' | 'donate' | 'toss'>('keep')
  const [justSaved, setJustSaved] = useState(false)

  const [keepCat, setKeepCat] = useState('')
  const [donateDate, setDonateDate] = useState('')
  const [donateCalAdded, setDonateCalAdded] = useState(false)
  const [donateDates, setDonateDates] = useState<Record<string, string>>({})
  const [donateCalItems, setDonateCalItems] = useState<Set<string>>(new Set())
  const [tossWrite, setTossWrite] = useState(false)
  const [tossMemo, setTossMemo] = useState('')
  const [tossEntries, setTossEntries] = useState<TossEntry[]>([])
  const [editTossId, setEditTossId] = useState<string | null>(null)
  const [editTossMemo, setEditTossMemo] = useState('')
  const [shareTossEntry, setShareTossEntry] = useState<TossEntry | null>(null)
  const [saveFlash, setSaveFlash] = useState(false)

  // Draft key — auto-save draft to localStorage so refresh restores
  const DRAFT_KEY = 'declutter_draft'
  useEffect(() => {
    const draft = loadLS<{ items: DeclutterItem[]; tossEntries: TossEntry[] } | null>(DRAFT_KEY, null)
    if (draft) { setItems(draft.items); setTossEntries(draft.tossEntries) }
  }, [])
  useEffect(() => {
    if (items.length > 0) saveLS(DRAFT_KEY, { items, tossEntries })
  }, [items, tossEntries])

  const addItem = (name?: string) => {
    const v = name || input.trim()
    if (!v) return
    setItems(prev => [...prev, { id: Date.now().toString(), name: v, decision: null }])
    setInput('')
  }

  const setDec = (id: string, d: Decision) =>
    setItems(prev => prev.map(x => x.id === id ? { ...x, decision: x.decision === d ? null : d } : x))

  const removeItem = (id: string) => setItems(prev => prev.filter(x => x.id !== id))

  const undecided = items.filter(x => !x.decision)
  const keepItems = items.filter(x => x.decision === 'keep')
  const donateItems = items.filter(x => x.decision === 'donate')
  const tossItems = items.filter(x => x.decision === 'toss')
  const allDecided = items.length > 0 && undecided.length === 0

  const flowItems = items.filter(x => x.decision === flowType)
  const currentFlowItem = flowItems[flowIndex]

  const startFlow = (type: 'keep' | 'donate' | 'toss') => {
    setFlowType(type); setFlowIndex(0); setStage('flow')
    setKeepCat(''); setDonateDate(''); setDonateCalAdded(false); setTossWrite(false); setTossMemo('')
  }

  const nextFlowItem = () => {
    if (flowIndex < flowItems.length - 1) {
      setFlowIndex(i => i + 1)
      setKeepCat(''); setDonateCalAdded(false); setTossWrite(false); setTossMemo('')
    } else {
      setStage(flowType === 'toss' ? 'tosslist' : 'review')
    }
  }

  const saveFlowItem = () => {
    let nextTossEntries = tossEntries
    setItems(prev => prev.map(x => {
      if (x.name !== currentFlowItem?.name) return x
      if (flowType === 'keep')   return { ...x, category: keepCat }
      if (flowType === 'donate') return { ...x, disposeDate: donateDate }
      if (flowType === 'toss') {
        if (tossMemo) {
          const entry: TossEntry = { id: x.id, name: x.name, memo: tossMemo, date: new Date().toLocaleDateString('zh-TW') }
          nextTossEntries = [...tossEntries.filter(e => e.id !== x.id), entry]
          setTossEntries(nextTossEntries)
        }
        return { ...x, tossMemo }
      }
      return x
    }))
    nextFlowItem()
  }

  const handleAddDonateIcs = (itemId: string, itemName: string) => {
    const date = donateDates[itemId]
    if (!date) return
    const ics = generateDonateIcs(date, itemName)
    downloadIcs(ics, `donate-${itemName}.ics`)
    setDonateCalItems(prev => new Set([...prev, itemId]))
  }

  const handleSave = () => {
    const record: DeclutterRecord = {
      savedAt: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      items,
      tossEntries,
    }
    onSaveToMember(record)
    setSaveFlash(true)
    setTimeout(() => {
      setSaveFlash(false)
      setJustSaved(true)
      saveLS(DRAFT_KEY, null)
    }, 600)
  }

  const resetAll = () => {
    setItems([]); setTossEntries([]); setStage('input'); setJustSaved(false)
    saveLS(DRAFT_KEY, null)
  }

  const shareText = (e: TossEntry) => `放手了「${e.name}」\n${e.memo}\n#斷捨離 #整理小幫手`

  // ── STAGE: input ──────────────────────────────────────────────
  if (stage === 'input') return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>斷捨離決策</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 24 }}>把物品一一加入清單，再標記留 / 送 / 丟</p>

      {justSaved && (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#2E6B50' }}>✅ 紀錄已儲存到會員頁</span>
          <button onClick={resetAll} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>開始新一輪</button>
        </div>
      )}

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="輸入物品名稱，Enter 新增"
            style={{ flex: 1, border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none', color: ink, background: 'white' }} />
          <button onClick={() => addItem()} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>新增</button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['舊衣服', '過期食品', '重複備品', '壞掉的東西', '久未使用品'].map(q => (
            <button key={q} onClick={() => addItem(q)}
              style={{ padding: '5px 12px', borderRadius: 16, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>
              + {q}
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          {items.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: i < items.length - 1 ? `1px solid ${cr}` : 'none' }}>
              <span style={{ flex: 1, fontSize: 14, color: ink }}>{item.name}</span>
              {(['keep', 'donate', 'toss'] as Decision[]).map(d => (
                <button key={d} onClick={() => setDec(item.id, d)} style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: item.decision === d ? 600 : 400,
                  border: `1px solid ${item.decision === d ? (d === 'keep' ? sg : d === 'donate' ? '#4285F4' : '#C47B5A') : bd}`,
                  background: item.decision === d ? (d === 'keep' ? '#EAF2EE' : d === 'donate' ? '#EEF3FE' : '#FDF5F0') : 'white',
                  color: item.decision === d ? (d === 'keep' ? sg : d === 'donate' ? '#4285F4' : '#C47B5A') : ml,
                }}>
                  {d === 'keep' ? '留' : d === 'donate' ? '送' : '丟'}
                </button>
              ))}
              <button onClick={() => removeItem(item.id)} style={{ fontSize: 13, color: mf, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ background: cr, borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: ml }}>
          {undecided.length > 0
            ? `還有 ${undecided.length} 件未標記`
            : `全部 ${items.length} 件已標記 — 留 ${keepItems.length} 件、送 ${donateItems.length} 件、丟 ${tossItems.length} 件`
          }
        </div>
      )}

      {allDecided && (
        <button onClick={() => setStage('review')} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
          進入分流處理 →
        </button>
      )}
    </div>
  )

  // ── STAGE: review ─────────────────────────────────────────────
  if (stage === 'review') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setStage('input')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>分流處理</h1>
      </div>

      {/* Keep */}
      {keepItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 10 }}>✓ 留下（{keepItems.length} 件）</div>
          {keepItems.map(item => (
            <div key={item.id} style={{ padding: '8px 0', borderBottom: `1px solid ${cr}` }}>
              <div style={{ fontSize: 14, color: ink, marginBottom: 4 }}>{item.name}</div>
              {item.category
                ? <span style={{ fontSize: 12, color: sg, background: '#EAF2EE', padding: '2px 8px', borderRadius: 8 }}>{item.category}</span>
                : <button onClick={() => startFlow('keep')} style={{ fontSize: 12, color: mf, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>指定分類</button>
              }
            </div>
          ))}
          {keepItems.some(x => !x.category) && (
            <button onClick={() => startFlow('keep')} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: `1px solid ${sg}`, background: 'white', color: sg, fontSize: 13, cursor: 'pointer' }}>
              逐一指定收納分類
            </button>
          )}
        </div>
      )}

      {/* Donate */}
      {donateItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4285F4', marginBottom: 10 }}>📦 送出（{donateItems.length} 件）</div>
          {donateItems.map(item => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: `1px solid ${cr}` }}>
              <div style={{ fontSize: 14, color: ink, marginBottom: 8 }}>{item.name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="date" min={todayStr()}
                  value={donateDates[item.id] || ''}
                  onChange={e => setDonateDates(prev => ({ ...prev, [item.id]: e.target.value }))}
                  style={{ border: `1px solid ${bd}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, color: ink, outline: 'none', background: 'white' }} />
                <button
                  onClick={() => handleAddDonateIcs(item.id, item.name)}
                  disabled={!donateDates[item.id]}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${donateDates[item.id] ? '#4285F4' : bd}`,
                    background: donateCalItems.has(item.id) ? '#EEF3FE' : 'white',
                    color: donateDates[item.id] ? '#4285F4' : mf,
                    fontSize: 13, cursor: donateDates[item.id] ? 'pointer' : 'not-allowed', fontWeight: 500,
                  }}>
                  {donateCalItems.has(item.id) ? '✅ 已加入行事曆' : '📅 加入行事曆'}
                </button>
              </div>
              {!donateDates[item.id] && <div style={{ fontSize: 11, color: mf, marginTop: 4 }}>選擇送出日期才能加入行事曆</div>}
            </div>
          ))}
        </div>
      )}

      {/* Toss */}
      {tossItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#C47B5A', marginBottom: 10 }}>🗑 丟棄（{tossItems.length} 件）</div>
          {tossItems.map(item => {
            const entry = tossEntries.find(e => e.id === item.id)
            return (
              <div key={item.id} style={{ padding: '8px 0', borderBottom: `1px solid ${cr}` }}>
                <div style={{ fontSize: 14, color: ink, marginBottom: 4 }}>{item.name}</div>
                {entry
                  ? <span style={{ fontSize: 12, color: mf }}>{entry.memo}</span>
                  : <span style={{ fontSize: 12, color: mf }}>未寫告別文</span>
                }
              </div>
            )
          })}
          {tossItems.some(x => !tossEntries.find(e => e.id === x.id)) && (
            <button onClick={() => startFlow('toss')} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: '1px solid #C47B5A', background: 'white', color: '#C47B5A', fontSize: 13, cursor: 'pointer' }}>
              寫告別紀念文（可略）
            </button>
          )}
        </div>
      )}

      {/* Save button */}
      <button onClick={handleSave}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: saveFlash ? sg : ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600, marginTop: 8, transition: 'background 0.3s' }}>
        {saveFlash ? '✅ 已儲存！' : '💾 儲存斷捨離紀錄'}
      </button>
      {justSaved && (
        <button onClick={onGoToMember} style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 12, border: `1px solid ${sg}`, background: 'white', color: sg, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          前往會員頁查看紀錄 →
        </button>
      )}
    </div>
  )

  // ── STAGE: flow ───────────────────────────────────────────────
  if (stage === 'flow') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <div style={{ fontSize: 13, color: mf }}>{flowIndex + 1} / {flowItems.length}</div>
      </div>

      {!currentFlowItem ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, color: sg }}>全部處理完成！</div>
          <button onClick={() => setStage(flowType === 'toss' ? 'tosslist' : 'review')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer' }}>返回總覽</button>
        </div>
      ) : (
        <div>
          <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '28px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ink, marginBottom: 4, fontFamily: "'Noto Serif TC', serif" }}>{currentFlowItem.name}</div>
            <div style={{ fontSize: 12, color: mf }}>
              {flowType === 'keep' ? '留下' : flowType === 'donate' ? '送出' : '丟棄'}
            </div>
          </div>

          {flowType === 'keep' && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>這件物品要放在哪一區？</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {KEEP_CATS.map(cat => (
                  <button key={cat} onClick={() => setKeepCat(cat)} style={{ padding: '8px 14px', borderRadius: 20, border: `1px solid ${keepCat === cat ? sg : bd}`, background: keepCat === cat ? '#EAF2EE' : 'white', color: keepCat === cat ? sg : ml, fontSize: 13, cursor: 'pointer' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {flowType === 'donate' && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: ml, marginBottom: 10 }}>預計送出日期</div>
              <input type="date" min={todayStr()} value={donateDate} onChange={e => setDonateDate(e.target.value)}
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: ink, outline: 'none', background: 'white', boxSizing: 'border-box' }} />
              {donateDate && (
                <button
                  onClick={() => {
                    const ics = generateDonateIcs(donateDate, currentFlowItem.name)
                    downloadIcs(ics, `donate-${currentFlowItem.name}.ics`)
                    setDonateCalAdded(true)
                  }}
                  style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, border: `1.5px solid ${donateCalAdded ? sg : '#4285F4'}`, background: donateCalAdded ? '#EAF2EE' : 'white', color: donateCalAdded ? sg : '#4285F4', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  {donateCalAdded ? '✅ 行事曆已加入' : '📅 加入行事曆提醒'}
                </button>
              )}
            </div>
          )}

          {flowType === 'toss' && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: ml, marginBottom: 4 }}>寫一句告別的話（可略過）</div>
              <div style={{ fontSize: 11, color: mf, marginBottom: 10 }}>例：謝謝你陪伴了我三年，現在換個地方繼續發揮你的用處吧。</div>
              <textarea value={tossMemo} onChange={e => setTossMemo(e.target.value)} placeholder="感謝、回憶、或祝福…"
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: ink, minHeight: 80, resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          )}

          <button onClick={saveFlowItem} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
            {flowIndex < flowItems.length - 1 ? '下一件 →' : '完成'}
          </button>
        </div>
      )}
    </div>
  )

  // ── STAGE: tosslist ──────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>告別紀念文</h1>
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
              <button onClick={() => { setEditTossId(entry.id); setEditTossMemo(entry.memo) }} style={{ fontSize: 12, color: mf, background: 'none', border: 'none', cursor: 'pointer' }}>編輯</button>
            </div>
          </div>
          {editTossId === entry.id ? (
            <div>
              <textarea value={editTossMemo} onChange={e => setEditTossMemo(e.target.value)} style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 60 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => { setTossEntries(prev => prev.map(e => e.id === entry.id ? { ...e, memo: editTossMemo } : e)); setEditTossId(null) }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                <button onClick={() => setEditTossId(null)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: ml, lineHeight: 1.7, margin: 0 }}>{entry.memo}</p>
          )}
        </div>
      ))}

      <button onClick={() => setStage('review')} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
        返回分流總覽 →
      </button>

      {shareTossEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 16 }}>分享告別文</div>
            <div style={{ background: cr, borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 14, color: ink, lineHeight: 1.8 }}>{shareTossEntry.memo}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SHARE_BTNS.map(p => (
                <button key={p.id} onClick={() => shareToSocial(p.id, shareText(shareTossEntry))}
                  style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: p.color, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  {p.label}
                </button>
              ))}
              <button onClick={() => setShareTossEntry(null)} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
