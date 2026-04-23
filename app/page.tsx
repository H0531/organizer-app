'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import HomeTab from '@/components/HomeTab'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import MemberTab from '@/components/MemberTab'
import type { DeclutterRecord, ChecklistLog } from '@/lib/types'
import { loadLS, saveLS, LS_CHECKLIST_LOGS, LS_DECLUTTER_RECORDS } from '@/lib/types'
import { getUserFromCookie, type OAuthUser } from '@/lib/auth'
import {
  sbLoadChecklistLogs, sbSaveChecklistLog, sbDeleteChecklistLog,
  sbLoadDeclutterRecords, sbSaveDeclutterRecord, sbDeleteDeclutterRecord,
} from '@/lib/supabase'

export type AppTab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'home',      label: '首頁',    icon: '✦'  },
  { id: 'checklist', label: '整理清單', icon: '🗂' },
  { id: 'declutter', label: '斷捨離',  icon: '♻️' },
  { id: 'challenge', label: '每日丟一物', icon: '🎯' },
  { id: 'recommend', label: '收納推薦', icon: '📦' },
  { id: 'member',    label: '會員',    icon: '👤' },
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

export default function Home() {
  const [tab, setTab]                           = useState<AppTab>('home')
  const [user, setUser]                         = useState<OAuthUser | null>(null)
  const [declutterRecords, setDeclutterRecords] = useState<DeclutterRecord[]>([])
  const [checklistLogs, setChecklistLogs]       = useState<ChecklistLog[]>([])
  const [loading, setLoading]                   = useState(false)
  const [toast, setToast]                       = useState<{ message: string; type: ToastType } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
  }, [])

  const loadUserData = useCallback(async (u: OAuthUser) => {
    setLoading(true)
    try {
      const [logs, records] = await Promise.all([
        sbLoadChecklistLogs(u.email),
        sbLoadDeclutterRecords(u.email),
      ])
      setChecklistLogs(logs)
      setDeclutterRecords(records)
    } catch {
      showToast('載入資料失敗，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [showToast])

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
      window.history.replaceState({}, '', '/')
    } else {
      const savedTab = sessionStorage.getItem(TAB_KEY) as AppTab | null
      if (savedTab && TABS.find(t => t.id === savedTab)) setTab(savedTab)
    }

    const u = getUserFromCookie()
    if (u) { setUser(u); loadUserData(u) }
    else {
      setDeclutterRecords([])
      setChecklistLogs(loadLS<ChecklistLog[]>(LS_CHECKLIST_LOGS, []))
    }
  }, [loadUserData])

  // ── Tab 切換（共用，帶捲到頂）────────────────────────────────
  const handleTabChange = useCallback((newTab: AppTab) => {
    setTab(newTab)
    sessionStorage.setItem(TAB_KEY, newTab)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [])

  // ── 資料操作 handlers ────────────────────────────────────────
  const handleDeclutterSave = async (record: DeclutterRecord) => {
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
    else { setDeclutterRecords([]); setChecklistLogs([]) }
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

        {/* ✅ RecommendTab：新增 fromSpace prop（可選）
            日後若要從 ChecklistTab 完成後自動帶入空間類型，
            可透過 sessionStorage 傳遞，例：
            sessionStorage.setItem('recommend_space', 'wardrobe')
            然後在這裡讀取並傳入。目前預設讀取。 */}
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

        {/* ✅ MemberTab：新增 onNavigate prop，供空狀態引導按鈕跳轉 */}
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
