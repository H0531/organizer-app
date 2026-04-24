'use client'
import { useState, useEffect, useRef } from 'react'
import type { DeclutterRecord, ChecklistLog, ChallengeEntry } from '@/lib/types'
import { loadLS, saveLS, shareToSocial, SHARE_BTNS, LS_CHALLENGE_DATA, loadPhoto, saveShareLabel, drawTextCard, drawDeclutterCard, saveOrShareImage, isIOSChrome } from '@/lib/types'
import { sbLoadChallengeData } from '@/lib/supabase'
import { getGoogleAuthUrl, getUserFromCookie, clearUserCookie, type OAuthUser } from '@/lib/auth'
import StatsCharts from './StatsCharts'
import type { AppTab } from '@/app/page'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

const fmtMins = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} 分 ${sec} 秒` : `${m} 分鐘` }

// ── 刪除確認 Modal ───────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: ww, borderRadius: 14, padding: 28, maxWidth: 320, width: '100%' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, color: ink, marginBottom: 8 }}>確認刪除</div>
        <div style={{ fontSize: 13, color: ml, marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#C47B5A', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>確定刪除</button>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 14, cursor: 'pointer' }}>取消</button>
        </div>
      </div>
    </div>
  )
}

// ── 分享 Modal ───────────────────────────────────────────────
function ShareModal({ title, text, photo, captureRef, onClose }: {
  title: string; text: string; photo?: string
  captureRef?: React.RefObject<HTMLDivElement | null>; onClose: () => void
}) {
  const captureAndShare = async () => {
    if (!captureRef?.current) return
    try {
      const itemName = title.replace('告別紀念文 · ', '')
      const memo = text.split('\n').slice(1, -1).join('\n')
      const canvas = photo
        ? await drawDeclutterCard({ name: itemName, memo, photo })
        : await drawTextCard(title, text)
      await saveOrShareImage(canvas, 'organizer-share.png', text)
    } catch { shareToSocial('copy', text) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.48)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: ww, borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, color: ink, marginBottom: 14 }}>{title}</div>
        {captureRef && (
          <div ref={captureRef} style={{ background: ww, borderRadius: 12, padding: '16px 18px', marginBottom: 14, border: `1px solid ${bd}` }}>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 16, color: ink, marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: ml, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{text}</div>
            <div style={{ fontSize: 11, color: mf, textAlign: 'right', marginTop: 8 }}>整理小幫手 #生活整理</div>
          </div>
        )}
        {!captureRef && (
          <div style={{ background: cr, borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: ink, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{text}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {captureRef && (
            <button onClick={captureAndShare} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: sg, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
              {saveShareLabel()}
            </button>
          )}
          {SHARE_BTNS.map(p => (
            <button key={p.id} onClick={() => shareToSocial(p.id, text)}
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

// ── MemberFooter ────────────────────────────────────────────
function MemberFooter() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
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

  const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,40,32,0.52)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: ww, borderRadius: '16px 16px 0 0', padding: '24px 24px 40px', maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 17, fontWeight: 700, color: ink }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: mf, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )

  return (
    <>
      <footer style={{ marginTop: 32, borderTop: `1px solid ${bd}`, paddingTop: 24, paddingBottom: 8 }}>
        {/* 品牌 Logo + 標題 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img src="/logo.png" alt="H 的收整沙龍" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', background: '#1e2130', marginBottom: 10 }} />
          <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 15, fontWeight: 700, color: ink, marginBottom: 4 }}>
            整理<span style={{ color: sg }}>•</span>小幫手
          </div>
          <div style={{ fontSize: 11, color: mf }}>H 的收整沙龍 · 調整心情，安置物品，享受空間</div>
        </div>
        {/* 社群連結 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <a href="https://www.instagram.com/i.am.ych?igsh=ZWd5M3EwMGxsZ3E%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', fontSize: 13, color: ink }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            Instagram
          </a>
          <a href="https://www.threads.com/@i.am.ych?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', fontSize: 13, color: ink }}>
            <svg width="15" height="15" viewBox="0 0 192 192" fill="currentColor">
              <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.932 16.1-45.512 16.246-22.76-.164-39.959-7.069-51.115-20.518C35.096 138.478 29.44 120.17 29.234 97c.206-23.17 5.862-41.478 16.806-54.39C57.158 29.16 74.357 22.255 97.117 22.09c22.928.165 40.382 7.104 51.878 20.625 5.65 6.688 9.946 15.116 12.838 25.108l16.157-4.304c-3.463-12.674-8.958-23.532-16.456-32.488C147.044 14.284 125.038 5.13 97.19 4.918h-.368C69.021 5.13 47.121 14.316 32.613 30.205 19.608 44.485 12.798 64.551 12.544 97c.254 32.449 7.064 52.515 20.069 66.795 14.508 15.89 36.408 25.075 64.177 25.286h.369c24.537-.176 41.71-6.6 55.93-20.739 18.472-18.371 17.965-41.433 11.853-55.54-4.262-9.935-12.542-17.845-23.405-22.814Z"/>
            </svg>
            Threads
          </a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 0', marginBottom: 16 }}>
          {[
            { label: '隱私權政策', onClick: () => setShowPrivacy(true) },
            { label: '使用條款', onClick: () => setShowTerms(true) },
            { label: '聯絡 / 錯誤回報', onClick: () => setShowContact(true) },
          ].map((item, i, arr) => (
            <span key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={item.onClick} style={{ fontSize: 12, color: ml, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', textDecoration: 'underline', textDecorationColor: bd }}>{item.label}</button>
              {i < arr.length - 1 && <span style={{ color: bd, fontSize: 12 }}>·</span>}
            </span>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: mf, paddingBottom: 8 }}>© 2026 H 的收整沙龍 · 整理小幫手</div>
      </footer>

      {showPrivacy && (
        <Modal title="隱私權政策" onClose={() => setShowPrivacy(false)}>
          <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}>最後更新：2026 年 4 月</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>收集的資料</strong><br />本服務在您登入時會取得 Google 帳號的名稱、Email 及大頭照，僅用於識別您的帳號並顯示於介面。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>資料儲存</strong><br />整理紀錄、照片、挑戰進度等資料儲存於 Supabase 雲端資料庫。未登入時，資料僅儲存於您的瀏覽器本機。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>照片</strong><br />上傳的照片儲存於 Supabase Storage，僅您本人可透過帳號存取。</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: ink }}>刪除資料</strong><br />如需刪除您的所有資料，請透過聯絡方式與我們聯繫，我們將在 7 個工作天內處理。</p>
          </div>
        </Modal>
      )}
      {showTerms && (
        <Modal title="使用條款" onClose={() => setShowTerms(false)}>
          <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
            <p style={{ marginBottom: 12 }}>最後更新：2026 年 4 月</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>服務說明</strong><br />整理小幫手是免費提供的個人整理工具，功能包含整理清單、斷捨離決策輔助及每日丟一物挑戰。</p>
            <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>使用規範</strong><br />本服務供個人使用，請勿用於商業用途或任何違法行為。</p>
            <p style={{ marginBottom: 0 }}><strong style={{ color: ink }}>資料責任</strong><br />請定期備份重要資料。本服務對資料遺失不承擔任何責任，建議登入以啟用雲端備份。</p>
          </div>
        </Modal>
      )}
      {showContact && (
        <Modal title="聯絡 / 錯誤回報" onClose={() => { setShowContact(false); setFeedbackSent(false) }}>
          <div style={{ fontSize: 13, color: ml, lineHeight: 1.7, marginBottom: 16 }}>有任何問題、功能建議或發現錯誤，歡迎填寫下方表單，我們會盡快處理。</div>
          {feedbackSent ? (
            <div style={{ background: '#EAF2EE', borderRadius: 12, padding: '24px 16px', fontSize: 14, color: '#2E6B50', textAlign: 'center', fontWeight: 500 }}>✅ 已發送，感謝您的回饋 :)</div>
          ) : (
            <>
              <textarea ref={textareaRef} defaultValue="" placeholder="描述問題或建議⋯例如：某個按鈕點不到、希望新增某功能"
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: ink, minHeight: 130, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }} />
              <input ref={emailRef} type="email" defaultValue="" placeholder="聯絡 Email（選填，方便我們回覆你）"
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 16, color: ink, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 }} />
              <button onClick={handleSubmit} disabled={sending}
                style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: sending ? '#9BC4AE' : ink, color: 'white', fontSize: 14, cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                {sending ? '送出中⋯' : '送出'}
              </button>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

type Props = {
  declutterRecords: DeclutterRecord[]
  checklistLogs: ChecklistLog[]
  user: OAuthUser | null
  onUserChange: (u: OAuthUser | null) => void
  onDeleteDeclutter: (savedAt: string) => void
  onDeleteDiary: (id: string) => void
  onNavigate?: (tab: AppTab) => void
}

export default function MemberTab({ declutterRecords, checklistLogs, user, onUserChange, onDeleteDeclutter, onDeleteDiary, onNavigate }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [authError, setAuthError] = useState(false)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'diary' | 'declutter' | 'challenge' | 'stats'>('diary')
  const [shareModal, setShareModal] = useState<{ title: string; text: string; withCapture?: boolean; photo?: string } | null>(null)
  const shareCaptureRef = useRef<HTMLDivElement>(null)
  const [challengeMode, setChallengeMode] = useState<number | null>(null)
  const [challengeEntries, setChallengeEntries] = useState<ChallengeEntry[]>([])
  const [tossPhotos, setTossPhotos] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'diary'; id: string } | { type: 'declutter'; savedAt: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      const fresh = getUserFromCookie()
      if (fresh) onUserChange(fresh)
      window.history.replaceState({}, '', '/')
    } else if (params.get('auth') === 'error') {
      setAuthError(true)
      window.history.replaceState({}, '', '/')
    }
    if (user?.email) {
      sbLoadChallengeData(user.email).then(remote => {
        if (remote) {
          setChallengeMode(remote.mode as number | null)
          setChallengeEntries(remote.entries as ChallengeEntry[])
        } else {
          const saved = loadLS<{ mode: number | null; entries: ChallengeEntry[] }>(LS_CHALLENGE_DATA, { mode: null, entries: [] }, user.email)
          setChallengeMode(saved.mode); setChallengeEntries(saved.entries)
        }
      })
    } else {
      const saved = loadLS<{ mode: number | null; entries: ChallengeEntry[] }>(LS_CHALLENGE_DATA, { mode: null, entries: [] })
      setChallengeMode(saved.mode); setChallengeEntries(saved.entries)
    }
    const sec = sessionStorage.getItem('member_section') as 'diary' | 'declutter' | 'challenge' | 'stats' | null
    if (sec) { setActiveSection(sec); sessionStorage.removeItem('member_section') }
  }, [user?.email])

  useEffect(() => {
    if (declutterRecords.length === 0) return
    declutterRecords.flatMap(r => r.tossEntries).forEach(async e => {
      const photo = await loadPhoto(`toss_photo_${e.id}`, user?.email)
      if (photo) setTossPhotos(prev => ({ ...prev, [e.id]: photo }))
    })
  }, [declutterRecords])

  const handleGoogleLogin = () => { window.location.href = getGoogleAuthUrl() }
  const handleLogout = () => { clearUserCookie(); onUserChange(null) }

  const saveName = () => {
    if (!draftName.trim() || !user) return
    const updated = { ...user, name: draftName.trim() }
    onUserChange(updated)
    document.cookie = `organizer_user=${encodeURIComponent(JSON.stringify(updated))}; Max-Age=${60 * 60 * 24 * 7}; path=/; SameSite=Lax`
    setEditingName(false)
  }

  const challengePct = challengeMode ? Math.round((challengeEntries.length / challengeMode) * 100) : 0

  // 成就數字計算
  const totalSessions = checklistLogs.length
  const totalDeclutterItems = declutterRecords.reduce((a, r) => a + r.items.length, 0)
  const totalReleasedItems = declutterRecords.reduce((a, r) => a + r.items.filter(x => x.decision !== 'keep').length, 0)
  const totalMins = Math.round(checklistLogs.reduce((a, l) => a + l.duration, 0) / 60)
  const challengeDays = challengeEntries.length

  const diaryShareText = (log: ChecklistLog) =>
    `我完成了${log.space}整理！用時 ${fmtMins(log.duration)} ✨\n${log.note}\n#整理小幫手 #生活整理`
  const declutterShareText = (record: DeclutterRecord) => {
    const keep = record.items.filter(x => x.decision === 'keep').length
    const donate = record.items.filter(x => x.decision === 'donate').length
    const toss = record.items.filter(x => x.decision === 'toss').length
    return `完成了一輪斷捨離！共 ${record.items.length} 件\n留 ${keep} 件・送 ${donate} 件・丟 ${toss} 件\n#斷捨離 #整理小幫手`
  }
  const challengeShareText = () =>
    `每日丟一物挑戰 ${challengeEntries.length}/${challengeMode} 天，達成率 ${challengePct}%！\n繼續努力中 💪\n#每日丟一物 #整理小幫手`

  // ── 未登入頁 ────────────────────────────────────────────────
  if (!user) return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>我的整理</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
        整理成果、照片和挑戰進度，登入後跨裝置都看得到。
      </p>

      {authError && (
        <div style={{ background: '#FDF5F0', border: '1px solid #E8A87C', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#C47B5A' }}>
          ⚠️ 登入失敗，請再試一次
        </div>
      )}

      {/* 本機成果預覽（有資料才顯示，加強登入誘因） */}
      {(totalSessions > 0 || totalDeclutterItems > 0 || challengeDays > 0) && (
        <div style={{ background: cr, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: mf, marginBottom: 10 }}>你目前已累積的整理成果</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
            {[
              { icon: '📓', value: totalSessions, unit: '次', label: '整理紀錄' },
              { icon: '♻️', value: totalDeclutterItems, unit: '件', label: '斷捨離' },
              { icon: '🎯', value: challengeDays, unit: '天', label: '挑戰天數' },
            ].map(s => (
              <div key={s.label} style={{ background: ww, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700, color: sg }}>{s.value}<span style={{ fontSize: 11 }}>{s.unit}</span></div>
                <div style={{ fontSize: 11, color: mf }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#C47B5A', lineHeight: 1.6 }}>
            ⚠️ 這些資料目前只存在本機，清除瀏覽器或換裝置後會消失。登入後可永久保存。
          </div>
        </div>
      )}

      {/* 空狀態引導（無資料時） */}
      {totalSessions === 0 && totalDeclutterItems === 0 && challengeDays === 0 && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '28px 24px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>還沒有整理紀錄</div>
          <div style={{ fontSize: 12, color: mf, marginBottom: 20, lineHeight: 1.7 }}>完成第一次整理後，成果會出現在這裡。</div>
          {onNavigate && (
            <button onClick={() => onNavigate('checklist')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              開始整理 →
            </button>
          )}
        </div>
      )}

      {/* Google 登入卡 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 8 }}>登入後跨裝置保存成果</div>
        <div style={{ fontSize: 13, color: ml, marginBottom: 24, lineHeight: 1.7 }}>
          整理日記、Before/After 照片、每日挑戰進度，手機和電腦都同步。
        </div>
        <button onClick={handleGoogleLogin}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '13px 20px', borderRadius: 10, border: '1.5px solid #DADCE0', background: 'white', cursor: 'pointer', fontSize: 15, color: '#3C4043', fontWeight: 500, marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          使用 Google 登入
        </button>
        <div style={{ fontSize: 12, color: mf }}>登入即表示同意儲存您的基本資料（姓名、Email）</div>
      </div>
    </div>
  )

  // ── 已登入頁 ────────────────────────────────────────────────
  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 20, color: ink }}>我的整理</h1>

      {/* 使用者資訊卡 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {user.picture
            ? <img src={user.picture} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: `2px solid ${sg}` }} />
            : <div style={{ width: 56, height: 56, borderRadius: '50%', background: sg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700 }}>{user.name.charAt(0)}</div>
          }
          <div style={{ flex: 1 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={draftName} onChange={e => setDraftName(e.target.value)}
                  style={{ flex: 1, border: `1px solid ${sg}`, borderRadius: 7, padding: '6px 10px', fontSize: 14, color: ink, outline: 'none' }} />
                <button onClick={saveName} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>存</button>
                <button onClick={() => setEditingName(false)} style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: ink }}>{user.name}</span>
                <button onClick={() => { setDraftName(user.name); setEditingName(true) }} style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>改名</button>
              </div>
            )}
            <div style={{ fontSize: 13, color: mf, marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={handleLogout} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>登出</button>
          <button onClick={() => {
            Object.keys(localStorage).filter(k => k.startsWith('declutter_records') || k.startsWith('checklist_logs')).forEach(k => localStorage.removeItem(k))
            window.location.reload()
          }} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: '#C47B5A', fontSize: 13, cursor: 'pointer' }}>清除本機舊資料</button>
        </div>
        {/* 社群連結 */}
        <div style={{ borderTop: `1px solid ${bd}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: mf, marginBottom: 8, textAlign: 'center' }}>追蹤整理師 H 的社群</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="https://www.instagram.com/i.am.ych?igsh=ZWd5M3EwMGxsZ3E%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink, fontSize: 13 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              Instagram
            </a>
            <a href="https://www.threads.com/@i.am.ych?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink, fontSize: 13 }}>
              <svg width="15" height="15" viewBox="0 0 192 192" fill="currentColor">
                <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.932 16.1-45.512 16.246-22.76-.164-39.959-7.069-51.115-20.518C35.096 138.478 29.44 120.17 29.234 97c.206-23.17 5.862-41.478 16.806-54.39C57.158 29.16 74.357 22.255 97.117 22.09c22.928.165 40.382 7.104 51.878 20.625 5.65 6.688 9.946 15.116 12.838 25.108l16.157-4.304c-3.463-12.674-8.958-23.532-16.456-32.488C147.044 14.284 125.038 5.13 97.19 4.918h-.368C69.021 5.13 47.121 14.316 32.613 30.205 19.608 44.485 12.798 64.551 12.544 97c.254 32.449 7.064 52.515 20.069 66.795 14.508 15.89 36.408 25.075 64.177 25.286h.369c24.537-.176 41.71-6.6 55.93-20.739 18.472-18.371 17.965-41.433 11.853-55.54-4.262-9.935-12.542-17.845-23.405-22.814Z"/>
              </svg>
              Threads
            </a>
          </div>
        </div>
      </div>

      {/* 成就大數字區 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>累計整理成就</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { num: totalSessions, unit: '次', label: '整理打卡', icon: '📓', color: sg },
            { num: totalReleasedItems, unit: '件', label: '已放手物品', icon: '♻️', color: '#C47B5A' },
            { num: totalMins, unit: '分鐘', label: '累計整理時間', icon: '⏱', color: '#4285F4' },
            { num: challengeDays, unit: '天', label: '每日挑戰累計', icon: '🎯', color: '#C4953A' },
          ].map(({ num, unit, label, icon, color }) => (
            <div key={label} style={{ background: cr, borderRadius: 10, padding: '14px 12px' }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
                {num}<span style={{ fontSize: 12, fontWeight: 400, color: mf }}> {unit}</span>
              </div>
              <div style={{ fontSize: 11, color: mf, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* 里程碑文字 */}
        {totalSessions > 0 && (
          <div style={{ fontSize: 12, color: ml, background: '#EAF2EE', borderRadius: 8, padding: '9px 12px', lineHeight: 1.7 }}>
            ✦ {
              totalSessions >= 30 ? `你已整理 ${totalSessions} 次，整理早已成為你的生活習慣。` :
              totalSessions >= 10 ? `你已整理 ${totalSessions} 次，空間越來越有你的風格。` :
              totalSessions >= 3 ? `你已整理 ${totalSessions} 次，繼續保持，空間正在慢慢改變。` :
              `你已經做了很好的第一步。每一次整理，都讓空間輕一點。`
            }
          </div>
        )}
        {totalSessions === 0 && (
          <div style={{ fontSize: 12, color: mf, textAlign: 'center', padding: '8px 0' }}>
            完成第一次整理，成就數字就會出現
          </div>
        )}
      </div>

      {/* 分頁切換 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'diary' as const, icon: '📓', label: '日記', count: checklistLogs.length },
          { key: 'declutter' as const, icon: '♻️', label: '斷捨離', count: declutterRecords.length },
          { key: 'challenge' as const, icon: '🎯', label: '挑戰', count: challengeDays },
          { key: 'stats' as const, icon: '📊', label: '統計', count: null },
        ].map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            style={{
              background: activeSection === s.key ? '#EAF2EE' : ww,
              border: `1px solid ${activeSection === s.key ? sg : bd}`,
              borderRadius: 10, padding: '10px 6px', textAlign: 'center', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 11, color: activeSection === s.key ? '#2E6B50' : mf, marginTop: 2 }}>{s.label}</div>
            {s.count !== null && <div style={{ fontSize: 11, fontWeight: 600, color: activeSection === s.key ? sg : mf }}>{s.count}</div>}
          </button>
        ))}
      </div>

      {/* 整理日記 */}
      {activeSection === 'diary' && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>整理日記（{checklistLogs.length} 筆）</div>
          {checklistLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📓</div>
              <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>還沒有整理紀錄</div>
              <div style={{ fontSize: 12, color: mf, marginBottom: 20, lineHeight: 1.7 }}>完成第一次整理打卡後，<br />日記會出現在這裡。</div>
              {onNavigate && (
                <button onClick={() => onNavigate('checklist')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  開始整理 →
                </button>
              )}
            </div>
          ) : checklistLogs.map((log, i) => (
            <div key={log.id} style={{ borderBottom: i < checklistLogs.length - 1 ? `1px solid ${cr}` : 'none', paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>{log.space}整理</span>
                  <span style={{ fontSize: 12, color: mf, marginLeft: 8 }}>{log.date}</span>
                  <span style={{ fontSize: 12, color: mf, marginLeft: 6 }}>· {fmtMins(log.duration)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setShareModal({ title: '分享整理日記', text: diaryShareText(log), withCapture: true })}
                    style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>分享</button>
                  <button onClick={() => setConfirmDelete({ type: 'diary', id: log.id })}
                    style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
                  <span style={{ fontSize: 13, color: sg, cursor: 'pointer' }} onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                    {expandedLog === log.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              {expandedLog === log.id && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 13, color: ml, lineHeight: 1.7, margin: '0 0 6px' }}>{log.note}</p>
                  <div style={{ fontSize: 12, color: mf }}>目標 {log.targetMinutes} 分鐘</div>
                  {(log.beforePhotos?.length > 0 || log.afterPhotos?.length > 0) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {log.beforePhotos?.map((p, idx) => (
                        <img key={idx} src={p} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${bd}` }} />
                      ))}
                      {log.afterPhotos?.map((p, idx) => (
                        <img key={idx} src={p} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: `2px solid ${sg}` }} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 斷捨離紀錄 */}
      {activeSection === 'declutter' && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>斷捨離紀錄（{declutterRecords.length} 次）</div>
          {declutterRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>♻️</div>
              <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>還沒有斷捨離紀錄</div>
              <div style={{ fontSize: 12, color: mf, marginBottom: 20, lineHeight: 1.7 }}>完成一輪斷捨離後，<br />紀錄會出現在這裡。</div>
              {onNavigate && (
                <button onClick={() => onNavigate('declutter')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  開始斷捨離 →
                </button>
              )}
            </div>
          ) : declutterRecords.map((record, i) => (
            <div key={i} style={{ borderBottom: i < declutterRecords.length - 1 ? `1px solid ${cr}` : 'none', paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => setExpandedRecord(expandedRecord === record.savedAt ? null : record.savedAt)}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{record.items.length} 件物品</span>
                  <span style={{ fontSize: 12, color: mf, marginLeft: 8 }}>{record.savedAt}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {record.items.length > 0 && (
                    <button onClick={() => setShareModal({ title: '分享斷捨離紀錄', text: declutterShareText(record) })}
                      style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>分享</button>
                  )}
                  <button onClick={() => setConfirmDelete({ type: 'declutter', savedAt: record.savedAt })}
                    style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
                  <span style={{ fontSize: 13, color: sg, cursor: 'pointer' }} onClick={() => setExpandedRecord(expandedRecord === record.savedAt ? null : record.savedAt)}>
                    {expandedRecord === record.savedAt ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              {expandedRecord === record.savedAt && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {(['keep', 'donate', 'toss'] as const).map(d => {
                      const count = record.items.filter(x => x.decision === d).length
                      if (!count) return null
                      return (
                        <span key={d} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: d === 'keep' ? '#EAF2EE' : d === 'donate' ? '#EEF3FE' : '#FDF5F0', color: d === 'keep' ? '#2E6B50' : d === 'donate' ? '#4285F4' : '#C47B5A' }}>
                          {d === 'keep' ? '留' : d === 'donate' ? '送' : '丟'} {count}件
                        </span>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {record.items.map((item, j) => (
                      <div key={j} style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12,
                        background: item.decision === 'keep' ? '#EAF2EE' : item.decision === 'toss' ? cr : '#FDF5F0',
                        color: item.decision === 'keep' ? '#2E6B50' : item.decision === 'toss' ? ml : '#C47B5A',
                        border: `1px solid ${item.decision === 'keep' ? '#C0DDD0' : item.decision === 'toss' ? bd : '#E8C0A8'}`,
                      }}>
                        {item.decision === 'keep' ? '✓' : item.decision === 'toss' ? '🗑' : '📦'} {item.name}
                        {item.category && <span style={{ color: mf }}> · {item.category}</span>}
                        {item.disposeDate && <span style={{ color: mf }}> · {item.disposeDate}</span>}
                      </div>
                    ))}
                  </div>
                  {record.tossEntries.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: mf, marginBottom: 6 }}>告別紀念文</div>
                      {record.tossEntries.map(e => (
                        <div key={e.id} style={{ background: cr, borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12, color: ink, lineHeight: 1.7 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <strong>{e.name}</strong>
                              {e.memo && <div style={{ marginTop: 4, color: ml }}>{e.memo}</div>}
                              {tossPhotos[e.id] && <img src={tossPhotos[e.id]} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6, marginTop: 8 }} />}
                            </div>
                            <button onClick={() => setShareModal({ title: `告別紀念文 · ${e.name}`, text: `放手了「${e.name}」\n${e.memo}\n#斷捨離 #整理小幫手`, withCapture: !isIOSChrome(), photo: isIOSChrome() ? undefined : tossPhotos[e.id] })}
                              style={{ fontSize: 11, color: sg, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>分享</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 挑戰紀錄 */}
      {activeSection === 'challenge' && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>每日丟一物挑戰</div>
            {challengeMode && (
              <button onClick={() => setShareModal({ title: '分享挑戰進度', text: challengeShareText() })}
                style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>分享進度</button>
            )}
          </div>
          {!challengeMode ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
              <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>尚未開始挑戰</div>
              <div style={{ fontSize: 12, color: mf, marginBottom: 20 }}>每天放手一件東西，7 天就能感受到空間變化</div>
              {onNavigate && (
                <button onClick={() => onNavigate('challenge')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                  開始每日挑戰 →
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: ink, fontWeight: 500 }}>{challengeMode} 天挑戰</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: sg }}>{challengeEntries.length}/{challengeMode} 天 ({challengePct}%)</span>
                </div>
                <div style={{ background: cr, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: sg, width: `${challengePct}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
              {challengeEntries.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: mf, marginBottom: 8 }}>最近紀錄</div>
                  {[...challengeEntries].reverse().slice(0, 5).map((entry, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${cr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: ink, fontWeight: 500 }}>Day {entry.day}：{entry.item}</span>
                          <span style={{ fontSize: 11, color: mf }}>{entry.date}</span>
                        </div>
                        {entry.feeling && <div style={{ fontSize: 12, color: ml, marginTop: 2 }}>{entry.feeling}</div>}
                      </div>
                      <button onClick={() => setShareModal({ title: `Day ${entry.day} 分享`, text: `每日丟一物 Day ${entry.day}：「${entry.item}」\n${entry.feeling || ''}\n#每日丟一物 #整理小幫手` })}
                        style={{ fontSize: 11, color: sg, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, flexShrink: 0 }}>分享</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 統計圖表 */}
      {activeSection === 'stats' && (
        <StatsCharts checklistLogs={checklistLogs} declutterRecords={declutterRecords} />
      )}

      {/* 分享 Modal */}
      {shareModal && (
        <ShareModal
          title={shareModal.title} text={shareModal.text} photo={shareModal.photo}
          captureRef={shareModal.withCapture ? shareCaptureRef : undefined}
          onClose={() => setShareModal(null)}
        />
      )}

      {/* 刪除確認 Modal */}
      {confirmDelete && (
        <ConfirmModal
          message={confirmDelete.type === 'diary' ? '確定刪除這筆整理日記？刪除後無法復原。' : '確定刪除這筆斷捨離紀錄？刪除後無法復原。'}
          onConfirm={() => {
            if (confirmDelete.type === 'diary') onDeleteDiary(confirmDelete.id)
            else onDeleteDeclutter(confirmDelete.savedAt)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Footer */}
      <MemberFooter />
    </div>
  )
}
