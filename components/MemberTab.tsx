'use client'
import { useState, useEffect, useRef } from 'react'
import type { DeclutterRecord, ChecklistLog, ChallengeEntry } from '@/lib/types'
import { loadLS, saveLS, shareToSocial, SHARE_BTNS, LS_CHALLENGE_DATA, loadPhoto, saveShareLabel } from '@/lib/types'
import { getGoogleAuthUrl, getUserFromCookie, clearUserCookie, type OAuthUser } from '@/lib/auth'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

const fmtMins = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return sec > 0 ? `${m} 分 ${sec} 秒` : `${m} 分鐘` }

type Props = {
  declutterRecords: DeclutterRecord[]
  checklistLogs: ChecklistLog[]
  user: OAuthUser | null
  onUserChange: (u: OAuthUser | null) => void
  onDeleteDeclutter: (savedAt: string) => void
  onDeleteDiary: (id: string) => void
}

function ShareModal({ title, text, captureRef, onClose }: { title: string; text: string; captureRef?: React.RefObject<HTMLDivElement | null>; onClose: () => void }) {
const captureAndShare = async () => {
  if (!captureRef?.current) return
  try {
    const { saveOrShareImage } = await import('@/lib/types')
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(captureRef.current, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FAF8F4',
      scale: 2,
      logging: false,
    })
    await saveOrShareImage(canvas, 'organizer-diary.png', text)
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

export default function MemberTab({ declutterRecords, checklistLogs, user, onUserChange, onDeleteDeclutter, onDeleteDiary }: Props) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [authError, setAuthError] = useState(false)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'diary' | 'declutter' | 'challenge'>('diary')
  const [shareModal, setShareModal] = useState<{ title: string; text: string; withCapture?: boolean } | null>(null)
  const shareCaptureRef = useRef<HTMLDivElement>(null)
  const [challengeMode, setChallengeMode] = useState<number | null>(null)
  const [challengeEntries, setChallengeEntries] = useState<ChallengeEntry[]>([])
  const [tossPhotos, setTossPhotos] = useState<Record<string, string>>({})

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
    const saved = loadLS<{ mode: number | null; entries: ChallengeEntry[] }>(LS_CHALLENGE_DATA, { mode: null, entries: [] }, user?.email)
    setChallengeMode(saved.mode)
    setChallengeEntries(saved.entries)
    const sec = sessionStorage.getItem('member_section') as 'diary' | 'declutter' | 'challenge' | null
    if (sec) { setActiveSection(sec); sessionStorage.removeItem('member_section') }
  }, [user?.email])

  useEffect(() => {
    if (declutterRecords.length === 0) return
    declutterRecords.flatMap(r => r.tossEntries).forEach(async e => {
      const photo = await loadPhoto(`toss_photo_${e.id}`)
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

  if (!user) return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>我的整理</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
        登入後，整理日記、斷捨離紀錄和每日挑戰進度都會同步到帳號，不怕換裝置或清除瀏覽器。
      </p>
      {authError && (
        <div style={{ background: '#FDF5F0', border: '1px solid #E8A87C', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#C47B5A' }}>
          ⚠️ 登入失敗，請再試一次
        </div>
      )}
      <div style={{ background: cr, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: ml, marginBottom: 8 }}>目前本機資料</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: '整理日記', value: `${checklistLogs.length} 筆`, icon: '📓' },
            { label: '斷捨離', value: `${declutterRecords.reduce((a, r) => a + r.items.length, 0)} 件`, icon: '♻️' },
            { label: '每日挑戰', value: challengeMode ? `${challengeEntries.length}/${challengeMode}天` : '未開始', icon: '🎯' },
          ].map(s => (
            <div key={s.label} style={{ background: ww, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: sg }}>{s.value}</div>
              <div style={{ fontSize: 11, color: mf }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: mf, marginTop: 10 }}>⚠️ 未登入資料只存在本機，關閉瀏覽器後將消失</div>
      </div>
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '32px 24px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 8 }}>使用 Google 登入</div>
        <div style={{ fontSize: 13, color: ml, marginBottom: 24, lineHeight: 1.6 }}>登入後資料跨裝置同步，不怕遺失</div>
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

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 20, color: ink }}>我的整理</h1>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                <button onClick={() => { setDraftName(user.name); setEditingName(true) }}
                  style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>改名</button>
              </div>
            )}
            <div style={{ fontSize: 13, color: mf, marginTop: 2 }}>{user.email}</div>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ marginTop: 16, width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 13, cursor: 'pointer' }}>
          登出
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: '整理日記', value: `${checklistLogs.length}`, unit: '筆', icon: '📓', section: 'diary' as const },
          { label: '斷捨離物品', value: `${declutterRecords.reduce((a, r) => a + r.items.length, 0)}`, unit: '件', icon: '♻️', section: 'declutter' as const },
          { label: '每日挑戰', value: challengeMode ? `${challengePct}` : '—', unit: challengeMode ? '%' : '', icon: '🎯', section: 'challenge' as const },
        ].map(s => (
          <button key={s.label} onClick={() => setActiveSection(s.section)}
            style={{ background: activeSection === s.section ? '#EAF2EE' : ww, border: `1px solid ${activeSection === s.section ? sg : bd}`, borderRadius: 12, padding: '14px 8px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700, color: sg, margin: '4px 0 1px' }}>{s.value}<span style={{ fontSize: 12 }}>{s.unit}</span></div>
            <div style={{ fontSize: 11, color: mf }}>{s.label}</div>
          </button>
        ))}
      </div>

      {activeSection === 'diary' && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>整理日記（{checklistLogs.length} 筆）</div>
          {checklistLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: mf, fontSize: 14, padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📓</div>完成整理後紀錄會出現在這裡
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
                  <button onClick={() => {
                    if (window.confirm('確定刪除這筆日記？刪除後無法復原。')) onDeleteDiary(log.id)
                  }} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
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

      {activeSection === 'declutter' && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>斷捨離紀錄（{declutterRecords.length} 次）</div>
          {declutterRecords.length === 0 ? (
            <div style={{ textAlign: 'center', color: mf, fontSize: 14, padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>還沒有斷捨離紀錄
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
                  <button onClick={() => {
                    if (window.confirm('確定刪除這筆斷捨離紀錄？刪除後無法復原。')) onDeleteDeclutter(record.savedAt)
                  }} style={{ fontSize: 12, color: '#C47B5A', background: 'none', border: 'none', cursor: 'pointer' }}>刪除</button>
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
                            <button onClick={() => setShareModal({ title: `告別紀念文 · ${e.name}`, text: `放手了「${e.name}」\n${e.memo}\n#斷捨離 #整理小幫手`, withCapture: true })}
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
            <div style={{ textAlign: 'center', color: mf, fontSize: 14, padding: '24px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>尚未開始挑戰
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

      {shareModal && (
        <ShareModal
          title={shareModal.title}
          text={shareModal.text}
          captureRef={shareModal.withCapture ? shareCaptureRef : undefined}
          onClose={() => setShareModal(null)}
        />
      )}
    </div>
  )
}