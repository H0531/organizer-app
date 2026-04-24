'use client'
import { useState, useEffect, useRef } from 'react'
import type { OAuthUser } from '@/lib/auth'
import { loadLS, LS_CHALLENGE_DATA } from '@/lib/types'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
type Tab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

// ── Contact Modal (uncontrolled textarea 避免失焦) ───────────
function ContactModal({ onClose, feedbackSent, setFeedbackSent }: {
  onClose: () => void
  feedbackSent: boolean
  setFeedbackSent: (v: boolean) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    const text = textareaRef.current?.value.trim()
    const email = emailRef.current?.value.trim()
    if (!text) return
    setSending(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, contact_email: email || null, submitted_at: new Date().toISOString() }),
      })
    } catch { /* 靜默失敗 */ }
    setSending(false)
    setFeedbackSent(true)
  }

  return (
    <Modal title="聯絡 / 錯誤回報" onClose={onClose}>
      <div style={{ fontSize: 13, color: ml, lineHeight: 1.7, marginBottom: 16 }}>
        有任何問題、功能建議或發現錯誤，歡迎填寫下方表單，我們會盡快處理。
      </div>
      {feedbackSent ? (
        <div style={{ background: '#EAF2EE', borderRadius: 12, padding: '24px 16px', fontSize: 14, color: '#2E6B50', textAlign: 'center', fontWeight: 500 }}>
          ✅ 已發送，感謝您的回饋 :)
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            defaultValue=""
            placeholder="描述問題或建議⋯例如：某個按鈕點不到、希望新增某功能"
            style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: ink, minHeight: 130, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }}
          />
          <input
            ref={emailRef}
            type="email"
            defaultValue=""
            placeholder="聯絡 Email（選填，方便我們回覆你）"
            style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: ink, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }}
          />
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: sending ? '#9BC4AE' : ink, color: 'white', fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
            {sending ? '送出中⋯' : '送出'}
          </button>
        </>
      )}
    </Modal>
  )
}

// ── Shared Modal ─────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.52)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      <div style={{ background: ww, borderRadius: '16px 16px 0 0', padding: '24px 24px 40px', maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, fontWeight: 700, color: ink }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: mf, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────
function Footer({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  return (
    <>
      <footer style={{ marginTop: 32, borderTop: `1px solid ${bd}`, paddingTop: 24, paddingBottom: 8 }}>
        {/* 品牌 Logo + 標題 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo.png" alt="H 的收整沙龍" style={{ width: 48, height: 48, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, fontWeight: 700, color: ink, marginBottom: 4 }}>
            整理<span style={{ color: sg }}>•</span>小幫手
          </div>
          <div style={{ fontSize: 11, color: mf }}>H 的收整沙龍 · 調整心情，安置物品，享受空間</div>
        </div>

        {/* 社群連結 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="https://www.instagram.com/i.am.ych?igsh=ZWd5M3EwMGxsZ3E%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', fontSize: 12, color: ink }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              Instagram
            </a>
            <a href="https://www.threads.com/@i.am.ych?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', fontSize: 12, color: ink }}>
              <svg width="14" height="14" viewBox="0 0 192 192" fill="currentColor">
                <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.932 16.1-45.512 16.246-22.76-.164-39.959-7.069-51.115-20.518C35.096 138.478 29.44 120.17 29.234 97c.206-23.17 5.862-41.478 16.806-54.39C57.158 29.16 74.357 22.255 97.117 22.09c22.928.165 40.382 7.104 51.878 20.625 5.65 6.688 9.946 15.116 12.838 25.108l16.157-4.304c-3.463-12.674-8.958-23.532-16.456-32.488C147.044 14.284 125.038 5.13 97.19 4.918h-.368C69.021 5.13 47.121 14.316 32.613 30.205 19.608 44.485 12.798 64.551 12.544 97c.254 32.449 7.064 52.515 20.069 66.795 14.508 15.89 36.408 25.075 64.177 25.286h.369c24.537-.176 41.71-6.6 55.93-20.739 18.472-18.371 17.965-41.433 11.853-55.54-4.262-9.935-12.542-17.845-23.405-22.814Z"/>
              </svg>
              Threads
            </a>
          </div>
        </div>

        {/* 連結列 */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 0', marginBottom: 16 }}>
          {[
            { label: '隱私權政策', onClick: () => setShowPrivacy(true) },
            { label: '使用條款', onClick: () => setShowTerms(true) },
            { label: '聯絡 / 錯誤回報', onClick: () => setShowContact(true) },
          ].map((item, i, arr) => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={item.onClick} style={{ fontSize: 12, color: ml, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', textDecoration: 'underline', textDecorationColor: bd }}>
                {item.label}
              </button>
              {i < arr.length - 1 && <span style={{ color: bd, fontSize: 12 }}>·</span>}
            </span>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: mf, paddingBottom: 8 }}>
          © 2026 H 的收整沙龍 · 整理小幫手
        </div>
      </footer>

      {/* 隱私權政策 */}
      {showPrivacy && (
        <Modal title="隱私權政策" onClose={() => setShowPrivacy(false)}>
          <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}>最後更新：2026 年 4 月</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>收集的資料</strong><br />本服務在您登入時會取得 Google 帳號的名稱、Email 及大頭照，僅用於識別您的帳號並顯示於介面。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>資料儲存</strong><br />整理紀錄、照片、挑戰進度等資料儲存於 Supabase 雲端資料庫。未登入時，資料僅儲存於您的瀏覽器本機。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>照片</strong><br />上傳的照片儲存於 Supabase Storage，僅您本人可透過帳號存取。我們不會將您的照片用於任何其他用途。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>第三方服務</strong><br />本服務使用 Google OAuth 登入、Supabase 資料庫及 Vercel 部署，請參閱各服務的隱私權政策。</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: ink }}>刪除資料</strong><br />如需刪除您的所有資料，請透過聯絡方式與我們聯繫，我們將在 7 個工作天內處理。</p>
          </div>
        </Modal>
      )}

      {/* 使用條款 */}
      {showTerms && (
        <Modal title="使用條款" onClose={() => setShowTerms(false)}>
          <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}>最後更新：2026 年 4 月</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>服務說明</strong><br />整理小幫手是免費提供的個人整理工具，功能包含整理清單、斷捨離決策輔助及每日丟一物挑戰。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>使用規範</strong><br />本服務供個人使用，請勿用於商業用途或任何違法行為。禁止上傳任何不當、侵權或涉及隱私的照片。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>服務可用性</strong><br />本服務盡力維持正常運作，但不保證 100% 可用性。因系統維護或不可抗力造成的服務中斷，恕不負責。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>資料責任</strong><br />請定期備份重要資料。本服務對資料遺失不承擔任何責任，建議登入以啟用雲端備份。</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: ink }}>條款修改</strong><br />我們保留隨時修改條款的權利，重大變更將透過服務內通知告知。繼續使用即視為同意修改後的條款。</p>
          </div>
        </Modal>
      )}

      {/* 聯絡 / 錯誤回報 */}
      {showContact && (
        <ContactModal onClose={() => { setShowContact(false); setFeedbackSent(false) }} feedbackSent={feedbackSent} setFeedbackSent={setFeedbackSent} />
      )}
    </>
  )
}

// ── 新手引導評估 ─────────────────────────────────────────────
const QUIZ_OPTIONS: { icon: string; label: string; sub: string; tab: Tab; tip: string }[] = [
  { icon: '🗂', label: '我想整理一個空間', sub: '書桌、衣櫃、廚房…', tab: 'checklist', tip: '從整理清單開始，20 分鐘搞定一個空間' },
  { icon: '♻️', label: '我有東西想清掉', sub: '不知留還是丟的物品', tab: 'declutter', tip: '用留／送／丟三分流決策，快速釐清' },
  { icon: '🎯', label: '我想養成整理習慣', sub: '需要一點動力和成就感', tab: 'challenge', tip: '每天丟一件東西，7 天就能感受到空間變化' },
]

function OnboardingQuiz({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [chosen, setChosen] = useState<Tab | null>(null)
  return (
    <div style={{ background: ww, border: `1px solid ${sg}`, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>今天你想做什麼？</div>
      <div style={{ fontSize: 12, color: mf, marginBottom: 14 }}>選一個，幫你找到最適合的起點</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUIZ_OPTIONS.map(opt => (
          <button key={opt.tab} onClick={() => { setChosen(opt.tab); setTimeout(() => onNavigate(opt.tab), 320) }} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: chosen === opt.tab ? '#EAF2EE' : 'white',
            border: `1px solid ${chosen === opt.tab ? sg : bd}`,
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{opt.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: mf }}>{opt.sub}</div>
            </div>
            <span style={{ fontSize: 18, color: chosen === opt.tab ? sg : bd, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
      {chosen && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#EAF2EE', borderRadius: 8, fontSize: 12, color: '#2E6B50' }}>
          ✦ {QUIZ_OPTIONS.find(o => o.tab === chosen)?.tip}
        </div>
      )}
    </div>
  )
}

type ChecklistLog = { id: string; date: string; space: string; duration: number }
type DeclutterRecord = { savedAt: string; items: { decision: string | null }[]; tossEntries: unknown[] }

export default function HomeTab({
  onNavigate, user, onLoginClick, checklistLogs = [], declutterRecords = [],
}: {
  onNavigate: (t: Tab) => void
  user: OAuthUser | null
  onLoginClick: () => void
  checklistLogs?: ChecklistLog[]
  declutterRecords?: DeclutterRecord[]
}) {
  const [challengeData, setChallengeData] = useState<{ mode: number | null; entries: { day: number; date: string }[] } | null>(null)

  useEffect(() => {
    const data = loadLS<{ mode: number | null; entries: { day: number; date: string }[] }>(
      LS_CHALLENGE_DATA, { mode: null, entries: [] }, user?.email
    )
    setChallengeData(data)
  }, [user])

  const NavLink = ({ target, children }: { target: Tab; children: string }) => (
    <span onClick={() => onNavigate(target)} style={{ color: sg, textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}>{children}</span>
  )

  const totalCleanings = checklistLogs.length
  const totalMins = checklistLogs.reduce((acc, l) => acc + Math.floor((l.duration ?? 0) / 60), 0)
  const totalDeclutter = declutterRecords.reduce((acc, r) => acc + (r.items?.filter(i => i.decision === 'toss' || i.decision === 'donate').length ?? 0), 0)
  const challengeEntries = challengeData?.entries ?? []
  const challengeMode = challengeData?.mode ?? null
  const challengeDays = challengeEntries.length
  const calcStreak = (entries: { date: string }[]) => {
    if (!entries.length) return 0
    const today = new Date(); let streak = 0
    for (let i = entries.length - 1; i >= 0; i--) {
      const d = new Date(entries[i].date.replace(/\//g, '-'))
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
      if (diff === streak) streak++; else break
    }
    return streak
  }
  const streak = calcStreak(challengeEntries)
  const hasAnyData = totalCleanings > 0 || totalDeclutter > 0 || challengeDays > 0

  return (
    <div>
      {/* 登入 Banner */}
      {!user && (
        <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 2 }}>跨裝置保存你的整理成果</div>
            <div style={{ fontSize: 12, color: ml, lineHeight: 1.6 }}>登入後，紀錄、照片、挑戰進度在手機和電腦都看得到。</div>
          </div>
          <button onClick={onLoginClick} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>登入</button>
        </div>
      )}

      {user && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasAnyData ? 16 : 0 }}>
            {user.picture
              ? <img src={user.picture} alt="" style={{ width: 34, height: 34, borderRadius: '50%', border: `1.5px solid ${sg}`, flexShrink: 0 }} />
              : <div style={{ width: 34, height: 34, borderRadius: '50%', background: sg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', fontWeight: 700, flexShrink: 0 }}>{user.name.charAt(0)}</div>
            }
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>嗨，{user.name}！</div>
              {!hasAnyData && <div style={{ fontSize: 12, color: mf }}>還沒有整理紀錄，今天開始吧 ✦</div>}
            </div>
          </div>
          {hasAnyData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {totalCleanings > 0 && (
                <button onClick={() => onNavigate('checklist')} style={{ background: '#EAF2EE', border: `1px solid ${sg}22`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: sg, fontFamily: "'Noto Serif TC', serif", lineHeight: 1 }}>{totalCleanings}</div>
                  <div style={{ fontSize: 11, color: '#2E6B50', marginTop: 3 }}>次整理完成</div>
                  {totalMins > 0 && <div style={{ fontSize: 10, color: ml, marginTop: 2 }}>共 {totalMins} 分鐘</div>}
                </button>
              )}
              {totalDeclutter > 0 && (
                <button onClick={() => onNavigate('declutter')} style={{ background: '#EEF3FE', border: '1px solid #4285F422', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#4285F4', fontFamily: "'Noto Serif TC', serif", lineHeight: 1 }}>{totalDeclutter}</div>
                  <div style={{ fontSize: 11, color: '#3067C8', marginTop: 3 }}>件物品放手</div>
                  <div style={{ fontSize: 10, color: ml, marginTop: 2 }}>斷捨離紀錄</div>
                </button>
              )}
              {challengeDays > 0 ? (
                <button onClick={() => onNavigate('challenge')} style={{ background: '#FDF9F0', border: '1px solid #C4953A22', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#C4953A', fontFamily: "'Noto Serif TC', serif", lineHeight: 1 }}>{challengeDays}</div>
                  <div style={{ fontSize: 11, color: '#7A5E2A', marginTop: 3 }}>天挑戰打卡{challengeMode ? ` / ${challengeMode}` : ''}</div>
                  {streak > 1 && <div style={{ fontSize: 10, color: '#C4953A', marginTop: 2 }}>🔥 連續 {streak} 天</div>}
                </button>
              ) : (
                <button onClick={() => onNavigate('challenge')} style={{ background: '#FDF9F0', border: '1px solid #C4953A22', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>🎯</div>
                  <div style={{ fontSize: 11, color: '#7A5E2A', marginTop: 3 }}>每日丟一物挑戰</div>
                  <div style={{ fontSize: 10, color: '#C4953A', marginTop: 2 }}>點我開始 →</div>
                </button>
              )}
              {hasAnyData && (
                <button onClick={() => onNavigate('member')} style={{ background: cr, border: `1px solid ${bd}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 22, color: ml, lineHeight: 1 }}>📓</div>
                  <div style={{ fontSize: 11, color: ml, marginTop: 3 }}>查看全部紀錄</div>
                  <div style={{ fontSize: 10, color: mf, marginTop: 2 }}>會員頁</div>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 新手引導 */}
      <OnboardingQuiz onNavigate={onNavigate} />

      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: mf, letterSpacing: '0.1em', marginBottom: 10 }}>H 的收整沙龍</p>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 700, color: ink, lineHeight: 1.5, marginBottom: 14 }}>
          調整心情，安置物品，享受空間──
        </h1>
        <p style={{ fontSize: 14, color: ml, lineHeight: 1.8, marginBottom: 0 }}>
          我是 24 小時伴你左右的整理小幫手，<br />有我陪你，一起整理。
        </p>
      </div>

      {/* 整理建議 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>新手必讀 · 整理建議</div>
        {[
          ['從最小的空間開始', '第一次建議從「包包」開始，20 分鐘內就能完成，成功感很重要。'],
          ['一次只整理一個空間', '整理完才算完成，別中途跑去整理別的地方。'],
          ['先整理再買收納品', '斷捨離後才知道真正需要收納多少東西，避免買錯。'],
          ['每日丟一物從小開始', '第一天可以從壞掉的東西或重複備品開始，不需要捨棄珍貴的物品。'],
          ['固定一個整理日', '每週固定一個空間，一個月輪完六個空間一次。'],
        ].map(([t, d], i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ color: sg, flexShrink: 0, marginTop: 2 }}>✦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: ml }}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      {[
        {
          icon: '🗂', tab: 'checklist' as Tab, title: '整理清單', time: '20–90 分鐘',
          desc: '選空間、設計時器、逐項打勾，完成後拍 Before / After 對比照、記打卡日記，並可排進行事曆。',
          steps: ['選擇今天要整理的空間', '（可選）拍整理前照片，支援裁切旋轉', '開始倒數計時，逐項打勾', '整理後拍照、寫日記，按儲存打卡', '預約下次整理會顯示在最上方'],
        },
        {
          icon: '♻️', tab: 'declutter' as Tab, title: '斷捨離決策', time: '10–30 分鐘',
          desc: '把物品逐一加入清單，標記「留」「送」「丟」後進入三條分流：留下指定分類、送出設定行事曆提醒、丟棄可寫告別紀念文。',
          steps: ['新增物品並標記留／送／丟', '全部完成後按「進入分流」', '留 → 指定收納分類', '送 → 選日期加入行事曆提醒', '丟 → 寫告別紀念文（可略）', '按儲存紀錄，在會員頁查看明細'],
        },
        {
          icon: '🎯', tab: 'challenge' as Tab, title: '每日丟一物挑戰', time: '每天 5 分鐘',
          desc: '選擇 7、30、60 或 100 天挑戰，每天放手一件東西，記錄故事，系統生成告別紀念文可分享到社群。',
          steps: ['選擇挑戰天數（建議新手從 7 天開始）', '每天記錄一件物品的故事', '系統生成 3 種告別紀念文', '達成里程碑可分享，進度自動保存'],
        },
        {
          icon: '📦', tab: 'recommend' as Tab, title: '收納品推薦', time: '5 分鐘',
          desc: '整理完後不知道買什麼收納品？輸入空間尺寸，自動推薦尺寸合適的商品（資料庫持續更新中）。',
          steps: ['選擇空間類型', '輸入寬 × 深 × 高（公分）', '查看推薦商品，綠色「完美符合」優先'],
        },
      ].map((f, idx) => (
        <div key={idx} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: ink }}><NavLink target={f.tab}>{f.title}</NavLink></div>
            </div>
            <span style={{ fontSize: 11, color: mf, background: cr, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>⏱ {f.time}</span>
          </div>
          <p style={{ fontSize: 13, color: ml, lineHeight: 1.8, marginBottom: 14 }}>{f.desc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {f.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderTop: i > 0 ? `1px solid ${cr}` : 'none' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: sg, color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate(f.tab)} style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 8, border: `1px solid ${sg}`, background: 'white', color: sg, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            開始 {f.title} →
          </button>
        </div>
      ))}

      {/* FAQ */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px', marginBottom: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>常見問題</div>
        {[
          ['重整頁面後資料還在嗎？', '有的。整理清單、斷捨離紀錄、每日丟一物進度都自動存在瀏覽器，重整頁面不會消失。但換裝置或清除瀏覽器資料就會遺失，建議登入會員以跨裝置保存。'],
          ['未登入可以用嗎？', '可以，全部功能都能正常使用。唯一差別是資料只存在本機，清除瀏覽器或換裝置後資料會消失。'],
          ['每日挑戰中斷了怎麼辦？', '進度存在瀏覽器，只要不清除資料就不會中斷。若已清除，重新選擇天數後可繼續累積。'],
          ['行事曆功能怎麼用？', '整理清單頁可預約下次整理時間，會下載 .ics 檔案，點開即可加入手機行事曆，系統會提前一天提醒。斷捨離送出的物品也可設定提醒日期。'],
          ['照片可以裁切或旋轉嗎？', '可以！在整理清單的拍照步驟，上傳後可以進行裁切和旋轉，調整到最佳角度再儲存。'],
          ['可以在手機上使用嗎？', '可以，支援手機瀏覽器，建議使用 Safari 或 Chrome，介面專為手機螢幕優化。'],
          ['會員頁面有什麼資料？', '登入後，整理日記、斷捨離紀錄（含每件物品明細）、每日丟一物挑戰進度，都會在「我的整理」頁面完整呈現。'],
        ].map(([q, a], i, arr) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Q：{q}</div>
            <div style={{ fontSize: 12, color: ml, lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  )
}
