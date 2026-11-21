import type { Metadata } from 'next'
import Link from 'next/link'
import PrivacyPolicyContent from '@/components/PrivacyPolicyContent'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358'

// title 套用 app/layout.tsx 的 title.template；canonical 以相對路徑寫，由 layout 的 metadataBase 組成完整網址
export const metadata: Metadata = {
  title: '隱私權政策',
  alternates: {
    canonical: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* 頂部標題列（沿用首頁樣式） */}
      <div style={{
        background: '#FAF8F4', borderBottom: `1px solid ${bd}`,
        padding: '0 16px', display: 'flex', alignItems: 'center', height: 52,
      }}>
        <Link href="/" style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 20, color: ink, letterSpacing: '0.02em', textDecoration: 'none' }}>
          整理<span style={{ color: sg }}>•</span>小幫手
        </Link>
      </div>

      <main style={{ padding: '16px 16px calc(40px + env(safe-area-inset-bottom))', maxWidth: 480, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-block', fontSize: 13, color: ml, textDecoration: 'none', padding: '4px 0', marginBottom: 12 }}>
          ← 返回首頁
        </Link>
        <div style={{ background: '#FAF8F4', border: `1px solid ${bd}`, borderRadius: 14, padding: '24px 20px' }}>
          <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 20, fontWeight: 700, color: ink, margin: '0 0 16px' }}>隱私權政策</h1>
          <PrivacyPolicyContent />
        </div>
      </main>
    </div>
  )
}
