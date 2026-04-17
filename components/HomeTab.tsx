'use client'
import type { OAuthUser } from '@/lib/auth'

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358', mf = '#A39B8E', cr = '#EDE8DD', ww = '#FAF8F4'
type Tab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

export default function HomeTab({
  onNavigate,
  user,
  onLoginClick,
}: {
  onNavigate: (t: Tab) => void
  user: OAuthUser | null
  onLoginClick: () => void
}) {
  const NavLink = ({ target, children }: { target: Tab; children: string }) => (
    <span onClick={() => onNavigate(target)} style={{ color: sg, textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}>{children}</span>
  )

  return (
    <div>
      {/* Login banner - show only when not logged in */}
      {!user && (
        <div style={{
          background: '#EAF2EE', border: `1px solid ${sg}`, borderRadius: 12,
          padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#2E6B50', marginBottom: 2 }}>尚未登入</div>
            <div style={{ fontSize: 12, color: ml, lineHeight: 1.6 }}>未登入仍可使用全部功能，但資料存在本機，離開頁面後將消失。登入後資料可跨裝置保存。</div>
          </div>
          <button
            onClick={onLoginClick}
            style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 8, border: 'none', background: sg, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
            登入
          </button>
        </div>
      )}

      {user && (
        <div style={{
          background: ww, border: `1px solid ${bd}`, borderRadius: 12,
          padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {user.picture
            ? <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${sg}` }} />
            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: sg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', fontWeight: 700 }}>{user.name.charAt(0)}</div>
          }
          <div style={{ fontSize: 13, color: ink }}>嗨，<strong>{user.name}</strong>！今天要整理哪裡？</div>
        </div>
      )}

      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 13, color: mf, letterSpacing: '0.1em', marginBottom: 10 }}>H 的收整沙龍</p>
        <h1 style={{ fontFamily: "'Noto Serif TC', serif", fontSize: 24, fontWeight: 700, color: ink, lineHeight: 1.5, marginBottom: 14 }}>
          調整心情，安置物品，享受空間──
        </h1>
        <p style={{ fontSize: 14, color: ml, lineHeight: 1.8, marginBottom: 20 }}>
          我是 24 小時伴你左右的整理小幫手，<br />有我陪你，一起整理。
        </p>
      </div>

      {/* Features */}
      {[
        {
          icon: '🗂', tab: 'checklist' as Tab, title: '整理清單',
          desc: '選空間、設計時器、逐項打勾，完成後拍 Before / After 對比照、記打卡日記，並可排進行事曆。',
          steps: ['選擇今天要整理的空間', '（可選）拍整理前照片，支援裁切旋轉', '開始倒數計時，逐項打勾', '整理後拍照、寫日記，按儲存打卡', '預約下次整理會顯示在最上方'],
        },
        {
          icon: '♻️', tab: 'declutter' as Tab, title: '斷捨離決策',
          desc: '把物品逐一加入清單，標記「留」「送」「丟」後進入三條分流：留下指定分類、送出設定行事曆提醒、丟棄可寫告別紀念文。',
          steps: ['新增物品並標記留／送／丟', '全部完成後按「進入分流」', '留 → 指定收納分類', '送 → 選日期加入行事曆提醒', '丟 → 寫告別紀念文（可略）', '按儲存紀錄，在會員頁查看明細'],
        },
        {
          icon: '🎯', tab: 'challenge' as Tab, title: '每日丟一物挑戰',
          desc: '選擇 7、30、60 或 100 天挑戰，每天放手一件東西，記錄故事，系統生成告別紀念文可分享到社群。',
          steps: ['選擇挑戰天數', '每天記錄一件物品的故事', '系統生成 3 種告別紀念文', '達成里程碑可分享，進度自動保存'],
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
          ['重整頁面後資料還在嗎？', '有的。整理清單、斷捨離紀錄、每日丟一物進度都自動存在瀏覽器，重整頁面不會消失。但換裝置或清除瀏覽器資料就會遺失，建議登入會員以跨裝置保存。'],
          ['未登入可以用嗎？', '可以，全部功能都能正常使用。唯一差別是資料只存在本機，清除瀏覽器或換裝置後資料會消失。'],
          ['每日挑戰中斷了怎麼辦？', '進度存在瀏覽器，只要不清除資料就不會中斷。若已清除，重新選擇天數後可繼續累積。'],
          ['行事曆功能怎麼用？', '整理清單頁可預約下次整理時間，會下載 .ics 檔案，點開即可加入手機行事曆，系統會提前一天提醒。斷捨離送出的物品也可設定提醒日期。'],
          ['照片可以裁切或旋轉嗎？', '可以！在整理清單的拍照步驟，上傳後可以進行裁切和旋轉，調整到最佳角度再儲存。'],
          ['可以在手機上使用嗎？', '可以，支援手機瀏覽器，建議使用 Safari 或 Chrome，介面專為手機螢幕優化。'],
          ['會員頁面有什麼資料？', '登入後，整理日記、斷捨離紀錄（含每件物品明細）、每日丟一物挑戰進度，都會在「我的整理」頁面完整呈現。'],
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
