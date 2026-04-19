'use client'
import { useState, useEffect, useCallback } from 'react'
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

export default function Home() {
  const [tab, setTab]                           = useState<AppTab>('home')
  const [user, setUser]                         = useState<OAuthUser | null>(null)
  const [declutterRecords, setDeclutterRecords] = useState<DeclutterRecord[]>([])
  const [checklistLogs, setChecklistLogs]       = useState<ChecklistLog[]>([])

  const loadUserData = useCallback(async (u: OAuthUser) => {
    const [logs, records] = await Promise.all([
      sbLoadChecklistLogs(u.email),
      sbLoadDeclutterRecords(u.email),
    ])
    setChecklistLogs(logs.length > 0 ? logs : loadLS<ChecklistLog[]>(LS_CHECKLIST_LOGS, [], u.email))
    setDeclutterRecords(records.length > 0 ? records : loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, [], u.email))
  }, [])

  useEffect(() => {
    if (/Line\//.test(navigator.userAgent)) {
      const url = window.location.href
      window.location.replace(url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1')
      return
    }
    const savedTab = sessionStorage.getItem(TAB_KEY) as AppTab | null
    if (savedTab && TABS.find(t => t.id === savedTab)) setTab(savedTab)
    const u = getUserFromCookie()
    if (u) { setUser(u); loadUserData(u) }
    else {
      setDeclutterRecords(loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, []))
      setChecklistLogs(loadLS<ChecklistLog[]>(LS_CHECKLIST_LOGS, []))
    }
  }, [loadUserData])

  const handleTabChange = (newTab: AppTab) => {
    setTab(newTab)
    sessionStorage.setItem(TAB_KEY, newTab)
    // iOS Chrome/Safari 相容：強制置頂
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }

  const handleDeclutterSave = async (record: DeclutterRecord) => {
    const recordToSave: DeclutterRecord = {
      ...record,
      tossEntries: record.tossEntries.map(e => ({ ...e, photo: undefined })),
    }
    setDeclutterRecords(prev => [recordToSave, ...prev])
    if (user) await sbSaveDeclutterRecord(user.email, recordToSave)
    else saveLS(LS_DECLUTTER_RECORDS, [recordToSave, ...declutterRecords])
  }

  const handleChecklistSave = async (log: ChecklistLog) => {
    setChecklistLogs(prev => [log, ...prev])
    if (user) await sbSaveChecklistLog(user.email, log)
    else saveLS(LS_CHECKLIST_LOGS, [log, ...checklistLogs])
  }

  const handleDeleteDeclutterRecord = async (savedAt: string) => {
    setDeclutterRecords(prev => prev.filter(r => r.savedAt !== savedAt))
    if (user) await sbDeleteDeclutterRecord(user.email, savedAt)
    else saveLS(LS_DECLUTTER_RECORDS, declutterRecords.filter(r => r.savedAt !== savedAt))
  }

  const handleDeleteChecklistLog = async (id: string) => {
    setChecklistLogs(prev => prev.filter(l => l.id !== id))
    if (user) await sbDeleteChecklistLog(user.email, id)
    else saveLS(LS_CHECKLIST_LOGS, checklistLogs.filter(l => l.id !== id))
  }

  const handleUserChange = async (u: OAuthUser | null) => {
    setUser(u)
    if (u) await loadUserData(u)
    else { setDeclutterRecords([]); setChecklistLogs([]) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{
        background: '#FAF8F4', borderBottom: `1px solid ${bd}`,
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: 46,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 17, color: ink }}>
          整理<span style={{ color: sg }}>•</span>小幫手
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
        {tab === 'home'      && <HomeTab key="home" onNavigate={handleTabChange} user={user} onLoginClick={() => handleTabChange('member')} />}
        {tab === 'checklist' && <ChecklistTab key="checklist" onSaveLog={handleChecklistSave} userId={user?.email} />}
        {tab === 'declutter' && <DeclutterTab key="declutter" onSaveToMember={handleDeclutterSave} onGoToMember={(section) => { handleTabChange('member'); if (section) sessionStorage.setItem('member_section', section) }} />}
        {tab === 'challenge' && <ChallengeTab key="challenge" userId={user?.email} />}
        {tab === 'recommend' && <RecommendTab key="recommend" />}
        {tab === 'member'    && (
          <MemberTab
            key="member"
            declutterRecords={declutterRecords}
            checklistLogs={checklistLogs}
            user={user}
            onUserChange={handleUserChange}
            onDeleteDeclutter={handleDeleteDeclutterRecord}
            onDeleteDiary={handleDeleteChecklistLog}
          />
        )}
      </div>

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
    </div>
  )
}
