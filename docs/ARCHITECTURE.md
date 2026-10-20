# Architecture｜現行架構與資料流程

## 1. 證據範圍

本文件依 2026-10-19 現行 Repo 唯讀核對報告整理，並補入原交接稿中的歷史背景。2026-10-19 匯入前，已在當時的 HEAD `1043e24` 核對文件中的檔案路徑、函式名稱與流程描述。同日補充 §4 的 LINE 導向與 §9 的 GA4 事件清單時，在當時的 HEAD `a077d57` 以唯讀方式再次核對；該版本相對 `1043e24` 只多了文件 commit，網站程式碼相同。以上 HEAD 都只代表核對當時，後續若程式碼變更，應重新核對相關描述。本文件沒有連線 Supabase、Vercel 或 GA4，不代表外部服務的現況已確認。

## 2. 技術與頁面結構

- Next.js 16.2.3、React 19.2.4、Supabase JS、Tailwind CSS 4。
- App 主要由 `app/page.tsx` 控制，以 tab 切換主要畫面。分頁 ID 定義於 `app/page.tsx` 的 `AppTab` 型別與 `TABS` 陣列：

  | 分頁 ID | 中文名稱 |
  |---|---|
  | `home` | 首頁 |
  | `checklist` | 整理清單 |
  | `declutter` | 斷捨離 |
  | `challenge` | 每日丟一物 |
  | `recommend` | 收納推薦 |
  | `member` | 我的整理 |

- `app/layout.tsx` 負責 metadata、SEO 與 GA4 `next/script` 初始化。
- `app/page.tsx` 負責身份初始化、Guest → 登入資料遷移，以及多種紀錄的讀寫／刪除 handler。
- 部署：歷史紀錄為 GitHub → Vercel。依使用者說明，推送 `main` 後由 Vercel 自動部署到正式環境；Vercel 設定尚未實際確認，Production 目前執行的版本也未確認。推送前的規則見 `CLAUDE.md` §3。

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
- LINE 內建瀏覽器：
  - 程式碼可證實：`app/page.tsx` 初始化的 `useEffect` 中，若 user agent 符合 LINE（`/Line\//`），會在目前網址加上 `openExternalBrowser=1`，以 `location.replace` 重新導向，隨後 `return`（該次執行不進行後續的身份初始化）。
  - 未驗證：LINE App 如何處理此參數、是否因此開啟外部瀏覽器、Google 登入是否因此成功。依使用者說明，Google 登入在 App 內建瀏覽器中可能無法完成（未驗證）。
  - 未確認：以關鍵字搜尋未找到明確的畫面提示文字，但這不代表已完整搜尋所有可能文案；LINE 以外的 App 內建瀏覽器處理方式也未確認。
  - 待評估：程式碼目前沒有明確檢查網址是否已包含 `openExternalBrowser=1`；若參數未被 LINE 處理，是否會重複導向需要另行評估，不可直接斷定一定會發生。
  - 修改登入或初始化流程時，先保留目前行為；若要調整或移除，必須先評估其影響。

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

設定狀態：
- Dashboard 人工確認（使用者於 2026-10-20 回報，見 `docs/SECURITY.md` §6.1）：三張資料表已啟用 RLS 並設有政策；`feedback` 表已啟用 RLS、沒有政策；`photos` bucket 為 Private、沒有 Storage policies。這是設定確認，跨帳號安全測試尚無實測證據（見 `docs/SECURITY.md` §6.3）。
- 仍未確認：各表主鍵／唯一約束。

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
- Storage bucket 的 Public／Private 設定屬於 Supabase 後台設定，**不是由上述 commit 變更**。2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private；這是歷史設定紀錄，不代表目前狀態。2026-10-20 使用者在 Dashboard 人工確認目前為 Private。詳見 `docs/SECURITY.md`。

### 8.2 上傳
`app/api/photos/route.ts` 的 POST：
- 驗證 Bearer token，透過 `supabaseAdmin.auth.getUser` 取得 email。
- body email 只用於比對，不一致則拒絕。
- key 使用白名單格式（見下方「照片 key 格式」）。
- 只接受 JPEG／PNG data URL，限制 2 MB，檢查 magic bytes。
- Storage 路徑為 `${JWT email}/${key}.${ext}`，使用 upsert。

#### 照片 key 格式（程式碼可見）

**Storage object key**（上傳、刪除、簽名 API 共用）
- 驗證規則：`app/api/photos/route.ts` 與 `app/api/photos/sign/route.ts` 的 `KEY_PATTERN` 相同，為 `^(checklist_\d{1,20}_(before|after)_[0-4]|toss_photo_\d{1,20})$`。
  - Checklist：`checklist_<logId>_before_<n>` 或 `checklist_<logId>_after_<n>`；`<logId>` 為 1–20 位數字，`<n>` 為 0–4（與整理清單每組最多 5 張照片的上限一致）。
  - Declutter：`toss_photo_<id>`；`<id>` 為 1–20 位數字。
- 產生位置：`components/ChecklistTab.tsx` 的 `saveLog`（`logId` 需通過 `isValidLogId` 的 1–20 位數字檢查）、`components/DeclutterTab.tsx` 的 `persistRecord`，以及 `app/page.tsx` 的 Guest → 登入遷移。
- 遷移時 Guest 紀錄的 id 只檢查為非空字串；若不符合上述數字格式，上傳 API 會拒絕，該筆遷移視為失敗，不會略過驗證。
- Storage 中的完整路徑為 `<JWT email>/<key>.<jpg|png>`；副檔名由上傳內容的 MIME 類型決定。簽名 API 另以 `PATH_PATTERN` 限制只接受「資料夾／檔名.jpg|png」兩層路徑。

**IndexedDB key**（本機快取，與 Storage 無關）
- 資料庫 `organizer_photos`、store `photos`（`lib/types.ts`）。
- 目前程式只以 `toss_photo_<id>` 為 key 存取：Guest 儲存斷捨離紀錄時寫入告別文照片（`app/page.tsx` 的 `handleDeclutterSave`），會員頁讀取舊紀錄、Guest → 登入遷移時讀取。
- Checklist 照片不寫入 IndexedDB；Guest 的 Checklist 照片以 data URL 保存在 LocalStorage 的紀錄中。
- IndexedDB key 與 Storage object key 的字串部分相同（都是 `toss_photo_<id>`），但 IndexedDB key 不含帳號資料夾與副檔名，兩者是不同的儲存位置。
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
- 歷史決策是將 GA4「依瀏覽器記錄變更網頁」設定維持 OFF；目前後台設定未重新確認。

### 事件清單（程式碼可見）

以下依程式碼中的 `window.gtag('event', …)` 呼叫整理。這只代表程式會送出這些事件，**不代表正式環境已確認收到**。

| 事件 | 位置 | 觸發時機 | 主要參數 |
|---|---|---|---|
| `page_view` | `app/page.tsx` `handleTabChange` | 每次切換 tab（含點擊目前所在的 tab） | `page_path`、`page_title` |
| `checklist_started` | `components/ChecklistTab.tsx` `startTimer` | 開始整理計時（不代表紀錄已保存） | `space`、`target_mins`、`login_state` |
| `checklist_saved` | `components/ChecklistTab.tsx` `saveLog` | 儲存回呼 `onSaveLog` 回傳成功後（語意限制見下方） | `space`、照片有無、`duration_mins`、`target_mins`、`login_state` |
| `before_photo_uploaded` | `components/ChecklistTab.tsx` `addPhotos` | 選擇「整理前」照片時（在讀檔之前送出） | `space` |
| `after_photo_uploaded` | `components/ChecklistTab.tsx` `addPhotos` | 選擇「整理後」照片時（在讀檔之前送出） | `space` |
| `declutter_flow_entered` | `components/DeclutterTab.tsx` | 進入分流（review）階段 | 物品數量統計 |
| `declutter_saved` | `components/DeclutterTab.tsx` `persistRecord` | 儲存回呼 `onSaveToMember` 回傳成功後（語意限制見下方） | 物品數量統計、`login_state` |
| `challenge_started` | `components/ChallengeTab.tsx` | 按下確認開始挑戰的按鈕時，在呼叫 `persistData` 後送出 | `days` |
| `challenge_entry_submitted` | `components/ChallengeTab.tsx` `submitEntry` | 送出每日打卡（品項欄位非空白）時，在呼叫 `persistData` 後送出 | `day`、`challenge_days`、`login_state` |
| `feedback_submitted` | `components/HomeTab.tsx`、`components/MemberTab.tsx` | 意見回饋 API 回應成功後 | `source`（`home`／`member`） |

- `before_photo_uploaded`／`after_photo_uploaded`：
  - 名稱是「uploaded」，但實際是在檔案選擇框的 change 事件呼叫 `addPhotos` 時送出，送出時間在讀取檔案之前。
  - 正常介面在照片數量達上限（5 張）時，不再顯示檔案選擇框。
  - 若一次選擇的照片數量超過剩餘名額，事件仍在 `addPhotos` 中送出一次，但實際加入的照片只取剩餘名額內的數量。
  - 取消選檔是否會觸發此事件，取決於瀏覽器行為，**尚未確認**。
  - 事件送出不代表照片已完成讀取或已上傳到 Storage（照片要到儲存整理日記時才上傳），也不代表 GA4 正式環境已收到。
- `challenge_started`／`challenge_entry_submitted`：程式碼在呼叫 `persistData` 後送出事件，但 `persistData` 沒有回傳明確的儲存成功／失敗狀態，因此事件本身不代表資料已成功儲存。
- `checklist_started`：在 `startTimer` 中送出，代表開始整理計時流程；不代表整理已完成，也不代表整理紀錄已保存。
- `checklist_saved`：代表前端儲存函式（`app/page.tsx` 的 `handleChecklistSave`）回傳成功，**不等於所有資料都已成功寫入 Supabase**。依程式碼，回傳成功的情況包括：
  - Guest：紀錄寫入本機 LocalStorage 成功；照片以 data URL 保存在本機，不寫雲端。
  - 登入：Supabase 寫入回報成功。
  - 登入：Supabase 寫入回報失敗，但隨後的唯讀確認發現該筆紀錄已存在，且本次上傳的照片都已被該紀錄引用，程式視為成功（實際伺服器狀態是在用戶端回應不確定的情況下推定）。
  - 登入：以原始帳號 email 送出的 Supabase 寫入回報成功，但檢查時帳號已切換。程式仍回傳成功，`page.tsx` 不更新共用 state。此時事件代表「原始儲存流程回報成功」，不代表目前登入帳號的資料已保存；`login_state` 仍反映原始帳號。若帳號在寫入請求送出前即已切換，寫入結果取決於尚未驗證的 RLS。`ChecklistTab` 若仍掛載，仍會以原始資料更新本元件的清單。
  - 登入時若照片上傳失敗，`saveLog` 會改用壓縮後的 data URL 作為照片參照，紀錄仍可能儲存成功；因此事件參數中的照片有無，不代表照片已上傳到 Storage。
  - 雲端最終狀態未由此事件確認。
- `declutter_saved`：代表前端儲存函式（`app/page.tsx` 的 `handleDeclutterSave`）回傳成功，**不等於所有照片與資料都已成功寫入雲端**。依程式碼，回傳成功的情況包括：
  - Guest：紀錄寫入本機 LocalStorage 成功。若本機空間不足，會改存不含 data URL 照片的版本，照片只另外寫入 IndexedDB 快取（寫入失敗時不會回報）。
  - 登入：Supabase 寫入回報成功；若儲存期間帳號已切換，仍回傳成功，只是不更新目前畫面。
  - 登入時若照片上傳失敗，`persistRecord` 會保留壓縮後的 data URL 作為照片參照。
  - 雲端最終狀態未由此事件確認。
- 表中「回傳成功後」只代表程式在儲存函式回傳成功後才送出事件；只有實際檢查到的觸發條件才寫成事實。
- 新增追蹤點沿用 snake_case 命名；不要在事件參數中送出使用者輸入的文字或 email。

### 待驗證
- 首次載入時 gtag `config` 是否送出預設 `page_view`，以及與手動 `page_view` 是否重複。
- 點擊目前所在 tab 會重送 `page_view`。
- `page_path` 參數在 GA4 報表中的呈現方式。
- 取消選擇照片時，各瀏覽器是否會觸發照片事件。
- 程式碼呼叫事件不等於正式環境已收到；未查 GA4 後台，也未重新驗證 production 是否收到事件。

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
- Storage bucket 與 RLS 設定已由 Dashboard 人工確認（2026-10-20）；跨帳號資料隔離與照片 API 尚無實測證據（見 `docs/SECURITY.md` §6.3）。
- LINE 導向沒有明確檢查網址是否已帶參數；是否會重複導向待評估（見 §4）。

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
- Storage bucket 的目前設定。2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private；這是歷史設定紀錄，不代表目前狀態；目前狀態以 `docs/SECURITY.md` §6.1 的 Dashboard 人工確認為準。
- RLS policy 正確且已生效。
- 資料庫主鍵／唯一約束符合程式預期。
- GA4 後台設定與事件收取目前正常。
- 歷史上的測試資料已清除。
