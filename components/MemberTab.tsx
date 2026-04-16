'use client'
import { useState, useEffect } from 'react'
import type { DeclutterRecord } from '@/lib/types'
import { getGoogleAuthUrl, getUserFromCookie, clearUserCookie, type OAuthUser } from '@/lib/auth'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

type Props = { declutterRecords: DeclutterRecord[] }

export default function MemberTab({ declutterRecords }: Props) {
  const [user, setUser] = useState<OAuthUser | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)

  useEffect(() => {
    const existing = getUserFromCookie()
    if (existing) setUser(existing)

    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      const fresh = getUserFromCookie()
      if (fresh) setUser(fresh)
      window.history.replaceState({}, '', '/')
    } else if (params.get('auth') === 'error') {
      setAuthError(true)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl()
  }

  const handleLogout = () => {
    clearUserCookie()
    setUser(null)
  }

  const saveName = () => {
    if (!draftName.trim() || !user) return
    const updated = { ...user, name: draftName.trim() }
    setUser(updated)
    document.cookie = `organizer_user=${encodeURIComponent(JSON.stringify(updated))}; Max-Age=${60 * 60 * 24 * 7}; path=/; SameSite=Lax`
    setEditingName(false)
  }

  if (!user) return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>會員登入</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>
        登入後，打卡日記與斷捨離紀錄都會同步到你的帳號，不怕換裝置或清除瀏覽器資料。
      </p>

      {authError && (
        <div style={{ background: '#FDF5F0', border: '1px solid #E8A87C', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#C47B5A' }}>
          ⚠️ 登入失敗，請再試一次
        </div>
      )}

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '32px 24px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 24 }}>使用 Google 登入</div>

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

      <div style={{ background: cr, borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: ml, marginBottom: 8 }}>⚙️ Vercel 部署設定</div>
        <div style={{ fontSize: 12, color: mf, lineHeight: 2 }}>
          需在 Vercel 環境變數中加入：<br/>
          <code style={{ background: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_ID</code><br/>
          <code style={{ background: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>GOOGLE_CLIENT_SECRET</code><br/>
          <code style={{ background: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code><br/>
          <code style={{ background: 'white', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>NEXT_PUBLIC_BASE_URL</code>（例：https://organizer-app-mauve.vercel.app）
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 20, color: ink }}>我的帳號</h1>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: '整理日記', value: `${declutterRecords.length} 筆`, icon: '📓' },
          { label: '斷捨離物品', value: `${declutterRecords.reduce((a, r) => a + r.items.length, 0)} 件`, icon: '♻️' },
        ].map(s => (
          <div key={s.label} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 22, fontWeight: 700, color: sg, margin: '4px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: mf }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>斷捨離紀錄</div>
        {declutterRecords.length === 0 ? (
          <div style={{ textAlign: 'center', color: mf, fontSize: 14, padding: '24px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
            還沒有斷捨離紀錄
          </div>
        ) : declutterRecords.map((record, i) => (
          <div key={i} style={{ borderBottom: i < declutterRecords.length - 1 ? `1px solid ${cr}` : 'none', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 500, color: ink }}>{record.items.length} 件物品</span>
                <span style={{ fontSize: 12, color: mf, marginLeft: 8 }}>{record.savedAt}</span>
              </div>
              <button onClick={() => setExpandedRecord(expandedRecord === record.savedAt ? null : record.savedAt)}
                style={{ fontSize: 12, color: sg, background: 'none', border: 'none', cursor: 'pointer' }}>
                {expandedRecord === record.savedAt ? '收起' : '查看'}
              </button>
            </div>
            {expandedRecord === record.savedAt && (
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {record.items.map((item, j) => (
                  <span key={j} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    background: item.decision === 'keep' ? '#EAF2EE' : item.decision === 'toss' ? cr : '#FDF5F0',
                    color: item.decision === 'keep' ? '#2E6B50' : item.decision === 'toss' ? ml : '#C47B5A',
                  }}>
                    {item.decision === 'keep' ? '✓ ' : item.decision === 'toss' ? '🗑 ' : '📦 '}{item.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
