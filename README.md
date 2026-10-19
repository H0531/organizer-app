# H 的收整沙龍｜整理小幫手

> 本 README 於 2026-10-19 依現行 Repo 唯讀核對報告、兩版交接文件比對結果與本地 Git 紀錄整理並匯入 repo。文件內容以目前程式碼為核對依據；本次文件整理未重新連線 GitHub 遠端、Supabase、Vercel 或 GA4。

## 專案概述

「H 的收整沙龍｜整理小幫手」是一個以低負擔整理行動為核心的 Web App，透過整理清單、斷捨離紀錄、每日挑戰、收納推薦與會員紀錄，協助使用者逐步開始整理並看見自己的進展。

## 技術概況

- Next.js 16.2.3
- React 19.2.4
- Supabase JS
- Tailwind CSS 4
- Recharts
- html2canvas

以上版本與套件資訊依 2026-10-19 的本地 `package.json` 盤點；之後請以 repo 內的 `package.json` 為準。

> 這個 Next.js 版本有 breaking changes。寫程式前請先依 `AGENTS.md` 閱讀 `node_modules/next/dist/docs/` 中的相關文件。

## 本機開發

```bash
npm install      # 安裝套件
npm run dev      # 啟動開發伺服器（預設 http://localhost:3000）
npm run build    # 正式建置
npm run start    # 以建置結果啟動
npm run lint     # ESLint 檢查
```

- 本機執行需要 Supabase 連線設定與 GA4 等環境設定，放在本機的 `.env.local`；需要哪些設定，以程式碼中的 `process.env` 引用為準。各環境的實際設定本文件未確認。
- `.env.local` 已被 `.gitignore` 排除。**密鑰與環境設定值不得提交到 Git，也不得寫入文件或在對話中輸出。**
- service role key 只能在 server-side route 使用，不得出現在 client 程式碼。
- Google 登入在本機或開發環境測試時，涉及 Supabase Auth 的 redirect allowlist 設定；修改外部設定前須取得明確授權（見 `docs/SECURITY.md`）。

## 文件導覽

- [`CLAUDE.md`](CLAUDE.md)：給 Claude Code 的協作規則
- [`docs/PRODUCT.md`](docs/PRODUCT.md)：產品定位與功能範圍
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：目前可見的架構與資料流程
- [`docs/SECURITY.md`](docs/SECURITY.md)：安全機制、歷史驗證紀錄、風險與未確認設定
- [`docs/DECISIONS.md`](docs/DECISIONS.md)：設計決策與待決事項
- [`docs/TODO.md`](docs/TODO.md)：待確認與待評估項目
- [`docs/WORKLOG.md`](docs/WORKLOG.md)：開發歷程、檢查基線與證據限制

## 重要狀態聲明

- 文件中的證據分為：程式碼可見、Git 紀錄可證實、歷史紀錄提及（未現況驗證）、未確認。
- 歷史紀錄中的測試結果與後台設定，不代表目前正式環境已重新驗證。
- Supabase Storage bucket 的 Public／Private 狀態、RLS policy、資料庫約束、Vercel 部署版本與 GA4 後台設定，目前都未重新確認。
- 最近一次檢查時的 Git 基線記錄在 `docs/WORKLOG.md`，不在本 README 維護。
- 若本文件描述與目前程式碼不一致，應以實際程式碼為準，並更新文件。
