'use client'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
type Tab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

export default function HomeTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const NavLink = ({ target, children }: { target: Tab; children: string }) => (
    <span onClick={() => onNavigate(target)} style={{ color: sg, textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}>{children}</span>
  )

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: mf, letterSpacing: '0.1em', marginBottom: 10 }}> H 的收整沙龍</p>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 700, color: ink, lineHeight: 1.5, marginBottom: 14 }}>
          人 × 物 × 空間 的對話
        </h1>
        <p style={{ fontSize: 14, color: ml, lineHeight: 1.8, marginBottom: 20 }}>
          調整心情，安置物品，享受空間──
        </p>
        <p style={{ fontSize: 14, color: ml, lineHeight: 1.8 }}>
        我是 24 小時陪伴你一起做整理的整理小幫手。
        </p>
      </div>

      {/* Features */}
      {[
        {
          icon: '🗂', tab: 'checklist' as Tab, title: '整理清單',
          desc: '選空間、設計時器、逐項打勾，完成後拍 Before / After 對比照、記打卡日記，並可排進 Google 行事曆。',
          steps: ['選擇今天要整理的空間', '（可選）拍整理前照片', '開始倒數計時，逐項打勾', '整理後拍照、寫日記，儲存打卡'],
        },
        {
          icon: '♻️', tab: 'declutter' as Tab, title: '斷捨離決策',
          desc: '把物品逐一加入清單，標記「留」「送」「丟」後進入三條分流：留下指定分類、送出設定行事曆提醒、丟棄可寫告別紀念文。',
          steps: ['新增物品並標記留／送／丟', '全部完成後進入分流處理', '留 → 指定收納分類', '送 → 設定送出日＋行事曆提醒', '丟 → 寫告別紀念文（可略過）'],
        },
        {
          icon: '🎯', tab: 'challenge' as Tab, title: '每日丟一物挑戰',
          desc: '選擇 30、60 或 100 天挑戰，每天放手一件東西，記錄故事，系統生成告別紀念文可分享到社群。',
          steps: ['選擇挑戰天數', '每天記錄一件物品的故事', '系統生成 3 種告別紀念文', '達成里程碑可分享'],
        },
        {
          icon: '📦', tab: 'recommend' as Tab, title: '收納品推薦',
          desc: '整理完後不知道買什麼收納品？輸入空間尺寸，自動推薦尺寸合適的商品（資料庫持續更新中）。',
          steps: ['選擇空間類型', '輸入寬 × 深 × 高（公分）', '查看推薦商品，綠色「完美符合」優先'],
        },
      ].map((f, idx) => (
        <div key={idx} style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>
              <NavLink target={f.tab}>{f.title}</NavLink>
            </div>
          </div>
          <p style={{ fontSize: 13, color: ml, lineHeight: 1.8, marginBottom: 14 }}>{f.desc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {f.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderTop: i > 0 ? `1px solid ${cr}` : 'none' }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: sg, color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tips */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>整理建議</div>
        {[
          ['從最小的空間開始', '第一次建議從「包包」開始，20 分鐘內就能完成'],
          ['一次只整理一個空間', '整理完才算完成，別中途跑去整理別的地方'],
          ['先整理再買收納品', '斷捨離後才知道真正需要收納多少東西'],
          ['每日丟一物從小開始', '第一天可以從壞掉的東西或重複備品開始'],
          ['固定一個整理日', '每週固定一個空間，一個月輪完六個空間一次'],
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

      {/* FAQ */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, letterSpacing: '0.08em', marginBottom: 14 }}>常見問題</div>
        {[
          ['我的資料會被儲存嗎？', '打卡日記、每日挑戰紀錄暫存在瀏覽器本機。登入會員後資料將同步至帳號，不怕遺失。'],
          ['可以在手機上使用嗎？', '可以。支援手機瀏覽器，建議使用 Safari 或 Chrome。'],
          ['Google 行事曆功能為什麼沒有作用？', '行事曆連動需部署後完成 Google OAuth 授權設定，目前為開發中狀態。'],
          ['每日丟一物中斷了怎麼辦？', '登入會員後進度雲端保存，不受瀏覽器清除影響。'],
        ].map(([q, a], i, arr) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 4 }}>Q：{q}</div>
            <div style={{ fontSize: 12, color: ml, lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
