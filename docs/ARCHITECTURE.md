# Architecture｜現行架構與資料流程

## 1. 證據範圍

本文件依 2026-10-19 現行 Repo 唯讀核對報告整理，並補入原交接稿中的歷史背景。2026-10-19 匯入前，已在 HEAD `1043e24` 核對文件中的檔案路徑、函式名稱與流程描述。後續若程式碼變更，應重新核對相關描述。本文件沒有連線 Supabase、Vercel 或 GA4，不代表外部服務的現況已確認。

## 2. 技術與頁面結構

- Next.js 16.2.3、React 19.2.4、Supabase JS、Tailwind CSS 4。
- App 主要由 `app/page.tsx` 控制，以 tab 切換主要畫面（首頁、整理清單、斷捨離、每日丟一物、收納推薦、我的整理）。
- `app/layout.tsx` 負責 metadata、SEO 與 GA4 `next/script` 初始化。
- `app/page.tsx` 負責身份初始化、Guest → 登入資料遷移，以及多種紀錄的讀寫／刪除 handler。
- 部署：歷史紀錄為 GitHub → Vercel；目前部署設定與 Production 版本未確認。

## 3. 主要檔案責任

| 檔案 | 報告指出的責任 |
|---|---|
| `app/page.tsx` | 身份初始化、Guest 草稿認領與紀錄遷移、資料 CRUD handler、tab 切換與手動 `page_view` |
| `app/layout.tsx` | metadata、SEO、GA4 初始化 |
| `app/api/auth/callback/route.ts` | 舊版自建 Google OAuth callback；不是現行主要身份來源 |
| `app/api/photos/route.ts` | 照片上傳與刪除，使用 service role |
| `app/api/photos/sign/route.ts` | 照片簽名 URL，使用 service role |
| `app/api/feedback/route.ts` | 意見回饋寫入，使用 service role；不要求登入 |
| `lib/auth.ts` | 舊版 OAuth URL／cookie 工具；仍有部分符號被使用 |
| `lib/supabase.ts` | Browser Supabase client、Auth 包裝、資料 CRUD 與 migration 專用確認／INSERT |
| `lib/photos.ts` | 呼叫照片 API、從參照值取得 Storage key、舊版 public URL helper |
| `lib/photoRef.ts` | 照片參照值解析 |
| `lib/photoSigner.ts` | 簽名 URL resolver；記憶體快取並綁定帳號 |
| `lib/types.ts` | 型別、LocalStorage helper、IndexedDB 照片快取與分享卡繪製 |
| `components/PhotoImg.tsx` | 統一顯示已儲存照片的元件 |
| `components/HomeTab.tsx` | 首頁、功能導覽與意見回饋 |
| `components/ChecklistTab.tsx` | 整理清單、計時、照片與整理日記 |
| `components/ChallengeTab.tsx` | 每日挑戰、snapshot 與同步／遷移 |
| `components/DeclutterTab.tsx` | 斷捨離流程、草稿、照片與紀錄 |
| `components/MemberTab.tsx` | 會員紀錄、統計、刪除與意見回饋 |
| `components/RecommendTab.tsx`、`components/StatsCharts.tsx` | 本輪未深入審查 |

## 4. 身份與 Guest 判斷

### Guest
- 以 `user === null` 判斷。
- Guest key 不帶帳號後綴，例如 `checklist_logs`、`declutter_records`、`challenge_data`、`checklist_draft`、`declutter_draft/stage`、`checklist_scheduled`。
- 照片另存於 IndexedDB `organizer_photos`，key 格式為 `toss_photo_${id}`。
- `authReady` 未完成前不渲染分頁，避免身份未確認時先以 Guest 身分讀寫。
- 若 `getSession` 失敗，畫面停在無法確認登入狀態。

### 登入使用者
- 現行登入使用 Supabase Auth Google OAuth 與 PKCE。
- `signInWithGoogle()` 的 redirect 為網站 origin。
- 由 Supabase JS 處理 callback URL 與 PKCE session，再由 `getAuthUser()`／`toAppUser()` 轉成 App user。
- email 會 trim 並轉小寫；沒有 email 的 session 視為未登入。
- 登入者的 LocalStorage key 使用 `${key}__${email}`。

## 5. Guest → 登入資料流程

### 草稿認領
`app/page.tsx` 的 `claimGuestDrafts` 先將 Guest 草稿寫入帳號 key，再移除 Guest key。若帳號已有自己的草稿，視為 conflict，兩份都保留。

### Checklist／Declutter 紀錄遷移
`loadUserData` 呼叫 `migrateGuestData`：
1. 透過 migration 專用確認函式查詢雲端是否已有該筆。
2. 確認 session email 一致。
3. 雲端不存在才上傳照片並執行純 INSERT。
4. 雲端已有且內容相同，視為已同步，移除相符 Guest 紀錄。
5. 雲端已有但內容不同，視為 conflict，不覆蓋、不刪除。
6. 雲端狀態未知時停止整批遷移。
7. 移除 Guest 紀錄時，只移除最新 LocalStorage 陣列中完全相同的一筆。

### Challenge
Challenge 不走上述共用 migration。`ChallengeTab` 會比較本機 snapshot 與雲端資料；只有在雲端確認無資料且帳號 key 也沒有資料時，才搬移匿名 `challenge_data`。本機和雲端寫入成功後才刪除匿名 key。

## 6. 登出行為

- `handleLogout` 呼叫 `signOutAuth()`；失敗會提示並維持登入狀態。
- 成功後由 `SIGNED_OUT` 事件觸發身份更新並載入 Guest 資料。
- 登出不會清除帳號專屬 LocalStorage key 或 IndexedDB 照片。
- `photoSigner` 記憶體快取會因 owner 改變而清除。
- 是否應在登出時實體清除帳號快取尚未定案，不可自行改變。

## 7. Supabase 資料存取

報告指出 `checklist_logs`、`declutter_records`、`challenge_data` 使用 `user_email` 作為關聯欄位。Client 查詢會加 `.eq('user_email', email)`，但這只是應用層過濾；資料庫層隔離仍取決於 RLS。

以下設定未檢查：
- 三張資料表的 RLS policy。
- 各表主鍵／唯一約束。
- `feedback` 表的權限。
- Storage bucket 與 Storage RLS。

## 8. 照片流程

### 8.1 歷史背景：為什麼改用 signed URL（歷史紀錄）

- 早期照片以 Supabase Storage public URL 直接讀取，上傳 API 也回傳 public URL。
- 2026-10 初的資安工作（歷史稱為 P1 系列）設計目標：將照片讀取由 public URL 遷移到短效 signed URL。
- 歷史設計原則：
  - 已儲存照片的顯示改走統一元件與 resolver，避免 browser runtime 直接讀取 `/storage/v1/object/public/photos/` 路徑。
  - 不保留讀取 public URL 的 fallback。
  - 不改動資料庫 schema 與既有上傳流程，讓遷移可以分階段進行、必要時回退。
  - 不改動 canvas 分享圖的其他流程，除非另有明確任務。
- 本地 Git 紀錄中標題與此遷移相符的 commit：`fb99d46`（sign endpoint）、`f44e851`（PhotoImg／photoRef／photoSigner）、`0008b83`（Checklist）、`2b02576`（Member）、`a947ed3`（分享照片讀取）、`ff0e6f2`（Declutter）。**關聯為推定，未經逐項驗證**：只依 commit metadata 的日期與標題，未逐行審查 diff。
- Storage bucket 的 Public／Private 設定屬於 Supabase 後台設定，**不是由上述 commit 變更**。2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private；這是歷史設定紀錄，不代表目前狀態，目前設定尚未重新驗證。詳見 `docs/SECURITY.md`。

### 8.2 上傳
`app/api/photos/route.ts` 的 POST：
- 驗證 Bearer token，透過 `supabaseAdmin.auth.getUser` 取得 email。
- body email 只用於比對，不一致則拒絕。
- key 使用白名單格式。
- 只接受 JPEG／PNG data URL，限制 2 MB，檢查 magic bytes。
- Storage 路徑為 `${JWT email}/${key}.${ext}`，使用 upsert。
- 回傳 public URL；資料庫中的照片參照可能仍是 public URL 格式。

### 8.3 參照值解析與讀取
- `lib/photoRef.ts` 將參照值解析為 data、storage、empty、invalid。
- public URL 需符合設定的 Supabase origin 與預期 public object path，並拒絕異常路徑。
- `PhotoImg` 對 data URL 直接顯示；Storage 參照會先經簽名 URL resolver。
- `photoSigner` 使用記憶體 cache、帳號 owner 與 generation，防止帳號切換後使用舊結果。
- Sign API 的 TTL 為 900 秒，每次最多 20 個 path；server 會依 JWT email 重組 canonical path，並回傳 `Cache-Control: no-store`。
- 多數已儲存照片使用 `PhotoImg`；報告另指出三處 `<img>` 用於本機草稿／預約／捐贈照片。這些路徑需在未來修改時再次確認來源型態。

### 8.4 刪除與清理
- 登入者刪除紀錄時，先刪 DB；成功後更新畫面，再盡力清理 Storage。
- 清理只允許本人資料夾、符合 key 前綴、且沒有被其他紀錄引用的檔案。
- 狀態不確定時不應冒險刪除；清理失敗可能留下 orphan。
- Checklist 儲存失敗有唯讀確認 DB 後再清理的保護；Declutter 儲存失敗目前沒有相同清理流程。
- Guest 刪除紀錄不會刪 IndexedDB 照片。

## 9. GA4

- `app/layout.tsx` 使用 `next/script` 在 `afterInteractive` 載入 gtag。
- GA ID 透過環境變數設定，沒有硬編碼在程式碼中；本文件不記錄實際 ID。
- tab 切換由 `app/page.tsx` 的 `handleTabChange` 手動送 `page_view`。
- 自訂事件包括 checklist、照片、declutter、challenge 與 feedback 相關事件。
- 歷史決策是將 GA4「依瀏覽器記錄變更網頁」設定維持 OFF；目前後台設定未重新確認。
- 首次載入的預設 page_view、點擊目前 tab 的事件、照片事件觸發時機與 `page_path` 參數都應另行驗證。
- 未查 GA4 後台，也未重新驗證 production 是否收到事件。

## 10. 現況風險與注意事項

以下是靜態盤點指出的潛在問題，並非都已被證明在 production 發生：
- `saveLS` 在寫入失敗時可能先移除舊資料。
- IndexedDB 照片 key 不分帳號，存在低機率的跨身份快取風險。
- `handleUpdateDeclutterRecord` 缺少帳號切換檢查。
- Declutter 儲存採先 select 再 insert，資料庫唯一約束未確認。
- `savedAt` 使用本地化時間字串作為識別值。
- `compressPhoto` 缺少 `onerror`。
- Checklist 計時器的 `timeLeft` 與 `Date.now()` 計算可能不一致。
- 部分照片儲存失敗時會將 data URL 寫入 DB。
- 刪除 modal 沒有等待實際刪除結果。
- feedback API 沒有 rate limit。
- 舊 OAuth callback route 仍存在。
- Storage bucket 的 Public／Private 狀態與 RLS 未確認。

## 11. 開始修改前的必查項目

1. 檢查當前 `package.json`、路由、元件與 Supabase client 實作。
2. 依 `AGENTS.md` 先讀 `node_modules/next/dist/docs/` 中與任務相關的 Next.js 文件。
3. 先畫出實際資料流與讀寫位置，再提出最小變更方案。
4. 明確區分 Guest LocalStorage、已登入雲端資料、照片 Storage object 與 DB reference 的生命週期。
5. 不因本文件直接假定路徑或檔名仍存在。

## 12. 不可從本文件推定的事項

本文件不能證明：
- GitHub 遠端最新 commit 與文件撰寫時的本地 HEAD 相同。
- Vercel Production 正在執行特定 commit。
- Storage bucket 的目前設定。2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private；這是歷史設定紀錄，不代表目前狀態，目前 bucket 的 Public／Private 設定尚未重新驗證（詳見 `docs/SECURITY.md`）。
- RLS policy 正確且已生效。
- 資料庫主鍵／唯一約束符合程式預期。
- GA4 後台設定與事件收取目前正常。
- 歷史上的測試資料已清除。
