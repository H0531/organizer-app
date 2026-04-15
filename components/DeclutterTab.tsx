'use client'
import { useState } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

type Decision = 'keep' | 'donate' | 'toss' | null
type Item = { name: string; decision: Decision; category?: string; disposeDate?: string; memo?: string }

const KEEP_CATS = ['日常用品', '季節性', '紀念品', '備用品', '工作用品']

export default function DeclutterTab() {
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const [stage, setStage] = useState<'input' | 'review' | 'flow'>('input')
  const [flowIndex, setFlowIndex] = useState(0)
  const [flowType, setFlowType] = useState<'keep' | 'donate' | 'toss'>('keep')

  // Keep flow
  const [keepCat, setKeepCat] = useState('')
  // Donate flow
  const [donateDate, setDonateDate] = useState('')
  const [donateCalAdded, setDonateCalAdded] = useState(false)
  // Toss flow
  const [tossWrite, setTossWrite] = useState(false)
  const [tossMemo, setTossMemo] = useState('')

  const addItem = (name?: string) => {
    const v = name || input.trim()
    if (!v) return
    setItems([...items, { name: v, decision: null }])
    setInput('')
  }

  const setDec = (i: number, d: Decision) => {
    const n = [...items]; n[i] = { ...n[i], decision: n[i].decision === d ? null : d }
    setItems(n)
  }

  const decided = items.filter(x => x.decision)
  const undecided = items.filter(x => !x.decision)
  const keepItems = items.filter(x => x.decision === 'keep')
  const donateItems = items.filter(x => x.decision === 'donate')
  const tossItems = items.filter(x => x.decision === 'toss')

  const startFlow = (type: 'keep' | 'donate' | 'toss') => {
    setFlowType(type)
    setFlowIndex(0)
    setStage('flow')
    setKeepCat('')
    setDonateDate('')
    setDonateCalAdded(false)
    setTossWrite(false)
    setTossMemo('')
  }

  const flowItems = items.filter(x => x.decision === flowType)
  const currentFlowItem = flowItems[flowIndex]

  const nextFlowItem = () => {
    if (flowIndex < flowItems.length - 1) {
      setFlowIndex(flowIndex + 1)
      setKeepCat('')
      setDonateCalAdded(false)
      setTossWrite(false)
      setTossMemo('')
    } else {
      setStage('review')
    }
  }

  const saveFlowItem = () => {
    const n = [...items]
    const idx = n.findIndex(x => x.name === currentFlowItem.name)
    if (idx !== -1) {
      if (flowType === 'keep') n[idx].category = keepCat
      if (flowType === 'donate') n[idx].disposeDate = donateDate
      if (flowType === 'toss') n[idx].memo = tossMemo
    }
    setItems(n)
    nextFlowItem()
  }

  const handleDonateCalendar = () => {
    if (!donateDate) { alert('請先選擇日期'); return }
    setDonateCalAdded(true)
    alert(`✅ 已設定提醒：${donateDate}\n（部署後需完成 Google Calendar API 串接）`)
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>斷捨離決策</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 28 }}>逐一判斷每件物品的去留，完成後進入分流處理</p>

      {/* Input stage */}
      {stage === 'input' && (
        <>
          <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>新增物品</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input style={{ flex: 1, border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, background: 'white', color: ink, outline: 'none' }}
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder="例：三年沒穿的外套" />
              <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500, background: ink, color: 'white' }} onClick={() => addItem()}>加入</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: mf }}>快速加：</span>
              {['備用充電線', '舊T-shirt', '過期保養品', '購物袋', '舊雜誌', '贈品文具'].map(n => (
                <button key={n} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', background: cr, color: ml }} onClick={() => addItem(n)}>{n}</button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>等待判斷</div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${cr}`, gap: 12 }}>
                  <span style={{ fontSize: 14, flex: 1, color: ink }}>{item.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['keep', 'donate', 'toss'] as const).map(d => {
                      const ac = item.decision === d
                      const col = d === 'keep' ? sg : d === 'donate' ? '#C47B5A' : mf
                      return <button key={d} onClick={() => setDec(i, d)} style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${col}`, background: ac ? col : 'white', color: ac ? 'white' : col, fontSize: 12, cursor: 'pointer' }}>{d === 'keep' ? '留' : d === 'donate' ? '送' : '丟'}</button>
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

              {decided.length > 0 && (
                <button onClick={() => setStage('review')} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  進入分流處理 →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Review stage - show 3 flows */}
      {stage === 'review' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink }}>分流處理</div>
              <div style={{ fontSize: 13, color: ml }}>選擇一個類別開始處理</div>
            </div>
            <button onClick={() => setStage('input')} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
          </div>

          {/* Keep flow card */}
          {keepItems.length > 0 && (
            <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: sg, marginBottom: 4 }}>✅ 選留 — {keepItems.length} 件</div>
                  <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>為每件物品指定收納分類，避免放錯位置</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {keepItems.slice(0, 4).map((item, i) => (
                      <span key={i} style={{ padding: '3px 10px', background: 'white', borderRadius: 20, fontSize: 12, color: ink }}>
                        {item.name}{item.category ? ` · ${item.category}` : ''}
                      </span>
                    ))}
                    {keepItems.length > 4 && <span style={{ fontSize: 12, color: mf }}>+{keepItems.length - 4} 件</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => startFlow('keep')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                開始分類 →
              </button>
            </div>
          )}

          {/* Donate flow card */}
          {donateItems.length > 0 && (
            <div style={{ background: '#FDF5F0', border: '1px solid #C47B5A', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#C47B5A', marginBottom: 4 }}>📦 選送 — {donateItems.length} 件</div>
              <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>拍照記錄後設定送出日，系統加入行事曆提醒</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {donateItems.map((item, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: 'white', borderRadius: 20, fontSize: 12, color: ink }}>
                    {item.name}{item.disposeDate ? ` · ${item.disposeDate}` : ''}
                  </span>
                ))}
              </div>
              <button onClick={() => startFlow('donate')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C47B5A', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                設定送出日 →
              </button>
            </div>
          )}

          {/* Toss flow card */}
          {tossItems.length > 0 && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: ml, marginBottom: 4 }}>🗑 選丟 — {tossItems.length} 件</div>
              <div style={{ fontSize: 13, color: ml, marginBottom: 12 }}>可以選擇是否寫一段告別記念文，整理記憶後再放手</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {tossItems.map((item, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: cr, borderRadius: 20, fontSize: 12, color: ink }}>{item.name}</span>
                ))}
              </div>
              <button onClick={() => startFlow('toss')} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>
                寫告別紀念文 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Flow stage */}
      {stage === 'flow' && currentFlowItem && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: mf }}>{flowIndex + 1} / {flowItems.length}</div>
            <button onClick={() => setStage('review')} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
          </div>

          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, color: ink, marginBottom: 20 }}>「{currentFlowItem.name}」</div>

          {/* Keep flow */}
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

          {/* Donate flow */}
          {flowType === 'donate' && (
            <>
              <div style={{ fontSize: 14, color: ml, marginBottom: 8 }}>預計什麼時候送出？</div>
              <input type="date" value={donateDate} onChange={e => setDonateDate(e.target.value)}
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />

              {!donateCalAdded
                ? <button onClick={handleDonateCalendar} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: `1px solid #4285F4`, background: 'white', color: '#4285F4', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                    📅 加入行事曆提醒
                  </button>
                : <div style={{ padding: '10px', borderRadius: 10, background: '#EAF2EE', color: sg, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>✅ 已加入行事曆</div>
              }
              <button onClick={saveFlowItem} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#C47B5A', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                {flowIndex < flowItems.length - 1 ? '確認，下一件 →' : '完成 ✓'}
              </button>
            </>
          )}

          {/* Toss flow */}
          {flowType === 'toss' && (
            <>
              <div style={{ fontSize: 14, color: ml, marginBottom: 16 }}>丟之前，要留下一些話嗎？</div>
              {!tossWrite
                ? <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
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
      )}
    </div>
  )
}
