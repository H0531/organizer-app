'use client'
import { useState, useEffect, useRef } from 'react'
import { loadLS, saveLS, LS_CHALLENGE_DATA } from '@/lib/types'
import { sbLoadChallengeData, sbSaveChallengeData } from '@/lib/supabase'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

type ChallengeMode = 7 | 30 | 60 | 100
type TossEntry = { day: number; item: string; origin: string; reason: string; feeling: string; date: string }

// ── 徽章定義 ─────────────────────────────────────────────────
const BADGES: { day: number; icon: string; label: string; desc: string }[] = [
  { day: 7,   icon: '🌱', label: '破冰徽章',   desc: '完成第一週，踏出最難的第一步' },
  { day: 14,  icon: '🌿', label: '習慣徽章',   desc: '連續兩週，整理已成為生活的一部分' },
  { day: 30,  icon: '🌳', label: '一個月徽章', desc: '30 天，你讓空間輕盈了 30 次' },
  { day: 60,  icon: '✨', label: '進階徽章',   desc: '兩個月的堅持，非常了不起' },
  { day: 100, icon: '🏆', label: '百日傳說',   desc: '100 天挑戰完成，你是整理大師' },
]

// ── 告別文模板 ───────────────────────────────────────────────
const MEMORIAL_TEMPLATES = [
  (e: TossEntry) => `第 ${e.day} 天，我放手了一件「${e.item}」。\n它來自 ${e.origin || '某個地方'}。${e.reason ? `\n放手的原因是：${e.reason}。` : ''}\n${e.feeling ? `\n放掉之後，${e.feeling}。` : ''}`,
  (e: TossEntry) => `Day ${e.day}：「${e.item}」，謝謝你陪伴過我。\n${e.reason ? `是因為${e.reason}，` : ''}今天我決定放手。\n${e.feeling || '願你在下一個地方繼續有用。'}`,
  (e: TossEntry) => `今天離開的是：${e.item}\n來自：${e.origin || '不知名的過去'}\n理由：${e.reason || '它完成了它的使命'}\n\n整理第 ${e.day} 天，繼續前行。`,
]

// ── 計算連續打卡天數（streak）────────────────────────────────
function calcStreak(entries: TossEntry[]): number {
  if (entries.length === 0) return 0
  const today = new Date()
  let streak = 0
  for (let i = entries.length - 1; i >= 0; i--) {
    const entryDate = new Date(entries[i].date.replace(/\//g, '-'))
    const diff = Math.round((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === streak) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// ── 完成儀式感頁面 ───────────────────────────────────────────
function CompletionCeremony({ mode, entries, onNewRound }: {
  mode: ChallengeMode
  entries: TossEntry[]
  onNewRound: () => void
}) {
  const [showShare, setShowShare] = useState(false)
  const badge = BADGES.find(b => b.day === mode)
  const shareText = `我完成了整理小幫手的 ${mode} 天每日丟一物挑戰！\n共放手了 ${entries.length} 件物品，讓生活輕盈了一點。\n\n#每日丟一物 #整理小幫手 #斷捨離`

  const handleShare = (platform: string) => {
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareText).then(() => alert('已複製！'))
    } else if (platform === 'threads') {
      const a = document.createElement('a')
      a.href = `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`
      a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
    }
  }

  return (
    <div style={{ background: ww, border: `1.5px solid ${sg}`, borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
      {/* 慶賀橫幅 */}
      <div style={{ background: sg, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>{badge?.icon ?? '🏆'}</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, color: 'white', fontWeight: 700, marginBottom: 6 }}>
          {mode} 天挑戰完成！
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
          {badge?.desc ?? `你共放手了 ${entries.length} 件物品`}
        </div>
      </div>

      {/* 成績統計 */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { num: entries.length, label: '件物品放手' },
            { num: mode, label: '天連續打卡' },
            { num: BADGES.filter(b => b.day <= mode && entries.length >= b.day).length, label: '枚徽章獲得' },
          ].map(({ num, label }) => (
            <div key={label} style={{ background: cr, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 700, color: sg }}>{num}</div>
              <div style={{ fontSize: 11, color: ml, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 已獲徽章 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: mf, marginBottom: 10 }}>獲得徽章</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BADGES.filter(b => b.day <= mode).map(b => (
              <div key={b.day} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: entries.length >= b.day ? '#EAF2EE' : cr,
                border: `1px solid ${entries.length >= b.day ? sg : bd}`,
                borderRadius: 20, padding: '5px 12px',
                opacity: entries.length >= b.day ? 1 : 0.45,
              }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontSize: 11, color: entries.length >= b.day ? '#2E6B50' : mf, fontWeight: 500 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 分享 */}
        {!showShare ? (
          <button onClick={() => setShowShare(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500, marginBottom: 10 }}>
            分享這份成就 ↗
          </button>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <div style={{ background: cr, borderRadius: 10, padding: '14px 16px', marginBottom: 10, fontSize: 13, color: ink, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {shareText}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleShare('threads')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ink, fontSize: 13, cursor: 'pointer' }}>分享到 Threads</button>
              <button onClick={() => handleShare('copy')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>複製文字</button>
            </div>
          </div>
        )}

        <button onClick={onNewRound} style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>
          開始新的一輪挑戰
        </button>
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────────
export default function ChallengeTab({ userId }: { userId?: string }) {
  const [mode, setMode] = useState<ChallengeMode | null>(null)
  const [pendingMode, setPendingMode] = useState<ChallengeMode | null>(null)
  const [entries, setEntries] = useState<TossEntry[]>([])
  const [prevEntryCount, setPrevEntryCount] = useState(0) // 重啟前的舊紀錄數，用於鼓勵文字
  const [showForm, setShowForm] = useState(false)
  const [showMemorial, setShowMemorial] = useState<TossEntry | null>(null)
  const [templateIdx, setTemplateIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [showBadges, setShowBadges] = useState(false)

  const [fItem, setFItem] = useState('')
  const [fOrigin, setFOrigin] = useState('')
  const [fReason, setFReason] = useState('')
  const [fFeeling, setFFeeling] = useState('')

  // load 完成才允許 save，避免初始化時空資料覆蓋真實紀錄
  const loadedRef = useRef(false)
  const [syncing, setSyncing] = useState(false)
  const [syncToast, setSyncToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    loadedRef.current = false
    setMode(null)
    setEntries([])
    setSyncToast(null)
    const load = async () => {
      let loadedMode: ChallengeMode | null = null
      let loadedEntries: TossEntry[] = []

      if (userId) {
        setSyncing(true)
        try {
          const remote = await sbLoadChallengeData(userId)
          if (remote) {
            loadedMode = remote.mode as ChallengeMode | null
            loadedEntries = remote.entries as TossEntry[]
          }
        } catch {
          // 雲端失敗 → fallback localStorage
        } finally {
          setSyncing(false)
        }
      }

      // 沒有雲端資料 → 讀 localStorage（含未登入情況）
      if (loadedMode === null) {
        const saved = loadLS<{ mode: ChallengeMode | null; entries: TossEntry[] }>(
          LS_CHALLENGE_DATA, { mode: null, entries: [] }, userId
        )
        loadedMode = saved.mode ?? null
        loadedEntries = saved.entries ?? []
      }

      setMode(loadedMode)
      setEntries(loadedEntries)
      loadedRef.current = true
    }
    load()
  }, [userId])

  // 直接 save：永遠存 localStorage，有 userId 時額外同步 Supabase
  const persistData = (newMode: ChallengeMode | null, newEntries: TossEntry[]) => {
    const payload = { mode: newMode, entries: newEntries }
    // 永遠先存 localStorage（含 userId suffix），確保重整後一定讀得到
    saveLS(LS_CHALLENGE_DATA, payload, userId)
    // 有登入時額外非同步同步到 Supabase
    if (userId) {
      sbSaveChallengeData(userId, payload).then(ok => {
        setSyncToast({ msg: ok ? '進度已同步到雲端 ☁️' : '雲端同步失敗，進度已存本機', ok })
        setTimeout(() => setSyncToast(null), 2800)
      })
    }
  }

  const today = new Date().toLocaleDateString('zh-TW')
  const currentDay = entries.length + 1
  const todayDone = entries[entries.length - 1]?.date === today
  const challengeDone = mode !== null && entries.length >= mode
  const streak = calcStreak(entries)
  const pct = mode ? Math.round((entries.length / mode) * 100) : 0
  const earnedBadges = BADGES.filter(b => entries.length >= b.day)
  const nextBadge = BADGES.find(b => b.day > entries.length)

  const submitEntry = () => {
    if (!fItem.trim()) return
    const entry: TossEntry = { day: currentDay, item: fItem, origin: fOrigin, reason: fReason, feeling: fFeeling, date: today }
    const newEntries = [...entries, entry]
    setEntries(newEntries)
    persistData(mode, newEntries)   // ← 直接 save，不依賴 effect
    setShowForm(false)
    setFItem(''); setFOrigin(''); setFReason(''); setFFeeling('')
    const idx = Math.floor(Math.random() * MEMORIAL_TEMPLATES.length)
    setTemplateIdx(idx)
    setTimeout(() => setShowMemorial(entry), 0)
  }

  const handleShare = (text: string, platform: string) => {
    const tag = '#每日丟一物 #整理小幫手 #斷捨離'
    const full = `${text}\n\n${tag}`
    if (platform === 'copy') {
      navigator.clipboard.writeText(full).then(() => alert('已複製！')).catch(() => {
        const el = document.createElement('textarea')
        el.value = full
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
        alert('已複製！')
      })
    } else if (platform === 'threads') {
      const a = document.createElement('a')
      a.href = `https://www.threads.net/intent/post?text=${encodeURIComponent(full)}`
      a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
    }
  }

  const handleResetChallenge = () => {
    setPrevEntryCount(entries.length)
    setMode(null); setPendingMode(null); setEntries([])
    persistData(null, [])
  }

  // ── 同步 Toast ───────────────────────────────────────────
  const syncToastUI = syncToast && (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: syncToast.ok ? '#7A9E8A' : '#C47B5A',
      color: 'white', borderRadius: 10, padding: '10px 20px',
      fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {syncToast.msg}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  )

  // ── 同步中 loading ────────────────────────────────────────
  if (syncing) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: ml, fontSize: 14 }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #DDD8CF',
          borderTop: '3px solid #7A9E8A', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        雲端進度載入中⋯
      </div>
    )
  }

  // ── 未開始：選擇模式 ─────────────────────────────────────
  if (!mode) {
    return (
      <div>
        {syncToastUI}
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>每日丟一物挑戰</h1>
        <p style={{ color: ml, fontSize: 14, marginBottom: 24 }}>連續打卡，每天放手一件東西，讓生活越來越輕盈</p>

        {/* 鼓勵文字：有舊紀錄時才顯示 */}
        {prevEntryCount > 0 && (
          <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 2 }}>
              你之前已經打了 {prevEntryCount} 天！這次可以再試一次 💪
            </div>
            <div style={{ fontSize: 12, color: ml }}>選擇天數，重新開始累積你的紀錄。</div>
          </div>
        )}

        {/* 選擇天數 */}
        <div style={{ fontSize: 13, color: ml, marginBottom: 14 }}>選擇挑戰長度：</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
          {([
            { m: 7,   label: '入門首選', sub: '一週體驗整理感' },
            { m: 30,  label: '習慣養成', sub: '一個月打造輕盈感' },
            { m: 60,  label: '進階挑戰', sub: '兩個月的質變' },
            { m: 100, label: '終極目標', sub: '百日整理傳說' },
          ] as { m: ChallengeMode; label: string; sub: string }[]).map(({ m, label, sub }) => (
            <button key={m} onClick={() => setPendingMode(m)} style={{
              padding: '22px 12px', border: `1.5px solid ${pendingMode === m ? sg : bd}`,
              borderRadius: 12, background: pendingMode === m ? '#EAF2EE' : ww,
              cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 700, color: sg, marginBottom: 4 }}>{m}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 4 }}>天 · {label}</div>
              <div style={{ fontSize: 11, color: mf }}>{sub}</div>
            </button>
          ))}
        </div>

        {pendingMode && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ background: '#FDF9F0', border: '1px solid #C4953A', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: '#7A5E2A', lineHeight: 1.7 }}>
              ⚠️ 開始後若中途中斷，需從第 1 天重新計算。請確認你已準備好每天打卡！
            </div>
            <button
              onClick={() => { setMode(pendingMode); setPendingMode(null); persistData(pendingMode, entries) }}
              style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
              確認開始 {pendingMode} 天挑戰
            </button>
          </div>
        )}

        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>關於這個挑戰</div>
          {[
            ['每天只丟一件', '不需要大整理，找一件用不到的東西，決定它的去留'],
            ['記錄物品故事', '簡短記錄它的來歷和感受，整理記憶也是整理的一部分'],
            ['連續打卡不中斷', '若中斷需從第 1 天重新計算，達成後可立即開始新的一輪'],
            ['獲得徽章與成就', '7 / 14 / 30 / 60 / 100 天各有徽章，完成可分享到社群'],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 3 ? `1px solid ${cr}` : 'none' }}>
              <span style={{ color: sg, fontSize: 14, flexShrink: 0, marginTop: 2 }}>✦</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{t}</div>
                <div style={{ fontSize: 12, color: ml }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── 挑戰完成：儀式感頁面 ────────────────────────────────
  if (challengeDone) {
    return (
      <div>
        <CompletionCeremony mode={mode} entries={entries} onNewRound={handleResetChallenge} />
        {/* 完整紀錄仍可查看 */}
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>完整挑戰紀錄</div>
            <button onClick={() => setShowHistory(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>{showHistory ? '收起' : '展開全部'}</button>
          </div>
          {(showHistory ? [...entries].reverse() : [...entries].reverse().slice(0, 3)).map((entry, i) => (
            <div key={i} onClick={() => { setShowMemorial(entry); setTemplateIdx(0) }} style={{ padding: '10px 0', borderBottom: `1px solid ${cr}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: ink, fontWeight: 500 }}>Day {entry.day}：{entry.item}</span>
                <span style={{ fontSize: 11, color: mf }}>{entry.date}</span>
              </div>
              {entry.feeling && <div style={{ fontSize: 12, color: ml, marginTop: 2 }}>{entry.feeling}</div>}
            </div>
          ))}
        </div>

        {showMemorial && (
          <MemorialModal entry={showMemorial} templateIdx={templateIdx} setTemplateIdx={setTemplateIdx} onClose={() => setShowMemorial(null)} onShare={handleShare} />
        )}
      </div>
    )
  }

  // ── 挑戰進行中 ───────────────────────────────────────────
  return (
    <div>
      {syncToastUI}
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>每日丟一物挑戰</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20 }}>{mode} 天挑戰進行中</p>

      {/* 進度卡：天數 + streak + 進度條 + 下個徽章 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 28, fontWeight: 700, color: ink, lineHeight: 1 }}>
              {entries.length}
              <span style={{ fontSize: 14, color: mf, fontWeight: 400 }}> / {mode} 天</span>
            </div>
            <div style={{ fontSize: 12, color: ml, marginTop: 4 }}>{pct}% 完成</div>
          </div>
          {/* Streak */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <span style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: streak > 0 ? '#C4953A' : mf }}>{streak}</span>
            </div>
            <div style={{ fontSize: 11, color: mf }}>連續天數</div>
            <button onClick={handleResetChallenge} style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>重新選擇</button>
          </div>
        </div>

        {/* 進度條 */}
        <div style={{ background: cr, borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', borderRadius: 4, background: sg, width: `${pct}%`, transition: 'width 0.5s' }} />
        </div>

        {/* 下個徽章提示 */}
        {nextBadge && (
          <div style={{ fontSize: 12, color: mf, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{nextBadge.icon}</span>
            <span>再 {nextBadge.day - entries.length} 天解鎖「{nextBadge.label}」</span>
          </div>
        )}
      </div>

      {/* 徽章區 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>徽章</div>
          <button onClick={() => setShowBadges(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>{showBadges ? '收起' : '查看全部'}</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(showBadges ? BADGES : BADGES.filter(b => b.day <= mode)).map(b => {
            const earned = entries.length >= b.day
            return (
              <div key={b.day} title={b.desc} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: earned ? '#EAF2EE' : cr,
                border: `1px solid ${earned ? sg : bd}`,
                borderRadius: 20, padding: '5px 12px',
                opacity: b.day > mode && !earned ? 0.4 : earned ? 1 : 0.6,
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: earned ? '#2E6B50' : mf }}>{b.label}</div>
                  {earned && <div style={{ fontSize: 10, color: '#2E6B50' }}>{b.day} 天達成</div>}
                  {!earned && <div style={{ fontSize: 10, color: mf }}>{b.day} 天解鎖</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 打點格 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>打卡紀錄</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: mode }).map((_, i) => {
            const done = i < entries.length
            const isToday = i === entries.length && !todayDone
            return (
              <div
                key={i}
                title={entries[i] ? `Day ${i + 1}: ${entries[i].item}` : `Day ${i + 1}`}
                onClick={() => done && (setShowMemorial(entries[i]), setTemplateIdx(0))}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: done ? sg : isToday ? '#F0E8D0' : cr,
                  border: isToday ? '1.5px dashed #C4953A' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: done ? 'pointer' : 'default',
                  transition: 'transform 0.1s',
                }}
              >
                {done && <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>✓</span>}
                {isToday && <span style={{ fontSize: 8, color: '#C4953A' }}>今</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 今日行動 */}
      {!todayDone ? (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>Day {currentDay} — 今天要丟什麼？</div>
          <div style={{ fontSize: 13, color: ml, marginBottom: 16 }}>找一件用不到的東西，記錄它的故事後放手</div>

          {!showForm ? (
            <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 500 }}>
              ＋ 記錄今天的物品
            </button>
          ) : (
            <div>
              {[
                { label: '物品名稱 *', val: fItem, set: setFItem, ph: '例：七年前買的馬克杯' },
                { label: '它從哪裡來？（可略）', val: fOrigin, set: setFOrigin, ph: '例：大學時朋友送的、自己買的' },
                { label: '為什麼要放手？（可略）', val: fReason, set: setFReason, ph: '例：已經有新的替代品了' },
                { label: '放掉之後的感受？（可略）', val: fFeeling, set: setFFeeling, ph: '例：有點輕鬆，但也有點捨不得' },
              ].map(({ label, val, set, ph }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: mf, marginBottom: 4 }}>{label}</div>
                  <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: ink, background: 'white' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button onClick={submitEntry} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  打卡完成 ✓
                </button>
                <button onClick={() => setShowForm(false)} style={{ padding: '11px 16px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>取消</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: '#2E6B50', marginBottom: 4 }}>今天已打卡！</div>
          <div style={{ fontSize: 13, color: ml }}>繼續保持，明天再來記錄 Day {entries.length + 1}</div>
          {streak >= 3 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#C4953A' }}>🔥 已連續 {streak} 天，太厲害了！</div>
          )}
        </div>
      )}

      {/* 歷史紀錄 */}
      {entries.length > 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>過去紀錄</div>
            <button onClick={() => setShowHistory(s => !s)} style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>{showHistory ? '收起' : '查看全部'}</button>
          </div>
          {(showHistory ? [...entries].reverse() : [...entries].reverse().slice(0, 3)).map((entry, i) => (
            <div key={i} onClick={() => { setShowMemorial(entry); setTemplateIdx(0) }}
              style={{ padding: '10px 0', borderBottom: `1px solid ${cr}`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: ink, fontWeight: 500 }}>Day {entry.day}：{entry.item}</span>
                <span style={{ fontSize: 11, color: mf }}>{entry.date}</span>
              </div>
              {entry.feeling && <div style={{ fontSize: 12, color: ml, marginTop: 2 }}>{entry.feeling}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 告別文 Modal */}
      {showMemorial && (
        <MemorialModal
          entry={showMemorial}
          templateIdx={templateIdx}
          setTemplateIdx={setTemplateIdx}
          onClose={() => setShowMemorial(null)}
          onShare={handleShare}
        />
      )}
    </div>
  )
}

// ── 告別文 Modal（獨立元件，completion 和進行中共用）────────
function MemorialModal({ entry, templateIdx, setTemplateIdx, onClose, onShare }: {
  entry: TossEntry
  templateIdx: number
  setTemplateIdx: (i: number) => void
  onClose: () => void
  onShare: (text: string, platform: string) => void
}) {
  const text = MEMORIAL_TEMPLATES[templateIdx](entry)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: ww, borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 4 }}>告別紀念文</div>
        <div style={{ fontSize: 12, color: mf, marginBottom: 16 }}>Day {entry.day} · {entry.date}</div>
        <div style={{ background: cr, borderRadius: 10, padding: '16px 18px', marginBottom: 14, fontSize: 14, color: ink, lineHeight: 1.9, whiteSpace: 'pre-line' }}>
          {text}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {MEMORIAL_TEMPLATES.map((_, i) => (
            <button key={i} onClick={() => setTemplateIdx(i)} style={{ flex: 1, padding: '6px', borderRadius: 8, border: `1px solid ${templateIdx === i ? sg : bd}`, background: templateIdx === i ? '#EAF2EE' : 'white', color: templateIdx === i ? sg : ml, fontSize: 12, cursor: 'pointer' }}>
              版本 {i + 1}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button onClick={() => onShare(text, 'threads')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ink, fontSize: 13, cursor: 'pointer' }}>分享 Threads</button>
          <button onClick={() => onShare(text, 'copy')} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>複製文字</button>
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>關閉</button>
      </div>
    </div>
  )
}
