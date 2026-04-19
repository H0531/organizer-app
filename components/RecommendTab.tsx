'use client'
import { useState } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

const PD = [
  { name: 'PP收納盒大', brand: '無印良品', w: 37, d: 26, h: 17, types: ['shelf', 'drawer', 'wardrobe'], fit: 'perfect', price: 'NT$299', url: 'https://www.muji.com/tw/' },
  { name: 'PP收納盒中', brand: '無印良品', w: 25, d: 20, h: 14, types: ['shelf', 'drawer', 'wardrobe'], fit: 'perfect', price: 'NT$199', url: 'https://www.muji.com/tw/' },
  { name: 'SKUBB衣物整理盒', brand: 'IKEA', w: 44, d: 55, h: 19, types: ['wardrobe', 'under'], fit: 'perfect', price: 'NT$149', url: 'https://www.ikea.com/tw/' },
  { name: 'SAMLA透明收納箱', brand: 'IKEA', w: 57, d: 39, h: 28, types: ['under', 'shelf'], fit: 'perfect', price: 'NT$299', url: 'https://www.ikea.com/tw/' },
  { name: '軟質整理盒6格', brand: 'DAISO', w: 32, d: 22, h: 10, types: ['drawer'], fit: 'perfect', price: 'NT$49', url: 'https://www.daiso.com.tw/' },
  { name: '床下扁型收納盒', brand: 'NITORI', w: 74, d: 40, h: 14, types: ['under'], fit: 'perfect', price: 'NT$450', url: 'https://www.nitori.com.tw/' },
  { name: '不織布衣物收納袋', brand: 'NITORI', w: 40, d: 25, h: 30, types: ['wardrobe'], fit: 'perfect', price: 'NT$199', url: 'https://www.nitori.com.tw/' },
  { name: '桌面整理架竹製', brand: '誠品生活', w: 28, d: 18, h: 22, types: ['shelf'], fit: 'perfect', price: 'NT$680', url: 'https://www.eslite.com/' },
  { name: 'KUGGIS收納盒附蓋', brand: 'IKEA', w: 37, d: 54, h: 21, types: ['shelf', 'wardrobe', 'under'], fit: 'ok', price: 'NT$249', url: 'https://www.ikea.com/tw/' },
  { name: 'PP資料盒薄型', brand: '無印良品', w: 10, d: 32, h: 24, types: ['shelf', 'drawer'], fit: 'ok', price: 'NT$149', url: 'https://www.muji.com/tw/' },
]

export default function RecommendTab() {
  const [mW, setMW] = useState('')
  const [mD, setMD] = useState('')
  const [mH, setMH] = useState('')
  const [spaceType, setSpaceType] = useState('shelf')
  const [showCrawlerNote, setShowCrawlerNote] = useState(false)

  const prods = PD.filter(p => {
    const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
    return p.types.includes(spaceType) && (!mW || p.w <= w + 5) && (!mD || p.d <= d + 5) && (!mH || p.h <= h + 5)
  }).slice(0, 6)

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>收納品推薦</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 28 }}>輸入空間尺寸，找到適合的收納工具</p>

      {/* Crawler notice banner */}
      <div style={{ background: '#FDF5E4', border: '1px solid #E8C97A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🚧</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#8B6914', marginBottom: 2 }}>資料庫升級中</div>
          <div style={{ fontSize: 12, color: '#A0851E', lineHeight: 1.6 }}>
            目前使用手動整理的商品資料（共 {PD.length} 筆）。爬蟲串接完成後將自動同步各大電商最新品項與價格。
          </div>
        </div>
        <button onClick={() => setShowCrawlerNote(s => !s)} style={{ fontSize: 11, color: '#A0851E', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          {showCrawlerNote ? '收起' : '了解更多'}
        </button>
      </div>

      {showCrawlerNote && (
        <div style={{ background: '#FEFAF0', border: '1px dashed #E8C97A', borderRadius: 10, padding: '16px 18px', marginBottom: 20, fontSize: 13, color: '#8B6914', lineHeight: 1.8 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>待接爬蟲資料來源</div>
          {[
            ['無印良品台灣', 'www.muji.com/tw', '待接'],
            ['IKEA台灣', 'www.ikea.com/tw', '待接'],
            ['NITORI台灣', 'www.nitori.com.tw', '待接'],
            ['DAISO台灣', 'www.daiso.com.tw', '待接'],
            ['momo購物', 'www.momoshop.com.tw', '規劃中'],
            ['PChome', 'shopping.pchome.com.tw', '規劃中'],
          ].map(([name, url, status]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #F0DFA0' }}>
              <span>{name} <span style={{ color: '#C0A060', fontSize: 11 }}>({url})</span></span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: status === '待接' ? '#FFF0C0' : '#F0F0F0', color: status === '待接' ? '#A08020' : '#999' }}>{status}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: '#A0851E' }}>
            串接完成後將支援：即時庫存查詢、價格比較、尺寸篩選、購買連結直跳
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>空間尺寸</div>
        <select value={spaceType} onChange={e => setSpaceType(e.target.value)} style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', fontSize: 14, background: 'white', color: ink, marginBottom: 12, outline: 'none' }}>
          <option value="shelf">層架書架</option>
          <option value="drawer">抽屜</option>
          <option value="under">床底沙發下</option>
          <option value="wardrobe">衣櫃內部</option>
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {([['寬度', mW, setMW], ['深度', mD, setMD], ['高度', mH, setMH]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: mf, marginBottom: 5, fontWeight: 500 }}>{label}</div>
              <input type="number" style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 15, background: 'white', color: ink, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                value={val} onChange={e => setter(e.target.value)} placeholder="0" />
              <div style={{ fontSize: 12, color: mf, textAlign: 'center', marginTop: 4 }}>公分</div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>推薦商品</div>
          {(mW || mD || mH) && <div style={{ fontSize: 12, color: mf }}>找到 {prods.length} 件</div>}
        </div>

        {(!mW && !mD && !mH)
          ? <div style={{ textAlign: 'center', padding: '28px 0', color: mf, fontSize: 14 }}>輸入尺寸後自動推薦</div>
          : prods.length === 0
            ? <div style={{ textAlign: 'center', padding: '28px 0', color: mf, fontSize: 14 }}>找不到符合商品，試著放寬尺寸限制</div>
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {prods.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ border: `1px solid ${bd}`, borderRadius: 10, padding: '14px 16px', background: 'white', textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: ink }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: mf }}>{p.brand}</span>
                      <span style={{ fontSize: 12, color: sg, fontWeight: 500 }}>{p.price}</span>
                    </div>
                    <div style={{ fontSize: 12, color: ml, marginBottom: 8 }}>{p.w}x{p.d}x{p.h} cm</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: p.fit === 'perfect' ? '#EAF2EE' : '#F0E2C0', color: p.fit === 'perfect' ? sg : '#C4953A', fontWeight: 500 }}>
                        {p.fit === 'perfect' ? '完美符合' : '可以使用'}
                      </span>
                      <span style={{ fontSize: 11, color: mf }}>→ 前往購買</span>
                    </div>
                  </a>
                ))}
              </div>
        }
      </div>

      {/* 收納選購指南 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginTop: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>選購原則</div>
        {[
          ['先斷捨離再買', '整理前先丟物，才知道真正需要幾個收納盒，避免買多了反而亂'],
          ['量好尺寸再下單', '收納盒要比空間小 2～3cm，才能順利放入並留通風空間'],
          ['同系列統一品牌', '混搭品牌難以堆疊，建議同一空間選同系列商品'],
          ['透明優先', '透明收納盒不必開蓋就能看到內容物，日常取用效率最高'],
          ['標籤是靈魂', '買再好的收納盒沒貼標籤，三個月後就不知道裡面放什麼'],
        ].map(([t, d], i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ color: sg, flexShrink: 0, marginTop: 2 }}>✦</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: ml }}>{d}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 空間別推薦工具 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>空間別必備工具</div>
        {[
          { space: '衣櫃', tools: ['隔板收納盒', '掛式收納袋', '防塵衣物袋', 'S 型掛鉤'] },
          { space: '廚房', tools: ['抽屜分格盤', '轉角旋轉架', '磁吸刀架', '密封罐組'] },
          { space: '書桌', tools: ['桌面整理架', '線材收納盒', '抽屜分格盤', '標籤機'] },
          { space: '玄關', tools: ['鞋盒（透明）', '傘架', '掛鉤排', '小物托盤'] },
          { space: '床底', tools: ['扁型收納箱', '防塵蓋附輪', '真空收納袋', '標籤卡'] },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: sg, background: '#EAF2EE', borderRadius: 6, padding: '3px 8px', flexShrink: 0, marginTop: 2 }}>{item.space}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.tools.map(tool => (
                <span key={tool} style={{ fontSize: 12, color: ink, background: cr, borderRadius: 6, padding: '3px 8px' }}>{tool}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Crawler placeholder footer */}
      <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 10, border: `1px dashed ${bd}`, background: 'white', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>即時比價功能（開發中）</div>
          <div style={{ fontSize: 12, color: ml }}>爬蟲串接後將自動顯示 momo、PChome 即時價格與庫存狀態</div>
        </div>
      </div>
    </div>
  )
}
