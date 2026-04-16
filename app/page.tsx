'use client'
import { useState } from 'react'
import HomeTab from '@/components/HomeTab'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import MemberTab from '@/components/MemberTab'
import type { DeclutterRecord } from '@/lib/types'

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

export default function Home() {
  const [tab, setTab] = useState<AppTab>('home')

  const handleTabChange = (newTab: AppTab) => {
    setTab(newTab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Shared state: declutter records saved to member area
  const [declutterRecords, setDeclutterRecords] = useState<DeclutterRecord[]>([])

  const handleDeclutterSave = (record: DeclutterRecord) => {
    setDeclutterRecords(prev => [record, ...prev])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Top title bar */}
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

      {/* Main content */}
      <div style={{ padding: '16px 16px 80px', maxWidth: 480, margin: '0 auto' }}>
        {tab === 'home'      && <HomeTab onNavigate={handleTabChange} />}
        {tab === 'checklist' && <ChecklistTab />}
        {tab === 'declutter' && <DeclutterTab onSaveToMember={handleDeclutterSave} onGoToMember={() => handleTabChange('member')} />}
        {tab === 'challenge' && <ChallengeTab />}
        {tab === 'recommend' && <RecommendTab />}
        {tab === 'member'    && <MemberTab declutterRecords={declutterRecords} />}
      </div>

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#FAF8F4', borderTop: `1px solid ${bd}`,
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            flex: 1, padding: '8px 4px 6px', border: 'none',
            background: 'transparent',
            color: tab === t.id ? sg : ml,
            fontSize: 10, cursor: 'pointer', fontWeight: tab === t.id ? 600 : 400,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            borderTop: tab === t.id ? `2px solid ${sg}` : '2px solid transparent',
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
