# Security｜安全機制、歷史驗證紀錄、風險與待確認事項

## 1. 文件狀態

本文件依 2026-10-19 現行 Repo 唯讀核對報告、原交接稿的歷史紀錄與本地 Git 紀錄整理。這不是滲透測試或正式環境安全認證。未確認的外部設定會明確標示，不可把推論或歷史紀錄當成已驗證事實。

2026-10-20 補充：加入使用者在 Supabase Dashboard 人工確認的設定（§6），以及當日在 HEAD `8d2d436` 的唯讀核對結果（測試證據搜尋、照片 API 與資料存取程式碼核對、正式網站公開頁面檢查）。紀錄見 `docs/WORKLOG.md` §6。

2026-10-21 補充：照片 API 錯誤日誌修正（PR #1，merge commit `508fa92`）已合併並由 GitHub 確認 Production 部署成功；新增照片 API 的 mock 測試（§4、§6.3）。紀錄見 `docs/WORKLOG.md` §7。

## 2. 證據與結果標記

### 證據來源
- **程式碼可見**：2026-10-19 唯讀報告在 repo 中看到的實作。
- **Git 紀錄可證實**：commit SHA、日期、標題（只有 metadata／stat，未逐行審查 diff）。
- **歷史紀錄提及**：過去對話摘要記載的結果或後台操作；未在現況重新驗證。
- **Dashboard 人工確認**：使用者在 Supabase Dashboard 畫面上觀察並回報的設定。只證明「設定目前如此」，**不等於實際安全測試已通過**。
- **實測證據**：實際執行過、且有可核實紀錄（步驟、帳號情境、結果、日期或 commit）的測試。
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

- 程式碼可見（2026-10-20，HEAD `8d2d436`）：上述三個 route 使用的 service role 環境變數不是 `NEXT_PUBLIC_` 開頭；前端程式沒有直接存取 Storage 或 `feedback` 表。
- 2026-10-20 正式網站唯讀檢查：首頁初始載入的 10 個 JS 檔中，沒有找到 JWT 格式金鑰、`sb_secret_` 金鑰或 `service_role` 字串，只有 1 個 publishable（公開）金鑰。範圍限制：只涵蓋首頁初始載入的 JS，未涵蓋之後才載入的 chunk。

## 4. 照片 API 的程式碼防護（程式碼可見）

- Bearer token 交給 Supabase Auth 驗證。
- 以 JWT 身分取得 email，並將 body email 僅作比對；不一致時拒絕。
- key 格式採白名單。
- 只接受 JPEG／PNG data URL。
- 限制 2 MB，檢查 base64 長度、實際 buffer 與 magic bytes。
- Storage path 以 JWT email 作為資料夾。
- 簽名 URL API 限制 path 數量，並要求傳入 path 與 server 依 JWT email 重建的 canonical path 完全一致。
- 簽名 URL TTL 為 900 秒，回應 `Cache-Control: no-store`。

這些是靜態程式碼盤點結果，不代表執行過動態攻擊測試。2026-10-20 在 HEAD `8d2d436` 重新核對，程式碼與上述描述一致（`app/api/photos/route.ts`、`app/api/photos/sign/route.ts` 的最後一次修改分別為 `cd7c970`、`fb99d46`）。

錯誤日誌（2026-10-21，PR #1；`fe029e4`、`6b912a0`，merge commit `508fa92`）：
- 修正前，上傳／刪除 API 會把 Storage 錯誤物件原樣寫入伺服器 log；mock 測試以假的 email、路徑、token、內部訊息證實這些內容會出現在 log（S3-A7 FAIL）。簽名 API 的 log 則未檢查錯誤的 name／status 格式。
- 修正後，兩個 route 的錯誤 log 只輸出 `errorSummary()` 的 `{ name, status }`（簽名失敗另含 `count`）：`name` 只接受英文字母開頭、英數與底線、最長 64 字元，否則記為 `unknown`；`status` 只接受 100–599 的整數或 3 位數字字串，否則不輸出。不輸出錯誤物件、訊息、email、token 或路徑。
- HTTP 狀態碼、回應內容、授權與 Storage 流程沒有改變。
- `errorSummary()` 在兩個 route 檔各有一份相同規則的副本（route 檔不匯出共用函式），修改時需同步。
- 正式環境 log 的實際錯誤格式尚未觀察（見 §6.4）。

## 5. 歷史資安驗證紀錄

> 本節只整理歷史紀錄中記載的結果，**全部屬於 `HISTORICAL PASS` 或歷史事件**，不代表目前 repo、Supabase 或 production 狀態。
>
> commit 欄位：SHA、日期與標題可由本地 Git 紀錄證實；但「這個 commit 對應這項歷史工作」是依日期與標題推定的關聯，**未經逐項驗證**（未逐行比對 diff）。後台設定變更不對應任何 commit。

| 日期 | 主題 | 歷史紀錄記載 | 標題相符的 Git commit（關聯為推定，未經逐項驗證） | 目前狀態 |
|---|---|---|---|---|
| 2026-10-02 | 照片上傳 API 安全修正（P0-3B） | 曾回報加入 JWT 驗證、由登入身分推導 Storage 路徑、檔案類型／大小／magic-byte 檢查，並做過 regression test | `cd7c970` fix: secure photo upload API | 程式碼防護已於 2026-10-20 靜態核對（見 §4）。regression test 只有歷史紀錄提及：原始測試紀錄不在 repo，2026-10-20 當時 repo 也沒有相關測試檔（2026-10-21 起新增的 `tests/s2`、`tests/s3` 是另外建立的 mock 測試，不是 P0-3B 的原始測試），**測試內容與範圍無法核實**，不可視為跨帳號或動態 API 測試已通過 |
| 2026-10-02～03 | 照片讀取改用 signed URL（P1-B／P1-C） | 曾設計並分階段將已儲存照片的讀取改為 signed URL | `fb99d46`、`f44e851`、`0008b83`、`2b02576`、`a947ed3` | 需檢查所有照片讀取路徑 |
| 2026-10-02～03 | 分享照片讀取 production QA（P1-C4） | 曾記載 11 個情境，部分情境通過；另有部分測項需以原始紀錄確認 | 測試對象涉及 `2b02576`、`a947ed3` | 不可概括為整體通過 |
| 2026-10-02 | `photos` bucket 改為 Private（P1-D，**Supabase 後台操作**） | 曾記載將 bucket 從 public 改為 private；當時記載的物件數為 51，限制 2 MB 與 JPEG／PNG；storage policy 的當時狀態有記錄，但需重新確認；**已被讀取過的舊 public URL 是否仍被 CDN 快取，當時列為待驗證** | 無（後台設定，非 Git commit） | 2026-10-20 使用者在 Dashboard 人工確認目前為 Private（見 §6）；舊 public URL 的 CDN 快取**仍未確認** |
| 2026-10-03 | 照片生命週期盤點（P2-1A／P2-1B） | 當時 51 個物件中，34 個可在 DB 找到引用，17 個屬「可能孤兒」而非已證實孤兒；曾進一步檢查瀏覽器端儲存 | 無 | 不可將歷史數量當成目前數量，也不可直接刪除 |
| 2026-10-03～04 | 分享預覽與照片生命週期（P2-1C） | 曾發現 Checklist 分享預覽直接讀 public Storage URL 的問題，之後有修正與驗證工作 | `eb6f741` fix: harden photo lifecycle cleanup：生命週期清理部分已由 diff 確認；**分享預覽的修正對應哪個 commit 無法確認** | 需確認所有分享預覽仍走安全讀取流程 |
| 2026-10-04 | Declutter 照片顯示（P2-2） | 曾將 4 個 `<img>` 改為 `PhotoImg`，並回報 `git diff --check`、TypeScript 與 lint 結果 | `ff0e6f2` fix: secure declutter photo reads | 不代表現行程式碼仍相同 |
| 2026-10-04 | Challenge 同步（P2-3-A） | 曾設計並實作 `updatedAt`、`pendingSync` 等同步狀態 | `5dcd339` fix: prevent challenge sync data loss | 需確認舊資料相容、競態與錯誤復原 |
| 2026-10-05 | Guest → 登入遷移（P2-3-B） | 歷史稽核曾發現部分遷移失敗後資料復活、雲端編輯被覆寫、跨帳號重複等風險，並有多輪修正 | `8aa499f` fix: harden guest migration safety | 需檢查完整流程與失敗／重試情境 |
| 2026-10-06 | feedback API 加固（P2-3-E） | 曾增加輸入長度限制、request body 限制、Supabase 錯誤處理與伺服器時間 | `bf0025d` fix: harden feedback submission | 2026-10-20：程式碼自 `bf0025d` 後未變更；`feedback` 表 RLS 已由 Dashboard 人工確認（見 §6）；rate limit 仍未處理 |
| 2026-10-08 | GA4 事件追蹤（P3-A2） | 曾處理重複 page_view、`login_state`、`feedback_submitted` | `1043e24` feat: improve GA4 event tracking | 需重新檢查程式碼、GA4 設定與 production 事件 |

## 6. Storage、RLS 與 Auth：現況與待確認

### 6.1 Dashboard 人工確認（使用者於 2026-10-20 回報）
> 以下只代表 Supabase Dashboard 畫面上的設定，**不代表實際安全測試已通過**。檢查由使用者執行，本 repo 沒有截圖或匯出檔。

- `photos` bucket：Private。
- Storage policies：Dashboard 沒有列出 `photos` 相關政策。
- `checklist_logs`、`declutter_records`、`challenge_data`：已啟用 RLS，各有 SELECT、INSERT、UPDATE、DELETE 四條政策，以登入 JWT 的 email 比對 `user_email`。使用者另外逐條查看了 `checklist_logs` 的四條政策。各表 UPDATE／INSERT 政策的 WITH CHECK 內容，沒有個別記錄。
- `feedback`：已啟用 RLS，沒有政策。
- Supabase Auth：Google Provider 已啟用；Confirm email 已開啟；Email Provider 與匿名登入為 Disabled；Third-Party Auth 頁面沒有顯示已新增的提供者。

### 6.2 程式碼靜態核對（2026-10-20，HEAD `8d2d436`）
- 三張主要資料表的存取都集中在 `lib/supabase.ts`。寫入的 `user_email` 都來自 Supabase Auth session 的 email（trim + 小寫，`toAppUser`）；client 查詢的 `.eq('user_email', …)` 只是應用層篩選，**不能當作資料庫層隔離的證據**。
- 前端程式沒有直接存取 Storage 或 `feedback` 表。照片只透過 `/api/photos`、`/api/photos/sign`（service role）存取；`feedback` 只透過 `/api/feedback`（service role）寫入。
- 因此，「bucket Private＋沒有 Storage policies」與「`feedback` RLS 開啟＋沒有政策」都符合程式設計：只有 service role 的 server route 能存取，前端無法直接讀寫。依目前程式碼，**不需要新增 Storage 或 `feedback` 政策**。
- 照片 API 的所有權檢查見 §4：未登入回 401；簽名網址只簽發 JWT email 資料夾內的路徑；刪除路徑由 server 以 JWT email 組成。
- 資料庫中仍可能保存 public URL 格式的照片參照；讀取時一律解析成 path 再走簽名網址。bucket 為 Private 時，直接開啟 public URL 不應能讀到照片（依 Supabase 一般行為，未實測）。

### 6.3 實測證據
**未找到可核實的真實環境實測證據**（2026-10-20 搜尋範圍：所有分支、所有歷史版本的檔案與 commit 訊息、`docs/`、未合併分支的 `docs/HANDOFF.md`；當時 repo 沒有測試檔，`package.json` 沒有測試指令或測試框架）。2026-10-21 起 repo 有照片 API 的 mock 測試檔（`tests/s2/`、`tests/s3/`，見下方），`package.json` 仍沒有 `test` 指令；mock 測試不屬於真實環境實測。以下項目沒有真實環境實測證據；這只代表找不到紀錄，**不代表過去一定沒有測過**：

| 項目 | 目前證據 |
|---|---|
| 三張表跨帳號 SELECT | Dashboard 設定（程式碼的 `.eq` 篩選不算隔離證據） |
| 三張表跨帳號 INSERT（偽造 `user_email`） | Dashboard 設定（WITH CHECK 未個別記錄） |
| 三張表跨帳號 UPDATE（含把 `user_email` 改成他人） | Dashboard 設定（WITH CHECK 未個別記錄） |
| 三張表跨帳號 DELETE | Dashboard 設定（程式碼的 `.eq` 篩選不算隔離證據） |
| 以他人照片路徑請求簽名網址 | 程式碼靜態（`app/api/photos/sign/route.ts`）；2026-10-21 起另有 mock 測試（見下方） |
| 未登入者請求簽名網址 | 程式碼靜態（同上，回 401）；2026-10-21 起另有 mock 測試 |
| 跨帳號刪除照片 | 程式碼靜態（`app/api/photos/route.ts` DELETE）；2026-10-21 起另有 mock 測試 |

歷史紀錄中的 P0-3B regression test 與 P1-C4 production QA（§5），因原始紀錄不在 repo、看不出是否包含跨帳號情境，不列為實測證據。

#### 照片 API mock 測試（2026-10-21 加入 repo，`fb1bd46`、`6b912a0`）
- 位置：`tests/s2/`、`tests/s3/`，以 Vitest（開發依賴 `vitest@3.2.4`）執行：`npx --no-install vitest run`（`package.json` 沒有 `test` 指令）。
- 範圍：照片 API 的身分驗證、所有權與路徑授權（跨帳號路徑、異常路徑、編碼字元、body 夾帶身分欄位），Storage 錯誤處理與 log 內容，前端 `photoSigner` 帳號隔離。
- 結果（歷史執行紀錄）：在合併前 HEAD `6b912a0` 執行，54／54 通過（S2 29、S3 25），同一版本 `npm run build` 成功；未在 merge commit `508fa92` 上重新執行（兩者檔案內容相同）。另以刻意弄壞授權邏輯的暫時複本確認測試能偵測錯誤（S2 8 個、S3 5 個變異版本）。
- 限制：全部使用假的 Supabase client 與假的 fetch，**不能證明真實 Supabase Auth／Storage 的行為，也不是跨帳號實測**；上表三張資料表的跨帳號項目不在範圍內。
- S2-03 補充：路徑結尾有空白時，請求同樣被拒絕、不呼叫 Storage，但結果是 `invalid`，不是原規劃描述的 `forbidden`；應以 `invalid` 為預期結果（測試檔中的案例描述已是 `invalid`）。
- S2-21～S2-24（需要真實 Supabase 與測試帳號）沒有執行：因為無法排除本機連到正式專案，S2-21、S2-23、S2-24 為 `BLOCKED`；S2-22（真實刪檔）依規劃不執行。

#### 照片 API 未登入請求（S1，`HISTORICAL PASS`）
- 2026-10-20 08:59 UTC，在 HEAD `4639880` 的本機伺服器，對 `POST /api/photos/sign`、`POST /api/photos`、`DELETE /api/photos` 各送出「沒有 Authorization」與「`Basic` 格式」兩種請求，共 6 項，歷史紀錄顯示都回傳預期的 401 `unauthorized`。
- 證據來源是當時的對話紀錄；原始伺服器 log 已不存在。本次沒有重新執行，不代表目前環境已重新通過。
- 這是本機 API 行為測試，沒有使用真實 token，不涵蓋真實 Supabase Auth 對異常 token 的回應。

#### 代號說明
- 實際執行的 **S3-A／S3-B** 是 Storage 錯誤處理、錯誤 log 修正與 `photoSigner` 帳號隔離的 mock 測試；真實 Private bucket、signed URL 與相關快取行為**尚未驗證**。由於原始路線圖未能取得，目前無法確認真實環境驗證在原路線圖中的代號。
- 照片 API 測試報告（repo 外）中的 R1～R7 是照片 API 的殘餘風險編號（例如以 email 為身分、Storage 路徑解讀），與路線圖的 R1～R7 是不同項目。路線圖 R1～R7 的原始定義目前找不到，因此 `docs/TODO.md` P1 的技術風險項目不標示路線圖 R 代號（項目本身保留）。

### 6.4 仍待確認
- 舊 public URL 的 CDN 快取：bucket 已是 Private，但過去被讀取過的 public URL 是否仍可從快取取得，歷史上列為待驗證，目前仍未確認（Dashboard 無法看出，需實際請求測試）。
- 跨帳號實測：見 §6.3；其中 INSERT／UPDATE 取決於 WITH CHECK，優先順序最高（見 `docs/TODO.md` P0）。
- 真實 Supabase Auth 對異常 token（過期、已登出、以 anon key 冒充）的回應，以及真實 Storage／signed URL 的行為：只有 mock 測試，尚未在真實環境驗證。
- 正式環境照片 API 錯誤 log 的實際格式：修正已部署（`508fa92`），但尚未觀察到自然發生的錯誤事件，實際格式待驗證。
- 正式網站照片顯示驗收：使用者已手動刪除測試照片，目前沒有可供驗收的既有照片，因此本次未執行照片顯示驗收（`NOT TESTED`）。不得為了驗收而重新建立正式測試資料。照片 API 的既有 mock 測試及合併前測試結果依歷史證據保留；真實 Storage 與 signed URL 行為仍列為未驗證項目。

### 6.5 資料庫約束
程式預期使用以下識別方式，但實際 schema／唯一約束未確認：
- checklist：`id` + `user_email`
- declutter：`user_email` + `saved_at`
- challenge：`user_email`

不得依程式碼假設直接認定資料庫已有對應的 unique constraint。

## 7. OAuth 與 redirect

### 現行與舊版流程
- 現行登入使用 Supabase Auth（Google OAuth + PKCE）。
- `app/api/auth/callback/route.ts` 仍存在；它會交換 Google token 並寫入非 httpOnly 的 `organizer_user` cookie，但現行 App 不再以此 cookie 作為身份來源。
- 舊 cookie 的安全問題（程式碼可證實）：`organizer_user` 是未簽章的 JSON，`lib/auth.ts` 的 `getUserFromCookie` 直接 `JSON.parse` 讀取，沒有任何簽章或伺服器端驗證；用戶端可以自行修改內容，因此不能作為可信任的身份依據。現行身份改由 Supabase Auth 的 session 決定，照片 API 也以伺服器驗證過的 JWT 為準（目標架構見 `docs/DECISIONS.md` D-014）。
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
- 連接或查詢 Supabase 等外部服務前，須先取得使用者同意，包括唯讀查詢。

## 12. 待確認清單

> 2026-10-20 更新：原第 1 項（bucket 狀態）、原第 3 項（Storage policies 與三張資料表 RLS 設定）、原第 4 項中的 feedback 權限，已由 Dashboard 人工確認（設定層級，見 §6.1），自本清單移除；對應的跨帳號實測改列為第 1 項。

1. 三張資料表的跨帳號 SELECT／INSERT／UPDATE／DELETE 實測；照片 API 跨帳號與未登入情境可一併實測（見 §6.3）。
2. 舊 public URL 是否仍可經 CDN 快取讀取。
3. 各表 UPDATE／INSERT 政策的 WITH CHECK 內容（若實測已涵蓋，可不另查）。
4. 三張資料表及 `feedback` 表的實際主鍵／唯一約束。
5. Supabase Auth redirect allowlist 是否仍保留開發用（Codespaces）網址。
6. 舊 OAuth callback 是否仍登記在 Google Console。
7. Vercel 環境變數設定（只確認存在與否，不讀值）。Production 部署版本：2026-10-21 由 GitHub 部署紀錄確認 `508fa92` 的 Production 部署成功（未查看 Vercel 後台）。
8. GA4 Enhanced Measurement 與正式事件收取。（2026-10-21：新增 `home_entry_click`、`declutter_started`，並讓點選目前分頁時不再送 `page_view`；新事件參數只用 `lib/analytics.ts` 允許清單內的固定值與 `login_state`，不含使用者輸入、物品名稱或 email。GA4 後台設定已由使用者確認（見 `docs/ARCHITECTURE.md` §9）；正式環境事件收件仍未確認，見 `docs/WORKLOG.md` §8。）
9. Storage 中目前是否有孤兒照片。（2026-10-21：測試照片已由使用者手動刪除，該次追查結案；不代表所有孤兒照片已盤點完成。）
10. 歷史上的測試資料目前是否仍存在。（測試照片部分已結案，見上一項；其他測試資料的現況未確認。）
