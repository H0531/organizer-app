'use client'
import { useState } from 'react'
import { SHARE_BTNS, shareToSocial } from '@/lib/types'
import type { DeclutterItem, TossEntry, DeclutterRecord, Decision } from '@/lib/types'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
const KEEP_CATS = ['日常用品', '季節性', '紀念品', '備用品', '工作用品']

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

  // Keep flow
  const [keepCat, setKeepCat] = useState('')
  // Donate flow
  const [donateDate, setDonateDate] = useState('')
  const [donateCalAdded, setDonateCalAdded] = useState(false)
  // Toss flow
  const [tossWrite, setTossWrite] = useState(false)
  const [tossMemo, setTossMemo] = useState('')

  // Toss list
  const [tossEntries, setTossEntries] = useState<TossEntry[]>([])
  const [editTossId, setEditTossId] = useState<string | null>(null)
  const [editTossMemo, setEditTossMemo] = useState('')
  const [shareTossEntry, setShareTossEntry] = useState<TossEntry | null>(null)

  const addItem = (name?: string) => {
    const v = name || input.trim()
    if (!v) return
    setItems(prev => [...prev, { id: Date.now().toString(), name: v, decision: null }])
    setInput('')
  }

  const setDec = (id: string, d: Decision) =>
    setItems(prev => prev.map(x => x.id === id ? { ...x, decision: x.decision === d ? null : d } : x))

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

  const handleSaveToMember = () => {
    const record: DeclutterRecord = {
      savedAt: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      items,
      tossEntries,
    }
    onSaveToMember(record)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 3000)
  }

  // ── Shared save banner ─────────────────────────────────
  const SaveBanner = () => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#EAF2EE', border: `1px solid ${sg}`, alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: '#2E6B50' }}>
        {justSaved ? '✅ 已儲存到會員專區' : '存進會員專區，隨時查看分流記錄'}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSaveToMember} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
          💾 儲存
        </button>
        <button onClick={onGoToMember} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${sg}`, background: 'white', color: sg, fontSize: 12, cursor: 'pointer' }}>
          前往會員專區
        </button>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════
  // INPUT
  // ══════════════════════════════════════════════════════
  if (stage === 'input') return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>斷捨離決策</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 28 }}>逐一判斷每件物品的去留，全部完成才能進入分流處理</p>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>新增物品</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input style={{ flex: 1, border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, background: 'white', color: ink, outline: 'none' }}
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="例：三年沒穿的外套" />
          <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500, background: ink, color: 'white' }} onClick={() => addItem()}>加入</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: mf }}>快速加：</span>
          {['備用充電線', '舊T-shirt', '過期保養品', '購物袋', '舊雜誌', '贈品文具'].map(n => (
            <button key={n} onClick={() => addItem(n)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: cr, color: ml }}>{n}</button>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>等待判斷</div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${cr}`, gap: 12 }}>
              <span style={{ fontSize: 14, flex: 1, color: ink }}>{item.name}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['keep', 'donate', 'toss'] as const).map(d => {
                  const ac = item.decision === d
                  const col = d === 'keep' ? sg : d === 'donate' ? '#C47B5A' : mf
                  return (
                    <button key={d} onClick={() => setDec(item.id, d)} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${col}`, background: ac ? col : 'white', color: ac ? 'white' : col, fontSize: 12, cursor: 'pointer' }}>
                      {d === 'keep' ? '留' : d === 'donate' ? '送' : '丟'}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: '#EAF2EE', color: sg }}>留下 {keepItems.length}</span>
            <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: '#F0D5C8', color: '#C47B5A' }}>送出 {donateItems.length}</span>
            <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: cr, color: ml }}>丟棄 {tossItems.length}</span>
            {undecided.length > 0 && <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, background: '#F5F0E8', color: mf }}>未決定 {undecided.length}</span>}
          </div>

          {!allDecided && (
            <div style={{ fontSize: 12, color: '#C47B5A', marginTop: 10 }}>
              還有 {undecided.length} 件物品未判斷，全部完成才能進入分流處理
            </div>
          )}

          <button onClick={() => setStage('review')} disabled={!allDecided}
            style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, border: 'none', background: allDecided ? ink : '#C8C2B8', color: 'white', fontSize: 14, cursor: allDecided ? 'pointer' : 'not-allowed', fontWeight: 500 }}>
            {allDecided ? '進入分流處理 →' : `還有 ${undecided.length} 件未判斷`}
          </button>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════
  // REVIEW
  // ══════════════════════════════════════════════════════
  if (stage === 'review') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>分流處理</h1>
          <div style={{ fontSize: 13, color: ml, marginTop: 4 }}>選擇一個類別開始處理</div>
        </div>
        <button onClick={() => setStage('input')} style={{ fontSize: 12, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
      </div>

      <SaveBanner />
      <button
  onClick={() => shareToSocial('threads',
    `今天完成斷捨離整理 🗂️\n✅ 留下 ${keepItems.length} 件　📦 送出 ${donateItems.length} 件　🗑 丟棄 ${tossItems.length} 件\n\n#斷捨離 #整理 #整理師`
  )}
  style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #000', background: 'white', color: '#000', fontSize: 14, cursor: 'pointer', marginBottom: 12, fontWeight: 500 }}
>
  分享整理結果到 Threads
</button>

      {keepItems.length > 0 && (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: sg, marginBottom: 4 }}>✅ 選留 — {keepItems.length} 件</div>
          <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>為每件物品指定收納分類，避免放錯位置</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {keepItems.map(item => (
              <span key={item.id} style={{ padding: '3px 10px', background: 'white', borderRadius: 20, fontSize: 12, color: ink }}>
                {item.name}{item.category ? ` · ${item.category}` : ''}
              </span>
            ))}
          </div>
          <button onClick={() => startFlow('keep')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>開始分類 →</button>
        </div>
      )}

      {donateItems.length > 0 && (
        <div style={{ background: '#FDF5F0', border: '1px solid #C47B5A', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#C47B5A', marginBottom: 4 }}>📦 選送 — {donateItems.length} 件</div>
          <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>設定送出日，加入行事曆提醒</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {donateItems.map(item => (
              <span key={item.id} style={{ padding: '3px 10px', background: 'white', borderRadius: 20, fontSize: 12, color: ink }}>
                {item.name}{item.disposeDate ? ` · ${item.disposeDate}` : ''}
              </span>
            ))}
          </div>
          <button onClick={() => startFlow('donate')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C47B5A', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>設定送出日 →</button>
        </div>
      )}

      {tossItems.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: ml, marginBottom: 4 }}>🗑 選丟 — {tossItems.length} 件</div>
          <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>點選每件物品，選擇寫告別紀念或直接放手</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tossItems.map(item => {
              const entry = tossEntries.find(e => e.id === item.id)
              return (
                <div key={item.id} style={{ background: cr, borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entry?.memo || editTossId === item.id ? 8 : 0 }}>
                    <span style={{ fontSize: 14, color: ink, fontWeight: 500 }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {entry?.memo && !editTossId && (
                        <button onClick={() => setShareTossEntry(entry)} style={{ fontSize: 12, color: 'white', background: sg, border: 'none', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', fontWeight: 500 }}>分享</button>
                      )}
                      <button onClick={() => { setEditTossId(item.id); setEditTossMemo(entry?.memo || '') }}
                        style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 6, cursor: 'pointer', padding: '3px 8px' }}>
                        {entry?.memo ? '編輯' : '✍️ 寫紀念文'}
                      </button>
                      {!entry?.memo && (
                        <button onClick={() => {
                          setItems(prev => prev.map(x => x.id === item.id ? { ...x, tossMemo: '' } : x))
                        }} style={{ fontSize: 12, color: mf, background: 'none', border: `1px solid ${bd}`, borderRadius: 6, cursor: 'pointer', padding: '3px 8px' }}>直接放手</button>
                      )}
                    </div>
                  </div>
                  {editTossId === item.id ? (
                    <div>
                      <textarea value={editTossMemo} onChange={e => setEditTossMemo(e.target.value)}
                        placeholder={`這是一件 ${item.name}。它曾陪伴過我…`}
                        style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 70 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button onClick={() => {
                          const next = [...tossEntries.filter(e => e.id !== item.id), { id: item.id, name: item.name, memo: editTossMemo, date: new Date().toLocaleDateString('zh-TW') }]
                          setTossEntries(next); setEditTossId(null)
                        }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                        <button onClick={() => setEditTossId(null)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
                      </div>
                    </div>
                  ) : (
                    entry?.memo && <p style={{ fontSize: 13, color: ml, margin: 0, lineHeight: 1.7 }}>{entry.memo}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════
  // FLOW
  // ══════════════════════════════════════════════════════
  if (stage === 'flow' && currentFlowItem) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: mf }}>{flowIndex + 1} / {flowItems.length}</span>
          <button onClick={handleSaveToMember} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${sg}`, background: justSaved ? '#EAF2EE' : 'white', color: sg, fontSize: 12, cursor: 'pointer' }}>
            {justSaved ? '✅ 已儲存' : '💾 儲存'}
          </button>
        </div>
      </div>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, color: ink, marginBottom: 20 }}>「{currentFlowItem.name}」</div>

        {/* Keep */}
        {flowType === 'keep' && (
          <>
            <div style={{ fontSize: 14, color: ml, marginBottom: 12 }}>這件東西要收在哪一類？</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {KEEP_CATS.map(cat => (
                <button key={cat} onClick={() => setKeepCat(cat)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${keepCat === cat ? sg : bd}`, background: keepCat === cat ? sg : 'white', color: keepCat === cat ? 'white' : ml, fontSize: 13, cursor: 'pointer' }}>{cat}</button>
              ))}
            </div>
            <button onClick={saveFlowItem} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
              {flowIndex < flowItems.length - 1 ? '確認，下一件 →' : '完成 ✓'}
            </button>
          </>
        )}

        {/* Donate */}
        {flowType === 'donate' && (
          <>
            <div style={{ fontSize: 14, color: ink, fontWeight: 500, marginBottom: 8 }}>預計什麼時候送出？</div>
            <input type="date" value={donateDate} min={todayStr()} onChange={e => setDonateDate(e.target.value)}
              style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box', color: ink, background: 'white' }} />
            {!donateCalAdded
              ? <button onClick={() => { if (!donateDate) { alert('請先選擇日期'); return }; setDonateCalAdded(true); alert(`✅ 已設定提醒：${donateDate}\n（部署後需完成 Google Calendar API 串接）`) }}
                  style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid #4285F4', background: 'white', color: '#4285F4', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                  📅 加入行事曆提醒
                </button>
              : <div style={{ padding: '10px', borderRadius: 10, background: '#EAF2EE', color: sg, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>✅ 已加入行事曆</div>
            }
            <button onClick={saveFlowItem} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#C47B5A', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
              {flowIndex < flowItems.length - 1 ? '確認，下一件 →' : '完成 ✓'}
            </button>
          </>
        )}

        {/* Toss */}
        {flowType === 'toss' && (
          <>
            <div style={{ fontSize: 14, color: ml, marginBottom: 16 }}>丟之前，要留下一些話嗎？</div>
            {!tossWrite
              ? <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTossWrite(true)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>✍️ 寫告別紀念</button>
                  <button onClick={saveFlowItem} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer' }}>
                    直接放手 {flowIndex < flowItems.length - 1 ? '→' : '✓'}
                  </button>
                </div>
              : <>
                  <textarea value={tossMemo} onChange={e => setTossMemo(e.target.value)}
                    placeholder={`這是一件 ${currentFlowItem.name}。它曾陪伴過我…`}
                    style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: ink, minHeight: 100, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }} />
                  <button onClick={saveFlowItem} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                    儲存後放手 {flowIndex < flowItems.length - 1 ? '→' : '✓'}
                  </button>
                </>
            }
          </>
        )}
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════
  // TOSS LIST
  // ══════════════════════════════════════════════════════
  if (stage === 'tosslist') return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setStage('review')} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700, color: ink, margin: 0 }}>丟棄列表</h1>
        <button onClick={handleSaveToMember} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${sg}`, background: justSaved ? '#EAF2EE' : 'white', color: sg, fontSize: 12, cursor: 'pointer' }}>
          {justSaved ? '✅ 已儲存' : '💾 儲存'}
        </button>
      </div>

      <SaveBanner />

      {tossItems.length === 0 ? (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', color: mf, fontSize: 14 }}>還沒有要丟棄的物品</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tossItems.map(item => {
            const entry = tossEntries.find(e => e.id === item.id)
            return (
              <div key={item.id} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entry?.memo ? 8 : 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{item.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {entry && (
                      <button onClick={() => setShareTossEntry(entry)} style={{ fontSize: 12, color: 'white', background: sg, border: 'none', borderRadius: 6, cursor: 'pointer', padding: '3px 10px', fontWeight: 500 }}>分享</button>
                    )}
                    <button onClick={() => { setEditTossId(item.id); setEditTossMemo(entry?.memo || '') }}
                      style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 6, cursor: 'pointer', padding: '3px 8px' }}>編輯</button>
                  </div>
                </div>

                {editTossId === item.id ? (
                  <div>
                    <textarea value={editTossMemo} onChange={e => setEditTossMemo(e.target.value)}
                      placeholder="寫下告別紀念文…"
                      style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 70 }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => {
                        const next = [...tossEntries.filter(e => e.id !== item.id), { id: item.id, name: item.name, memo: editTossMemo, date: new Date().toLocaleDateString('zh-TW') }]
                        setTossEntries(next); setEditTossId(null)
                      }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                      <button onClick={() => setEditTossId(null)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
                    </div>
                  </div>
                ) : (
                  entry?.memo && <p style={{ fontSize: 13, color: ml, margin: 0, lineHeight: 1.7 }}>{entry.memo}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Share toss popup */}
      {shareTossEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 400, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 4 }}>「{shareTossEntry.name}」告別紀念</div>
            <div style={{ fontSize: 12, color: mf, marginBottom: 16 }}>{shareTossEntry.date}</div>
            {shareTossEntry.memo && (
              <div style={{ background: cr, borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 14, color: ink, lineHeight: 1.8 }}>{shareTossEntry.memo}</div>
            )}
            <div style={{ background: '#F5F0E8', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: ml, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {`我放手了一件「${shareTossEntry.name}」。${shareTossEntry.memo ? '\n' + shareTossEntry.memo : ''}\n\n#斷捨離 #整理小幫手`}
            </div>
            {SHARE_BTNS.map(p => (
              <button key={p.id} onClick={() => shareToSocial(p.id, `我放手了一件「${shareTossEntry.name}」。${shareTossEntry.memo ? '\n' + shareTossEntry.memo : ''}\n#斷捨離 #整理小幫手`)}
                style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: p.color, fontSize: 14, cursor: 'pointer', marginBottom: 8, fontWeight: 500 }}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setShareTossEntry(null)} style={{ width: '100%', marginTop: 4, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  )

  return null
}
