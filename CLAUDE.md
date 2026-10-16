@AGENTS.md

# 整理小幫手（iamych.app）

H 的收整沙龍旗下的整理習慣養成 web app。正式站：https://iamych.app

## 與 H 合作的方式

- H 沒有程式背景，所有程式碼都由 Claude 撰寫。說明一律用繁體中文、白話，不要假設 H 看得懂術語；需要 H 手動操作的步驟（Supabase 後台、Vercel、Google Cloud）要寫成可照做的步驟。
- 直接給程式碼與結果，不需要冗長解說；改動完說明「改了什麼、怎麼驗證」即可。
- 介面文案以 H 原本的文字為基礎，不自行杜撰新資訊或新功能描述。
- 一次只做一件事、小步提交。動到登入、權限、資料庫、照片儲存時，先說明影響範圍再動手。
- 部署流程：`git push` 到 `main` → Vercel 自動部署。所以 push 前務必 `npm run build` 通過，push 等於上線。

## 產品定位

- 對象：想整理但不知道從哪裡開始的人，想自學整理／斷捨離、不一定會請整理師。
- 核心：陪伴感＋一步步引導（空間整理、斷捨離），讓人重新掌握空間、更享受生活。
- 設計理念：從整理師的角色延伸，把整理／收納心法融入每個功能，而不是只做工具。
- 標語：調整心情，安置物品，享受空間。
- 規劃中：「斷捨離日記」社群功能——跟物品告別並留下紀錄，給使用者成就感。
- 即將開始第一波對外推廣，穩定性與資料安全優先於新功能。

## 技術棧

- Next.js 16（App Router）+ React 19 + TypeScript + Tailwind CSS v4
- Supabase：Auth（Google Provider）、Postgres、Storage
- Recharts（會員頁統計圖）、html2canvas（圖片輸出）
- Vercel 託管；GA4 事件追蹤
- 注意：這版 Next.js 有破壞性變更，寫程式前先看 `node_modules/next/dist/docs/`（見 AGENTS.md）。

## 專案結構

```
app/
  page.tsx            主頁：6 個分頁的切換、登入狀態、Guest → 登入的資料遷移
  layout.tsx          metadata / Open Graph / GA4（NEXT_PUBLIC_GA_ID）
  api/feedback/       意見回饋 → Supabase feedback 表（service role）
  api/photos/         照片上傳／刪除（驗證 Bearer JWT）
  api/photos/sign/    產生照片 signed URL（驗證 JWT + 只能存取自己的資料夾）
  api/auth/callback/  舊版自製 Google OAuth callback（已不使用，見待辦）
components/
  HomeTab / ChecklistTab / DeclutterTab / ChallengeTab / RecommendTab / MemberTab
  StatsCharts（甜甜圈／長條圖）、PhotoImg（照片顯示，走 signed URL）
lib/
  supabase.ts   Supabase client、登入／登出、各資料表讀寫
  auth.ts       OAuthUser 型別；其餘 cookie 函式為舊版遺留
  photos.ts / photoRef.ts / photoSigner.ts   照片上傳、路徑解析、signed URL 快取
  types.ts      資料型別 + IndexedDB 存取
```

## 分頁

| id | 名稱 | 內容 |
|---|---|---|
| home | 首頁 | 入口與引導 |
| checklist | 整理清單 | 整理流程 + 計時、前後對照照片 |
| declutter | 斷捨離 | 留／捐／丟的決策流程、告別照片 |
| challenge | 每日丟一物 | 每日挑戰紀錄 |
| recommend | 收納推薦 | 收納用品推薦 |
| member | 我的整理 | 會員資料、統計圖、歷史紀錄 |

## 登入與資料（重要）

- 已決定的目標架構：**Supabase Auth + Google Provider + JWT + RLS + Private Storage**，用來修補先前的 P0 權限漏洞（舊版用自製 Google OAuth + 前端可讀的 `organizer_user` cookie 當身分，任何人都能偽造）。
- 目前狀態：前端登入已改為 Supabase Auth（PKCE），`getAuthUser()` 是唯一身分來源；照片 API 以 Bearer JWT 驗證身分，email 一律從 JWT 取，request body 的 email 只做比對、不當作擁有權依據。
- 帳號識別仍以 `user.email`（trim + 小寫）為 key，資料表與照片資料夾都用 email 分區。
- 資料表：`checklist_logs`、`declutter_records`、`challenge_data`、`feedback`。
- 照片：Supabase Storage bucket `photos`，路徑 `<email>/<key>.<jpg|png>`，key 格式 `checklist_<id>_(before|after)_<0-4>` 或 `toss_photo_<id>`；限 2MB、只收 JPEG／PNG。顯示時透過 `/api/photos/sign` 取 signed URL，快取只放記憶體。
- Guest（未登入）資料存在 localStorage（`checklist_draft`、`checklist_scheduled`、`declutter_draft`、`declutter_stage` 等）與 IndexedDB（照片）；登入後由 `page.tsx` 遷移到 Supabase。
- 原則：
  - 不要把 service role key 用在前端；只能出現在 `app/api/**` 的 server 端。
  - 任何新 API 都要驗證 JWT，不信任 client 傳來的 email／user id。
  - 新資料表一定要開 RLS 並寫 policy。
  - 修改 Supabase schema 或 RLS 前，先用 Supabase MCP 查現況（list_tables、get_advisors），再提出 migration。

## 環境變數

`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`NEXT_PUBLIC_GA_ID`、`NEXT_PUBLIC_BASE_URL`；舊版 OAuth 遺留：`NEXT_PUBLIC_GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`。`.env*` 不進 git，正式值在 Vercel 設定。

## GA4 事件

`page_view`、`checklist_started`、`checklist_saved`、`declutter_flow_entered`、`declutter_saved`、`challenge_started`、`challenge_entry_submitted`、`feedback_submitted`。新增追蹤點沿用 snake_case 命名。

## 其他注意

- LINE 等 App 內建瀏覽器（WebView）無法完成 Google 登入，介面已有提示，改登入流程時要保留。
- 手機優先：主要使用者在手機上操作，版面先確認窄螢幕。

## 待辦／技術債

- [ ] 確認 Supabase 上各資料表 RLS 與 `photos` bucket 已設為 private，再移除舊的公開網址邏輯（`lib/photos.ts` 的 `getRemotePhotoUrl`、`api/photos` 回傳的 public URL）。
- [ ] 刪除舊版 OAuth：`app/api/auth/callback/route.ts`、`lib/auth.ts` 的 cookie 函式（`OAuthUser` 型別保留或搬到 `lib/types.ts`）、Vercel 上不再需要的 Google 環境變數。
- [ ] 刪除根目錄誤建的檔案 `tate"`。
- [ ] README 仍是 create-next-app 預設內容，可改成專案說明。
- [ ] 斷捨離日記社群功能（規劃中）。
