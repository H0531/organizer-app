# Decisions｜設計決策與待決事項

> 協作習慣（繁體中文、先講結論、一次一個步驟、結果標記等）記錄在 `CLAUDE.md`，本文件不重複。

## 狀態標記
- **歷史明確**：可由使用者過去明確要求／決定支持。
- **現行實作**：現行 Repo 唯讀報告指出程式中有相應邏輯。
- **待驗證**：程式碼或外部環境尚未完整驗證。
- **待決策**：需要使用者決定，不得由 AI 自行定案。

## D-001：先唯讀盤點，再決定修改
**狀態：歷史明確，長期協作規則。**

執行功能修改前，先確認目前檔案、相關流程、Git 狀態與修改範圍。不要將分析任務擴大為重構或清理工作。遇到不確定事項先列出，不猜測。

## D-002：未經明確授權，不操作外部服務或部署
**狀態：歷史明確，長期協作規則。**

不得擅自修改 Supabase、Vercel、GA4、資料庫、Storage、OAuth 設定；不得擅自 commit、push 或部署。使用者自行執行 Bash／Codespaces 命令並處理 Git 推送，除非另有明確指示。

## D-003：Guest 草稿認領先保留資料
**狀態：現行實作可見；需保留設計原則。**

草稿先寫入帳號 key，再刪 Guest key；若帳號已有草稿，視為衝突，兩份都保留。未經授權不要改成無條件覆蓋或清除。

## D-004：Guest 紀錄遷移先確認雲端
**狀態：現行實作可見。**

Checklist／Declutter 遷移先確認雲端紀錄，再決定是否 INSERT。雲端已有相同資料可視為已同步；內容不同則不覆蓋；雲端狀態未知則停止遷移。這些防護不可為了簡化程式而直接移除。

## D-005：Challenge 有獨立同步／遷移流程
**狀態：現行實作可見。**

Challenge 不走 Checklist／Declutter 的同一套 migration；它會比較本機 snapshot 與雲端狀態。修改時必須獨立檢查其同步與資料保留行為。

## D-006：照片讀取使用 resolver／簽名 URL
**狀態：歷史明確且現行程式可見；bucket Private 已由 Dashboard 人工確認（2026-10-20）；跨帳號實測待補。**

歷史上逐步加入 `PhotoImg`、`photoRef`、`photoSigner` 與 sign API，目標是不再從 browser 直接讀 public URL、不保留 public fallback。修改照片資料格式前，必須考慮既有資料可能保存 public URL。程式使用 signed URL 不代表 bucket 已確認為 Private。

2026-10-20：使用者在 Dashboard 確認 `photos` bucket 為 Private、沒有 Storage policies，符合「只由 server route 以 service role 存取」的設計（見 `docs/SECURITY.md` §6）。這是設定確認，照片 API 的跨帳號情境仍沒有實測證據。

## D-007：照片刪除採保守清理
**狀態：現行實作可見。**

刪除紀錄時先確認 DB 刪除成功，再嘗試清理 Storage；清理前限制本人資料夾、key 前綴與引用情況。狀態不確定時寧可保留檔案，也不要誤刪其他紀錄仍在使用的照片。

## D-008：GA4 以手動 tab page_view 為歷史方案
**狀態：歷史明確；目前後台設定待驗證。**

2026-10-08 的歷史決策是將 GA4「依瀏覽器記錄變更網頁」設定維持 OFF，保留 `handleTabChange` 手動 `page_view`，不恢復舊 `GoogleAnalytics.tsx`／GATracker。此為歷史決策；GA4 後台目前狀態與正式事件收取未重新確認。

## D-009：登出後是否清除帳號本機快取
**狀態：待決策。**

現行登出會載入 Guest 資料，但帳號專屬 LocalStorage 與 IndexedDB 照片仍留在裝置。應先決定隱私需求與多帳號使用情境，再決定是否清除、保留或提供使用者控制；不得擅自刪除。

## D-010：移除舊 OAuth callback
**狀態：待驗證／待決策。**

舊 route 目前不是主要身份來源，但仍存在。需先確認 Google Console redirect 設定與是否有其他外部依賴，再決定停用或刪除。

使用者已表達移除舊 OAuth callback 的意圖（2026-10-16 的說明）；但執行前仍須確認 Google Console 與其他外部依賴（例如 Vercel 上是否仍保留相關設定），並另行取得授權。

## D-011：Storage bucket 與 RLS 狀態
**狀態：設定已由 Dashboard 人工確認（2026-10-20）；跨帳號實測待補。**

2026-10-02 的歷史紀錄曾記載在 Supabase 後台將 `photos` bucket 改為 Private（後台操作，非 Git commit）。這是歷史設定紀錄，不代表目前狀態；目前 Public／Private 設定尚未重新驗證，詳見 `docs/SECURITY.md`。RLS policy 目前也未確認。不得寫成已確認 Private，也不得在未取得授權前修改設定。（以上為 2026-10-19 的紀錄，保留作為歷史。）

2026-10-20 更新：使用者在 Supabase Dashboard 人工確認——`photos` bucket 為 Private、沒有 Storage policies；三張主要資料表已啟用 RLS，各有四條以 JWT email 比對 `user_email` 的政策；`feedback` 已啟用 RLS 且沒有政策。這些是**設定確認**，不是安全測試結果；跨帳號實測仍沒有可核實證據（見 `docs/SECURITY.md` §6.3）。修改這些設定仍須另行取得授權。

## D-012：修正已知程式風險需獨立授權
**狀態：待處理。**

`saveLS` 可能丟失舊資料、Declutter 更新缺少身份切換檢查、圖片壓縮錯誤處理、計時器一致性等，均需先完成影響盤點，再分項提出最小修改方案。交接文件製作本身不授權修改這些程式。

## D-013：不由 AI 自行決定的產品事項
**狀態：歷史明確。**

不要自行改變產品定位、新增或刪除主要功能、重做整體 UX；不要把歷史討論中的 UX 想法（例如九宮格調整）當成已批准需求。可疑或誤提交的檔案（例如 `tate"`、`.env.loecho`）先回報，不自行清除。

## D-014：目標身份與資料保護架構
**狀態：歷史明確（使用者決定）；部分現行實作可見；其餘待驗證。**

目標架構為 Supabase Auth（Google）＋ JWT ＋ RLS ＋ Private Storage，用來取代舊版自製 Google OAuth 與用戶端可修改的 `organizer_user` cookie（cookie 的問題見 `docs/SECURITY.md` §7）。

- 現行實作可見：前端登入已改為 Supabase Auth（PKCE）；照片 API 以伺服器驗證過的 JWT 決定身份。
- Dashboard 人工確認（2026-10-20）：三張主要資料表與 `feedback` 已啟用 RLS；`photos` bucket 為 Private；Google Provider 已啟用，Email Provider 與匿名登入為 Disabled，其他 OAuth provider 的狀態未個別記錄。
- 待驗證：跨帳號資料隔離與照片存取的實測（見 `docs/SECURITY.md` §6.3）。
- 這是架構目標，**不代表所有安全機制已經完成或通過驗證**；設定已確認，但在跨帳號實測取得證據前，不可宣稱此架構已通過安全驗證。
- 細節分別見：照片讀取 D-006、舊 OAuth 移除 D-010、Storage 與 RLS 狀態 D-011。
