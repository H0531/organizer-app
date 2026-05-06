'use client'
import { useState, useRef, useEffect } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

// ── 商品資料庫（所有商品均已確認連結）────────────────────────
// comment：整理師短評；category：商品用途（前端篩選用）
const DAISO = 'https://shop.daiso.com.tw/pages/daiso0-61'

const PD = [
  // ── 層架 ──
  { name: 'DRÖNA 收納盒', brand: 'IKEA', w: 33, d: 38, h: 33, types: ['shelf'], price: 'NT$169',
    url: 'https://www.ikea.com.tw/zh/products/boxes-and-organisers/boxes-and-baskets/drona-art-70262828',
    category: '收納盒', comment: '剛好塞滿 KALLAX 格狀層架，大布盒遮蔽雜亂視覺效果極佳。' },
  { name: 'KUGGIS收納盒附蓋', brand: 'IKEA', w: 37, d: 54, h: 21, types: ['shelf', 'wardrobe', 'under'], price: 'NT$249',
    url: 'https://www.ikea.com.tw/zh/products/boxes-and-organisers/boxes-and-baskets/kuggis-art-40280206',
    category: '收納盒', comment: '附蓋防塵，適合不常取用的季節性物品。' },
  { name: 'PP收納盒大', brand: '無印良品', w: 37, d: 26, h: 17, types: ['shelf', 'drawer', 'wardrobe'], price: 'NT$299',
    url: 'https://shop.muji.tw/SalePage/Index/9084001',
    category: '收納盒', comment: '疊放穩定，無印系列尺寸統一，買多不怕對不齊。' },
  { name: 'SKÅDIS 收納壁板', brand: 'IKEA', w: 36, d: 1, h: 56, types: ['shelf'], price: 'NT$299',
    url: 'https://www.ikea.com.tw/zh/products/wall-organisers/boards-and-wall-organisers/skadis-art-80320804',
    category: '整理架', comment: '書桌牆面零碎空間最好用，掛鉤、盒子自由搭。' },
  { name: '堆疊式前開收納箱', brand: 'DAISO', w: 38, d: 24, h: 44, types: ['shelf'], price: 'NT$199',
    url: DAISO,
    category: '收納盒', comment: '日本製斜口前掀蓋，不用搬開上層就能直接伸手拿取。' },

  // ── 衣櫃 ──
  { name: 'SKUBB衣物整理盒', brand: 'IKEA', w: 44, d: 55, h: 19, types: ['wardrobe', 'under'], price: 'NT$149',
    url: 'https://www.ikea.com.tw/zh/products/clothes-and-shoe-organisers-and-accessories/clothes-and-shoes-organisers/skubb-art-50290361',
    category: '衣物收納', comment: '衣櫃層板專用，折疊收納時整齊不塌陷。' },
  { name: '衣物收納袋 RT7050 4格', brand: 'NITORI', w: 55, d: 40, h: 24, types: ['wardrobe'], price: 'NT$199',
    url: 'https://www.nitori-net.tw/product/8490233s',
    category: '衣物收納', comment: '透氣不織布防塵，有透明視窗不用打開就知道放什麼。' },
  { name: '半透明衣物收納袋', brand: 'DAISO', w: 30, d: 36, h: 25, types: ['wardrobe'], price: 'NT$69',
    url: DAISO,
    category: '衣物收納', comment: '軟質拉鍊設計，半透明一眼看清內容物，防塵又省空間。' },

  // ── 抽屜 ──
  { name: 'SKUBB 收納盒 6件組', brand: 'IKEA', w: 44, d: 34, h: 11, types: ['drawer'], price: 'NT$199',
    url: 'https://www.ikea.com.tw/zh/products/boxes-and-organisers/organisers/skubb-art-20428553',
    category: '分格盒', comment: '一組含 3 種尺寸拉鍊軟格，內著、襪子、配件一次分類定位。' },
  { name: '抽屜分格盤 15格', brand: 'NITORI', w: 30, d: 20, h: 6, types: ['drawer'], price: 'NT$129',
    url: 'https://www.nitori-net.tw/product/8490229',
    category: '分格盤', comment: '深度淺、格子清楚，適合文具或化妝品分類。' },
  { name: '透明 PS 飾品收納盒', brand: 'DAISO', w: 30, d: 7, h: 2, types: ['drawer'], price: 'NT$49',
    url: DAISO,
    category: '分格盤', comment: '搭配絨面格放入抽屜，百元內就能拼出專櫃級手飾收納。' },

  // ── 床底／沙發下 ──
  { name: 'PÄRKLA 收納盒', brand: 'IKEA', w: 55, d: 49, h: 19, types: ['under'], price: 'NT$59',
    url: 'https://www.ikea.com.tw/zh/products/clothes-and-shoe-organisers-and-accessories/clothes-and-shoes-organisers/parkla-art-10395384',
    category: '收納盒', comment: '床底收納超平價首選，有拉鍊防塵，拉取省力。' },
  { name: '雙開附輪床底收納箱', brand: 'NITORI', w: 66, d: 45, h: 17, types: ['under'], price: 'NT$349',
    url: 'https://www.nitori-net.tw/product/8400039',
    category: '收納盒', comment: '附輪好推拉，兩側都可開蓋，床底頻繁取物首選。' },
  { name: 'SAMLA透明收納箱', brand: 'IKEA', w: 57, d: 39, h: 28, types: ['under', 'shelf'], price: 'NT$299',
    url: 'https://www.ikea.com.tw/zh/products/boxes-and-organisers/boxes-and-baskets/samla-art-70180941',
    category: '收納盒', comment: '透明蓋讓你不用開箱就知道放什麼，床底首選。' },
  { name: '環保材質防塵收納箱', brand: 'DAISO', w: 36, d: 25, h: 24, types: ['under'], price: 'NT$99',
    url: DAISO,
    category: '收納盒', comment: '材質硬挺耐磨，自帶蓋防塵，挑高床架下堆疊放很穩。' },
]

// 商品類型標籤（用於前端篩選）
const CATEGORIES = ['全部', '收納盒', '整理架', '分格盤', '分格盒', '衣物收納']

const SPACE_TYPES = [
  { value: 'shelf',    icon: '📚', label: '層架書架', hint: '量格子內部尺寸' },
  { value: 'drawer',   icon: '🗄', label: '抽屜',    hint: '量抽屜內寬深高' },
  { value: 'under',    icon: '🛏', label: '床底/沙發下', hint: '量離地高度' },
  { value: 'wardrobe', icon: '👕', label: '衣櫃',    hint: '量格層淨尺寸' },
]

const SPACE_TIPS: Record<string, { tools: string[]; tip: string }> = {
  shelf:    { tools: ['隔板收納盒', '桌面整理架', '標籤機', '文件夾立架'], tip: '同系列統一品牌好堆疊，不同品牌高度難對齊' },
  drawer:   { tools: ['分格盤', 'PP收納格', '小物托盤', '矽膠防滑墊'], tip: '抽屜深度超過 30cm，前區放常用、後區放備用' },
  under:    { tools: ['扁型收納箱', '真空壓縮袋', '附輪收納盒', '防塵袋'], tip: '床底高度通常 14–20cm，附輪款方便推拉取物' },
  wardrobe: { tools: ['不織布收納袋', 'SKUBB 整理盒', '掛式收納袋', '防塵衣物袋'], tip: '衣物直立收納（KonMari 法）可多放 30% 衣服' },
}

// 計算商品尺寸與使用者空間的差距分數（越小越接近）
function fitScore(p: typeof PD[0], mW: string, mD: string, mH: string): number {
  const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
  let score = 0
  if (mW && !isNaN(w)) score += Math.abs(w - p.w)
  if (mD && !isNaN(d)) score += Math.abs(d - p.d)
  if (mH && !isNaN(h)) score += Math.abs(h - p.h)
  return score
}

// 判斷是否「完美符合」：各維度都比空間小，且差距在 5cm 以內
function isPerfect(p: typeof PD[0], mW: string, mD: string, mH: string): boolean {
  const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
  if (mW && !isNaN(w) && (p.w > w || w - p.w > 5)) return false
  if (mD && !isNaN(d) && (p.d > d || d - p.d > 5)) return false
  if (mH && !isNaN(h) && (p.h > h || h - p.h > 5)) return false
  return true
}

export default function RecommendTab({ fromSpace }: { fromSpace?: string }) {
  const [mW, setMW] = useState('')
  const [mD, setMD] = useState('')
  const [mH, setMH] = useState('')
  const [spaceType, setSpaceType] = useState(fromSpace || 'shelf')
  const [searched, setSearched] = useState(false)
  const [activeCategory, setActiveCategory] = useState('全部')
  const [tipsOpen, setTipsOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const hasInput = mW || mD || mH

  // 計算所有符合空間類型的商品，依尺寸接近程度排序
  const allMatched = PD
    .filter(p => {
      if (!p.types.includes(spaceType)) return false
      const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
      if (mW && !isNaN(w) && p.w > w + 5) return false
      if (mD && !isNaN(d) && p.d > d + 5) return false
      if (mH && !isNaN(h) && p.h > h + 5) return false
      return true
    })
    .map(p => ({ ...p, _perfect: isPerfect(p, mW, mD, mH), _score: fitScore(p, mW, mD, mH) }))
    .sort((a, b) => {
      // 完美符合優先，同層內依尺寸差距排序
      if (a._perfect && !b._perfect) return -1
      if (!a._perfect && b._perfect) return 1
      return a._score - b._score
    })
    .slice(0, 8)

  // 前端類型篩選
  const prods = activeCategory === '全部'
    ? allMatched
    : allMatched.filter(p => p.category === activeCategory)

  const currentSpaceInfo = SPACE_TYPES.find(s => s.value === spaceType)
  const currentTip = SPACE_TIPS[spaceType]

  const handleSearch = () => {
    setSearched(true)
    setActiveCategory('全部')
    // 平滑捲動到結果區
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  // 切換空間時重設搜尋狀態
  useEffect(() => {
    setSearched(false)
    setActiveCategory('全部')
  }, [spaceType])

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>收納品推薦</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 20 }}>整理完再買，量好尺寸，一次買對</p>

      {/* 整理前買的提示 */}
      <div style={{ background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 4 }}>✦ 先整理再買收納品</div>
        <div style={{ fontSize: 12, color: ml, lineHeight: 1.7 }}>
          斷捨離後才知道真正剩幾件物品，量好空間尺寸再下單，避免買了放不下或買太多。
        </div>
      </div>

      {/* 空間選擇 */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>要收納哪個空間？</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {SPACE_TYPES.map(s => (
            <button key={s.value} onClick={() => setSpaceType(s.value)} style={{
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

        <button onClick={handleSearch}
          style={{ width: '100%', marginTop: 16, padding: '11px', borderRadius: 10, border: 'none', background: ink, color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          查詢適合的收納品
        </button>
      </div>

      {/* 推薦結果 */}
      {(searched || hasInput) && (
        <div ref={resultsRef} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>推薦商品</div>
            <div style={{ fontSize: 12, color: mf }}>找到 {allMatched.length} 件</div>
          </div>

          {/* 商品類型篩選標籤 */}
          {allMatched.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {CATEGORIES.filter(cat => cat === '全部' || allMatched.some(p => p.category === cat)).map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 20,
                  border: activeCategory === cat ? `1.5px solid ${sg}` : `1px solid ${bd}`,
                  background: activeCategory === cat ? '#EAF2EE' : 'white',
                  color: activeCategory === cat ? '#2E6B50' : ml,
                  cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {prods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, color: mf, marginBottom: 6 }}>
                {allMatched.length === 0 ? '找不到符合尺寸的商品' : `此類別沒有符合的商品`}
              </div>
              <div style={{ fontSize: 12, color: mf }}>
                {allMatched.length === 0
                  ? '試著放寬尺寸，或清空某個欄位'
                  : <button onClick={() => setActiveCategory('全部')} style={{ background: 'none', border: 'none', color: sg, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>查看全部類別</button>
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prods.map((p, i) => {
                const isTop = i === 0  // 排序第一名才給「最推薦」標籤
                const isBest = isTop && allMatched.length > 1

                return (
                  <div key={i} style={{
                    border: `1px solid ${isBest ? sg : bd}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    background: isBest ? '#FAFDF9' : 'white',
                    position: 'relative',
                  }}>
                    {/* 最推薦標籤（只給排序第一） */}
                    {isBest && (
                      <div style={{
                        position: 'absolute', top: -11, left: 14,
                        background: sg, color: 'white',
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 10px', borderRadius: 10,
                      }}>
                        ✦ 最推薦
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 2 }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: mf }}>{p.brand}</span>
                          {/* 商品類型標籤 */}
                          <span style={{ fontSize: 11, color: ml, background: cr, padding: '1px 7px', borderRadius: 6 }}>{p.category}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: sg }}>{p.price}</div>
                        {/* 符合程度標籤：只有最接近的那個才是「完美符合」，其餘顯示「適合使用」 */}
                        <div style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 8, marginTop: 3,
                          background: p._perfect ? '#EAF2EE' : '#F0E2C0',
                          color: p._perfect ? sg : '#C4953A',
                          fontWeight: 500, display: 'inline-block',
                        }}>
                          {p._perfect ? '✓ 完美符合' : '○ 適合使用'}
                        </div>
                      </div>
                    </div>

                    {/* 尺寸資訊 */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: ml }}>{p.w} × {p.d} × {p.h} cm</div>
                      {(mW || mD || mH) && (
                        <div style={{ fontSize: 11, color: mf }}>
                          （你的空間：{mW || '?'} × {mD || '?'} × {mH || '?'} cm）
                        </div>
                      )}
                    </div>

                    {/* 整理師短評 */}
                    <div style={{
                      fontSize: 12, color: '#2E6B50',
                      background: '#EAF2EE',
                      borderRadius: 7, padding: '6px 10px',
                      marginBottom: 10,
                      lineHeight: 1.6,
                    }}>
                      ✦ {p.comment}
                    </div>

                    {/* 前往官網按鈕（改為明顯按鈕樣式） */}
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'block', textAlign: 'center',
                        padding: '8px 0',
                        borderRadius: 8,
                        border: `1.5px solid ${sg}`,
                        background: 'white',
                        color: '#2E6B50',
                        fontSize: 13, fontWeight: 600,
                        textDecoration: 'none',
                      }}>
                      前往品牌官網查看 →
                    </a>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state（0 件） */}
          {allMatched.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, color: mf, marginBottom: 4 }}>找不到完全符合的商品</div>
              <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>試著放寬尺寸，或清空某個欄位再查詢</div>
            </div>
          )}
        </div>
      )}

      {/* 空狀態引導 */}
      {!searched && !hasInput && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📐</div>
          <div style={{ fontSize: 14, color: ink, marginBottom: 6 }}>量好尺寸，找到剛好的收納盒</div>
          <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>輸入空間的寬、深、高，自動篩選符合的商品</div>
        </div>
      )}

      {/* 常用工具 */}
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

      {/* 選購原則（可收合 Accordion） */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
        <button
          onClick={() => setTipsOpen(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', background: 'none', border: 'none', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em' }}>選購原則</span>
          <span style={{ fontSize: 16, color: mf, transition: 'transform 0.2s', display: 'inline-block', transform: tipsOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {tipsOpen && (
          <div style={{ padding: '0 24px 20px' }}>
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
        )}
      </div>
    </div>
  )
}
