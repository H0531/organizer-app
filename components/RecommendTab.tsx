'use client'
import { useState, useRef, useEffect } from 'react'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

// ── 商品資料庫（連結均為搜尋頁 / 分類頁，永久有效）────────────────────────
const DAISO_URL = 'https://shop.daiso.com.tw/collections/all'
const IKEA_BOXES = 'https://www.ikea.com.tw/zh/cat/boxes-and-baskets-49861/'
const IKEA_CLOTHES = 'https://www.ikea.com.tw/zh/cat/clothes-and-shoe-organisers-and-accessories-30314/'
const IKEA_WALL = 'https://www.ikea.com.tw/zh/cat/wall-organisers-24985/'
const MUJI_URL = 'https://shop.muji.tw/categories/storage'
const NITORI_URL = 'https://www.nitori-net.tw/search/?q=收納'

const PD = [
  // ── 層架 ──
  { name: 'DRÖNA 收納盒', brand: 'IKEA', w: 33, d: 38, h: 33, types: ['shelf'],
    url: IKEA_BOXES, category: '收納盒', comment: '剛好塞滿 KALLAX 格狀層架，大布盒遮蔽雜亂視覺效果極佳。' },
  { name: 'KUGGIS收納盒附蓋', brand: 'IKEA', w: 37, d: 54, h: 21, types: ['shelf', 'wardrobe', 'under'],
    url: IKEA_BOXES, category: '收納盒', comment: '附蓋防塵，適合不常取用的季節性物品。' },
  { name: 'PP收納盒大', brand: '無印良品', w: 37, d: 26, h: 17, types: ['shelf', 'drawer', 'wardrobe'],
    url: MUJI_URL, category: '收納盒', comment: '疊放穩定，無印系列尺寸統一，買多不怕對不齊。' },
  { name: 'SKÅDIS 收納壁板', brand: 'IKEA', w: 36, d: 1, h: 56, types: ['shelf'],
    url: IKEA_WALL, category: '整理架', comment: '書桌牆面零碎空間最好用，掛鉤、盒子自由搭。' },
  { name: '堆疊式前開收納箱', brand: 'DAISO', w: 38, d: 24, h: 44, types: ['shelf'],
    url: DAISO_URL, category: '收納盒', comment: '日本製斜口前掀蓋，不用搬開上層就能直接伸手拿取。' },

  // ── 衣櫃 ──
  { name: 'SKUBB衣物整理盒', brand: 'IKEA', w: 44, d: 55, h: 19, types: ['wardrobe', 'under'],
    url: IKEA_CLOTHES, category: '衣物收納', comment: '衣櫃層板專用，折疊收納時整齊不塌陷。' },
  { name: '衣物收納袋 4格', brand: 'NITORI', w: 55, d: 40, h: 24, types: ['wardrobe'],
    url: NITORI_URL, category: '衣物收納', comment: '透氣不織布防塵，有透明視窗不用打開就知道放什麼。' },
  { name: '半透明衣物收納袋', brand: 'DAISO', w: 30, d: 36, h: 25, types: ['wardrobe'],
    url: DAISO_URL, category: '衣物收納', comment: '軟質拉鍊設計，半透明一眼看清內容物，防塵又省空間。' },

  // ── 抽屜 ──
  { name: 'SKUBB 收納盒 6件組', brand: 'IKEA', w: 44, d: 34, h: 11, types: ['drawer'],
    url: IKEA_CLOTHES, category: '分格盒', comment: '一組含 3 種尺寸拉鍊軟格，內著、襪子、配件一次分類定位。' },
  { name: '抽屜分格盤 15格', brand: 'NITORI', w: 30, d: 20, h: 6, types: ['drawer'],
    url: NITORI_URL, category: '分格盤', comment: '深度淺、格子清楚，適合文具或化妝品分類。' },
  { name: '透明 PS 飾品收納盒', brand: 'DAISO', w: 30, d: 7, h: 2, types: ['drawer'],
    url: DAISO_URL, category: '分格盤', comment: '搭配絨面格放入抽屜，百元內就能拼出專櫃級手飾收納。' },

  // ── 床底／沙發下 ──
  { name: 'PÄRKLA 收納盒', brand: 'IKEA', w: 55, d: 49, h: 19, types: ['under'],
    url: IKEA_CLOTHES, category: '收納盒', comment: '床底收納超平價首選，有拉鍊防塵，拉取省力。' },
  { name: '雙開附輪床底收納箱', brand: 'NITORI', w: 66, d: 45, h: 17, types: ['under'],
    url: NITORI_URL, category: '收納盒', comment: '附輪好推拉，兩側都可開蓋，床底頻繁取物首選。' },
  { name: 'SAMLA透明收納箱', brand: 'IKEA', w: 57, d: 39, h: 28, types: ['under', 'shelf'],
    url: IKEA_BOXES, category: '收納盒', comment: '透明蓋讓你不用開箱就知道放什麼，床底首選。' },
  { name: '環保材質防塵收納箱', brand: 'DAISO', w: 36, d: 25, h: 24, types: ['under'],
    url: DAISO_URL, category: '收納盒', comment: '材質硬挺耐磨，自帶蓋防塵，挑高床架下堆疊放很穩。' },
]

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

function fitScore(p: typeof PD[0], mW: string, mD: string, mH: string): number {
  const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
  let score = 0
  if (mW && !isNaN(w)) score += Math.abs(w - p.w)
  if (mD && !isNaN(d)) score += Math.abs(d - p.d)
  if (mH && !isNaN(h)) score += Math.abs(h - p.h)
  return score
}

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
  const [activeCategory, setActiveCategory] = useState('全部')
  const [tipsOpen, setTipsOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const hasInput = mW || mD || mH

  // 所有符合空間類型的商品，有輸入尺寸時才過濾尺寸
  const allMatched = PD
    .filter(p => {
      if (!p.types.includes(spaceType)) return false
      if (hasInput) {
        const w = parseFloat(mW), d = parseFloat(mD), h = parseFloat(mH)
        if (mW && !isNaN(w) && p.w > w + 5) return false
        if (mD && !isNaN(d) && p.d > d + 5) return false
        if (mH && !isNaN(h) && p.h > h + 5) return false
      }
      return true
    })
    .map(p => ({ ...p, _perfect: isPerfect(p, mW, mD, mH), _score: fitScore(p, mW, mD, mH) }))
    .sort((a, b) => {
      if (a._perfect && !b._perfect) return -1
      if (!a._perfect && b._perfect) return 1
      return a._score - b._score
    })
    .slice(0, 8)

  const prods = activeCategory === '全部'
    ? allMatched
    : allMatched.filter(p => p.category === activeCategory)

  const currentSpaceInfo = SPACE_TYPES.find(s => s.value === spaceType)
  const currentTip = SPACE_TIPS[spaceType]

  // 切換空間時重設
  useEffect(() => {
    setActiveCategory('全部')
  }, [spaceType])

  const handleSearch = () => {
    setActiveCategory('全部')
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

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
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 12 }}>選擇收納空間</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {SPACE_TYPES.map(s => (
            <button key={s.value} onClick={() => setSpaceType(s.value)}
              style={{
                padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                border: spaceType === s.value ? `2px solid ${sg}` : `1.5px solid ${bd}`,
                background: spaceType === s.value ? '#EAF2EE' : 'white',
                textAlign: 'left', WebkitTapHighlightColor: 'transparent',
              }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{s.label}</div>
              <div style={{ fontSize: 11, color: mf, marginTop: 2 }}>{s.hint}</div>
            </button>
          ))}
        </div>

        {/* 尺寸輸入 */}
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 10 }}>
          輸入空間尺寸（cm，可留空）
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[['寬', mW, setMW], ['深', mD, setMD], ['高', mH, setMH]].map(([label, val, setter]) => (
            <div key={label as string}>
              <div style={{ fontSize: 11, color: mf, marginBottom: 4 }}>{label as string}</div>
              <input
                type="number"
                value={val as string}
                onChange={e => (setter as (v: string) => void)(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%', padding: '10px 8px', borderRadius: 8,
                  border: `1.5px solid ${bd}`, fontSize: 14, color: ink,
                  background: 'white', boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        <button onClick={handleSearch}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10,
            background: sg, color: 'white', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
            WebkitTapHighlightColor: 'transparent',
          }}>
          {hasInput ? '依尺寸篩選推薦商品' : '顯示全部推薦商品'}
        </button>
      </div>

      {/* 商品結果區：直接顯示，不需 searched gate */}
      <div ref={resultsRef}>
        {/* 類別篩選 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              style={{
                padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                border: `1.5px solid ${activeCategory === c ? sg : bd}`,
                background: activeCategory === c ? '#EAF2EE' : 'white',
                color: activeCategory === c ? '#2E6B50' : ml,
                fontSize: 12, fontWeight: activeCategory === c ? 600 : 400,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
              {c}
            </button>
          ))}
        </div>

        {/* 結果提示文字 */}
        <div style={{ fontSize: 12, color: mf, marginBottom: 10 }}>
          {hasInput
            ? `符合尺寸的商品 ${allMatched.length} 件`
            : `${currentSpaceInfo?.label} 推薦商品 ${allMatched.length} 件`}
        </div>

        {prods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 14, color: mf, marginBottom: 4 }}>找不到符合的商品</div>
            <div style={{ fontSize: 12, color: mf, lineHeight: 1.7 }}>
              {allMatched.length === 0
                ? '試著放寬尺寸，或清空某個欄位'
                : <button onClick={() => setActiveCategory('全部')} style={{ background: 'none', border: 'none', color: sg, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>查看全部類別</button>
              }
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prods.map((p, i) => {
              const isBest = i === 0 && allMatched.length > 1

              return (
                <div key={i} style={{
                  border: `1px solid ${isBest ? sg : bd}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  background: isBest ? '#FAFDF9' : 'white',
                  position: 'relative',
                }}>
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
                        <span style={{ fontSize: 11, color: ml, background: cr, padding: '1px 7px', borderRadius: 6 }}>{p.category}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {hasInput && (
                        <div style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 8, marginTop: 3,
                          background: p._perfect ? '#EAF2EE' : '#F0E2C0',
                          color: p._perfect ? sg : '#C4953A',
                          fontWeight: 500, display: 'inline-block',
                        }}>
                          {p._perfect ? '✓ 完美符合' : '○ 適合使用'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: ml }}>{p.w} × {p.d} × {p.h} cm</div>
                    {hasInput && (
                      <div style={{ fontSize: 11, color: mf }}>
                        （你的空間：{mW || '?'} × {mD || '?'} × {mH || '?'} cm）
                      </div>
                    )}
                  </div>

                  <div style={{
                    fontSize: 12, color: '#2E6B50',
                    background: '#EAF2EE',
                    borderRadius: 7, padding: '6px 10px',
                    marginBottom: 10,
                    lineHeight: 1.6,
                  }}>
                    ✦ {p.comment}
                  </div>

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
      </div>

      {/* 常用工具 */}
      {currentTip && (
        <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px', marginBottom: 14, marginTop: 16 }}>
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
