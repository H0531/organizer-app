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

> SHA、日期與標題已於 2026-10-19 依本地 `git log` 核對。除非另有說明，這裡只有 commit metadata／stat，不代表逐行 diff 已完整審查。

| Commit | 日期 | 標題 | 記錄與限制 |
|---|---|---|---|
| `9bb5555` | 2026-09-26 | `fix: migrate challenge data on login` | Challenge 登入遷移的早期修正。 |
| `1ce16a0` | 2026-10-01 | `feat: migrate auth to supabase` | 登入身分改由 Supabase Auth 決定。 |
| `cd7c970` | 2026-10-02 | `fix: secure photo upload API` | 照片上傳 API 安全修正；未做動態 API 測試。 |
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
| `1043e24` | 2026-10-08 | `feat: improve GA4 event tracking` | 歷史紀錄曾回報 production smoke test；目前正式環境未重新驗證。 |

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
- 靜態盤點不能取代動態測試，也沒有確認 bucket／RLS 後台設定。

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

## 6. 執行任務時建議留下的紀錄格式

每個實際執行的任務，補記：
1. 任務日期、範圍與授權邊界（唯讀／可修改哪些檔案／是否允許外部寫入）。
2. 當時 branch、HEAD commit、工作樹狀態；production commit 若有可驗證證據，另行記錄。
3. 變更檔案與摘要（唯讀任務則註明沒有變更）。
4. 實際執行的檢查與逐項結果；未跑的測試列為 `NOT TESTED`，受阻列為 `BLOCKED`，只有歷史紀錄的列為 `HISTORICAL PASS`。
5. 未解風險、後續工作及回滾方式；涉及資料刪除時記錄授權範圍與前後確認，但避免記錄個資或 secrets。

## 7. 本文件的限制

- 不含秘密值、帳號 email、專案識別碼、GA Measurement ID、DNS 設定值或環境變數內容。
- 沒有重新連線遠端 Git、Supabase、Vercel 或 GA4。
- 沒有重新跑功能測試。
- 歷史測試與部署紀錄只保留為歷史紀錄，不作為目前 Production 的保證。
