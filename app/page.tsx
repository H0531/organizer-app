'use client'
import { useState } from 'react'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import GuideTab from '@/components/GuideTab'

type Tab = 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'guide'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'checklist', label: '整理清單', icon: '🗂' },
  { id: 'declutter', label: '斷捨離', icon: '♻️' },
  { id: 'challenge', label: '每日丟一物', icon: '🎯' },
  { id: 'recommend', label: '收納推薦', icon: '📦' },
  { id: 'guide', label: '說明', icon: '✦' },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('checklist')

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav style={{
        background: '#FAF8F4',
        borderBottom: '1px solid #DDD8CF',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexWrap: 'wrap',
        gap: 4,
      }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 17, color: '#2C2820', flexShrink: 0 }}>
          整理<span style={{ color: '#7A9E8A' }}>•</span>小幫手
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: 'none',
                background: tab === t.id ? '#2C2820' : 'transparent',
                color: tab === t.id ? '#FAF8F4' : '#6B6358',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: tab === t.id ? 500 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div style={{ padding: '32px 24px', maxWidth: 760, margin: '0 auto' }}>
        {tab === 'checklist' && <ChecklistTab />}
        {tab === 'declutter' && <DeclutterTab />}
        {tab === 'challenge' && <ChallengeTab />}
        {tab === 'recommend' && <RecommendTab />}
        {tab === 'guide' && <GuideTab onNavigate={setTab} />}
      </div>
    </div>
  )
}
