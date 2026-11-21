// 隱私權政策正文：唯一來源。
// 首頁（HomeTab）、會員頁（MemberTab）的政策視窗與 /privacy 頁面共用此元件，修改政策請只改這裡。
const ink = '#2C2820', ml = '#6B6358'

export default function PrivacyPolicyContent() {
  return (
    <div style={{ fontSize: 13, color: ml, lineHeight: 1.9 }}>
      <p style={{ marginBottom: 12 }}>最後更新：2026 年 11 月</p>
      <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>收集的資料</strong><br />本服務在您登入時會取得 Google 帳號的名稱、Email 及大頭照，僅用於識別您的帳號並顯示於介面。</p>
      <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>資料儲存</strong><br />整理紀錄、照片、挑戰進度等資料儲存於 Supabase 雲端資料庫。未登入時，資料僅儲存於您的瀏覽器本機。</p>
      <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>照片</strong><br />上傳的照片儲存於 Supabase Storage。</p>
      <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>回饋表單</strong><br />透過「聯絡 / 錯誤回報」表單送出時，會儲存您填寫的留言內容，以及您選填的聯絡 Email。</p>
      <p style={{ marginBottom: 12 }}><strong style={{ color: ink }}>第三方服務</strong><br />本服務使用 Google OAuth 登入及 Supabase 資料庫，請參閱各服務的隱私權政策。<br />本網站使用 Google Analytics 4（GA4）分析網站使用情形與功能使用狀況。</p>
      <p style={{ marginBottom: 0 }}><strong style={{ color: ink }}>刪除資料</strong><br />如需刪除您的所有資料，請透過網站上的「聯絡 / 錯誤回報」表單提出申請。</p>
    </div>
  )
}
