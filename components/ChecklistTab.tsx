'use client'
import { useState, useEffect, useRef } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

const SP: Record<string, { label: string; items: { text: string; badge?: string }[] }> = {
  desk: { label: '書桌整理清單', items: [{ text: '清空桌面所有物品', badge: '必做' }, { text: '分類文件文具雜物' }, { text: '丟棄過期收據廢紙' }, { text: '文具只留常用3支筆' }, { text: '電線整理貼上標籤' }, { text: '桌面只留今日必要物品' }] },
  wardrobe: { label: '衣櫃整理清單', items: [{ text: '全部衣物取出攤開', badge: '必做' }, { text: '依類型分堆上衣褲外套' }, { text: '超過一年未穿考慮送出' }, { text: '破損變形衣物直接淘汰' }, { text: '常穿放前方少穿放後方' }, { text: '折疊統一方式直立收納' }] },
  kitchen: { label: '廚房整理清單', items: [{ text: '清查過期食品與調味料', badge: '必做' }, { text: '餐具統計過多的送出' }, { text: '常用鍋具放瓦斯爐旁' }, { text: '塑膠袋只留10個' }, { text: '清潔用品集中一區' }, { text: '冰箱門背貼購物清單欄' }] },
  bathroom: { label: '浴室整理清單', items: [{ text: '清查過期保養品藥品', badge: '必做' }, { text: '只留1套備用備品' }, { text: '毛巾超過3條斷捨離' }, { text: '瓶瓶罐罐整理到收納架' }, { text: '清除水垢黴菌' }, { text: '放一個小香氛提升儀式感' }] },
  bag: { label: '包包整理清單', items: [{ text: '倒出所有東西', badge: '必做' }, { text: '丟棄發票廢紙屑' }, { text: '零錢集中到錢包' }, { text: '超過3個購物袋只留一個' }, { text: '藥品確認是否過期' }, { text: '常用物品分區放小包' }] },
  digital: { label: '數位整理清單', items: [{ text: '截圖資料夾整理或刪除', badge: '必做' }, { text: '手機App超過3頁刪一輪' }, { text: '相簿備份到雲端' }, { text: '訂閱email取消不需要的' }, { text: '桌面資料夾分類命名' }, { text: '清除瀏覽器書籤' }] },
}
const SI: Record<string, string> = { desk: '🗂', wardrobe: '👕', kitchen: '🍳', bathroom: '🪥', bag: '👜', digital: '📱' }
const SN: Record<string, string> = { desk: '書桌', wardrobe: '衣櫃', kitchen: '廚房', bathroom: '浴室', bag: '包包', digital: '數位' }

const PRESET_MINS = [10, 30, 60, 90, 120]
const MAX_PHOTOS = 5

type PhotoSet = string[]
type LogEntry = {
  id: string; date: string; space: string; note: string
  beforePhotos: PhotoSet; afterPhotos: PhotoSet
  duration: number; targetMinutes: number
  skipBefore: boolean; skipAfter: boolean
}

// ─── Photo Upload Strip ───────────────────────────────────────────────────────
function PhotoStrip({ photos, onAdd, onRemove, skipped, onSkip, label, color }: {
  photos: string[]; onAdd: (files: FileList) => void; onRemove: (i: number) => void
  skipped: boolean; onSkip: () => void; label: string; color: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
            <div style={{ border: `1px dashed ${bd}`, borderRadius: 10, padding: '16px', marginBottom: 10, background: 'white', textAlign: 'center' }}>
              <svg width="52" height="38" viewBox="0 0 52 38" fill="none" style={{ display: 'block', margin: '0 auto 8px' }}>
                <rect x="2" y="9" width="48" height="27" rx="4" fill={cr} stroke={bd} strokeWidth="1.5" />
                <circle cx="26" cy="22.5" r="8.5" fill="white" stroke={mf} strokeWidth="1.5" />
                <circle cx="26" cy="22.5" r="5" fill={cr} stroke={mf} strokeWidth="1" />
                <rect x="17" y="4" width="18" height="8" rx="2.5" fill={bd} />
                <circle cx="41" cy="14" r="2.5" fill={mf} />
              </svg>
              <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>
                建議角度：站在空間正前方，平行拍攝整體<br />
                光線充足的照片對比效果更明顯
              </div>
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 82, height: 82, objectFit: 'cover', borderRadius: 8, border: `2px solid ${color}`, display: 'block' }} />
                  <button onClick={() => onRemove(i)} style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#777', color: 'white', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <>
              <button onClick={() => ref.current?.click()} style={{ padding: '7px 16px', border: `1px dashed ${color}`, borderRadius: 8, background: 'white', color: color, cursor: 'pointer', fontSize: 13 }}>
                ＋ 上傳照片{photos.length > 0 ? `（${photos.length}/${MAX_PHOTOS}）` : ''}
              </button>
              <input ref={ref} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && onAdd(e.target.files)} />
            </>
          )}
          {photos.length >= MAX_PHOTOS && <div style={{ fontSize: 12, color: mf, marginTop: 2 }}>已達上限（{MAX_PHOTOS} 張）</div>}
        </>
      )}
    </div>
  )
}

// ─── Page Dots ────────────────────────────────────────────────────────────────
function PageDots({ page }: { page: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[1, 2, 3].map(p => (
        <div key={p} style={{ width: p === page ? 22 : 7, height: 7, borderRadius: 4, background: p === page ? sg : cr, transition: 'all 0.3s' }} />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChecklistTab() {
  const [page, setPage] = useState<1 | 2 | 3>(1)
  const [space, setSpace] = useState('desk')
  const [checked, setChecked] = useState<Record<string, boolean[]>>({})

  // Photos
  const [beforePhotos, setBeforePhotos] = useState<PhotoSet>([])
  const [afterPhotos, setAfterPhotos] = useState<PhotoSet>([])
  const [skipBefore, setSkipBefore] = useState(false)
  const [skipAfter, setSkipAfter] = useState(false)

  // Timer
  const [targetMins, setTargetMins] = useState(30)
  const [customMins, setCustomMins] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerDone, setTimerDone] = useState(false)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Note
  const [note, setNote] = useState('')

  // Calendar
  const [showCalModal, setShowCalModal] = useState(false)
  const [calDate, setCalDate] = useState('')
  const [calTime, setCalTime] = useState('09:00')
  const [calConnected, setCalConnected] = useState(false)
  const [calLoading, setCalLoading] = useState(false)
  const [calSaved, setCalSaved] = useState(false)

  // Diary
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [shareEntry, setShareEntry] = useState<LogEntry | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const effectiveMins = useCustom ? Math.max(1, parseInt(customMins) || 1) : targetMins
  const totalSecs = effectiveMins * 60

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { setTimerRunning(false); setTimerDone(true); clearInterval(timerRef.current!); return 0 }
          return t - 1
        })
        setElapsedSecs(e => e + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  const fmtSecs = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const fmtMins = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} 分 ${sec} 秒` : `${m} 分鐘` }

  const getC = () => checked[space] || SP[space].items.map(() => false)
  const toggleC = (i: number) => { const c = getC(); const n = [...c]; n[i] = !n[i]; setChecked({ ...checked, [space]: n }) }
  const done = getC().filter(Boolean).length
  const total = SP[space].items.length

  const addPhotos = (type: 'before' | 'after', files: FileList) => {
    const current = type === 'before' ? beforePhotos : afterPhotos
    const setter = type === 'before' ? setBeforePhotos : setAfterPhotos
    const toAdd = Array.from(files).slice(0, MAX_PHOTOS - current.length)
    Promise.all(toAdd.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(f) }))).then(res => setter([...current, ...res]))
  }
  const removePhoto = (type: 'before' | 'after', i: number) => {
    if (type === 'before') setBeforePhotos(p => p.filter((_, idx) => idx !== i))
    else setAfterPhotos(p => p.filter((_, idx) => idx !== i))
  }

  const startTimer = () => { setTimeLeft(totalSecs); setElapsedSecs(0); setTimerDone(false); setTimerRunning(true); setPage(2) }

  const saveLog = () => {
    const entry: LogEntry = {
      id: Date.now().toString(), date: new Date().toLocaleDateString('zh-TW'),
      space: SN[space], note,
      beforePhotos: skipBefore ? [] : beforePhotos,
      afterPhotos: skipAfter ? [] : afterPhotos,
      duration: elapsedSecs, targetMinutes: effectiveMins,
      skipBefore, skipAfter,
    }
    setLogs([entry, ...logs])
    setNote(''); setBeforePhotos([]); setAfterPhotos([]); setSkipBefore(false); setSkipAfter(false)
    setChecked({ ...checked, [space]: SP[space].items.map(() => false) })
    setTimerDone(false); setElapsedSecs(0); setTimeLeft(0)
    setPage(3)
  }

  const handleShare = (entry: LogEntry, platform: string) => {
    const text = `我完成了${entry.space}整理！用時 ${fmtMins(entry.duration)} ✨ #整理小幫手 #生活整理`
    if (platform === 'copy') { navigator.clipboard.writeText(text); alert('已複製！') }
    else if (platform === 'line') window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`)
    else if (platform === 'threads') window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`)
  }

  const saveEdit = () => { setLogs(logs.map(l => l.id === editingId ? { ...l, note: editNote } : l)); setEditingId(null) }
  const deleteLog = (id: string) => { setLogs(logs.filter(l => l.id !== id)); setConfirmDeleteId(null); if (shareEntry?.id === id) setShareEntry(null) }

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════
  if (page === 1) return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>今天整理哪裡？</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20 }}>選空間、拍整理前照片、設好時間，再開始</p>
      <PageDots page={1} />

      {/* 空間選擇 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {Object.keys(SP).map(k => (
          <button key={k} onClick={() => setSpace(k)} style={{ padding: '14px 10px', border: space === k ? `2px solid ${sg}` : `1px solid ${bd}`, borderRadius: 10, background: space === k ? '#EAF2EE' : ww, cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{SI[k]}</span>
            <span style={{ fontSize: 13, color: ink }}>{SN[k]}</span>
          </button>
        ))}
      </div>

      {/* Before photos */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <PhotoStrip photos={beforePhotos} onAdd={f => addPhotos('before', f)} onRemove={i => removePhoto('before', i)}
          skipped={skipBefore} onSkip={() => { setSkipBefore(s => !s); setBeforePhotos([]) }}
          label="📷 整理前照片" color={mf} />
      </div>

      {/* Timer setup */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>⏱ 設定整理時間</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRESET_MINS.map(m => (
            <button key={m} onClick={() => { setTargetMins(m); setUseCustom(false) }} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${!useCustom && targetMins === m ? sg : bd}`, background: !useCustom && targetMins === m ? sg : 'white', color: !useCustom && targetMins === m ? 'white' : ml, fontSize: 13, cursor: 'pointer' }}>
              {m} 分
            </button>
          ))}
          <button onClick={() => setUseCustom(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${useCustom ? sg : bd}`, background: useCustom ? sg : 'white', color: useCustom ? 'white' : ml, fontSize: 13, cursor: 'pointer' }}>
            自訂
          </button>
        </div>
        {useCustom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input type="number" min={1} value={customMins} onChange={e => setCustomMins(e.target.value)} placeholder="輸入分鐘數" style={{ width: 120, border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' }} />
            <span style={{ fontSize: 13, color: ml }}>分鐘（最小 1 分鐘）</span>
          </div>
        )}
        <div style={{ fontSize: 12, color: mf, marginTop: 6 }}>已設定：<strong style={{ color: ink }}>{effectiveMins} 分鐘</strong></div>
      </div>

      {/* Google Calendar */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 8 }}>📅 提前安排整理時間</div>
        <div style={{ fontSize: 13, color: ml, marginBottom: 14, lineHeight: 1.6 }}>排進行事曆後，前一天會收到通知提醒</div>
        {calSaved ? (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EAF2EE', color: sg, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✅ 已排程：{calDate} {calTime}</span>
            <button onClick={() => { setCalSaved(false); setShowCalModal(true) }} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>修改</button>
          </div>
        ) : (
          <button onClick={() => setShowCalModal(true)} style={{ padding: '9px 18px', border: '1px solid #4285F4', borderRadius: 8, background: 'white', color: '#4285F4', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            加入 Google 行事曆
          </button>
        )}
      </div>

      <button onClick={startTimer} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
        開始整理 ▶
      </button>

      {/* Calendar Modal */}
      {showCalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 6 }}>加入 Google 行事曆</div>
            <p style={{ fontSize: 13, color: ml, marginBottom: 20, lineHeight: 1.6 }}>設定整理日期與時間，前一天會傳送提醒通知</p>
            {!calConnected ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: mf, marginBottom: 16 }}>需要先授權 Google 帳號</div>
                <button onClick={() => { setCalLoading(true); setTimeout(() => { setCalLoading(false); setCalConnected(true) }, 1400) }} disabled={calLoading} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#4285F4', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  {calLoading ? '連結中…' : '🔗 連結 Google 帳號'}
                </button>
                <div style={{ fontSize: 11, color: mf, marginTop: 8 }}>（部署後需完成 OAuth 設定）</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: mf, marginBottom: 5 }}>整理日期</div>
                  <input type="date" value={calDate} onChange={e => setCalDate(e.target.value)} style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: mf, marginBottom: 5 }}>開始時間</div>
                  <input type="time" value={calTime} onChange={e => setCalTime(e.target.value)} style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => { if (calDate) { setCalSaved(true); setShowCalModal(false) } }} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>確認排程</button>
              </>
            )}
            <button onClick={() => setShowCalModal(false)} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ══════════════════════════════════════════════════════════════════════
  if (page === 2) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => { setTimerRunning(false); setPage(1) }} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 返回</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>整理中</h1>
      </div>
      <PageDots page={2} />

      {/* Countdown ring */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 12px' }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r="54" fill="none" stroke={cr} strokeWidth="9" />
            <circle cx="65" cy="65" r="54" fill="none" stroke={timerDone ? '#C47B5A' : sg} strokeWidth="9"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (timeLeft / (totalSecs || 1))}`}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {timerDone
              ? <div style={{ fontSize: 15, fontWeight: 700, color: '#C47B5A' }}>時間到！</div>
              : <div style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, color: ink }}>{fmtSecs(timeLeft)}</div>
            }
            <div style={{ fontSize: 11, color: mf, marginTop: 2 }}>目標 {effectiveMins} 分</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: mf, marginBottom: 14 }}>已用 {fmtMins(elapsedSecs)}</div>
        {!timerDone && (
          <button onClick={() => setTimerRunning(r => !r)} style={{ padding: '8px 22px', borderRadius: 8, border: `1px solid ${sg}`, background: timerRunning ? sg : 'white', color: timerRunning ? 'white' : sg, fontSize: 13, cursor: 'pointer' }}>
            {timerRunning ? '⏸ 暫停' : '▶ 繼續'}
          </button>
        )}
      </div>

      {/* Checklist */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>{SP[space].label}</div>
        {SP[space].items.map((item, i) => (
          <div key={i} onClick={() => toggleC(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < total - 1 ? `1px solid ${cr}` : 'none', cursor: 'pointer' }}>
            <div style={{ width: 20, height: 20, border: getC()[i] ? 'none' : `1.5px solid ${bd}`, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: getC()[i] ? sg : 'white' }}>
              {getC()[i] && <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: 14, flex: 1, textDecoration: getC()[i] ? 'line-through' : 'none', color: getC()[i] ? mf : ink }}>{item.text}</span>
            {item.badge && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#F0E2C0', color: '#C4953A', fontWeight: 500 }}>{item.badge}</span>}
          </div>
        ))}
        <div style={{ background: cr, borderRadius: 4, height: 6, marginTop: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, background: sg, width: `${total ? Math.round(done / total * 100) : 0}%`, transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: 12, color: mf, marginTop: 6, textAlign: 'right' }}>{done} / {total} 完成</div>
      </div>

      {/* After photos + note */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <PhotoStrip photos={afterPhotos} onAdd={f => addPhotos('after', f)} onRemove={i => removePhoto('after', i)}
          skipped={skipAfter} onSkip={() => { setSkipAfter(s => !s); setAfterPhotos([]) }}
          label="📷 整理後照片" color={sg} />
        <div style={{ height: 1, background: cr, margin: '16px 0' }} />
        <div style={{ fontSize: 13, color: ml, marginBottom: 4, fontWeight: 500 }}>📝 整理紀錄</div>
        <div style={{ fontSize: 11, color: mf, background: cr, borderRadius: 6, padding: '7px 10px', marginBottom: 8, lineHeight: 1.6 }}>
          範例：今天清出三袋舊衣服，衣櫃左半邊空出來了！下次要整理右邊的毛衣區。
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="記錄這次整理的感受、發現、下次提醒自己的事…"
          style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: ink, minHeight: 80, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>

      <button onClick={saveLog} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: ink, color: 'white', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
        💾 儲存日記 →
      </button>
    </div>
  )

  // ══════════════════════════════════════════════════════════════════════
  // PAGE 3 — 打卡日記列表
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setPage(1)} style={{ fontSize: 13, color: ml, background: 'none', border: 'none', cursor: 'pointer' }}>← 新的整理</button>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: ink, margin: 0, flex: 1 }}>打卡日記</h1>
        <div style={{ fontSize: 13, color: mf }}>{logs.length} 筆</div>
      </div>
      <PageDots page={3} />

      {logs.length === 0 ? (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📓</div>
          <div style={{ fontSize: 15, color: mf }}>還沒有整理紀錄</div>
          <div style={{ fontSize: 13, color: mf, marginTop: 4 }}>完成第一次整理後會出現在這裡</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {logs.map(entry => (
            <div key={entry.id} onClick={() => setShareEntry(entry)}
              style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = sg)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = bd)}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{entry.space}整理</span>
                  <span style={{ fontSize: 12, color: mf, marginLeft: 8 }}>{entry.date}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: mf, marginRight: 4 }}>{fmtMins(entry.duration)}</span>
                  <button onClick={e => { e.stopPropagation(); setEditingId(entry.id); setEditNote(entry.note) }} style={{ fontSize: 12, color: sg, background: 'none', border: `1px solid ${sg}`, borderRadius: 6, cursor: 'pointer', padding: '2px 8px' }}>編輯</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(entry.id) }} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: '1px solid #C47B5A', borderRadius: 6, cursor: 'pointer', padding: '2px 8px' }}>刪除</button>
                </div>
              </div>

              {editingId === entry.id ? (
                <div onClick={e => e.stopPropagation()}>
                  <textarea value={editNote} onChange={e => setEditNote(e.target.value)} style={{ width: '100%', border: `1px solid ${sg}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: ink, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 60 }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={e => { e.stopPropagation(); saveEdit() }} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
                    <button onClick={e => { e.stopPropagation(); setEditingId(null) }} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
                  </div>
                </div>
              ) : (
                entry.note && <p style={{ fontSize: 13, color: ml, margin: '0 0 10px', lineHeight: 1.6 }}>{entry.note}</p>
              )}

              {(entry.beforePhotos.length > 0 || entry.afterPhotos.length > 0) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {entry.beforePhotos.slice(0, 2).map((p, i) => (
                    <div key={`b${i}`} style={{ position: 'relative' }}>
                      <img src={p} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, filter: 'grayscale(20%)' }} />
                      <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '1px 4px', borderRadius: 3, letterSpacing: '0.05em' }}>B</span>
                    </div>
                  ))}
                  {entry.afterPhotos.slice(0, 2).map((p, i) => (
                    <div key={`a${i}`} style={{ position: 'relative' }}>
                      <img src={p} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: `1.5px solid ${sg}` }} />
                      <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 8, background: 'rgba(122,158,138,0.85)', color: 'white', padding: '1px 4px', borderRadius: 3, letterSpacing: '0.05em' }}>A</span>
                    </div>
                  ))}
                  {(entry.beforePhotos.length + entry.afterPhotos.length > 4) && (
                    <div style={{ width: 64, height: 48, borderRadius: 6, background: cr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: mf }}>
                      +{entry.beforePhotos.length + entry.afterPhotos.length - 4}
                    </div>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: mf, marginTop: 8 }}>點擊查看完整紀錄 · 分享成果</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Share Popup ── */}
      {shareEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.52)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 460, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, color: ink, marginBottom: 2 }}>{shareEntry.space}整理紀錄</div>
            <div style={{ fontSize: 12, color: mf, marginBottom: 20 }}>{shareEntry.date} · 用時 {fmtMins(shareEntry.duration)}</div>

            {/* BEFORE photos */}
            {shareEntry.beforePhotos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1, background: '#E0D8CC' }} />
                  <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 800, color: '#7A6A50', background: '#EDE2CC', padding: '4px 14px', borderRadius: 30, border: '1px solid #CDB98A' }}>BEFORE</div>
                  <div style={{ flex: 1, height: 1, background: '#E0D8CC' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {shareEntry.beforePhotos.map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: shareEntry.beforePhotos.length === 1 ? '100%' : 'calc(50% - 4px)', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, filter: 'grayscale(10%)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* AFTER photos */}
            {shareEntry.afterPhotos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1, background: '#C8DDD2' }} />
                  <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 800, color: '#2E6B50', background: '#E0F0E8', padding: '4px 14px', borderRadius: 30, border: `1.5px solid ${sg}` }}>AFTER</div>
                  <div style={{ flex: 1, height: 1, background: '#C8DDD2' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {shareEntry.afterPhotos.map((p, i) => (
                    <img key={i} src={p} alt="" style={{ width: shareEntry.afterPhotos.length === 1 ? '100%' : 'calc(50% - 4px)', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, border: `2px solid ${sg}` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            {shareEntry.note && (
              <div style={{ background: cr, borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 14, color: ink, lineHeight: 1.8 }}>
                {shareEntry.note}
              </div>
            )}

            {/* Share text */}
            <div style={{ background: '#F5F0E8', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: ml, lineHeight: 1.7 }}>
              我完成了{shareEntry.space}整理！用時 {fmtMins(shareEntry.duration)} ✨ #整理小幫手 #生活整理
            </div>

            {[
              { id: 'threads', label: '分享到 Threads', color: '#000' },
              { id: 'line', label: '分享到 LINE', color: '#00B900' },
              { id: 'copy', label: '複製分享文字', color: ml },
            ].map(p => (
              <button key={p.id} onClick={() => handleShare(shareEntry, p.id)} style={{ display: 'block', width: '100%', padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: p.color, fontSize: 14, cursor: 'pointer', marginBottom: 8, fontWeight: 500 }}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setShareEntry(null)} style={{ width: '100%', marginTop: 4, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
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
    </div>
  )
}
