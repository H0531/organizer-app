// 隱私權政策正文：唯一來源。
// 首頁（HomeTab）、會員頁（MemberTab）的政策視窗與 /privacy 頁面共用此元件，修改政策請只改這裡。
const ink = '#2C2820', ml = '#6B6358'

function Section({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 16 }}>
      <strong style={{ color: ink }}>{title}</strong>
      {children}
    </div>
  )
}

const p = { margin: '4px 0 0' }

export default function PrivacyPolicyContent() {
  return (
    <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
      <p style={{ margin: '0 0 16px' }}>最後更新：2026 年 11 月</p>

      <Section title="Google 登入">
        <p style={p}>若您使用 Google 登入，系統會透過 Supabase 的登入服務接收您 Google 帳號的名稱、電子郵件地址及大頭照：</p>
        <p style={p}>・電子郵件地址：用來識別您的帳號，並將您的整理資料連結到這個帳號。</p>
        <p style={p}>・名稱與大頭照：顯示在介面上。您可以在「我的整理」修改顯示名稱，修改後的名稱會保存在登入服務中。</p>
        <p style={p}>登入狀態會保存在您的瀏覽器中，讓您下次開啟時維持登入。</p>
      </Section>

      <Section title="資料保存位置">
        <p style={p}>・未登入時：整理日記、斷捨離紀錄、挑戰進度、草稿及照片只保存在您目前使用的瀏覽器本機，不會上傳到雲端資料庫。</p>
        <p style={p}>・登入後：整理日記、斷捨離紀錄與挑戰進度會保存在 Supabase 雲端資料庫。瀏覽器本機也會保存部分資料，例如尚未完成的草稿、排定的整理項目、挑戰進度的副本及照片的暫存資訊，方便您在同一台裝置上繼續使用。</p>
        <p style={p}>・自訂清單項目：無論是否登入，都只保存在瀏覽器本機，而且不會依登入帳號區分。使用同一個瀏覽器的其他人，可能會看到相同的自訂項目。</p>
        <p style={p}>・未登入時建立的紀錄，在您登入後，系統會嘗試同步到您的帳號。</p>
      </Section>

      <Section title="照片">
        <p style={p}>登入時，您上傳的照片會保存在 Supabase Storage；若上傳失敗，照片會暫存在瀏覽器本機。未登入時，照片只保存在瀏覽器本機。</p>
      </Section>

      <Section title="回饋表單">
        <p style={p}>送出「聯絡 / 錯誤回報」表單時，系統會將您填寫的留言內容、選填的聯絡用電子郵件地址及送出時間保存在 Supabase 資料庫。留言用於了解您回報的問題或建議；電子郵件地址用於回覆您，未填寫時不會保存。表單不會自動附上您的登入帳號。</p>
      </Section>

      <Section title="第三方服務">
        <p style={p}>・Google 登入：讓您使用 Google 帳號登入本服務。</p>
        <p style={p}>・Supabase：提供登入服務、雲端資料庫及照片儲存。</p>
        <p style={p}>・Google Analytics 4（GA4）：分析網站的瀏覽情形與功能使用狀況。網站會送出的事件包括開啟了哪些頁面、使用了哪些功能，以及部分事件附帶的資訊，例如目前是否登入、選取的整理空間種類。</p>
        <p style={p}>各服務如何處理資料，請參閱各服務的隱私權政策。</p>
      </Section>

      <Section title="刪除資料" last>
        <p style={p}>・網站目前沒有讓您自行刪除帳號，或一次刪除全部雲端資料的功能。</p>
        <p style={p}>・帳號下的雲端資料（包括登入帳號資料、整理紀錄及照片）：如需申請刪除，請透過網站上的「聯絡 / 錯誤回報」表單提出，並填寫您登入使用的 Google 帳號電子郵件地址，以便辨識帳號。</p>
        <p style={p}>・回饋紀錄：回饋紀錄不會自動連結到您的登入帳號。如需申請刪除某筆回饋，請在申請中提供足以辨識該筆紀錄的資訊，例如大約的送出時間、留言內容，或當時填寫的電子郵件地址。</p>
        <p style={p}>・處理方式：透過表單送出申請，本身不會自動刪除任何資料。網站負責人收到申請後，會先確認要處理的帳號或回饋紀錄範圍，再以人工方式處理。處理時間無法保證；若提供的資訊不足以辨識帳號或回饋紀錄，可能無法完成刪除。</p>
        <p style={p}>・瀏覽器本機資料：這些資料保存在您的瀏覽器中，無法由伺服器遠端刪除。您可以透過瀏覽器設定清除本網站的資料來移除。未登入時的資料只保存在本機，清除後將無法復原。</p>
      </Section>
    </div>
  )
}
