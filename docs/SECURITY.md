# Security｜安全機制、歷史驗證紀錄、風險與待確認事項

## 1. 文件狀態

本文件依 2026-10-19 現行 Repo 唯讀核對報告、原交接稿的歷史紀錄與本地 Git 紀錄整理。這不是滲透測試或正式環境安全認證。未確認的外部設定會明確標示，不可把推論或歷史紀錄當成已驗證事實。

## 2. 證據與結果標記

### 證據來源
- **程式碼可見**：2026-10-19 唯讀報告在 repo 中看到的實作。
- **Git 紀錄可證實**：commit SHA、日期、標題（只有 metadata／stat，未逐行審查 diff）。
- **歷史紀錄提及**：過去對話摘要記載的結果或後台操作；未在現況重新驗證。
- **未確認**：沒有足夠證據。

### 結果標記
| 標記 | 意義 |
|---|---|
| `PASS` | 本次實際執行指定檢查並通過，並記錄範圍、環境、基準 commit 與可重現證據 |
| `FAIL` | 本次實際執行且未通過 |
| `HISTORICAL PASS` | 只有歷史紀錄曾回報通過；不可當作目前通過 |
| `NOT TESTED` | 本次沒有執行 |
| `BLOCKED` | 因權限、環境、資料或工具限制無法完成，須說明阻礙 |
| `NEEDS REVIEW` | 有跡象或未解問題，但證據不足以作出結論 |

任何涉及 production 的結論，應附上實際測試時間、測試環境、測試範圍及結果；不要在文件中記錄秘密值、個資或真實使用者識別資料。

## 3. Server service role 使用位置（程式碼可見）

- `app/api/photos/route.ts`：照片上傳與刪除。
- `app/api/photos/sign/route.ts`：產生照片簽名 URL。
- `app/api/feedback/route.ts`：意見回饋寫入，無需登入。

Service role 會繞過一般 RLS 保護，因此每個 route 都必須自行做足身份／輸入／授權檢查。不得把 service role key 放到 client bundle、回應或文件中。本文件不包含任何金鑰值。

## 4. 照片 API 的程式碼防護（程式碼可見）

- Bearer token 交給 Supabase Auth 驗證。
- 以 JWT 身分取得 email，並將 body email 僅作比對；不一致時拒絕。
- key 格式採白名單。
- 只接受 JPEG／PNG data URL。
- 限制 2 MB，檢查 base64 長度、實際 buffer 與 magic bytes。
- Storage path 以 JWT email 作為資料夾。
- 簽名 URL API 限制 path 數量，並要求傳入 path 與 server 依 JWT email 重建的 canonical path 完全一致。
- 簽名 URL TTL 為 900 秒，回應 `Cache-Control: no-store`。

這些是靜態程式碼盤點結果，不代表執行過動態攻擊測試。

## 5. 歷史資安驗證紀錄

> 本節只整理歷史紀錄中記載的結果，**全部屬於 `HISTORICAL PASS` 或歷史事件**，不代表目前 repo、Supabase 或 production 狀態。
>
> commit 欄位：SHA、日期與標題可由本地 Git 紀錄證實；但「這個 commit 對應這項歷史工作」是依日期與標題推定的關聯，**未經逐項驗證**（未逐行比對 diff）。後台設定變更不對應任何 commit。

| 日期 | 主題 | 歷史紀錄記載 | 標題相符的 Git commit（關聯為推定，未經逐項驗證） | 目前狀態 |
|---|---|---|---|---|
| 2026-10-02 | 照片上傳 API 安全修正（P0-3B） | 曾回報加入 JWT 驗證、由登入身分推導 Storage 路徑、檔案類型／大小／magic-byte 檢查，並做過 regression test | `cd7c970` fix: secure photo upload API | 需以現行 route、呼叫端與測試重新驗證 |
| 2026-10-02～03 | 照片讀取改用 signed URL（P1-B／P1-C） | 曾設計並分階段將已儲存照片的讀取改為 signed URL | `fb99d46`、`f44e851`、`0008b83`、`2b02576`、`a947ed3` | 需檢查所有照片讀取路徑 |
| 2026-10-02～03 | 分享照片讀取 production QA（P1-C4） | 曾記載 11 個情境，部分情境通過；另有部分測項需以原始紀錄確認 | 測試對象涉及 `2b02576`、`a947ed3` | 不可概括為整體通過 |
| 2026-10-02 | `photos` bucket 改為 Private（P1-D，**Supabase 後台操作**） | 曾記載將 bucket 從 public 改為 private；當時記載的物件數為 51，限制 2 MB 與 JPEG／PNG；storage policy 的當時狀態有記錄，但需重新確認；**已被讀取過的舊 public URL 是否仍被 CDN 快取，當時列為待驗證** | 無（後台設定，非 Git commit） | **未確認**；不得據此宣稱目前 bucket 為 Private 或快取已失效 |
| 2026-10-03 | 照片生命週期盤點（P2-1A／P2-1B） | 當時 51 個物件中，34 個可在 DB 找到引用，17 個屬「可能孤兒」而非已證實孤兒；曾進一步檢查瀏覽器端儲存 | 無 | 不可將歷史數量當成目前數量，也不可直接刪除 |
| 2026-10-03～04 | 分享預覽與照片生命週期（P2-1C） | 曾發現 Checklist 分享預覽直接讀 public Storage URL 的問題，之後有修正與驗證工作 | `eb6f741` fix: harden photo lifecycle cleanup：生命週期清理部分已由 diff 確認；**分享預覽的修正對應哪個 commit 無法確認** | 需確認所有分享預覽仍走安全讀取流程 |
| 2026-10-04 | Declutter 照片顯示（P2-2） | 曾將 4 個 `<img>` 改為 `PhotoImg`，並回報 `git diff --check`、TypeScript 與 lint 結果 | `ff0e6f2` fix: secure declutter photo reads | 不代表現行程式碼仍相同 |
| 2026-10-04 | Challenge 同步（P2-3-A） | 曾設計並實作 `updatedAt`、`pendingSync` 等同步狀態 | `5dcd339` fix: prevent challenge sync data loss | 需確認舊資料相容、競態與錯誤復原 |
| 2026-10-05 | Guest → 登入遷移（P2-3-B） | 歷史稽核曾發現部分遷移失敗後資料復活、雲端編輯被覆寫、跨帳號重複等風險，並有多輪修正 | `8aa499f` fix: harden guest migration safety | 需檢查完整流程與失敗／重試情境 |
| 2026-10-06 | feedback API 加固（P2-3-E） | 曾增加輸入長度限制、request body 限制、Supabase 錯誤處理與伺服器時間 | `bf0025d` fix: harden feedback submission | 需重新檢查 endpoint、前端與資料庫權限；rate limit 仍未處理 |
| 2026-10-08 | GA4 事件追蹤（P3-A2） | 曾處理重複 page_view、`login_state`、`feedback_submitted` | `1043e24` feat: improve GA4 event tracking | 需重新檢查程式碼、GA4 設定與 production 事件 |

## 6. 優先待確認：Storage 與 RLS

### Supabase Storage
- 歷史紀錄：2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private。這是歷史設定紀錄，不代表目前狀態。
- 目前狀態：Public／Private 設定**尚未重新驗證**。
- 程式碼仍可能將 public URL 寫入資料庫，而讀取端改為解析 path 並使用簽名 URL。如果 bucket 目前是 Public，持有物件 URL 的人可能不需要簽名就能讀取，因此不能僅憑程式碼有 signed URL 就宣稱照片受到私有 bucket 保護。
- 舊 public URL 的 CDN 快取：假設 bucket 確實已是 Private，過去被讀取過的 public URL 是否仍可從快取取得，歷史上列為待驗證，目前未確認。

### 資料表 RLS
三張主要資料表使用 `user_email` 關聯，client 查詢會加入 email filter。這不等同資料庫層隔離已成立。實際 RLS policy 與 JWT claim 的對照方式尚未確認。

### 資料庫約束
程式預期使用以下識別方式，但實際 schema／唯一約束未確認：
- checklist：`id` + `user_email`
- declutter：`user_email` + `saved_at`
- challenge：`user_email`

不得依程式碼假設直接認定資料庫已有對應的 unique constraint。

## 7. OAuth 與 redirect

### 現行與舊版流程
- 現行登入使用 Supabase Auth（Google OAuth + PKCE）。
- `app/api/auth/callback/route.ts` 仍存在；它會交換 Google token 並寫入非 httpOnly 的 `organizer_user` cookie，但現行 App 不再以此 cookie 作為身份來源。
- 是否仍有外部 OAuth redirect 設定指向舊 route 尚未確認。不得只因為 repo 內看似無呼叫者就直接刪除；應先確認外部設定與歷史用途。

### Codespaces redirect allowlist（歷史檢查事項）
- 歷史紀錄：在 Codespaces 測試 Google 登入時，曾將 Codespaces 的轉發網址加入 Supabase Auth 的 redirect allowlist。
- 歷史紀錄：同一時期曾除錯 `.env.local` 中 Supabase key 含非 ASCII 字元，導致 auth code exchange 失敗；這是歷史除錯紀錄，不應假設目前仍有此問題，也不得讀取金鑰值來驗證。
- 目前狀態：Supabase redirect allowlist 中是否仍保留開發用網址**未確認**。不再使用的開發網址應由使用者決定是否移除。

## 8. 身份與本機快取的隱私風險（程式碼可見）

- 登出後帳號專屬 LocalStorage key 與 IndexedDB 照片仍留在裝置。
- IndexedDB 照片 key 不分帳號；特定讀取路徑可能先查到本機快取。
- `checklist_custom_items` 與 `CL_PAGE_KEY` 沒有帳號後綴。
- 登出後是否清除本機快取仍是產品／隱私決策，不可未經授權自行更改。
- `saveLS` 失敗時可能先刪除舊資料，屬資料可靠性風險，需先盤點呼叫點再評估修正。

## 9. 其他已知風險（程式碼可見）

- `app/api/feedback/route.ts` 不需登入且沒有 rate limit，存在被灌入垃圾資料的風險。
- Declutter 儲存失敗沒有與 Checklist 對稱的 Storage 清理流程，可能留下 orphan。
- Guest 刪除紀錄不會刪 IndexedDB 照片。
- 部分上傳失敗路徑可能將 data URL 寫入資料庫，增加 DB 欄位大小。
- `compressPhoto` 缺少圖片解碼錯誤處理。
- MemberTab 刪除確認 modal 不等待實際刪除結果；Guest 刪除失敗可能沒有提示。

以上需依實際影響排序，並不是已發生的事故清單。

## 10. 秘密與識別資訊處理

- 不將 `.env`、`.env.local`、token、API key、service role key、帳號 email、Supabase 專案識別碼、GA Measurement ID、DNS 設定值或 Vercel 專案識別碼寫入文件。
- `.env.local`、`.env.loecho`、`.vercel/` 在 2026-10-19 被確認為 ignored 本機檔案；其內容未被讀取。
- 原始歷史對話索引含有識別資訊風險，不匯入 repo；需要時應在 repo 外保存並先做隱私篩選。
- 交接 ZIP 已於 2026-10-19 做過唯讀檢查（只讀取，未解壓到 repo）；ZIP 本身不應加入 Git。

## 11. 安全操作底線

- 先唯讀盤點，再提出計畫，得到明確授權後才進行任何有副作用的變更。
- 沒有備份、明確範圍與授權，不刪除 DB records 或 Storage objects。
- 不修改 `.env*` 或其他 secrets 檔案，不把秘密值加入 Git。

## 12. 待確認清單

1. `photos` bucket 目前的 Public／Private 狀態。
2. 舊 public URL 是否仍可經 CDN 快取讀取。
3. Storage policies 與三張資料表 RLS。
4. 三張資料表的實際主鍵／唯一約束及 feedback 權限。
5. Supabase Auth redirect allowlist 是否仍保留開發用（Codespaces）網址。
6. 舊 OAuth callback 是否仍登記在 Google Console。
7. Vercel Production 部署版本與環境變數設定（只確認存在與否，不讀值）。
8. GA4 Enhanced Measurement 與正式事件收取。
9. Storage 中目前是否有孤兒照片。
10. 歷史上的測試資料目前是否仍存在。
