// GA4 追蹤判斷邏輯（lib/analytics.ts）
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  HOME_ENTRY_PLACEMENTS, HOME_ENTRY_TARGET_TABS,
  buildHomeEntryClickParams, trackHomeEntryClick,
  shouldSendTabPageView, shouldTrackDeclutterStart,
} from '../../lib/analytics'

afterEach(() => { vi.unstubAllGlobals() })

function stubGtag() {
  const gtag = vi.fn()
  vi.stubGlobal('window', { gtag })
  return gtag
}

describe('home_entry_click', () => {
  it('每種允許的入口位置與分頁都送出 1 筆，參數只有 placement 與 target_tab', () => {
    for (const placement of HOME_ENTRY_PLACEMENTS) {
      for (const tab of HOME_ENTRY_TARGET_TABS) {
        const gtag = stubGtag()
        trackHomeEntryClick(placement, tab)
        expect(gtag).toHaveBeenCalledTimes(1)
        expect(gtag).toHaveBeenCalledWith('event', 'home_entry_click', { placement, target_tab: tab })
      }
    }
  })

  it('不在允許清單內的值不送事件', () => {
    const gtag = stubGtag()
    trackHomeEntryClick('quiz', 'home')
    trackHomeEntryClick('quiz', 'someone@example.test')
    trackHomeEntryClick('unknown' as never, 'checklist')
    expect(gtag).not.toHaveBeenCalled()
    expect(buildHomeEntryClickParams('quiz', '<script>')).toBeNull()
  })

  it('gtag 尚未載入時不丟錯誤', () => {
    vi.stubGlobal('window', {})
    expect(() => trackHomeEntryClick('quiz', 'checklist')).not.toThrow()
  })

  it('HomeTab.tsx 中每個呼叫的入口位置與目標分頁都在允許清單內', () => {
    const src = readFileSync(new URL('../../components/HomeTab.tsx', import.meta.url), 'utf8')
    const calls = [...src.matchAll(/trackHomeEntryClick\('([^']+)',\s*([^)]+)\)/g)]
    expect(calls.length).toBe(9)
    const literalTargets: string[] = []
    for (const [, placement, target] of calls) {
      expect(HOME_ENTRY_PLACEMENTS as readonly string[]).toContain(placement)
      const m = target.trim().match(/^'([^']+)'$/)
      if (m) literalTargets.push(m[1])
      else expect(['opt.tab', 'target', 'f.tab']).toContain(target.trim())
    }
    for (const t of literalTargets) expect(HOME_ENTRY_TARGET_TABS as readonly string[]).toContain(t)
  })
})

describe('tab page_view', () => {
  // 模擬 page.tsx handleTabChange：以 ref 記錄目前分頁
  function simulate(start: string, clicks: string[]) {
    let current = start
    let sent = 0
    for (const next of clicks) {
      if (shouldSendTabPageView(current, next)) sent++
      current = next
    }
    return sent
  }

  it('點選目前已開啟的分頁不送 page_view', () => {
    expect(shouldSendTabPageView('checklist', 'checklist')).toBe(false)
    expect(simulate('home', ['home', 'home'])).toBe(0)
  })

  it('切換到其他分頁，每次操作只送 1 筆', () => {
    expect(shouldSendTabPageView('home', 'checklist')).toBe(true)
    expect(simulate('home', ['checklist', 'checklist', 'declutter', 'home'])).toBe(3)
  })
})

describe('declutter_started', () => {
  // 模擬 components/DeclutterTab.tsx 的實際流程：
  // - mount：items=[]、startTrackedRef=false（DeclutterTab 只在斷捨離分頁時渲染，離開分頁即 unmount）
  // - 草稿恢復：useEffect 直接 setItems(draft.items)，不經過 addItem
  // - addItem：先用 shouldTrackDeclutterStart 判斷，再加入物品
  // - resetAll（再來一輪）／removeItem 刪到 0 件：items 變成 0 → effect 重置 startTrackedRef
  // 限制：這是流程模擬，不是 React 元件渲染測試（專案沒有瀏覽器測試環境）
  function mountDeclutterTab(draftItemCount = 0) {
    let items = 0
    let tracked = false
    let sent = 0
    const syncEffect = () => { if (items === 0) tracked = false }
    const tryTrack = (countSeenByClosure: number) => {
      if (shouldTrackDeclutterStart(countSeenByClosure, tracked)) { tracked = true; sent++ }
    }
    syncEffect()
    if (draftItemCount > 0) { items = draftItemCount; syncEffect() }
    return {
      addItem() { tryTrack(items); items++; syncEffect() },
      // 同一次 render 內呼叫 addItem 兩次（例如 Enter 與點擊幾乎同時）：兩次 closure 看到的 items 數量相同
      addItemTwiceSameRender() { const seen = items; tryTrack(seen); tryTrack(seen); items += 2; syncEffect() },
      // 重新渲染：不呼叫 addItem，只有 effect 依 items.length 執行
      rerender() { syncEffect() },
      resetAll() { items = 0; syncEffect() },
      removeAll() { items = 0; syncEffect() },
      get sent() { return sent },
    }
  }

  it('1. 清單為空時加入第一件物品 → 只送 1 次', () => {
    const t = mountDeclutterTab()
    t.addItem()
    expect(t.sent).toBe(1)
  })

  it('2. 同一輪繼續加入物品 → 不再送', () => {
    const t = mountDeclutterTab()
    t.addItem(); t.addItem(); t.addItem()
    expect(t.sent).toBe(1)
  })

  it('3. 恢復既有草稿後繼續加入 → 不送', () => {
    const t = mountDeclutterTab(3)
    t.addItem()
    expect(t.sent).toBe(0)
  })

  it('4. 按「再來一輪」(resetAll) 後加入第一件 → 再送 1 次', () => {
    const t = mountDeclutterTab()
    t.addItem(); t.addItem()
    t.resetAll()
    t.addItem(); t.addItem()
    expect(t.sent).toBe(2)
  })

  it('5. 儲存後離開分頁（unmount、草稿已清除），回來開始新一輪 → 再送 1 次', () => {
    const first = mountDeclutterTab()
    first.addItem(); first.addItem()
    // 儲存成功後 handleSave 清除草稿；離開分頁 → unmount；回來 → 沒有草稿的新 mount
    const second = mountDeclutterTab(0)
    second.addItem()
    expect(first.sent + second.sent).toBe(2)
  })

  it('6. 手動刪除所有物品後再加入第一件 → 視為新的一輪，再送 1 次', () => {
    const t = mountDeclutterTab()
    t.addItem(); t.addItem()
    t.removeAll()
    t.addItem()
    expect(t.sent).toBe(2)
  })

  it('6b. 恢復草稿後刪光再加入 → 視為新的一輪，送 1 次', () => {
    const t = mountDeclutterTab(2)
    t.removeAll()
    t.addItem()
    expect(t.sent).toBe(1)
  })

  it('7. 重新渲染或同一次 render 內重複呼叫 → 同一輪不重複送', () => {
    const t = mountDeclutterTab()
    t.addItemTwiceSameRender()
    t.rerender(); t.rerender()
    t.addItem()
    expect(t.sent).toBe(1)
  })

  it('判斷函式本身：只有「加入前 0 件且這輪尚未送過」才回傳 true', () => {
    expect(shouldTrackDeclutterStart(0, false)).toBe(true)
    expect(shouldTrackDeclutterStart(0, true)).toBe(false)
    expect(shouldTrackDeclutterStart(1, false)).toBe(false)
  })
})
