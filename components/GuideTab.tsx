'use client'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'

type Tab = 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'guide'

export default function GuideTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const TabLink = ({ target, children }: { target: Tab; children: string }) => (
    <span onClick={() => onNavigate(target)} style={{ color: sg, textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}>
      {children}
    </span>
  )

  return (
    <div>
      <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700, marginBottom: 6, color: ink }}>使用說明</h1>
      <p style={{ color: ml, fontSize: 14, marginBottom: 32 }}>整理，不是把東西收起來，是讓生活更輕盈。</p>

      {/* About */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>關於整理小幫手</div>
        <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, marginBottom: 12 }}>
          整理小幫手是一個免費的線上工具，專為忙碌、不知道從哪裡開始整理的人設計。把整理師的專業思維，轉化為四個簡單易用的功能，讓你一步一步動起來。
        </p>
        <p style={{ fontSize: 14, color: ml, lineHeight: 1.8 }}>
          不需要一次整理整間房子。今天只整理書桌，明天只整理包包，每天 15 分鐘，三個月後你的生活會是另一個樣子。
        </p>
      </div>

      {/* Checklist */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🗂</span>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>功能一：整理清單</div>
        </div>
        <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, marginBottom: 16 }}>
          選空間、開計時器、逐項打勾，完成後拍 BA 對比照、記日記，還可以加入 Google 行事曆排定下次整理時間。
        </p>
        {[
          <span key="1">點選 <TabLink target="checklist">整理清單</TabLink> 分頁，選擇今天要整理的空間</span>,
          '（可選）上傳整理前照片，按「開始整理」啟動計時',
          '依序打勾，全部完成後按「完成整理」',
          '上傳整理後照片，寫下今日心得，儲存為打卡日記',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: sg, color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: ink, lineHeight: 1.7 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Declutter */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>♻️</span>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>功能二：斷捨離決策</div>
        </div>
        <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, marginBottom: 12 }}>
          把物品一件一件加入清單，標記「留」「送」「丟」後進入分流處理：
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['留', '#EAF2EE', sg, '指定收納分類'],
            ['送', '#F0D5C8', '#C47B5A', '設定送出日＋行事曆提醒'],
            ['丟', cr, ml, '可選擇寫告別紀念文'],
          ].map(([label, bg2, col, desc]) => (
            <div key={label} style={{ padding: '10px', borderRadius: 8, background: bg2 as string }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: col as string, display: 'block', marginBottom: 4 }}>{label}</span>
              <span style={{ fontSize: 11, color: ml }}>{desc}</span>
            </div>
          ))}
        </div>
        {[
          <span key="1">點選 <TabLink target="declutter">斷捨離</TabLink> 分頁，逐一新增物品並標記決定</span>,
          '全部標記完後按「進入分流處理」',
          '依序完成留 / 送 / 丟 三個流程',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < 2 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: sg, color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: ink, lineHeight: 1.7 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Challenge */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>功能三：每日丟一物挑戰</div>
        </div>
        <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, marginBottom: 16 }}>
          選擇 30、60 或 100 天挑戰，每天放手一件東西，記錄它的來歷和你的感受，系統生成告別紀念文可分享到社群。
        </p>
        {[
          <span key="1">點選 <TabLink target="challenge">每日丟一物</TabLink>，選擇挑戰天數</span>,
          '每天點「記錄今天的物品」，填寫物品故事後打卡',
          '系統生成告別紀念文（3 種版本），可分享到 Threads',
          '中間不能斷，完成 30/60/100 天達成里程碑',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: sg, color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: ink, lineHeight: 1.7 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Recommend */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>📦</span>
          <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>功能四：收納品推薦</div>
        </div>
        <p style={{ fontSize: 14, color: ink, lineHeight: 1.8, marginBottom: 16 }}>
          整理完後不知道要買什麼收納品？輸入空間尺寸，自動推薦尺寸合適的商品（資料庫升級中，即時爬蟲串接開發中）。
        </p>
        {[
          <span key="1">點選 <TabLink target="recommend">收納推薦</TabLink>，選擇空間類型</span>,
          '輸入寬度、深度、高度（公分）',
          '查看推薦商品，綠色「完美符合」優先選',
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0', borderBottom: i < 2 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: sg, color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: ink, lineHeight: 1.7 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14 }}>整理建議</div>
        {[
          ['從最小的空間開始', '第一次建議從「包包」開始，20 分鐘內就能完成，有成就感才會想繼續'],
          ['一次只整理一個空間', '整理完才算完成，別中途跑去整理另一個地方'],
          ['先整理再買收納品', '用收納品推薦功能前，先完成斷捨離，才知道需要收納多少東西'],
          ['每日丟一物從小開始', '第一天可以從已經壞掉的東西、或重複備品開始，不要從有情感的物品'],
          ['固定一個整理日', '每週固定一個空間，一個月就能輪完六個空間一次'],
        ].map(([title, desc], i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <span style={{ color: sg, fontSize: 16, flexShrink: 0, marginTop: 2 }}>✦</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 13, color: ml, lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ background: ww, border: `1px solid ${bd}`, borderRadius: 12, padding: '24px 28px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: mf, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14 }}>常見問題</div>
        {[
          ['我的資料會被儲存嗎？', '目前版本的打卡進度和清單儲存在瀏覽器本機，關掉頁面後不會保留。建議每次整理時當作當天工作清單使用。'],
          ['可以在手機上使用嗎？', '可以。網站支援手機瀏覽器，建議使用 Safari 或 Chrome 開啟。'],
          ['Google 行事曆功能為什麼沒有作用？', '行事曆連動需要完成 Google OAuth 授權設定，目前為開發中狀態。部署到 Vercel 後，需在 Google Cloud Console 建立 OAuth 憑證才能啟用此功能。'],
          ['每日丟一物中斷了怎麼辦？', '目前版本資料儲存在瀏覽器，若清除快取資料會重置。正式版本將加入帳號系統保存進度。'],
        ].map(([q, a], i, arr) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${cr}` : 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 5 }}>Q：{q}</div>
            <div style={{ fontSize: 13, color: ml, lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
