# TODO｜待確認與待評估事項

## 使用說明

本清單依 2026-10-19 唯讀報告、兩版交接文件比對與歷史紀錄整理。所有項目目前都只是待確認／待評估；除非後續取得新證據並記錄，不可標成已修復或已驗證。

2026-10-20 更新：依使用者的 Supabase Dashboard 人工確認與當日唯讀核對（見 `docs/WORKLOG.md` §6），勾選已取得證據的項目，並註明證據類型。勾選的設定確認項目**不代表安全測試已通過**。

2026-10-21 更新：照片 API 錯誤日誌修正（PR #1，merge commit `508fa92`）依既有 GitHub 紀錄已合併並部署（之後已執行 `git fetch origin`，本機 `origin/main` 指向 `508fa92`；部署狀態依 GitHub 紀錄，未重新查驗 Vercel 後台）；新增照片 API 的 mock 測試（見 `docs/WORKLOG.md` §7）。mock 測試**不代表真實環境驗證**。

2026-10-21 結案整理：依唯讀稽核結果補記 S1（`HISTORICAL PASS`）、照片顯示驗收未執行的原因、測試照片追查結案（見 `docs/WORKLOG.md` §7、`docs/SECURITY.md` §6.3、§6.4）。路線圖代號（R1～R7、PHOTO-1～3、S3～S8）的原始定義目前找不到，下方項目不標示這些代號；項目本身全部保留，**仍未驗證或未處理**，也沒有因此改為完成或延後。已完成的 S3-A／S3-B 是錯誤 log 修正與 mock 測試，不代表真實 bucket／signed URL 行為已驗證；這項真實環境驗證在原路線圖中的代號無法確認。

## P0｜外部設定與安全邊界待確認

- [x] **確認 Supabase `photos` bucket 目前的 Public／Private 狀態。** 歷史紀錄曾於 2026-10-02 改為 Private。2026-10-20 使用者在 Dashboard 人工確認為 Private（設定確認，見 `docs/SECURITY.md` §6.1）。
- [ ] **確認舊 public URL 是否仍可經 CDN 快取讀取。** 真實 Private bucket 與 signed URL 行為同樣尚未在真實環境驗證（見 `docs/SECURITY.md` §6.4）。歷史上列為待驗證，結果未知；Dashboard 無法看出，需實際請求測試。bucket 已是 Private，優先順序低於下方跨帳號實測。
- [x] **唯讀檢查 Storage policies 與三張資料表 RLS。** 2026-10-20 使用者在 Dashboard 人工確認：沒有 `photos` 相關 Storage policies；三張表已啟用 RLS，各有四條以 JWT email 比對 `user_email` 的政策；`feedback` 已啟用 RLS、沒有政策（設定確認，見 `docs/SECURITY.md` §6.1）。各表 UPDATE／INSERT 政策的 WITH CHECK 內容沒有個別記錄，改由下一項實測涵蓋。
- [ ] **跨帳號資料隔離實測（尚無實測證據）。** 三張主要資料表的跨帳號 SELECT／INSERT／UPDATE／DELETE，以 INSERT（偽造 `user_email`）與 UPDATE（把 `user_email` 改成他人）優先，因為取決於 WITH CHECK。照片 API 的跨帳號簽名網址、未登入請求簽名網址、跨帳號刪除目前只有程式碼靜態證據，可一併實測，不需單獨安排。執行方式（例如 SQL Editor 在交易中模擬並 rollback，或使用測試帳號）與是否在正式資料庫執行，須由使用者決定並另行授權；只使用測試資料，不使用真實使用者 email（見 `docs/SECURITY.md` §6.3）。2026-10-21：照片 API 的跨帳號路徑、未登入、跨帳號刪除等程式分支已有 mock 測試（`tests/s2/`），但仍沒有真實環境的跨帳號實測；本項維持未完成。
- [ ] **確認實際 DB schema 與唯一約束。** Checklist、Declutter、Challenge 及 feedback 表的約束尚未核對（RLS 設定確認不能取代約束核對）。
- [ ] **確認 Supabase Auth redirect allowlist。** 歷史紀錄：曾為 Codespaces 測試加入開發用轉發網址；目前設定未確認。確認是否仍保留，並由使用者決定是否移除。
- [ ] **確認舊 Google OAuth callback 是否仍登記於 Google Console。** 在確認外部依賴前，不移除舊 route。
- [x] **確認遠端 GitHub 最新狀態。** 2026-10-19 已執行 `git fetch origin`：`origin/main` 為 `0df9f1a`，與本地 `main` 分歧；已以 merge commit `cfaab0f` 整合進本地 `main`，保留本地 `CLAUDE.md`（詳見 `docs/WORKLOG.md` §5）。範圍只限 `main` 的 Git 歷史；遠端狀態會隨時間改變，推送前須再次確認（見下一項）。
- [x] **推送本地 `main` 的文件 commit 與 merge commit。** 2026-10-20 觀察：本地 `origin/main` ref 與 HEAD `8d2d436` 相同，已包含 `cfaab0f`（Git 本地紀錄；當日未執行 fetch，GitHub 實際狀態未另行查驗）。推送由使用者執行。
- [x] **確認 Vercel 是否在推送 `main` 時自動部署，以及目前 Production 部署的 commit。** 依使用者說明推送 `main` 會自動部署；使用者於 2026-10-20 回報 Vercel 最新部署 commit 為 `8d2d436`、狀態 Ready（使用者回報，未由 Claude 查驗 Vercel）。2026-10-21：合併 PR #1 後，GitHub 部署紀錄顯示 merge commit `508fa92` 自動建立 Production 部署且狀態 success（GitHub 紀錄可證實）；Production Branch 為 `main` 由使用者在 Vercel 後台確認回報。未由 Claude 查看 Vercel 後台。
- [ ] **PR #1 部署後：確認正式網站照片可正常顯示。** 需在正式網站以既有登入狀態開啟一筆有照片的紀錄確認；只瀏覽，不建立、上傳、修改或刪除資料。2026-10-21 只確認正式網站首頁可載入（HTTP 200）。之後使用者說明：已手動刪除測試照片，目前沒有可供驗收的既有照片，因此本次未執行照片顯示驗收（`NOT TESTED`）；不得為了驗收而重新建立正式測試資料。日後有自然產生的照片紀錄時再確認。
- [ ] **正式環境照片 API 錯誤 log 的實際格式。** 修正已部署（`508fa92`），待自然發生的錯誤事件出現時，在 Vercel log 確認只含錯誤名稱與狀態碼。不要為此刻意製造正式環境錯誤。
- [ ] **確認 Vercel 是否仍保留舊 OAuth 使用的 Google 環境變數。** 只確認是否存在，不讀取值；在決定移除舊 OAuth 前處理（見 P2 舊 OAuth 項目、`docs/DECISIONS.md` D-010）。
- [ ] **確認 GitHub repo 是否公開。** 結果會影響文件中可否出現 repo 名稱與正式網域；目前未確認。
- [ ] **確認 GA4 Enhanced Measurement 與正式事件收取。** 歷史方案是設定 OFF，但目前後台狀態未確認。

## P0｜資料盤點（只讀，不刪除）

- [x] **測試照片追查。** 2026-10-21 使用者確認已手動刪除測試照片，此次追查結案（使用者回報，未由 Claude 查驗 Storage）。不重新盤查、不刪除、不要求再次證明。本項結案**不代表**下方的孤兒照片盤點已完成。
- [ ] **重新盤點 Storage 孤兒照片。** 歷史盤點（2026-10-03）曾列出 17 個「可能孤兒」物件；不可沿用歷史數量，需以目前 DB 與 Storage 交叉比對，並考慮瀏覽器端仍可能保存引用。未經另行授權不得刪除。
- [ ] **確認歷史測試資料現況。** 歷史紀錄提到曾在 production 建立測試資料，目前是否仍存在未知。測試照片部分已結案（見上方）；其他測試資料（例如資料表紀錄）的現況未確認。未經另行授權不得 DELETE。
- [ ] **待查證：測試資料筆數的來源。** 第二輪審查草稿曾寫入一組 `checklist_logs`／`declutter_records` 的測試資料筆數，但目前找不到可靠出處，數字也與其他歷史盤點數字相近，可能記混。在找到原始紀錄前，**不得採信該數字，也不得據以刪除任何資料**。

## P1｜資料可靠性與身份隔離風險（先評估，再修改）

- [ ] **`saveLS` 寫入失敗可能先刪除舊資料。** 先盤點所有呼叫點與失敗處理，再提出保留舊資料的方案。
- [ ] **IndexedDB 照片 key 不分帳號。** 評估跨身份快取風險與不破壞既有照片的修正方式。
- [ ] **`handleUpdateDeclutterRecord` 缺少 `activeEmailRef` 檢查。** 評估帳號切換期間的寫入競態。
- [ ] **Declutter 先 select 再 insert，且 select 錯誤處理不足。** 先核對 DB 唯一約束，再評估原子性。
- [ ] **`savedAt` 使用本地化秒級字串作識別值。** 評估碰撞與跨裝置格式一致性；修改前需規劃舊資料相容性。
- [ ] **`compressPhoto` 缺少 `onerror`。** 評估圖片解碼失敗時 Promise 卡住的處理方式。
- [ ] **Checklist `timeLeft` 與經過時間使用不同計時方式。** 評估背景分頁節流造成的不一致，保留既有刷新／暫停語意。
- [ ] **照片上傳失敗時可能把 data URL 寫入 DB。** 評估欄位大小與 fallback 的必要性。
- [ ] **Declutter 儲存失敗可能留下 Storage orphan。** 提出不誤刪已被引用照片的清理策略。
- [ ] **Guest 刪除紀錄不會刪 IndexedDB 照片。** 先確認照片共享／引用關係，再決定是否需要清理。
- [ ] **MemberTab 刪除 modal 不等待刪除結果。** 評估非同步 callback 型別與失敗提示。
- [ ] **feedback API 缺少 rate limit。** 評估低風險防濫用方案，不要在未授權前部署。
- [ ] **`checklist_custom_items`、`CL_PAGE_KEY` 沒有帳號後綴。** 評估這是否為刻意的共用設定，先確認產品預期。
- [ ] **LINE 導向是否可能重複執行（待評估風險）。** `app/page.tsx` 沒有明確檢查網址是否已包含 `openExternalBrowser=1`；是否實際會重複導向未經驗證，不可視為已確認的漏洞（見 `docs/ARCHITECTURE.md` §4）。
- [ ] **Challenge 遷移的邊界情境未經本輪驗證，需另行測試。** 例如雲端已有資料時匿名 `challenge_data` 的保留方式、身份切換期間的寫入；目前不可標成已測試。

## P1｜產品與 UX（依使用者需求決定優先順序）

- [ ] 確認目前分頁、功能、登入門檻及 Guest 資料保存方式是否符合產品預期。
- [ ] 檢查首頁定位、第一次使用說明與各分頁導覽是否仍符合目前產品方向。
- [ ] 確認「登入前保留功能可見性」原則在各分頁的落實狀況。
- [ ] 回看空間選擇九宮格是否造成選擇負擔；是否需要新手推薦或快速完成入口，**由使用者決定**（目前未決策）。
- [ ] 確認 RecommendTab（收納推薦）的定位是否保留。
- [ ] 查證 RecommendTab 商品資料的品名、尺寸與價格；歷史檢查曾提到資料最初可能未經真實來源驗證。
- [ ] 正式文案中的健康效果宣稱（例如降低壓力荷爾蒙）在查核可信研究前不使用。
- [ ] 確認目標受眾描述是否已經過驗證，或仍屬假設。

## P2｜維護性與文件

- [ ] 核對 `app/api/auth/callback/route.ts`、`lib/auth.ts` 舊 OAuth 程式的外部依賴，再決定是否移除。
- [ ] 修正過時程式註解：service role 使用範圍、public URL 舊流程等；需另行授權修改程式碼。
- [ ] **評估移除舊 public URL 相關程式邏輯。** 可能涉及 `lib/photos.ts` 的 `getRemotePhotoUrl`，以及照片上傳 API 回傳 public URL 的舊流程。前置條件：先完成 P0 的 `photos` bucket Public／Private 狀態與 Storage policies／RLS 確認（2026-10-20 已由 Dashboard 人工確認設定），並評估資料庫與本機中既有照片參照（可能仍是 public URL 格式）的相容性（尚未評估）。完成前不得直接移除或改寫程式碼；此項與上方「修正過時註解」、待使用者決策中的「照片失敗上傳時的資料格式」是不同事項，也不代表已確認目前存在漏洞。
- [ ] `errorSummary()` 在 `app/api/photos/route.ts` 與 `app/api/photos/sign/route.ts` 各有一份相同規則的副本，修改時需同步；是否抽成 `lib/` 共用函式另行評估（低優先順序）。
- [x] 評估誤提交的 `tate"` 檔案是否可移除。已於 `8d2d436`（2026-10-20，`chore: remove accidental git log file`）移除（Git 紀錄可證實）。
- [ ] **網站安全標頭（`NEEDS REVIEW`，低優先順序）。** 2026-10-20 唯讀檢查正式網站首頁回應：有 HSTS 與 `X-Content-Type-Options`，沒有 `Content-Security-Policy` 與 `X-Frame-Options`。目前沒有證據顯示造成實際問題；是否補上由使用者決定，修改前需評估對 GA4、Google 登入與外部字型的影響。
- [ ] **`components/ChecklistTab.tsx` 的 `APP_URL` 備用網址指向非本專案的 vercel.app 網域**（2026-10-20 檢查該網址回傳其他網站）。實際使用處在瀏覽器中執行、會改用目前網站網址，正常情況下不會用到；屬低優先順序維護，修改程式需另行授權。
- [ ] 重新審查 `HomeTab`、`RecommendTab`、`StatsCharts` 與 `lib/types.ts` 尚未深入檢查的部分。
- [ ] 對重要歷史 commit 做逐行 diff 審查；目前只有 commit metadata／stat 摘要。
- [ ] 確認取消選擇照片時，`before_photo_uploaded`／`after_photo_uploaded` 是否會被觸發。取決於瀏覽器行為，目前**未確認**，不可自行推定結果（見 `docs/ARCHITECTURE.md` §9；與「待使用者決策」中的 GA4 事件語意調整相關）。

### 持續性維護規則
- 程式碼變更後，核對並更新 `docs/ARCHITECTURE.md`。
- 修改 `CLAUDE.md` 時，保留第一行 `@AGENTS.md`。

## 待使用者決策

- [ ] 登出後帳號專屬 LocalStorage／IndexedDB 是否清除、保留或提供手動清除。
- [ ] 舊 OAuth callback 的處置方式。
- [ ] Supabase redirect allowlist 中的開發用網址是否移除。
- [ ] 是否要實作照片失敗上傳時的資料格式改變；須先評估舊 public URL 相容性。
- [ ] 是否採用新的 Declutter 唯一識別值；須先評估既有資料遷移。
- [ ] 是否調整 GA4 事件語意與 page_view 觸發方式；須先確認 GA4 後台設定。
- [ ] 空間選擇九宮格是否調整。

## 完成定義

每個項目只有在取得對應證據、完成必要測試並記錄日期／範圍後，才能改為已完成。外部設定要記錄檢查位置與結果，但不要記錄秘密值。
