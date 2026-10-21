// GA4 追蹤的判斷邏輯（純函式，方便測試）
// 只送固定允許清單內的值；不送使用者輸入內容、email 或其他個人資料

// ── home_entry_click ────────────────────────────────────────
// placement：首頁入口位置（實際存在於 components/HomeTab.tsx 的入口）
// - quiz：「今天你想做什麼？」選項
// - feature_card：功能介紹卡片底部的「開始 ○○ →」按鈕
// - text_link：功能介紹卡片標題的文字連結
// - stats_card：登入後的整理統計卡片
// - login_banner：未登入時的「登入」按鈕（前往我的整理）
export const HOME_ENTRY_PLACEMENTS = ['quiz', 'feature_card', 'text_link', 'stats_card', 'login_banner'] as const
export type HomeEntryPlacement = typeof HOME_ENTRY_PLACEMENTS[number]

export const HOME_ENTRY_TARGET_TABS = ['checklist', 'declutter', 'challenge', 'recommend', 'member'] as const
export type HomeEntryTargetTab = typeof HOME_ENTRY_TARGET_TABS[number]

// 不在允許清單內 → null（不送事件）
export function buildHomeEntryClickParams(placement: string, targetTab: string): { placement: HomeEntryPlacement; target_tab: HomeEntryTargetTab } | null {
  if (!(HOME_ENTRY_PLACEMENTS as readonly string[]).includes(placement)) return null
  if (!(HOME_ENTRY_TARGET_TABS as readonly string[]).includes(targetTab)) return null
  return { placement: placement as HomeEntryPlacement, target_tab: targetTab as HomeEntryTargetTab }
}

export function trackHomeEntryClick(placement: HomeEntryPlacement, targetTab: string): void {
  const params = buildHomeEntryClickParams(placement, targetTab)
  if (!params) return
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'home_entry_click', params)
  }
}

// ── tab page_view ───────────────────────────────────────────
// 點選目前已開啟的分頁不算換頁，不送 page_view
export function shouldSendTabPageView(currentTab: string, nextTab: string): boolean {
  return currentTab !== nextTab
}

// ── declutter_started ───────────────────────────────────────
// 一輪斷捨離的開始 = 清單是空的時候加入第一件物品
// - 恢復草稿（清單已有物品）不算開始
// - 同一輪已送過（連點、同一次 render 內重複呼叫）不再送
export function shouldTrackDeclutterStart(itemCountBeforeAdd: number, alreadyTrackedThisRound: boolean): boolean {
  return itemCountBeforeAdd === 0 && !alreadyTrackedThisRound
}
