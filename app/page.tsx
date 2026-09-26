'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import HomeTab from '@/components/HomeTab'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import MemberTab from '@/components/MemberTab'
import type { DeclutterRecord, ChecklistLog } from '@/lib/types'
import { loadLS, saveLS, savePhoto, LS_CHECKLIST_LOGS, LS_DECLUTTER_RECORDS } from '@/lib/types'
import { getUserFromCookie, type OAuthUser } from '@/lib/auth'
import {
  sbLoadChecklistLogs, sbSaveChecklistLog, sbDeleteChecklistLog,
  sbLoadDeclutterRecords, sbSaveDeclutterRecord, sbDeleteDeclutterRecord,
} from '@/lib/supabase'
import { uploadPhoto } from '@/lib/photos'

export type AppTab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'home',      label: '首頁',    icon: '✦'  },
  { id: 'checklist', label: '整理清單', icon: '🗂' },
  { id: 'declutter', label: '斷捨離',  icon: '♻️' },
  { id: 'challenge', label: '每日丟一物', icon: '🎯' },
  { id: 'recommend', label: '收納推薦', icon: '📦' },
  { id: 'member',    label: '我的整理', icon: '👤' },
]

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358'
const TAB_KEY = 'active_tab'

// ── Toast ──────────────────────────────────────────────────────
type ToastType = 'error' | 'success'
function Toast({ message, type, onDone }: { message: string; type: ToastType; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: type === 'error' ? '#C47B5A' : '#7A9E8A',
      color: 'white', borderRadius: 10, padding: '10px 20px',
      fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {type === 'error' ? '⚠️ ' : '✅ '}{message}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  )
}

// ── Loading Spinner ────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(245,240,232,0.85)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, border: `3px solid #DDD8CF`,
        borderTop: `3px solid #7A9E8A`, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: 13, color: '#6B6358' }}>載入資料中⋯</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── ChecklistLog 資料統一 ─────────────────────────────────────
// Guest（LocalStorage）與登入（Supabase）兩種來源進入 state 前都經過這裡：
// - 補齊欄位預設值，確保 MemberTab / ChecklistTab 拿到同一種 ChecklistLog 結構
// - 照片保留原字串（Guest 為 data URL、登入後為 Storage URL，兩者都可直接當 img src）
// - 依建立時間排序（id = 建立時的 Date.now()），新到舊；
//   Supabase 原本依 updated_at 排序，migration 或編輯心得後順序會與 Guest 不同
function normalizeChecklistLogs(list: unknown): ChecklistLog[] {
  if (!Array.isArray(list)) return []
  const toStr = (v: unknown) => (typeof v === 'string' ? v : '')
  const toNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
  const toPhotos = (v: unknown) => Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && p !== '') : []
  const logs: ChecklistLog[] = list
    .filter(l => l && typeof l === 'object')
    .map(raw => {
      const l = raw as Partial<ChecklistLog>
      return {
        ...l,
        id: String(l.id ?? ''),
        date: toStr(l.date),
        space: toStr(l.space),
        note: toStr(l.note),
        beforePhotos: toPhotos(l.beforePhotos),
        afterPhotos: toPhotos(l.afterPhotos),
        duration: toNum(l.duration),
        targetMinutes: toNum(l.targetMinutes),
      }
    })
  return logs
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const x = Number(a.l.id), y = Number(b.l.id)
      if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return y - x
      return a.i - b.i
    })
    .map(o => o.l)
}

export default function Home() {
  const [tab, setTab]                           = useState<AppTab>('home')
  const [user, setUser]                         = useState<OAuthUser | null>(null)
  const [declutterRecords, setDeclutterRecords] = useState<DeclutterRecord[]>([])
  const [checklistLogs, setChecklistLogs]       = useState<ChecklistLog[]>([])
  const [loading, setLoading]                   = useState(false)
  const [toast, setToast]                       = useState<{ message: string; type: ToastType } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 同一次登入生命週期（同一次 mount）只執行一次 guest→cloud migration，
  // 避免 page.tsx 初始化流程與 MemberTab.tsx 的 auth=success 流程同時觸發兩次
  const migratedEmailsRef = useRef<Set<string>>(new Set())
  // 目前畫面所屬的登入帳號（null = Guest）。非同步載入完成時用來確認使用者沒有在途中登出／切換，
  // 避免已登出後，晚回來的 Supabase 私人資料被寫進畫面（進而被 Guest 儲存寫入 LocalStorage）
  const activeEmailRef = useRef<string | null>(null)

  // Guest 資料：一律從 LocalStorage 讀取（只讀不寫，不會把 Supabase 資料複製回來）
  const loadGuestData = useCallback(() => {
    setDeclutterRecords(loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, []))
    setChecklistLogs(normalizeChecklistLogs(loadLS<unknown>(LS_CHECKLIST_LOGS, [])))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
  }, [])

  // Guest LocalStorage 資料 → 登入後 migration 至該 email 的 Supabase
  // 只處理 checklist_logs 與 declutter_records（不處理 challenge_data）
  const migrateGuestData = useCallback(async (u: OAuthUser) => {
    // ── checklist_logs ──
    const guestLogsRaw = localStorage.getItem(LS_CHECKLIST_LOGS)
    if (guestLogsRaw) {
      try {
        const guestLogs = JSON.parse(guestLogsRaw) as ChecklistLog[]
        if (Array.isArray(guestLogs) && guestLogs.length > 0) {
          let allOk = true
          for (const log of guestLogs) {
            try {
              const migratedBefore: string[] = []
              for (let i = 0; i < log.beforePhotos.length; i++) {
                const src = log.beforePhotos[i]
                if (src && src.startsWith('data:')) {
                  const url = await uploadPhoto(u.email, `checklist_${log.id}_before_${i}`, src)
                  if (!url) { allOk = false; break }
                  migratedBefore.push(url)
                } else {
                  migratedBefore.push(src)
                }
              }
              if (!allOk) break

              const migratedAfter: string[] = []
              for (let i = 0; i < log.afterPhotos.length; i++) {
                const src = log.afterPhotos[i]
                if (src && src.startsWith('data:')) {
                  const url = await uploadPhoto(u.email, `checklist_${log.id}_after_${i}`, src)
                  if (!url) { allOk = false; break }
                  migratedAfter.push(url)
                } else {
                  migratedAfter.push(src)
                }
              }
              if (!allOk) break

              const migratedLog: ChecklistLog = { ...log, beforePhotos: migratedBefore, afterPhotos: migratedAfter }
              const saved = await sbSaveChecklistLog(u.email, migratedLog)
              if (!saved) { allOk = false; break }
            } catch (err) {
              console.error('migrateGuestData: checklist log migration failed', err)
              allOk = false
              break
            }
          }
          if (allOk) {
            localStorage.removeItem(LS_CHECKLIST_LOGS)
          } else {
            showToast('部分整理紀錄同步失敗，資料仍保留在本機，之後可以再次同步。')
          }
        }
      } catch (err) {
        console.error('migrateGuestData: checklist_logs parse failed', err)
      }
    }

    // ── declutter_records ──
    const guestRecordsRaw = localStorage.getItem(LS_DECLUTTER_RECORDS)
    if (guestRecordsRaw) {
      try {
        const guestRecords = JSON.parse(guestRecordsRaw) as DeclutterRecord[]
        if (Array.isArray(guestRecords) && guestRecords.length > 0) {
          let allOk = true
          for (const record of guestRecords) {
            try {
              const saved = await sbSaveDeclutterRecord(u.email, record)
              if (!saved) { allOk = false; break }
            } catch (err) {
              console.error('migrateGuestData: declutter record migration failed', err)
              allOk = false
              break
            }
          }
          if (allOk) {
            localStorage.removeItem(LS_DECLUTTER_RECORDS)
          } else {
            showToast('部分斷捨離紀錄同步失敗，資料仍保留在本機，之後可以再次同步。')
          }
        }
      } catch (err) {
        console.error('migrateGuestData: declutter_records parse failed', err)
      }
    }
  }, [showToast])

  const loadUserData = useCallback(async (u: OAuthUser) => {
    activeEmailRef.current = u.email
    setLoading(true)
    try {
      if (!migratedEmailsRef.current.has(u.email)) {
        migratedEmailsRef.current.add(u.email)
        await migrateGuestData(u)
      }
      const [logs, records] = await Promise.all([
        sbLoadChecklistLogs(u.email),
        sbLoadDeclutterRecords(u.email),
      ])
      // 載入期間已登出或換帳號 → 丟棄結果
      if (activeEmailRef.current !== u.email) return
      setChecklistLogs(normalizeChecklistLogs(logs))
      setDeclutterRecords(records)
    } catch {
      showToast('載入資料失敗，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [showToast, migrateGuestData])

  useEffect(() => {
    if (/Line\//.test(navigator.userAgent)) {
      const url = window.location.href
      window.location.replace(url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1')
      return
    }
    // URL 參數 tab 切換（從 HomeTab 的 APP_URL 連結進入時）
    const params = new URLSearchParams(window.location.search)
    const urlTab = params.get('tab') as AppTab | null
    if (urlTab && TABS.find(t => t.id === urlTab)) {
      setTab(urlTab)
      sessionStorage.setItem(TAB_KEY, urlTab)
      // 保留 ?tab= 在網址，讓 GA 追蹤到正確頁面，不再 replaceState 掉
    } else {
      const savedTab = sessionStorage.getItem(TAB_KEY) as AppTab | null
      if (savedTab && TABS.find(t => t.id === savedTab)) setTab(savedTab)
    }

    const u = getUserFromCookie()
    if (u) { setUser(u); loadUserData(u) }
    else { activeEmailRef.current = null; loadGuestData() }
  }, [loadUserData, loadGuestData])

  // ── Tab 切換（共用，帶捲到頂）────────────────────────────────
  const handleTabChange = useCallback((newTab: AppTab) => {
    setTab(newTab)
    sessionStorage.setItem(TAB_KEY, newTab)
    const url = newTab === 'home' ? '/' : `/?tab=${newTab}`
    window.history.replaceState({}, '', url)
    // 手動觸發 GA page_view，因為 replaceState 不會被 Next.js router 感知
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_title: newTab,
      })
    }
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [])

  // ── 資料操作 handlers ────────────────────────────────────────
  const handleDeclutterSave = async (record: DeclutterRecord) => {
    // 未登入：照片存 IDB，record 裡的 photo 清掉（避免塞爆 localStorage）
    if (!user) {
      await Promise.all(
        record.tossEntries.map(e => {
          if (e.photo) return savePhoto(`toss_photo_${e.id}`, e.photo)
          return Promise.resolve()
        })
      )
    }
    const recordToSave: DeclutterRecord = {
      ...record,
      tossEntries: record.tossEntries.map(e => ({ ...e, photo: undefined })),
    }
    setDeclutterRecords(prev => [recordToSave, ...prev])
    if (user) {
      const ok = await sbSaveDeclutterRecord(user.email, recordToSave)
      if (!ok) showToast('儲存失敗，請檢查網路連線')
      else showToast('斷捨離紀錄已儲存', 'success')
    } else {
      saveLS(LS_DECLUTTER_RECORDS, [recordToSave, ...declutterRecords])
    }
  }

  const handleChecklistSave = async (log: ChecklistLog) => {
    setChecklistLogs(prev => [log, ...prev])
    if (user) {
      const ok = await sbSaveChecklistLog(user.email, log)
      if (!ok) showToast('儲存失敗，請檢查網路連線')
    } else {
      saveLS(LS_CHECKLIST_LOGS, [log, ...checklistLogs])
    }
  }

  const handleDeleteDeclutterRecord = async (savedAt: string) => {
    setDeclutterRecords(prev => prev.filter(r => r.savedAt !== savedAt))
    if (user) {
      const ok = await sbDeleteDeclutterRecord(user.email, savedAt)
      if (!ok) showToast('刪除失敗，請檢查網路連線')
    } else {
      saveLS(LS_DECLUTTER_RECORDS, declutterRecords.filter(r => r.savedAt !== savedAt))
    }
  }

  const handleDeleteChecklistLog = async (id: string) => {
    setChecklistLogs(prev => prev.filter(l => l.id !== id))
    if (user) {
      const ok = await sbDeleteChecklistLog(user.email, id)
      if (!ok) showToast('刪除失敗，請檢查網路連線')
    } else {
      saveLS(LS_CHECKLIST_LOGS, checklistLogs.filter(l => l.id !== id))
    }
  }

  const handleEditChecklistLog = async (id: string, note: string) => {
    const updated = checklistLogs.map(l => l.id === id ? { ...l, note } : l)
    setChecklistLogs(updated)
    if (user) {
      const log = updated.find(l => l.id === id)
      if (log) {
        const ok = await sbSaveChecklistLog(user.email, log)
        if (!ok) showToast('編輯儲存失敗')
      }
    } else {
      saveLS(LS_CHECKLIST_LOGS, updated)
    }
  }

  const handleUserChange = async (u: OAuthUser | null) => {
    setUser(u)
    if (u) await loadUserData(u)
    else {
      // 登出：清掉登入帳號的資料，改載入本機 Guest 資料（若有）
      activeEmailRef.current = null
      loadGuestData()
    }
  }

  // DeclutterTab → MemberTab 跳轉（帶子區塊）
  const handleGoToMember = useCallback((section?: string) => {
    handleTabChange('member')
    if (section) sessionStorage.setItem('member_section', section)
  }, [handleTabChange])

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* 頂部標題列 */}
      <div style={{
        background: '#FAF8F4', borderBottom: `1px solid ${bd}`,
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 20, color: ink, letterSpacing: '0.02em' }}>
          整理<span style={{ color: sg }}>•</span>小幫手
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <a href="https://www.instagram.com/i.am.ych?igsh=ZWd5M3EwMGxsZ3E%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="https://www.threads.com/@i.am.ych?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink }}>
            <svg width="15" height="15" viewBox="0 0 192 192" fill="currentColor">
              <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.932 16.1-45.512 16.246-22.76-.164-39.959-7.069-51.115-20.518C35.096 138.478 29.44 120.17 29.234 97c.206-23.17 5.862-41.478 16.806-54.39C57.158 29.16 74.357 22.255 97.117 22.09c22.928.165 40.382 7.104 51.878 20.625 5.65 6.688 9.946 15.116 12.838 25.108l16.157-4.304c-3.463-12.674-8.958-23.532-16.456-32.488C147.044 14.284 125.038 5.13 97.19 4.918h-.368C69.021 5.13 47.121 14.316 32.613 30.205 19.608 44.485 12.798 64.551 12.544 97c.254 32.449 7.064 52.515 20.069 66.795 14.508 15.89 36.408 25.075 64.177 25.286h.369c24.537-.176 41.71-6.6 55.93-20.739 18.472-18.371 17.965-41.433 11.853-55.54-4.262-9.935-12.542-17.845-23.405-22.814Z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* 頁面內容 */}
      <div style={{ padding: '16px 16px calc(100px + env(safe-area-inset-bottom))', maxWidth: 480, margin: '0 auto' }}>

        {tab === 'home' && (
          <HomeTab
            key="home"
            onNavigate={handleTabChange}
            user={user}
            onLoginClick={() => handleTabChange('member')}
            checklistLogs={checklistLogs}
            declutterRecords={declutterRecords}
          />
        )}

        {tab === 'checklist' && (
          <ChecklistTab
            key="checklist"
            onSaveLog={handleChecklistSave}
            onDeleteLog={handleDeleteChecklistLog}
            onEditLog={handleEditChecklistLog}
            initialLogs={checklistLogs}
            userId={user?.email}
          />
        )}

        {tab === 'declutter' && (
          <DeclutterTab
            key="declutter"
            onSaveToMember={handleDeclutterSave}
            onGoToMember={handleGoToMember}
            userEmail={user?.email}
          />
        )}

        {tab === 'challenge' && (
          <ChallengeTab
            key="challenge"
            userId={user?.email}
          />
        )}

        {tab === 'recommend' && (
          <RecommendTab
            key="recommend"
            fromSpace={
              typeof window !== 'undefined'
                ? (sessionStorage.getItem('recommend_space') ?? undefined)
                : undefined
            }
          />
        )}

        {tab === 'member' && (
          <MemberTab
            key="member"
            declutterRecords={declutterRecords}
            checklistLogs={checklistLogs}
            user={user}
            onUserChange={handleUserChange}
            onDeleteDeclutter={handleDeleteDeclutterRecord}
            onDeleteDiary={handleDeleteChecklistLog}
            onNavigate={handleTabChange}
          />
        )}

      </div>

      {/* 底部導覽列 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#FAF8F4', borderTop: `1px solid ${bd}`,
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            flex: 1, padding: '10px 4px 8px', border: 'none',
            background: 'transparent', color: tab === t.id ? sg : ml,
            fontSize: 10, cursor: 'pointer',
            fontWeight: tab === t.id ? 600 : 400,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            borderTop: tab === t.id ? `2px solid ${sg}` : '2px solid transparent',
            minHeight: 56, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {loading && <LoadingOverlay />}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}
