'use client'
import { useState } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

// ── 擴充商品資料庫（18 筆）───────────────────────────────────
const PD = [
  // 層架
  { name: 'PP收納盒大', brand: '無印良品', w: 37, d: 26, h: 17, types: ['shelf', 'drawer', 'wardrobe'], fit: 'perfect', price: 'NT$299', url: 'https://www.muji.com/tw/' },
  { name: 'PP收納盒中', brand: '無印良品', w: 25, d: 20, h: 14, types: ['shelf', 'drawer', 'wardrobe'], fit: 'perfect', price: 'NT$199', url: 'https://www.muji.com/tw/' },
  { name: 'SAMLA透明收納箱', brand: 'IKEA', w: 57, d: 39, h: 28, types: ['under', 'shelf'], fit: 'perfect', price: 'NT$299', url: 'https://www.ikea.com/tw/' },
  { name: 'KUGGIS收納盒附蓋', brand: 'IKEA', w: 37, d: 54, h: 21, types: ['shelf', 'wardrobe', 'under'], fit: 'ok', price: 'NT$249', url: 'https://www.ikea.com/tw/' },
  { name: '桌面整理架竹製', brand: '誠品生活', w: 28, d: 18, h: 22, types: ['shelf'], fit: 'perfect', price: 'NT$680', url: 'https://www.eslite.com/' },
  { name: '可疊加收納盒附蓋', brand: '無印良品', w: 34, d: 44, h: 18, types: ['shelf', 'under'], fit: 'perfect', price: 'NT$350', url: 'https://www.muji.com/tw/' },
  // 抽屜
  { name: '軟質整理盒6格', brand: 'DAISO', w: 32, d: 22, h: 10, types: ['drawer'], fit: 'perfect', price: 'NT$49', url: 'https://www.daiso.com.tw/' },
  { name: 'PP資料盒薄型', brand: '無印良品', w: 10, d: 32, h: 24, types: ['shelf', 'drawer'], fit: 'ok', price: 'NT$149', url: 'https://www.muji.com/tw/' },
  { name: '抽屜分格盤(6格)', brand: 'NITORI', w: 30, d: 20, h: 6, types: ['drawer'], fit: 'perfect', price: 'NT$129', url: 'https://www.nitori.com.tw/' },
  { name: 'SKÅDIS 桌面整理盤', brand: 'IKEA', w: 36, d: 10, h: 10, types: ['drawer', 'shelf'], fit: 'ok', price: 'NT$99', url: 'https://www.ikea.com/tw/' },
  // 衣櫃
  { name: 'SKUBB衣物整理盒', brand: 'IKEA', w: 44, d: 55, h: 19, types: ['wardrobe', 'under'], fit: 'perfect', price: 'NT$149', url: 'https://www.ikea.com/tw/' },
  { name: '不織布衣物收納袋', brand: 'NITORI', w: 40, d: 25, h: 30, types: ['wardrobe'], fit: 'perfect', price: 'NT$199', url: 'https://www.nitori.com.tw/' },
  { name: '掛式收納袋5格', brand: 'DAISO', w: 30, d: 10, h: 80, types: ['wardrobe'], fit: 'ok', price: 'NT$79', url: 'https://www.daiso.com.tw/' },
  { name: '真空壓縮收納袋L', brand: 'NITORI', w: 60, d: 80, h: 3, types: ['wardrobe', 'under'], fit: 'ok', price: 'NT$249', url: 'https://www.nitori.com.tw/' },
  // 床底
  { name: '床下扁型收納盒', brand: 'NITORI', w: 74, d: 40, h: 14, types: ['under'], fit: 'perfect', price: 'NT$450', url: 'https://www.nitori.com.tw/' },
  { name: '附輪床下收納箱', brand: 'IKEA', w: 66, d: 45, h: 17, types: ['under'], fit: 'perfect', price: 'NT$349', url: 'https://www.ikea.com/tw/' },
  // 書桌
  { name: '桌面電線收納盒', brand: 'DAISO', w: 25, d: 12, h: 8, types: ['shelf', 'drawer'], fit: 'perfect', price: 'NT$49', url: 'https://www.daiso.com.tw/' },
  { name: '金屬網格文件架', brand: '無印良品', w: 10, d: 27, h: 26, types: ['shelf'], fit: 'ok', price: 'NT$390', url: 'https://www.muji.com/tw/' },
]

// 空間選項（圖示 + 標籤 + 建議尺寸）
const SPACE_TYPES = [
  { value: 'shelf',    icon: '📚', label: '層架書架', hint: '量格子內部尺寸' },
  { value: 'drawer',   icon: '🗄', label: '抽屜',    hint: '量抽屜內寬深高' },
  { value: 'under',    icon: '🛏', label: '床底/沙發下', hint: '量離地高度' },
  { value: 'wardrobe', icon: '👕', label: '衣櫃',    hint: '量格層淨尺寸' },
]

// 空間別收納心法
const SPACE_TIPS: Record<string, { tools: string[]; tip: string }> = {
  shelf:    { tools: ['隔板收納盒', '桌面整理架', '標籤機', '文件夾立架'], tip: '同系列統一品牌好堆疊，不同品牌高度難對齊' },
  drawer:   { tools: ['分格盤', 'PP收納格', '小物托盤', '矽膠防滑墊'], tip: '抽屜深度超過 30cm，前區放常用、後區放備用' },
  under:    { tools: ['扁型收納箱', '真空壓縮袋', '附輪收納盒', '防塵袋'], tip: '床底高度通常 14–20cm，附輪款方便推拉取物' },
  wardrobe: { tools: ['不織布收納袋', 'SKUBB 整理盒', '掛式收納袋', '防塵衣物袋'], tip: '衣物直立收納（KonMari 法）可多放 30% 衣服' },
}

export default function RecommendTab({ fromSpace }: { fromSpace?: string }) {
  const [mW, setMW] = useState('')
  const [mD, setMD] = useState('')
  const [mH, setMH] = useState('')
  const [spaceType, setSpaceType] = useState(fromSpace || 'shelf')
  const [searched, setSearched] = useState(false)

  const hasInput = mW || mD || mH

  const prods = PD.filter(p => {
    const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
    if (!p.types.includes(spaceType)) return false
    if (mW && p.w > w + 5) return false
    if (mD && p.d > d + 5) return false
    if (mH && p.h > h + 5) return false
    return true
  }).sort((a, b) => {
    // perfect 優先，其次尺寸越接近越前
    if (a.fit === 'perfect' && b.fit !== 'perfect') return -1
    if (b.fit === 'perfect' && a.fit !== 'perfect') return 1
    return 0
  }).slice(0, 8)

  const currentSpaceInfo = SPACE_TYPES.find(s => s.value === spaceType)
  const currentTip = SPACE_TIPS[spaceType]

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>收納品推薦</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20 }}>整理完再買，量好尺寸，一次買對</p>

      {/* 情境提示：整理後才買的原則 */}
      <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 4 }}>✦ 先整理再買收納品</div>
        <div style={{ fontSize: 12, color: ml, lineHeight: 1.7 }}>
          斷捨離後才知道真正剩幾件物品，量好空間尺寸再下單，避免買了放不下或買太多。
        </div>
      </div>

      {/* 空間選擇（圖示格） */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>要收納哪個空間？</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {SPACE_TYPES.map(s => (
            <button key={s.value} onClick={() => { setSpaceType(s.value); setSearched(false) }} style={{
              padding: '12px 6px 10px', border: spaceType === s.value ? `2px solid ${sg}` : `1px solid ${bd}`,
              borderRadius: 10, background: spaceType === s.value ? '#EAF2EE' : ww,
              cursor: 'pointer', textAlign: 'center', WebkitTapHighlightColor: 'transparent',
            }}>
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: spaceType === s.value ? '#2E6B50' : ink, fontWeight: spaceType === s.value ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{s.label}</span>
            </button>
          ))}
        </div>

        {currentSpaceInfo && (
          <div style={{ fontSize: 12, color: mf, background: cr, borderRadius: 8, padding: '7px 12px', marginBottom: 16 }}>
            📏 建議測量：{currentSpaceInfo.hint}
          </div>
        )}

        {/* 尺寸輸入 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {([['寬度', mW, setMW], ['深度', mD, setMD], ['高度', mH, setMH]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: mf, marginBottom: 5, fontWeight: 500 }}>{label}</div>
              <input type="number" min={0}
                style={{ width: '100%', border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 12px', fontSize: 15, background: 'white', color: ink, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                value={val} onChange={e => { setter(e.target.value); setSearched(false) }} placeholder="–" />
              <div style={{ fontSize: 11, color: mf, textAlign: 'center', marginTop: 4 }}>cm</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSearched(true)}
          style={{ width: '100%', marginTop: 16, padding: '11px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          查詢適合的收納品
        </button>
      </div>

      {/* 推薦結果 */}
      {(searched || hasInput) && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>推薦商品</div>
            <div style={{ fontSize: 12, color: mf }}>找到 {prods.length} 件</div>
          </div>

          {prods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, color: mf, marginBottom: 6 }}>找不到符合尺寸的商品</div>
              <div style={{ fontSize: 12, color: mf }}>試著放寬尺寸，或清空某個欄位</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prods.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ border: `1px solid ${p.fit === 'perfect' ? sg : bd}`, borderRadius: 10, padding: '14px 16px', background: p.fit === 'perfect' ? '#FAFDF9' : 'white', textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: mf }}>{p.brand}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: sg }}>{p.price}</div>
                      <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, marginTop: 3, background: p.fit === 'perfect' ? '#EAF2EE' : '#F0E2C0', color: p.fit === 'perfect' ? sg : '#C4953A', fontWeight: 500, display: 'inline-block' }}>
                        {p.fit === 'perfect' ? '✓ 完美符合' : '○ 可以使用'}
                      </div>
                    </div>
                  </div>

                  {/* 尺寸視覺化對比 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: ml }}>
                      {p.w} × {p.d} × {p.h} cm
                    </div>
                    {(mW || mD || mH) && (
                      <div style={{ fontSize: 11, color: mf }}>
                        （你的空間：{mW || '?'} × {mD || '?'} × {mH || '?'} cm）
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: '#4285F4', textAlign: 'right' }}>前往品牌官網 →</div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 未搜尋時顯示空狀態引導 */}
      {!searched && !hasInput && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📐</div>
          <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>量好尺寸，找到剛好的收納盒</div>
          <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>輸入空間的寬、深、高，自動篩選符合的商品</div>
        </div>
      )}

      {/* 本空間收納心法 */}
      {currentTip && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>
            {currentSpaceInfo?.label} 常用工具
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {currentTip.tools.map(tool => (
              <span key={tool} style={{ fontSize: 12, color: ink, background: cr, borderRadius: 8, padding: '5px 10px' }}>{tool}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: ml, background: '#EAF2EE', borderRadius: 8, padding: '9px 12px', lineHeight: 1.7 }}>
            ✦ {currentTip.tip}
          </div>
        </div>
      )}

      {/* 選購通用原則 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14 }}>
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
    </div>
  )
}
