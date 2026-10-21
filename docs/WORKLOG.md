# Worklog｜開發歷程、檢查基線與證據限制

## 1. 使用原則

本文件區分：
- **Git 紀錄可證實**：commit SHA、標題、日期等 metadata。
- **歷史紀錄提及**：過去對話記載的工作、測試或部署結果；不代表目前重新驗證。
- **檢查時觀察**：某次唯讀檢查當下看到的狀態；只代表當時。
- **尚未驗證**：需要新檢查或外部服務才能確認。

不可把 commit 訊息當成完整測試報告，也不可將歷史 Production PASS 寫成目前仍然 PASS。Supabase、Vercel、GA4 等後台設定的變更不是 Git commit，不能用 commit 證明。

## 2. 早期產品與工程時間線（歷史紀錄提及）

> 依原交接稿的時間線整理，只保留產品與工程相關項目。細節未在現況重新驗證。

### 2026-03 至 2026-04：產品規劃與初始網站
- 2026-03-26：開始規劃整理收納工具，後續形成整理清單、斷捨離、每日挑戰等功能方向。
- 2026-04 中下旬：網站設計、功能優化、GitHub／Vercel 部署與測試環境。本地 Git 最早的 commit 為 2026-04-13。
- 2026-04-24：網站 SEO／可發現性討論。

### 2026-05 至 2026-07：受眾、分析與優化
- 2026-05：目標用戶、使用情境、衡量網站使用者、GA4 SPA page tracking、未登入使用者追蹤與隱私問題。
- 2026-05-12：未登入狀態的功能可見性與本機資料體驗。
- 2026-07-20：GA 數據分析與功能優化方向。

### 2026-08 至 2026-09：登入同步與 UX
- 訪客資料與登入後同步、Challenge／Member 介面修改等工作。
- 2026-09-17：首頁內容層級與新手引導調整；歷史 UX 檢視也指出空間九宮格可能帶來選擇負擔（未決策）。
- 2026-09-26：ChallengeTab 與 MemberTab 開發；Git 紀錄有 `9bb5555` fix: migrate challenge data on login（2026-09-26）。

### 2026-10-01 至 2026-10-08：登入改版、資安加固與資料完整性
- 2026-10-01：登入改用 Supabase Auth；Git 紀錄有 `1ce16a0` feat: migrate auth to supabase。
- 2026-10-02 至 10-04：照片上傳 API 安全修正、signed URL 架構與分階段導入、照片生命週期與疑似孤兒物件盤點、Checklist 分享預覽與 Declutter 照片讀取修正。
- 2026-10-02：歷史紀錄記載 `photos` bucket 在 Supabase 後台改為 Private（**後台操作，不是 Git commit 的結果**；目前狀態未確認）。
- 2026-10-04 至 10-06：Challenge 同步、Guest → 登入遷移、登入狀態 UI 寫入同步、feedback API 加固。
- 2026-10-08：GA4 事件追蹤調整與後台驗證。

### 2026-10-13：產品價值與受眾
- 使用者表達產品定位方向（見 `docs/PRODUCT.md`）；受眾描述仍屬待驗證假設。

## 3. 重要 Commit 索引（Git 紀錄可證實）

> SHA、日期與標題已於 2026-10-19 依本地 `git log` 核對（`0e3cc34`、`8d2d436` 兩列於 2026-10-20 核對；`4639880`、`fe029e4`、`fb1bd46`、`6b912a0` 四列於 2026-10-21 依本地 `git log` 核對）。`508fa92` 一列原依 GitHub 紀錄建立（當時本機 Git 尚未同步該 commit）；2026-10-21 之後執行 `git fetch origin`，已依本地 `git log` 核對其 SHA、日期、標題與父 commit（`4639880`、`6b912a0`），與本表一致。除非另有說明，這裡只有 commit metadata／stat，不代表逐行 diff 已完整審查。

| Commit | 日期 | 標題 | 記錄與限制 |
|---|---|---|---|
| `9bb5555` | 2026-09-26 | `fix: migrate challenge data on login` | Challenge 登入遷移的早期修正。 |
| `1ce16a0` | 2026-10-01 | `feat: migrate auth to supabase` | 登入身分改由 Supabase Auth 決定。 |
| `cd7c970` | 2026-10-02 | `fix: secure photo upload API` | 照片上傳 API 安全修正。repo 中沒有動態 API 測試的檔案或紀錄；`docs/SECURITY.md` §5 記載的歷史 regression test 原始紀錄不在 repo，內容與範圍無法核實（2026-10-20 修正：原寫「未做動態 API 測試」，但沒有證據證明「未做」，改為「找不到紀錄」）。 |
| `fb99d46` | 2026-10-02 | `feat: add signed photo URL endpoint` | 加入 signed URL endpoint；不證明 bucket 為 Private。 |
| `f44e851` | 2026-10-02 | `feat: add photo read resolver` | 加入 PhotoImg／photoRef／photoSigner 相關架構。 |
| `0008b83` | 2026-10-02 | `feat: use signed photo URLs in checklist` | Checklist 照片讀取使用 signed URL。 |
| `2b02576` | 2026-10-03 | `feat: use signed URLs in member photos` | Member 照片讀取相關變更。 |
| `a947ed3` | 2026-10-03 | `feat: secure share photo reads` | 分享照片讀取相關變更；**不是 bucket Private 的證據**。 |
| `ff0e6f2` | 2026-10-04 | `fix: secure declutter photo reads` | Declutter 照片讀取修正；歷史紀錄曾回報已推上 production，未重測。 |
| `eb6f741` | 2026-10-04 | `fix: harden photo lifecycle cleanup` | 照片生命週期清理相關變更。 |
| `5dcd339` | 2026-10-04 | `fix: prevent challenge sync data loss` | Challenge 同步資料遺失防護。 |
| `8aa499f` | 2026-10-05 | `fix: harden guest migration safety` | Guest migration 防護。 |
| `45ee890` | 2026-10-06 | `fix: prevent authenticated UI write desync` | 登入狀態下 UI 寫入同步相關修正。 |
| `bf0025d` | 2026-10-06 | `fix: harden feedback submission` | Feedback 提交防護；rate limit 仍需評估。 |
| `1043e24` | 2026-10-08 | `feat: improve GA4 event tracking` | 歷史紀錄曾回報 production smoke test；目前正式環境未重新驗證。本地 `main` 與 `origin/main` 的共同祖先。 |
| `0df9f1a` | 2026-10-16 | `Update CLAUDE.md` | 遠端 `origin/main` 上的 commit（依 metadata，作者為使用者、經 GitHub 網頁提交）；只修改 `CLAUDE.md`。 |
| `02bfbe9` | 2026-10-19 | `docs: add project handoff documentation` | 匯入 8 份交接文件。 |
| `a077d57` | 2026-10-19 | `docs: update handoff commit record` | 修正 WORKLOG 中的提交狀態描述。 |
| `aff621e` | 2026-10-19 | `docs: refine Claude collaboration rules` | 文件分組提交第 1 組：`CLAUDE.md`。 |
| `a6cbd1c` | 2026-10-19 | `docs: clarify architecture and tracking behavior` | 文件分組提交第 2 組：`docs/ARCHITECTURE.md`。 |
| `b6537fd` | 2026-10-19 | `docs: update product security and decision records` | 文件分組提交第 3 組：`docs/PRODUCT.md`、`docs/SECURITY.md`、`docs/DECISIONS.md`、`docs/TODO.md`。 |
| `b1854e8` | 2026-10-19 | `docs: clarify deployment precautions` | 文件分組提交第 4 組：`README.md`。 |
| `cfaab0f` | 2026-10-19 | `Merge origin/main, preserving local CLAUDE.md` | 將 `0df9f1a` 合併進本地 `main`；詳見 §5。建立時尚未推送；2026-10-20 觀察本地 `origin/main` 已包含此 commit（見 §6）。 |
| `0e3cc34` | 2026-10-19 | `docs: record documentation merge and pending release checks` | 更新 `docs/TODO.md`、`docs/WORKLOG.md` 的合併與待推送紀錄。 |
| `8d2d436` | 2026-10-20 | `chore: remove accidental git log file` | 移除誤提交的 `tate"`。使用者回報 Vercel 最新部署為此 commit、狀態 Ready（未由 Claude 查驗）。 |
| `4639880` | 2026-10-20 | `docs: reconcile security audit findings` | 文件更新；PR #1 的基準 commit。 |
| `fe029e4` | 2026-10-21 | `fix(security): sanitize photo storage error logs` | 上傳／刪除 API 的錯誤 log 改用 `errorSummary()`；見 §7。 |
| `fb1bd46` | 2026-10-21 | `test(security): preserve photo security regression tests` | 新增 Vitest 開發依賴、`vitest.config.mts`、`tests/s2/`、`tests/s3/`；見 §7。 |
| `6b912a0` | 2026-10-21 | `fix(security): sanitize photo signing error logs` | 簽名 API 的錯誤 log 改用 `errorSummary()`，新增 S3-A8／A9 測試；見 §7。 |
| `508fa92` | 2026-10-21 | `Merge pull request #1 from H0531/security/s3-photo-log-fix` | 一般 merge commit（父 commit `4639880`、`6b912a0`）；GitHub 紀錄顯示 Production 部署成功；見 §7。 |

### 原交接稿的修正紀錄
- 原交接稿將 `2b02576`、`a947ed3` 標為 2026-10-02；依本地 Git 紀錄，兩者日期皆為 **2026-10-03**。
- 原交接稿將「photos bucket 改 private」對應到 `a947ed3`。bucket 設定是 Supabase 後台操作，**不能歸因於任何 Git commit**；本文件已移除這個對應。

## 4. 歷史驗證紀錄（不是目前狀態保證）

### Guest／會員資料
- 2026-04 曾討論整理日記／斷捨離紀錄消失、會員頁顯示與帳號切換資料隔離。
- 2026-09 至 10 月多次處理 Guest → Supabase Auth 登入資料遷移、Challenge 同步與 authenticated UI write desync。
- 這些歷史問題促成目前多處遷移保護；不能推定所有邊界情境都已通過測試。

### 照片資安
- 2026-10-02 至 10-04 曾處理上傳 API 驗證、signed URL、PhotoImg 與照片生命週期清理。
- 詳細歷史驗證紀錄見 `docs/SECURITY.md` 第 5 節。
- 靜態盤點不能取代動態測試，也沒有確認 bucket／RLS 後台設定。（2026-10-19 的紀錄；bucket／RLS 設定已於 2026-10-20 由使用者在 Dashboard 人工確認，見 §6。）

### GA4
- 2026-10-08 的歷史紀錄曾回報 `1043e24` 部署 Ready 與 Production smoke test。
- 歷史方案是維持 GA4「依瀏覽器記錄變更網頁」設定 OFF，使用 tab change 手動 page_view。
- 目前 GA4 後台設定與事件收取未確認。

### 測試資料
- 歷史紀錄提到曾在 production 建立測試資料；目前是否仍存在未確認。
- 第二輪審查草稿曾寫入一組測試資料筆數，但出處無法確認，已列為 `docs/TODO.md` 的待查證問題，本文件不採用。

## 5. 2026-10-19 交接檢查與文件整合紀錄

### 檢查時觀察的 Git 基線（只代表當時）
- 分支：`main`
- HEAD：`1043e24 feat: improve GA4 event tracking`
- 本地 `origin/main` ref 與 HEAD 一致；未執行 fetch，遠端最新狀態未確認。
- 追蹤中的檔案沒有修改；未追蹤檔案為兩個交接 ZIP。
- 之後的工作請重新執行 `git status`、`git log`，不要沿用此基線。

### 當日執行的唯讀檢查（皆未修改 repo、未操作外部服務、未部署）
1. 現行 Repo 唯讀核對：工作區狀態、檔案職責、Guest／登入／遷移、照片、元件、GA4、文件缺口。
2. 原交接 ZIP 檔案清單檢查（只列目錄，未解壓）。
3. 原始對話索引檔的唯讀內容檢查：判定含敏感識別值與無關內容，不匯入 repo。
4. 原交接 ZIP 與第二輪審查草稿的 8 份文件比對。

### 文件整合
- 以第二輪審查草稿為主體，補回原交接稿中有依據的內容，產出 8 份整合文件；已匯入 repo，並於 2026-10-19 建立文件提交 02bfbe9。
- 整合時修正：commit 日期、bucket 設定與 commit 的錯誤對應、D-011 的表述、測試資料筆數改列待查證。

### 匯入前程式碼核對（已完成）
- 在 HEAD `1043e24` 核對 `docs/ARCHITECTURE.md` 中 47 項具體程式碼描述（檔案路徑、函式名稱、登入與 Guest 流程、照片上傳／讀取／刪除、GA4 事件），結果一致。
- 將 GA ID 的具體環境變數名稱改為概括描述，避免文件直接列出該名稱。
- 未驗證：此核對只涵蓋 repo 程式碼，不代表 Supabase、Vercel、GA4 或其他外部服務的現況已驗證。

### 文件匯入與範圍檢查（已完成）
- 2026-10-19 匯入 8 份文件（`README.md`、`CLAUDE.md` 與 `docs/` 下 6 份），與整合草稿逐位元組相同。
- 確認 `AGENTS.md` 未修改。
- 確認網站程式碼及 `package.json`、`package-lock.json` 未修改。
- 確認未 commit、push、部署或連線外部服務。
- 未驗證：這些是文件匯入檢查結果，不代表外部服務設定已驗證。

### 文件分組提交與遠端整合（已完成；尚未推送）
- **發現分歧**：推送前檢查時執行 `git fetch origin`，發現本地 `main` 與 `origin/main` 分歧——共同祖先 `1043e24`，本地獨有 6 個 commit（`02bfbe9`、`a077d57`，以及下方 4 組），遠端獨有 1 個 commit（`0df9f1a`，只修改 `CLAUDE.md`）。
- **文件分組提交**：先將工作目錄中的 7 份文件修改分 4 組提交，每組只以明確路徑加入暫存區：
  1. `aff621e`：`CLAUDE.md`（整合遠端 `0df9f1a` 的規則與本地協作規範）。
  2. `a6cbd1c`：`docs/ARCHITECTURE.md`。
  3. `b6537fd`：`docs/PRODUCT.md`、`docs/SECURITY.md`、`docs/DECISIONS.md`、`docs/TODO.md`。
  4. `b1854e8`：`README.md`。
- **整合前再次確認遠端**：2026-10-19 再次執行 `git fetch origin`，`origin/main` 仍為 `0df9f1a`，沒有新的遠端 commit。
- **遠端整合**：以 `git merge --no-ff origin/main` 建立 merge commit `cfaab0f`（`Merge origin/main, preserving local CLAUDE.md`）；第一個父 commit 為 `b1854e8`，第二個父 commit 為 `0df9f1a`。
  - 只有 `CLAUDE.md` 發生衝突。以 `git checkout --ours CLAUDE.md` 保留本地版本，並確認第一行為 `@AGENTS.md`，內容與 merge 前的本地版本完全相同。保留本地版本的依據：合併前已逐項確認本地 `CLAUDE.md` 已承接遠端 `0df9f1a` 應保留的內容（技術與產品細節移至 README 與 `docs/`，部分內容依決策刻意排除）。
  - merge commit 的 tree 與第一個父 commit `b1854e8` 完全相同（`git diff HEAD^1 HEAD` 無差異）。
  - 本地原有 6 個 commit 的 SHA 均保留，沒有 rebase 或改寫歷史。
- **未納入本次整合**：遠端分支 `origin/claude/new-session-4u0zpo`（`52128c0`，內容為 `docs/HANDOFF.md`）沒有合併。理由：內容多與現有文件重複或已過時，並建議將原始對話匯入 repo，與 `docs/SECURITY.md` §10 的決定衝突；有價值的部分已摘要吸收至現有文件。兩個交接 ZIP 仍未追蹤、未提交。
- **尚未執行**：`npm run build`、推送（`git push`）、部署。推送 `main` 可能觸發正式環境部署（見 `CLAUDE.md` §3），須另行取得同意。（2026-10-20 補註：之後已由使用者推送，見 §6。）
- 未驗證：本節只記錄 Git 操作與文件檢查結果，不代表 Vercel、Supabase、GA4 等外部服務的狀態已驗證。

## 6. 2026-10-20 開發盤點與資安現況核對紀錄

### 基線（只代表當時）
- 分支 `main`，HEAD `8d2d436`；本地 `origin/main` ref 與 HEAD 相同（未執行 fetch）；追蹤中的檔案沒有修改，未追蹤檔案為兩個交接 ZIP。
- 網站程式碼（`app/`、`components/`、`lib/`、`types/`、`package.json`、`next.config.ts`）在 `1043e24..8d2d436` 之間沒有變更。
- 使用者回報：Vercel 最新部署 commit 為 `8d2d436`、狀態 Ready（未由 Claude 查驗）。

### 授權範圍
- 盤點與核對全程唯讀。第一輪只授權修改 `docs/` 下四份文件；第二輪經審查後，另外授權修改 `README.md`、`docs/PRODUCT.md`、`docs/ARCHITECTURE.md`，並修正第一輪審查發現的 8 個問題。
- 未修改程式碼；未執行 SQL；未連線 Supabase、Vercel 後台或 GA4；未使用 Supabase MCP；未讀取 `.env*`；未執行 fetch、build、commit、push 或部署。

### 使用者在 Supabase Dashboard 人工確認的設定
- 內容見 `docs/SECURITY.md` §6.1。這是使用者執行的設定檢查，不是安全測試；repo 中沒有截圖。

### 當日實際執行的唯讀檢查
1. 開發現況盤點：Git 狀態、正式文件、GA4 程式碼（初始化、`page_view`、9 個自訂事件）。GA4 的問題只在程式碼層級確認，GA4 後台與正式事件收取 `NOT TESTED`。
2. 歷史資安工作核對：照片簽名網址、上傳 API、feedback API、舊 OAuth callback 的 commit 與現行程式碼對照；這些檔案在相關 commit 之後沒有被修改。
3. 資料存取與照片 API 程式碼靜態核對（結果見 `docs/SECURITY.md` §6.2）。
4. 測試證據搜尋：所有分支、所有歷史版本都沒有測試檔，`package.json` 沒有測試指令；commit 訊息沒有測試紀錄。跨帳號安全測試**未找到可核實證據**（見 `docs/SECURITY.md` §6.3）。
5. 正式網站唯讀檢查（只送出 GET／HEAD，未登入、未呼叫 API、未寫入）：首頁、`robots.txt`、`sitemap.xml` 回應 200；不含 www 的網域會 307 轉到 www；首頁初始 JS 沒有 service role 金鑰（見 `docs/SECURITY.md` §3）；回應標頭沒有 CSP 與 `X-Frame-Options`（列為 `NEEDS REVIEW`）。無法執行 JavaScript，所以畫面呈現與瀏覽器 console 錯誤 `NOT TESTED`。

### 當日發現的文件問題與處理
- `docs/SECURITY.md` §5 寫 `cd7c970`「做過 regression test」，本文件 §3 寫「未做動態 API 測試」，兩者矛盾。`docs/SECURITY.md` §5 該列的「目前狀態」欄與本文件 §3 都已改為：歷史紀錄提及 regression test，但原始紀錄不在 repo、內容無法核實。`docs/SECURITY.md` §5「歷史紀錄記載」欄的原文保留不變。
- bucket／RLS「未確認」的描述（`docs/SECURITY.md`、`docs/DECISIONS.md` D-006／D-011／D-014、`docs/TODO.md` P0）已依 Dashboard 人工確認更新，並標明是設定確認、不是測試通過。2026-10-19 的原文保留。
- 已過時的 TODO（推送 `main`、移除 `tate"`）已改為勾選並註明證據。
- `README.md`、`docs/PRODUCT.md`、`docs/ARCHITECTURE.md` 中 6 處 bucket／RLS 過時聲明已更新。
- 最後審查後，另外授權修正 `docs/WORKLOG.md` 授權範圍紀錄與 `docs/SECURITY.md` §12 第 4 項（加入 `feedback` 表的約束，與 `docs/TODO.md` 一致）。

### 未完成事項
- 跨帳號資料隔離與照片 API 的實測（`docs/TODO.md` P0）。
- 舊 public URL 的 CDN 快取、唯一約束、redirect allowlist、Google Console 舊 callback 登記：仍未確認。
- `docs/TODO.md` P1 的 `compressPhoto` 項目沒有區分是哪一份程式（程式碼可見：只有 `components/ChecklistTab.tsx` `saveLog` 內的版本缺少 `onerror`，`components/DeclutterTab.tsx` 的版本已有），本次沒有修改該項描述。

## 7. 2026-10-21 照片 API 錯誤日誌修正（PR #1）與部署紀錄

### 範圍與授權
- 使用者分階段授權：建立照片 API 的 mock 測試（新增開發依賴 Vitest）、修正錯誤日誌、建立本機 commit、推送 `security/s3-photo-log-fix` 分支、建立 PR #1、合併 PR #1（觸發正式部署）。
- 未修改 Supabase、Vercel、GA4 設定；未讀取 `.env*`；測試未使用真實帳號、token 或正式資料；未把 Preview 當成測試環境使用。

### 發現與修正
- 上傳／刪除 API 會把 Storage 錯誤物件原樣寫入伺服器 log（mock 測試以假的敏感字串證實，S3-A7 FAIL）。以 `errorSummary()` 只輸出驗證過的錯誤名稱與狀態碼（`fe029e4`）。
- 整合前審查發現簽名 API 的 log 未檢查 name／status 格式；先以新增的 S3-A8／A9 確認在未修正程式上失敗，再套用相同規則修正（`6b912a0`）。
- 規則與限制見 `docs/SECURITY.md` §4。

### 測試與建置（歷史執行紀錄，於合併前 HEAD `6b912a0` 執行）
- `npx --no-install vitest run`：5 個測試檔、54／54 通過（S2 29、S3 25）。
- `npm run build`：成功（編譯與型別檢查通過）。
- 測試靈敏度：以刻意弄壞授權邏輯的暫時複本確認測試能偵測錯誤（S2 8 個、S3 5 個變異版本）；複本放在被 Git 忽略的位置，執行後已刪除。
- 以上**未在 merge commit `508fa92` 上重新執行**；`6b912a0` 與 `508fa92` 的檔案內容相同（GitHub 比較結果沒有檔案差異）。
- 全部為 mock 測試，不代表真實 Supabase Auth／Storage 的行為。

### 推送、合併與部署（GitHub 紀錄可證實）
- 推送分支後，GitHub 上的 Vercel 檢查對 `6b912a0` 顯示 success（Preview 建置）。
- PR #1 於 2026-10-21 09:49:47 UTC 以一般 merge commit 合併：`508fa9249b714005b2ddb6909383c0c597a6cf03`。來源分支未刪除。
- GitHub 上 `508fa92` 的 Vercel 狀態為 success，並有一筆 Production 部署紀錄（09:50:27 UTC）。未由 Claude 查看 Vercel 後台。
- 本機查核限制（2026-10-21 唯讀稽核時觀察）：本機 Git 尚未同步到 `508fa92`（合併後未執行 fetch；本機 `main` 與 `origin/main` ref 仍為 `4639880`）。這只代表本機紀錄未更新，**不代表 PR 未合併**；合併與部署的證據來源是上述 GitHub 紀錄。之後（同日）執行 `git fetch origin`：`origin/main` 指向 `508fa92`，本機已可找到該 commit，父 commit 為 `4639880`、`6b912a0`，且 `6b912a0` 與 `508fa92` 的檔案內容沒有差異。這只代表 fetch 當時 GitHub `main` 的狀態；部署狀態仍依上述 GitHub 紀錄。

### 部署後驗收
- 正式網站首頁：一次 GET 回應 200（2026-10-21）。
- 照片顯示：當時沒有可用的瀏覽器工具與登入工作階段。之後使用者說明：已手動刪除測試照片，目前沒有可供驗收的既有照片，因此本次未執行照片顯示驗收（`NOT TESTED`，不是 PASS）。不得為了驗收而重新建立正式測試資料。照片 API 的既有 mock 測試及合併前測試結果依歷史證據保留；真實 Storage 與 signed URL 行為仍列為未驗證項目。
- 正式環境錯誤 log：**尚待自然錯誤事件驗證**（沒有已授權的唯讀日誌存取方式；未刻意製造錯誤）。

### 證據位置與限制
- 詳細報告、測試輸出與備份存放在 Codespace 內、repo 外的 `/home/codespace/organizer-reviews/`（使用者另有下載的備份），不在 repo 中，Codespace 刪除時可能遺失。
- 2026-10-21 曾以 Vercel CLI 嘗試唯讀查詢專案設定，結果失敗或逾時；期間 CLI 更新了本機的認證與使用統計檔（未讀取內容）。之後未再使用 Vercel CLI。

### 未完成事項
- 正式網站照片顯示確認（目前沒有可驗收的照片，未執行）、正式環境錯誤 log 格式（`docs/TODO.md` P0）。
- 真實 Supabase Auth 對異常 token 的行為、真實 Storage／signed URL 行為、真實跨帳號資料隔離：仍沒有真實環境實測（`docs/SECURITY.md` §6.3、§6.4）。

### 唯讀稽核後的結案整理（2026-10-21）
依當日對 Git 歷史、測試檔、repo 外工作紀錄的唯讀稽核補記；本次只整理文件，沒有重新執行稽核或測試。

已完成（不需重做）：
- **S1**：照片 API 未登入請求 6 項，2026-10-20 08:59 UTC 在本機伺服器（HEAD `4639880`）執行，歷史紀錄顯示都回傳預期的 401。證據來源是歷史對話紀錄，原始伺服器 log 已不存在。標記 `HISTORICAL PASS`，本次沒有重新執行。
- **S2-01～S2-20**：mock 測試與 8 個變異版本檢查已完成；只代表 mock 範圍，不代表真實 Supabase 行為已通過。S2-03 結尾空白的預期結果為 `invalid`（不是 `forbidden`）。S2-21、S2-23、S2-24 為 `BLOCKED`，S2-22 依規劃不執行。
- **S3-A／S3-B**：錯誤 log 修正、mock 測試與 5 個變異版本檢查已完成。這**不是**真實 Private bucket／signed URL 驗證，真實環境行為仍未驗證。
- **合併前測試**：54／54 通過、`npm run build` 成功（見上方「測試與建置」）；屬合併前的歷史證據，不是本次重新執行的結果。
- **PR #1**：依 GitHub 紀錄已合併並成功部署 Production；稽核時本機 Git 尚未同步，之後已 fetch，本機 `origin/main` 指向 `508fa92`（見上方「推送、合併與部署」）。
- **測試照片追查**：使用者確認已手動刪除測試照片，此次追查結案；不重新盤查、刪除或要求再次證明。這**不代表**所有 Storage 孤兒照片已盤點完成。

代號說明：
- 實際執行的 S3-A／S3-B 是 mock 測試；真實 Storage、signed URL 等行為尚未驗證。原始路線圖未能取得，無法確認真實環境驗證在原路線圖中的代號（見 `docs/SECURITY.md` §6.3「代號說明」）。
- 照片 API 測試報告（repo 外）的 R1～R7 是照片 API 殘餘風險，與路線圖的 R1～R7 不同。路線圖 R1～R7 的原始定義目前找不到，`docs/TODO.md` P1 的技術風險項目不標示 R 代號。

仍未驗證（沒有經使用者決定延後，不標為完成或延後）：
- 真實 Private bucket、signed URL 及相關快取行為。
- 資料庫主鍵與唯一約束。
- 跨帳號 RLS 行為。
- 舊 Google OAuth callback 外部設定。
- GA4 後台與正式事件。
- 資料可靠性與照片流程相關技術風險（`docs/TODO.md` P1）。路線圖代號（R1～R7、PHOTO-1～3、S3～S8）的原始定義找不到，以上項目都不標示對應關係；項目本身保留，未改為完成或延後。網站程式碼在 `1043e24` 之後只有照片 API 錯誤 log 的修改，這些項目的程式沒有變更。
- 孤兒照片盤點與 CDN 快取驗證。

## 8. 執行任務時建議留下的紀錄格式

每個實際執行的任務，補記：
1. 任務日期、範圍與授權邊界（唯讀／可修改哪些檔案／是否允許外部寫入）。
2. 當時 branch、HEAD commit、工作樹狀態；production commit 若有可驗證證據，另行記錄。
3. 變更檔案與摘要（唯讀任務則註明沒有變更）。
4. 實際執行的檢查與逐項結果；未跑的測試列為 `NOT TESTED`，受阻列為 `BLOCKED`，只有歷史紀錄的列為 `HISTORICAL PASS`。
5. 未解風險、後續工作及回滾方式；涉及資料刪除時記錄授權範圍與前後確認，但避免記錄個資或 secrets。

## 9. 本文件的限制

- 不含秘密值、帳號 email、專案識別碼、GA Measurement ID、DNS 設定值或環境變數內容。
- 2026-10-19 曾數次執行 `git fetch origin`，僅更新本地的遠端追蹤資訊；除此之外沒有其他遠端 Git 操作，也沒有連線 Supabase、Vercel 或 GA4。
- 2026-10-20 的遠端請求只有 GET／HEAD：正式網站公開頁面（見 §6），以及對 `components/ChecklistTab.tsx` `APP_URL` 備用網址的一次 GET（該網址回傳其他網站，見 `docs/TODO.md` P2）；沒有其他遠端操作。
- 2026-10-21 的遠端操作：GitHub API 唯讀查詢、推送 `security/s3-photo-log-fix` 分支、建立並合併 PR #1、正式網站首頁一次 GET，以及兩次失敗的 Vercel CLI 唯讀查詢（見 §7）；之後在唯讀稽核與結案整理後執行一次 `git fetch origin`（稽核當時本機尚未同步）：只更新本機遠端追蹤紀錄，確認 `origin/main` 指向 `508fa92`（父 commit `4639880`、`6b912a0`，與 `6b912a0` 的檔案內容沒有差異），沒有 merge、commit 或 push，也沒有重新查驗 Vercel 後台。沒有連線 Supabase 或 GA4。
- 沒有重新跑功能測試（2026-10-21 的照片 API mock 測試見 §7）。
- 歷史測試與部署紀錄只保留為歷史紀錄，不作為目前 Production 的保證。
