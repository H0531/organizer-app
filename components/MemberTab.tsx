'use client'
import { useState } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

// Placeholder user type
type User = { name: string; email: string; avatar: string; provider: 'google' | 'facebook' }

export default function MemberTab() {
  const [user, setUser] = useState<User | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null)

  // Mock login — in production replace with real OAuth redirect
  const handleLogin = (provider: 'google' | 'facebook') => {
    setOauthLoading(provider)
    setTimeout(() => {
      setOauthLoading(null)
      setUser({
        name: provider === 'google' ? 'Google 使用者' : 'Facebook 使用者',
        email: provider === 'google' ? 'user@gmail.com' : 'user@facebook.com',
        avatar: provider === 'google' ? 'G' : 'F',
        provider,
      })
    }, 1600)
  }

  const saveName = () => {
    if (!draftName.trim()) return
    setUser(u => u ? { ...u, name: draftName.trim() } : u)
    setEditingName(false)
  }

  if (!user) return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>會員登入</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>
        登入後，打卡日記、每日挑戰、斷捨離紀錄都會同步到你的帳號，不怕換裝置或清除瀏覽器資料。
      </p>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '32px 28px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, color: ink, marginBottom: 24 }}>選擇登入方式</div>

        {/* Google */}
        <button
          onClick={() => handleLogin('google')}
          disabled={!!oauthLoading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '13px 20px', borderRadius: 10, border: '1.5px solid #DADCE0', background: 'white', cursor: oauthLoading ? 'default' : 'pointer', fontSize: 15, color: '#3C4043', fontWeight: 500, marginBottom: 12, opacity: oauthLoading && oauthLoading !== 'google' ? 0.5 : 1 }}>
          {oauthLoading === 'google' ? (
            <span style={{ fontSize: 14, color: mf }}>連結中…</span>
          ) : (
            <>
              {/* Google G SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              使用 Google 登入
            </>
          )}
        </button>

        {/* Facebook */}
        <button
          onClick={() => handleLogin('facebook')}
          disabled={!!oauthLoading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '13px 20px', borderRadius: 10, border: 'none', background: '#1877F2', cursor: oauthLoading ? 'default' : 'pointer', fontSize: 15, color: 'white', fontWeight: 500, opacity: oauthLoading && oauthLoading !== 'facebook' ? 0.5 : 1 }}>
          {oauthLoading === 'facebook' ? (
            <span style={{ fontSize: 14 }}>連結中…</span>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              使用 Facebook 登入
            </>
          )}
        </button>

        <div style={{ fontSize: 11, color: mf, marginTop: 20, lineHeight: 1.6 }}>
          ⚠️ 目前為模擬登入介面，部署後需完成 Google / Facebook OAuth 串接
        </div>
      </div>

      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 22px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 12 }}>登入後可以使用</div>
        {[
          ['📅', '整理行事曆', '排定整理時間，前一天收到提醒'],
          ['📓', '打卡日記', '整理紀錄雲端同步，換裝置不遺失'],
          ['♻️', '斷捨離分流區', '留送丟的決定與處理進度'],
          ['🎯', '每日丟一物進度', '30/60/100 天挑戰完整記錄'],
          ['📦', '收納品清單', '你收藏的推薦商品與購買記錄'],
        ].map(([icon, title, desc], i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: ml }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Logged-in dashboard
  return (
    <div>
      {/* Header */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 14, padding: '22px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: user.provider === 'google' ? '#EA4335' : '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {user.avatar}
        </div>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
                style={{ flex: 1, border: `1px solid ${sg}`, borderRadius: 8, padding: '6px 10px', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} autoFocus />
              <button onClick={saveName} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 12, cursor: 'pointer' }}>儲存</button>
              <button onClick={() => setEditingName(false)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${bd}`, background: 'white', color: ml, fontSize: 12, cursor: 'pointer' }}>取消</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 18, fontWeight: 700, color: ink }}>{user.name} 的整理小幫手</div>
              <button onClick={() => { setDraftName(user.name); setEditingName(true) }} style={{ fontSize: 11, color: mf, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>改名</button>
            </div>
          )}
          <div style={{ fontSize: 12, color: mf, marginTop: 2 }}>{user.email}</div>
        </div>
        <button onClick={() => setUser(null)} style={{ fontSize: 12, color: mf, background: 'none', border: `1px solid ${bd}`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>登出</button>
      </div>

      {/* Dashboard sections */}
      {/* Calendar */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>📅 整理行事曆</div>
          <span style={{ fontSize: 11, padding: '2px 8px', background: '#FDF5E4', border: '1px solid #E8C97A', borderRadius: 10, color: '#A08020' }}>OAuth 待接</span>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 0', color: mf, fontSize: 13 }}>
          行事曆串接完成後，這裡會顯示你所有排定的整理時間
        </div>
      </div>

      {/* Diary summary */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 14 }}>📓 打卡日記</div>
        <div style={{ textAlign: 'center', padding: '20px 0', color: mf, fontSize: 13 }}>
          登入後的整理紀錄將同步至此
        </div>
      </div>

      {/* Declutter summary */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 14 }}>♻️ 斷捨離分流區</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['留下', '#EAF2EE', sg, '0 件'], ['送出', '#F0D5C8', '#C47B5A', '0 件'], ['丟棄', cr, ml, '0 件']].map(([label, bg, col, val]) => (
            <div key={label} style={{ flex: 1, padding: '14px 10px', borderRadius: 10, background: bg as string, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: col as string }}>{val}</div>
              <div style={{ fontSize: 12, color: ml, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Challenge summary */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 14 }}>🎯 每日丟一物挑戰</div>
        <div style={{ textAlign: 'center', padding: '20px 0', color: mf, fontSize: 13 }}>
          開始挑戰後，進度明細會顯示在這裡
        </div>
      </div>

      {/* Recommend bookmark */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 14 }}>📦 收納品清單</div>
        <div style={{ textAlign: 'center', padding: '20px 0', color: mf, fontSize: 13 }}>
          在收納推薦頁收藏的商品會出現在這裡
        </div>
      </div>
    </div>
  )
}
