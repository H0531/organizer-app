'use client'
import { useState, useEffect } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

type ChallengeMode = 7 | 30 | 60 | 100
type TossEntry = { day: number; item: string; origin: string; reason: string; feeling: string; date: string }

const STORAGE_KEY = 'challenge_data'

// Fixed memorial templates
const MEMORIAL_TEMPLATES = [
  (e: TossEntry) => `第 ${e.day} 天，我放手了一件「${e.item}」。\n它來自 ${e.origin || '某個地方'}。${e.reason ? `\n放手的原因是：${e.reason}。` : ''}\n${e.feeling ? `\n放掉之後，${e.feeling}。` : ''}`,
  (e: TossEntry) => `Day ${e.day}：「${e.item}」，謝謝你陪伴過我。\n${e.reason ? `是因為${e.reason}，` : ''}今天我決定放手。\n${e.feeling || '願你在下一個地方繼續有用。'}`,
  (e: TossEntry) => `今天離開的是：${e.item}\n來自：${e.origin || '不知名的過去'}\n理由：${e.reason || '它完成了它的使命'}\n\n整理第 ${e.day} 天，繼續前行。`,
]

export default function ChallengeTab() {
  const [mode, setMode] = useState<ChallengeMode | null>(null)
  const [entries, setEntries] = useState<TossEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showMemorial, setShowMemorial] = useState<TossEntry | null>(null)
  const [templateIdx, setTemplateIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)

  // Form state
  const [fItem, setFItem] = useState('')
  const [fOrigin, setFOrigin] = useState('')
  const [fReason, setFReason] = useState('')
  const [fFeeling, setFFeeling] = useState('')

  // ── FIX 2: Load persisted data on mount ──────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { mode: savedMode, entries: savedEntries } = JSON.parse(saved)
        if (savedMode) setMode(savedMode)
        if (savedEntries) setEntries(savedEntries)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // ── FIX 2: Persist whenever mode or entries change ────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, entries }))
    } catch {
      // ignore storage errors
    }
  }, [mode, entries])

  const today = new Date().toLocaleDateString('zh-TW')
  const currentDay = entries.length + 1
  const todayDone = entries[entries.length - 1]?.date === today

  const submitEntry = () => {
    if (!fItem.trim()) return
    const entry: TossEntry = { day: currentDay, item: fItem, origin: fOrigin, reason: fReason, feeling: fFeeling, date: today }
    const newEntries = [...entries, entry]
    setEntries(newEntries)

    // ── FIX 1: Clear form & hide it first, then open modal in next tick ──
    setShowForm(false)
    setFItem(''); setFOrigin(''); setFReason(''); setFFeeling('')
    const idx = Math.floor(Math.random() * MEMORIAL_TEMPLATES.length)
    setTemplateIdx(idx)
    setTimeout(() => setShowMemorial(entry), 0)
  }

  const handleShare = (text: string, platform: string) => {
    const tag = '#每日丟一物 #整理小幫手 #斷捨離'
    const full = `${text}\n\n${tag}`
    if (platform === 'copy') { navigator.clipboard.writeText(full); alert('已複製！') }
    else if (platform === 'threads') window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(full)}`)
  }

  const handleResetChallenge = () => {
    setMode(null)
    setEntries([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const pct = mode ? Math.round((entries.length / mode) * 100) : 0
  const milestones = [
    { day: 7, label: '第一週 🌱' },
    { day: 14, label: '兩週 🌿' },
    { day: 30, label: '一個月 🌳' },
    { day: 60, label: '兩個月 ✨' },
    { day: 100, label: '百日達成 🏆' },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>每日丟一物挑戰</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 28 }}>連續打卡，每天放手一件東西，讓生活越來越輕盈</p>

      {/* Mode selection */}
      {!mode && (
        <div>
          <div style={{ fontSize: 14, color: ml, marginBottom: 16 }}>選擇挑戰長度：</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 24 }}>
            {([7, 30, 60, 100] as ChallengeMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: '24px 12px', border: `1px solid ${bd}`, borderRadius: 12, background: ww, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 700, color: sg, marginBottom: 4 }}>{m}</div>
                <div style={{ fontSize: 13, color: ml }}>天挑戰</div>
                <div style={{ fontSize: 11, color: mf, marginTop: 6 }}>
                  {m === 7 ? '輕鬆入門' : m === 30 ? '入門首選' : m === 60 ? '進階版本' : '終極挑戰'}
                </div>
              </button>
            ))}
          </div>

          {/* What is this */}
          <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>關於這個挑戰</div>
            {[
              ['每天只丟一件', '不需要大整理，每天找一件用不到的東西，決定它的去留'],
              ['記錄物品故事', '簡短記錄它的來歷和你的感受，整理記憶也是整理的一部分'],
              ['中間不能斷', '挑戰期間若中斷，需從第1天重新開始'],
              ['完成可分享', '達成 30 / 60 / 100 天，產出完整紀念文可分享到社群'],
            ].map(([t, d], i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${cr}` : 'none' }}>
                <span style={{ color: sg, fontSize: 14, flexShrink: 0, marginTop: 2 }}>✦</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 2 }}>{t}</div>
                  <div style={{ fontSize: 13, color: ml }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active challenge */}
      {mode && (
        <>
          {/* Progress header */}
          <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, color: ink }}>{entries.length} <span style={{ fontSize: 14, color: mf, fontFamily: 'inherit', fontWeight: 400 }}>/ {mode} 天</span></div>
                <div style={{ fontSize: 13, color: ml, marginTop: 2 }}>{mode} 天挑戰中</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: sg }}>{pct}%</div>
                <button onClick={handleResetChallenge} style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>重新選擇</button>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: cr, borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ height: '100%', borderRadius: 4, background: sg, width: `${pct}%`, transition: 'width 0.5s' }} />
            </div>

            {/* Milestones */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {milestones.filter(m => m.day <= mode).map(m => (
                <span key={m.day} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, background: entries.length >= m.day ? sg : cr, color: entries.length >= m.day ? 'white' : mf, fontWeight: entries.length >= m.day ? 500 : 400 }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Dot grid */}
          <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>打卡紀錄</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: mode }).map((_, i) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: 6, background: i < entries.length ? sg : i === entries.length ? '#F0E8D0' : cr, border: i === entries.length ? `1.5px dashed #C4953A` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i < entries.length ? 'pointer' : 'default' }}
                  title={entries[i] ? `Day ${i + 1}: ${entries[i].item}` : `Day ${i + 1}`}
                  onClick={() => entries[i] && setShowMemorial(entries[i])}>
                  {i < entries.length && <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>✓</span>}
                  {i === entries.length && <span style={{ fontSize: 8, color: '#C4953A' }}>今</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Today's action */}
          {!todayDone ? (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 4 }}>Day {currentDay} — 今天要丟什麼？</div>
              <div style={{ fontSize: 13, color: ml, marginBottom: 16 }}>找一件用不到的東西，記錄它的故事後放手</div>

              {!showForm ? (
                <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 500 }}>
                  ＋ 記錄今天的物品
                </button>
              ) : (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: mf, marginBottom: 4 }}>物品名稱 *</div>
                    <input value={fItem} onChange={e => setFItem(e.target.value)} placeholder="例：七年前買的馬克杯" style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: mf, marginBottom: 4 }}>它從哪裡來？（可略）</div>
                    <input value={fOrigin} onChange={e => setFOrigin(e.target.value)} placeholder="例：大學時朋友送的、自己買的" style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: mf, marginBottom: 4 }}>為什麼要放手？（可略）</div>
                    <input value={fReason} onChange={e => setFReason(e.target.value)} placeholder="例：已經有新的替代品了" style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: mf, marginBottom: 4 }}>放掉之後的感受？（可略）</div>
                    <input value={fFeeling} onChange={e => setFFeeling(e.target.value)} placeholder="例：有點輕鬆，但也有點捨不得" style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={submitEntry} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>打卡完成 ✓</button>
                    <button onClick={() => setShowForm(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>取消</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>✅</div>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: sg, marginBottom: 4 }}>今天已打卡！</div>
              <div style={{ fontSize: 13, color: ml }}>明天再來 Day {entries.length + 1}</div>
            </div>
          )}

          {/* History */}
          {entries.length > 0 && (
            <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>過去紀錄</div>
                <button onClick={() => setShowHistory(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>{showHistory ? '收起' : '查看全部'}</button>
              </div>
              {(showHistory ? [...entries].reverse() : [...entries].reverse().slice(0, 3)).map((entry, i) => (
                <div key={i} onClick={() => { setShowMemorial(entry); setTemplateIdx(0) }} style={{ padding: '10px 0', borderBottom: `1px solid ${cr}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: ink, fontWeight: 500 }}>Day {entry.day}：{entry.item}</span>
                    <span style={{ fontSize: 11, color: mf }}>{entry.date}</span>
                  </div>
                  {entry.feeling && <div style={{ fontSize: 12, color: ml, marginTop: 2 }}>{entry.feeling}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Memorial modal */}
      {showMemorial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 6 }}>告別紀念文</div>
            <div style={{ fontSize: 12, color: mf, marginBottom: 16 }}>Day {showMemorial.day} · {showMemorial.date}</div>

            <div style={{ background: cr, borderRadius: 10, padding: '16px 18px', marginBottom: 16, fontSize: 14, color: ink, lineHeight: 1.9, whiteSpace: 'pre-line' }}>
              {MEMORIAL_TEMPLATES[templateIdx](showMemorial)}
            </div>

            {/* Switch template */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {MEMORIAL_TEMPLATES.map((_, i) => (
                <button key={i} onClick={() => setTemplateIdx(i)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${templateIdx === i ? sg : bd}`, background: templateIdx === i ? '#EAF2EE' : 'white', color: templateIdx === i ? sg : ml, fontSize: 12, cursor: 'pointer' }}>
                  版本 {i + 1}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => handleShare(MEMORIAL_TEMPLATES[templateIdx](showMemorial), 'threads')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ink, fontSize: 12, cursor: 'pointer' }}>分享 Threads</button>
              <button onClick={() => handleShare(MEMORIAL_TEMPLATES[templateIdx](showMemorial), 'copy')} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>複製文字</button>
            </div>
            <button onClick={() => setShowMemorial(null)} style={{ width: '100%', padding: '8px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  )
}
