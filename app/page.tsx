'use client'
import { useState } from 'react'
import HomeTab from '@/components/HomeTab'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import MemberTab from '@/components/MemberTab'

type Tab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: '首頁', icon: '✦' },
  { id: 'checklist', label: '整理清單', icon: '🗂' },
  { id: 'declutter', label: '斷捨離', icon: '♻️' },
  { id: 'challenge', label: '每日丟一物', icon: '🎯' },
  { id: 'recommend', label: '收納推薦', icon: '📦' },
  { id: 'member', label: '會員', icon: '👤' },
]

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358'

export default function Home() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      <nav style={{
        background: '#FAF8F4', borderBottom: `1px solid ${bd}`,
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 16, color: ink, flexShrink: 0 }}>
          整理<span style={{ color: sg }}>•</span>小幫手
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '5px 10px', borderRadius: 20, border: 'none',
              background: tab === t.id ? ink : 'transparent',
              color: tab === t.id ? '#FAF8F4' : ml,
              fontSize: 12, cursor: 'pointer', fontWeight: tab === t.id ? 500 : 400,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              <span style={{ display: 'none' }}>{t.label}</span>
              <span className="nav-label">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        @media (min-width: 480px) { .nav-label { display: inline !important; } }
      `}</style>

      <div style={{ padding: '28px 20px', maxWidth: 760, margin: '0 auto' }}>
        {tab === 'home'      && <HomeTab onNavigate={setTab} />}
        {tab === 'checklist' && <ChecklistTab />}
        {tab === 'declutter' && <DeclutterTab />}
        {tab === 'challenge' && <ChallengeTab />}
        {tab === 'recommend' && <RecommendTab />}
        {tab === 'member'    && <MemberTab />}
      </div>
    </div>
  )
}
