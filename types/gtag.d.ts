// GA4 gtag.js 全域型別（gtag.js 由 app/layout.tsx 以 next/script 載入）
// 原本宣告在 app/GoogleAnalytics.tsx，該 component 移除後保留於此，供各 component 的 window.gtag 使用
interface Window {
  gtag: (...args: unknown[]) => void
}
