'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import HomeTab from '@/components/HomeTab'
import ChecklistTab from '@/components/ChecklistTab'
import DeclutterTab from '@/components/DeclutterTab'
import ChallengeTab from '@/components/ChallengeTab'
import RecommendTab from '@/components/RecommendTab'
import MemberTab from '@/components/MemberTab'
import type { DeclutterRecord, ChecklistLog, TossEntry } from '@/lib/types'
import { loadLS, saveLS, savePhoto, loadPhoto, LS_CHECKLIST_LOGS, LS_DECLUTTER_RECORDS } from '@/lib/types'
import type { OAuthUser } from '@/lib/auth'
import {
  sbLoadChecklistLogs, sbSaveChecklistLog, sbDeleteChecklistLog, sbConfirmChecklistLog,
  sbLoadDeclutterRecords, sbSaveDeclutterRecord, sbDeleteDeclutterRecord,
  sbConfirmDeclutterRecord, sbInsertChecklistLogForMigration, sbInsertDeclutterRecordForMigration,
  supabase, getAuthUser, toAppUser,
} from '@/lib/supabase'
import { uploadPhoto, deleteRemotePhoto, storageKeyFromPhotoRef } from '@/lib/photos'
import { parsePhotoRef } from '@/lib/photoRef'

export type AppTab = 'home' | 'checklist' | 'declutter' | 'challenge' | 'recommend' | 'member'

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'home',      label: '首頁',    icon: '✦'  },
  { id: 'checklist', label: '整理清單', icon: '🗂' },
  { id: 'declutter', label: '斷捨離',  icon: '♻️' },
  { id: 'challenge', label: '每日丟一物', icon: '🎯' },
  { id: 'recommend', label: '收納推薦', icon: '📦' },
  { id: 'member',    label: '我的整理', icon: '👤' },
]

const ink = '#2C2820', sg = '#7A9E8A', bd = '#DDD8CF', ml = '#6B6358'
const TAB_KEY = 'active_tab'

// ── Toast ──────────────────────────────────────────────────────
type ToastType = 'error' | 'success'
function Toast({ message, type, onDone }: { message: string; type: ToastType; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: type === 'error' ? '#C47B5A' : '#7A9E8A',
      color: 'white', borderRadius: 10, padding: '10px 20px',
      fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {type === 'error' ? '⚠️ ' : '✅ '}{message}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  )
}

// ── Loading Spinner ────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(245,240,232,0.85)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, border: `3px solid #DDD8CF`,
        borderTop: `3px solid #7A9E8A`, borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: 13, color: '#6B6358' }}>載入資料中⋯</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ── ChecklistLog 資料統一 ─────────────────────────────────────
// Guest（LocalStorage）與登入（Supabase）兩種來源進入 state 前都經過這裡：
// - 補齊欄位預設值，確保 MemberTab / ChecklistTab 拿到同一種 ChecklistLog 結構
// - 照片保留原字串（Guest 為 data URL、登入後為 Storage URL，兩者都可直接當 img src）
// - 依建立時間排序（id = 建立時的 Date.now()），新到舊；
//   Supabase 原本依 updated_at 排序，migration 或編輯心得後順序會與 Guest 不同
function normalizeChecklistLogs(list: unknown): ChecklistLog[] {
  if (!Array.isArray(list)) return []
  const toStr = (v: unknown) => (typeof v === 'string' ? v : '')
  const toNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
  const toPhotos = (v: unknown) => Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && p !== '') : []
  const logs: ChecklistLog[] = list
    .filter(l => l && typeof l === 'object')
    .map(raw => {
      const l = raw as Partial<ChecklistLog>
      return {
        ...l,
        id: String(l.id ?? ''),
        date: toStr(l.date),
        space: toStr(l.space),
        note: toStr(l.note),
        beforePhotos: toPhotos(l.beforePhotos),
        afterPhotos: toPhotos(l.afterPhotos),
        duration: toNum(l.duration),
        targetMinutes: toNum(l.targetMinutes),
      }
    })
  return logs
    .map((l, i) => ({ l, i }))
    .sort((a, b) => {
      const x = Number(a.l.id), y = Number(b.l.id)
      if (Number.isFinite(x) && Number.isFinite(y) && x !== y) return y - x
      return a.i - b.i
    })
    .map(o => o.l)
}

// Guest checklist_logs 專用安全寫入：
// 直接 setItem 覆蓋，失敗只 catch，不先 removeItem 再重試（saveLS 的做法在第二次也失敗時會讓舊資料整個消失）
// setItem 拋出例外（例如容量不足）時，瀏覽器不會改動 key 原本的值 → 已成功保存的舊紀錄維持原樣
function safeSaveChecklistLogs(next: ChecklistLog[]): boolean {
  try {
    localStorage.setItem(LS_CHECKLIST_LOGS, JSON.stringify(next))
    return true
  } catch (err) {
    console.warn('safeSaveChecklistLogs: localStorage write failed', err)
    return false
  }
}

// Guest：讀取 LocalStorage 實際保存的 checklist_logs（以實際保存內容為基準組新資料，不依賴畫面 state）
function loadPersistedChecklistLogs(): ChecklistLog[] {
  const raw = loadLS<unknown>(LS_CHECKLIST_LOGS, [])
  return Array.isArray(raw) ? (raw as ChecklistLog[]) : []
}

// ── 草稿帳號隔離：登入時認領 Guest 草稿 ────────────────────
// Guest 草稿 key：checklist_draft / declutter_draft / declutter_stage
// 帳號草稿 key：同名加上 `__${email}`（與 loadLS / saveLS 第三個參數相同的命名）
// 規則：帳號沒有自己的草稿 → 先把 Guest 原字串寫進帳號 key，全部成功後才刪 Guest key（永遠先寫後刪）
//       帳號已有自己的草稿 → 兩份都不動，回報 conflict
//       寫入失敗（例如容量不足）→ 撤回這次新寫入的帳號 key、保留 Guest key，回報 failed
type DraftClaimResult = { conflict: boolean; failed: boolean; scheduledConflict: boolean; scheduledFailed: boolean }
function claimGuestDrafts(email: string): DraftClaimResult {
  const result: DraftClaimResult = { conflict: false, failed: false, scheduledConflict: false, scheduledFailed: false }
  if (typeof window === 'undefined') return result
  const has = (raw: string | null) => raw !== null && raw !== 'null'
  const acct = (key: string) => `${key}__${email}`
  try {
    // ── 整理清單草稿 ──
    const clGuest = localStorage.getItem('checklist_draft')
    if (has(clGuest)) {
      if (has(localStorage.getItem(acct('checklist_draft')))) {
        result.conflict = true
      } else {
        try {
          localStorage.setItem(acct('checklist_draft'), clGuest as string)
          localStorage.removeItem('checklist_draft')
        } catch (err) {
          console.warn('claimGuestDrafts: checklist_draft write failed', err)
          result.failed = true
        }
      }
    }
    // ── 斷捨離草稿 + 階段（一組；只有 stage 沒有 draft 時不認領、不刪除）──
    const dcGuest = localStorage.getItem('declutter_draft')
    if (has(dcGuest)) {
      if (has(localStorage.getItem(acct('declutter_draft')))) {
        result.conflict = true
      } else {
        const stGuest = localStorage.getItem('declutter_stage')
        let draftWritten = false
        try {
          localStorage.setItem(acct('declutter_draft'), dcGuest as string)
          draftWritten = true
          // 帳號 stage 與 Guest 一致：Guest 有 stage 就一起搬；沒有則移除帳號殘留的 stage（沒有草稿時它沒有意義）
          if (has(stGuest)) localStorage.setItem(acct('declutter_stage'), stGuest as string)
          else localStorage.removeItem(acct('declutter_stage'))
          // 兩者都寫入成功才刪 Guest
          localStorage.removeItem('declutter_draft')
          localStorage.removeItem('declutter_stage')
        } catch (err) {
          console.warn('claimGuestDrafts: declutter draft/stage write failed', err)
          // stage 寫入失敗：撤回剛寫入的帳號草稿（帳號原本沒有草稿），Guest 兩個 key 保持原樣
          if (draftWritten) { try { localStorage.removeItem(acct('declutter_draft')) } catch { /* ignore */ } }
          result.failed = true
        }
      }
    }
    // ── 整理清單預約（可能含整理前照片原圖）：同樣規則，直接搬原始字串；'[]' 視為沒有預約 ──
    const hasScheduled = (raw: string | null) => has(raw) && raw !== '[]'
    const scGuest = localStorage.getItem('checklist_scheduled')
    if (hasScheduled(scGuest)) {
      if (hasScheduled(localStorage.getItem(acct('checklist_scheduled')))) {
        result.scheduledConflict = true
      } else {
        try {
          localStorage.setItem(acct('checklist_scheduled'), scGuest as string)
          localStorage.removeItem('checklist_scheduled')
        } catch (err) {
          // setItem 失敗不會寫入任何內容（帳號 key 維持原狀），Guest key 保留
          console.warn('claimGuestDrafts: checklist_scheduled write failed', err)
          result.scheduledFailed = true
        }
      }
    }
  } catch (err) {
    console.warn('claimGuestDrafts failed', err)
    result.failed = true
  }
  return result
}

// 舊 Guest 告別文照片（IndexedDB 內可能是未壓縮原圖）在 migration 上傳前壓縮：
// 與整理日記相同規格（長邊最大 800px、JPEG、quality 0.5）；無法解碼時原樣上傳
function compressPhotoForUpload(src: string): Promise<string> {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      const max = 800; const r = Math.min(max / img.width, max / img.height, 1)
      c.width = img.width * r; c.height = img.height * r
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      res(c.toDataURL('image/jpeg', 0.5))
    }
    img.onerror = () => res(src)
    img.src = src
  })
}

// ── Guest → 登入 migration（per-record）──────────────────────
// 規則：
// - 一律先 confirm 雲端（唯讀），確定 absent 才上傳照片、才 INSERT（照片 key 固定且 upsert，先上傳會覆蓋雲端照片）
// - 雲端已存在：內容相同 → alreadySynced（清除 Guest 該筆）；內容不同 → conflict（不覆蓋、不清除）
// - 每筆成功後只從「最新」LocalStorage 移除該筆 snapshot，不整批 removeItem
// - 單筆失敗 / conflict 繼續下一筆；confirm = unknown（session / 網路 / 帳號不符）才停止整批
type MigrationCounts = { migrated: number; alreadySynced: number; conflicts: number; failed: number; pending: number }
type MigrationResult = { checklist: MigrationCounts; declutter: MigrationCounts }
type RecordOutcome = 'migrated' | 'alreadySynced' | 'conflict' | 'failed' | 'stop'
const emptyMigrationCounts = (): MigrationCounts => ({ migrated: 0, alreadySynced: 0, conflicts: 0, failed: 0, pending: 0 })

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// 嚴格 JSON 內容比對：
// - object：不看 key 順序，比較所有 key 的聯集；undefined 與缺少該 key 視為相同（JSON 序列化後相同）
// - array：順序有意義，逐項比對
// - primitive：=== 嚴格比較，不做型別轉換
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => sameJson(v, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (!sameJson(a[k], b[k])) return false
    }
    return true
  }
  return false
}

// 照片陣列比對：長度必須相同；
// Guest 為 data URL → 雲端同位置必須是本帳號 folder 下、key 完全等於預期 key 的 Storage reference；
// Guest 不是 data URL → 嚴格字串比較
function samePhotoList(guest: unknown, cloud: unknown, email: string, keyFor: (i: number) => string): boolean {
  const g = guest ?? []
  const c = cloud ?? []
  if (!Array.isArray(g) || !Array.isArray(c) || g.length !== c.length) return false
  return g.every((src, i) =>
    typeof src === 'string' && src.startsWith('data:')
      ? storageKeyFromPhotoRef(c[i], email, keyFor(i), true) !== null
      : src === c[i])
}

function sameChecklistForMigration(guest: Record<string, unknown>, cloud: unknown, email: string): boolean {
  if (!isPlainObject(cloud)) return false
  const id = String(guest.id)
  return sameJson({ ...guest, beforePhotos: undefined, afterPhotos: undefined }, { ...cloud, beforePhotos: undefined, afterPhotos: undefined })
    && samePhotoList(guest.beforePhotos, cloud.beforePhotos, email, i => `checklist_${id}_before_${i}`)
    && samePhotoList(guest.afterPhotos, cloud.afterPhotos, email, i => `checklist_${id}_after_${i}`)
}

// guestPhotoSrcs[i]：第 i 筆告別文實際要遷移的照片（entry.photo，沒有時為 IndexedDB toss_photo_${id}）
function sameDeclutterForMigration(
  guest: Record<string, unknown>,
  guestPhotoSrcs: (string | undefined)[],
  cloud: unknown,
  email: string
): boolean {
  if (!isPlainObject(cloud)) return false
  if (!sameJson({ ...guest, tossEntries: undefined }, { ...cloud, tossEntries: undefined })) return false
  const g = (guest.tossEntries ?? []) as unknown
  const c = (cloud.tossEntries ?? []) as unknown
  if (!Array.isArray(g) || !Array.isArray(c) || g.length !== c.length) return false
  return g.every((ge, i) => {
    const ce = c[i]
    if (!isPlainObject(ge) || !isPlainObject(ce)) return false
    if (!sameJson({ ...ge, photo: undefined }, { ...ce, photo: undefined })) return false
    const src = guestPhotoSrcs[i]
    if (src && src.startsWith('data:')) return storageKeyFromPhotoRef(ce.photo, email, `toss_photo_${String(ge.id)}`, true) !== null
    // 非 data URL：與 migration 寫入的值相同（有 src 寫 src；沒有則維持 entry 原本的 photo 值）
    return src ? ce.photo === src : ce.photo === ge.photo
  })
}

// 讀取 Guest 陣列：key 不存在 → []；無法解析或不是陣列 → null（不可清除、不可遷移）
function readGuestArray(key: string): unknown[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// 只從「當下最新」的 Guest 陣列移除與 snapshot 嚴格相同的第一筆；其餘（含 migration 期間其他 tab 新增的）原樣保留
// read → compare → write 全程同步（無 await）；parse 失敗或不是陣列 → 不刪除任何資料
function removeMigratedGuestRecord(key: string, snapshot: unknown): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return false
    const list: unknown = JSON.parse(raw)
    if (!Array.isArray(list)) return false
    const idx = list.findIndex(r => sameJson(r, snapshot))
    if (idx < 0) return false
    const next = list.filter((_, i) => i !== idx)
    if (next.length === 0) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(next))
    return true
  } catch (err) {
    console.warn('removeMigratedGuestRecord failed', key, err)
    return false
  }
}

function cleanupAfterMigration(key: string, snapshot: unknown, outcome: 'migrated' | 'alreadySynced'): RecordOutcome {
  // 清除失敗不影響雲端結果：下次 migration 會判定為 alreadySynced 再清除
  if (!removeMigratedGuestRecord(key, snapshot)) console.warn('migration: guest record not removed (will retry next time)', key)
  return outcome
}

async function migrateChecklistLog(email: string, raw: unknown): Promise<RecordOutcome> {
  // malformed：不是物件、沒有 id、照片欄位不是字串陣列（舊資料缺欄位視為 []）
  if (!isPlainObject(raw) || typeof raw.id !== 'string' || raw.id === '') return 'failed'
  const before = raw.beforePhotos ?? []
  const after = raw.afterPhotos ?? []
  if (!Array.isArray(before) || !Array.isArray(after)) return 'failed'
  if (![...before, ...after].every(p => typeof p === 'string')) return 'failed'
  const id = raw.id

  // 1. 先確認雲端（上傳照片之前）
  const confirmation = await sbConfirmChecklistLog(email, id)
  if (confirmation.status === 'unknown') return 'stop'
  if (confirmation.status === 'present') {
    if (!sameChecklistForMigration(raw, confirmation.log, email)) return 'conflict'
    return cleanupAfterMigration(LS_CHECKLIST_LOGS, raw, 'alreadySynced')
  }

  // 2. absent → 上傳照片
  const uploadList = async (list: string[], slot: 'before' | 'after'): Promise<string[] | null> => {
    const out: string[] = []
    for (let i = 0; i < list.length; i++) {
      const src = list[i]
      if (src.startsWith('data:')) {
        const url = await uploadPhoto(email, `checklist_${id}_${slot}_${i}`, src)
        if (!url) return null
        out.push(url)
      } else {
        out.push(src)
      }
    }
    return out
  }
  const migratedBefore = await uploadList(before as string[], 'before')
  if (!migratedBefore) return 'failed'
  const migratedAfter = await uploadList(after as string[], 'after')
  if (!migratedAfter) return 'failed'

  // 3. 純 INSERT（不覆蓋）
  const migratedLog = { ...raw, beforePhotos: migratedBefore, afterPhotos: migratedAfter } as ChecklistLog
  const inserted = await sbInsertChecklistLogForMigration(email, migratedLog)
  if (inserted === 'inserted') return cleanupAfterMigration(LS_CHECKLIST_LOGS, raw, 'migrated')
  if (inserted === 'duplicate') {
    // 期間已被寫入（例如另一個 tab 的 migration）→ 重新確認內容
    const again = await sbConfirmChecklistLog(email, id)
    if (again.status === 'unknown') return 'stop'
    if (again.status === 'present') {
      if (!sameChecklistForMigration(raw, again.log, email)) return 'conflict'
      return cleanupAfterMigration(LS_CHECKLIST_LOGS, raw, 'alreadySynced')
    }
    return 'failed'
  }
  return 'failed'
}

async function migrateDeclutterRecord(email: string, raw: unknown): Promise<RecordOutcome> {
  // malformed：不是物件、沒有 savedAt、items 不是陣列、告別文不是含 id 的物件陣列（舊資料缺欄位視為 []）
  if (!isPlainObject(raw) || typeof raw.savedAt !== 'string' || raw.savedAt === '') return 'failed'
  if (!Array.isArray(raw.items)) return 'failed'
  const entriesRaw = raw.tossEntries ?? []
  if (!Array.isArray(entriesRaw)) return 'failed'
  if (!entriesRaw.every(e => isPlainObject(e) && typeof e.id === 'string')) return 'failed'
  const entries = entriesRaw as TossEntry[]
  const savedAt = raw.savedAt

  // 0. 決定每筆告別文要遷移的照片（唯讀）：entry.photo，沒有時讀 IndexedDB toss_photo_${id}
  const photoSrcs: (string | undefined)[] = []
  const fromIdb: boolean[] = []
  for (const e of entries) {
    let src = e.photo
    let idb = false
    if (!src) {
      try { src = await loadPhoto(`toss_photo_${e.id}`) } catch { src = undefined }
      idb = !!src
    }
    photoSrcs.push(src)
    fromIdb.push(idb)
  }

  // 1. 先確認雲端（上傳照片之前）
  const confirmation = await sbConfirmDeclutterRecord(email, savedAt)
  if (confirmation.status === 'unknown') return 'stop'
  if (confirmation.status === 'present') {
    if (!sameDeclutterForMigration(raw, photoSrcs, confirmation.record, email)) return 'conflict'
    return cleanupAfterMigration(LS_DECLUTTER_RECORDS, raw, 'alreadySynced')
  }

  // 2. absent → 上傳照片
  const migratedEntries: TossEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const src = photoSrcs[i]
    if (src && src.startsWith('data:')) {
      // 舊 IDB 照片可能是未壓縮原圖，先壓縮避免超過上傳大小限制
      const payload = fromIdb[i] ? await compressPhotoForUpload(src) : src
      const url = await uploadPhoto(email, `toss_photo_${e.id}`, payload)
      if (!url) return 'failed'
      migratedEntries.push({ ...e, photo: url })
    } else {
      migratedEntries.push(src ? { ...e, photo: src } : e)
    }
  }

  // 3. 純 INSERT（不覆蓋）
  const migratedRecord = { ...raw, tossEntries: migratedEntries } as DeclutterRecord
  const inserted = await sbInsertDeclutterRecordForMigration(email, migratedRecord)
  if (inserted === 'inserted') return cleanupAfterMigration(LS_DECLUTTER_RECORDS, raw, 'migrated')
  if (inserted === 'duplicate') {
    const again = await sbConfirmDeclutterRecord(email, savedAt)
    if (again.status === 'unknown') return 'stop'
    if (again.status === 'present') {
      if (!sameDeclutterForMigration(raw, photoSrcs, again.record, email)) return 'conflict'
      return cleanupAfterMigration(LS_DECLUTTER_RECORDS, raw, 'alreadySynced')
    }
    return 'failed'
  }
  return 'failed'
}

export default function Home() {
  const [tab, setTab]                           = useState<AppTab>('home')
  const [user, setUser]                         = useState<OAuthUser | null>(null)
  const [declutterRecords, setDeclutterRecords] = useState<DeclutterRecord[]>([])
  const [checklistLogs, setChecklistLogs]       = useState<ChecklistLog[]>([])
  const [loading, setLoading]                   = useState(false)
  const [toast, setToast]                       = useState<{ message: string; type: ToastType } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 同一次登入生命週期（同一次 mount）只執行一次 guest→cloud migration，
  // 避免 page.tsx 初始化流程與 MemberTab.tsx 的 auth=success 流程同時觸發兩次。
  // 記錄每個 email 的 migration Promise（進行中或已完成都保留）：
  // 之後同一 email 的 loadUserData 不重跑 migration，而是 await 同一個 Promise，
  // 確保 migration 完成前不會讀雲端、也不會提前結束 loading
  const migrationPromisesRef = useRef<Map<string, Promise<MigrationResult>>>(new Map())
  // 目前畫面所屬的登入帳號（null = Guest）。非同步載入完成時用來確認使用者沒有在途中登出／切換，
  // 避免已登出後，晚回來的 Supabase 私人資料被寫進畫面（進而被 Guest 儲存寫入 LocalStorage）
  const activeEmailRef = useRef<string | null>(null)
  // 草稿認領提示：同一次頁面生命週期、同一個 email 最多提示一次（OAuth 回來的重複 loadUserData、改名時不重複跳）
  const draftNoticeShownRef = useRef<Set<string>>(new Set())
  // ── 登入身分（Supabase Auth）初始化狀態 ──
  // authReady=false 時不渲染任何資料分頁：避免身分尚未確認就以 Guest 身分讀寫 LocalStorage
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(false)
  // 是否已套用過第一次身分（之後的 auth 事件只在「身分真的改變」時才切換資料）
  const authResolvedRef = useRef(false)

  // Guest 資料：一律從 LocalStorage 讀取（只讀不寫，不會把 Supabase 資料複製回來）
  const loadGuestData = useCallback(() => {
    setDeclutterRecords(loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, []))
    setChecklistLogs(normalizeChecklistLogs(loadLS<unknown>(LS_CHECKLIST_LOGS, [])))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
  }, [])

  // Guest LocalStorage 資料 → 登入後 migration 至該 email 的 Supabase（per-record，見上方 migrateChecklistLog / migrateDeclutterRecord）
  // 只處理 checklist_logs 與 declutter_records（不處理 challenge_data）
  const migrateGuestData = useCallback(async (u: OAuthUser): Promise<MigrationResult> => {
    const email = u.email
    const result: MigrationResult = { checklist: emptyMigrationCounts(), declutter: emptyMigrationCounts() }
    // 整批停止：confirm = unknown（session / 帳號 / 網路無法確認）或畫面帳號已改變 → 後續 records 一律不寫
    let stopped = false

    const runBatch = async (
      key: string,
      counts: MigrationCounts,
      migrateOne: (email: string, raw: unknown) => Promise<RecordOutcome>
    ) => {
      const list = readGuestArray(key)
      if (list === null) {
        // 整個 key 無法解析：不遷移、不清除，以 1 筆 failed 計（保留給使用者／之後處理）
        console.error('migrateGuestData: guest data unreadable', key)
        counts.failed += 1
        return
      }
      for (let i = 0; i < list.length; i++) {
        if (stopped || activeEmailRef.current !== email) {
          stopped = true
          counts.pending += list.length - i
          return
        }
        let outcome: RecordOutcome
        try {
          outcome = await migrateOne(email, list[i])
        } catch (err) {
          console.error('migrateGuestData: record migration failed', key, err)
          outcome = 'failed'
        }
        if (outcome === 'stop') {
          stopped = true
          counts.pending += list.length - i
          return
        }
        if (outcome === 'migrated') counts.migrated += 1
        else if (outcome === 'alreadySynced') counts.alreadySynced += 1
        else if (outcome === 'conflict') counts.conflicts += 1
        else counts.failed += 1
      }
    }

    await runBatch(LS_CHECKLIST_LOGS, result.checklist, migrateChecklistLog)
    await runBatch(LS_DECLUTTER_RECORDS, result.declutter, migrateDeclutterRecord)

    const unsynced = result.checklist.failed + result.checklist.pending + result.declutter.failed + result.declutter.pending
    const conflicts = result.checklist.conflicts + result.declutter.conflicts
    if (unsynced > 0 || conflicts > 0) console.warn('migrateGuestData result', result)
    // 只在畫面仍屬於這個帳號時提示；未同步（可重試）優先於 conflict
    if (activeEmailRef.current === email) {
      if (unsynced > 0) showToast('部分資料尚未同步，稍後會再試。')
      else if (conflicts > 0) showToast(`有 ${conflicts} 筆資料與雲端版本不同，暫時未同步。`)
    }
    return result
  }, [showToast])

  const loadUserData = useCallback(async (u: OAuthUser) => {
    activeEmailRef.current = u.email
    // Guest 草稿認領：必須同步、在第一個 await 之前完成，
    // 讓之後才掛載的 ChecklistTab / DeclutterTab 一初始化就讀到帳號 key
    const claim = claimGuestDrafts(u.email)
    // 同一次頁面生命週期、同一個 email 最多一則提示；優先順序：寫入失敗 > 未合併（草稿 > 預約）
    const claimNotice =
      claim.failed ? '本機儲存空間不足，訪客草稿暫時無法轉入你的帳號，草稿仍保留在本機。'
      : claim.scheduledFailed ? '本機儲存空間不足，訪客預約暫時無法轉入你的帳號，預約仍保留在本機。'
      : claim.conflict ? '本機還有一份訪客草稿，因為你已有進行中的草稿，所以沒有合併。'
      : claim.scheduledConflict ? '本機還有一份訪客預約，因為你已有自己的預約，所以沒有合併。'
      : null
    if (claimNotice && !draftNoticeShownRef.current.has(u.email)) {
      draftNoticeShownRef.current.add(u.email)
      showToast(claimNotice)
    }
    setLoading(true)
    try {
      let migration = migrationPromisesRef.current.get(u.email)
      if (!migration) {
        // 只有第一次呼叫會建立並執行 migration（同步存入 Map，後續呼叫一定拿得到）
        migration = migrateGuestData(u)
        migrationPromisesRef.current.set(u.email, migration)
      }
      // 所有呼叫等待同一個 Promise，得到一致結果；
      // migrateGuestData 內部已自行處理各筆失敗（保留本機＋提示），萬一整體 reject 會進入下方既有的 catch
      await migration
      const [logs, records] = await Promise.all([
        sbLoadChecklistLogs(u.email),
        sbLoadDeclutterRecords(u.email),
      ])
      // 載入期間已登出或換帳號 → 丟棄結果
      if (activeEmailRef.current !== u.email) return
      // 讀取失敗（null）→ 保留既有 state，不誤當成 0 筆；成功（含真的 0 筆 []）→ 正常更新
      let loadFailed = false
      if (logs !== null) setChecklistLogs(normalizeChecklistLogs(logs))
      else loadFailed = true
      if (records !== null) setDeclutterRecords(records)
      else loadFailed = true
      if (loadFailed) showToast('載入資料失敗，請重新整理')
    } catch {
      showToast('載入資料失敗，請重新整理')
    } finally {
      setLoading(false)
    }
  }, [showToast, migrateGuestData])

  // 套用 Supabase Auth 身分：
  // - 第一次（初始化）一定套用
  // - 之後只有 email 真的改變（null→A、A→B、A→null）才切換資料；
  //   同一身分（TOKEN_REFRESHED、USER_UPDATED、重複 SIGNED_IN）只同步顯示名稱／頭像，不重跑 migration、不重新載入
  const applyAuthUser = useCallback((u: OAuthUser | null) => {
    const nextEmail = u?.email ?? null
    if (authResolvedRef.current && nextEmail === activeEmailRef.current) {
      if (u) setUser(prev => (prev && prev.email === u.email && prev.name === u.name && prev.picture === u.picture) ? prev : u)
      return
    }
    authResolvedRef.current = true
    setUser(u)
    if (u) loadUserData(u)   // 同步部分：activeEmailRef = email → claimGuestDrafts（在分頁初始化之前）
    else { activeEmailRef.current = null; loadGuestData() }
    setAuthReady(true)
  }, [loadUserData, loadGuestData])

  useEffect(() => {
    if (/Line\//.test(navigator.userAgent)) {
      const url = window.location.href
      window.location.replace(url + (url.includes('?') ? '&' : '?') + 'openExternalBrowser=1')
      return
    }
    // URL 參數 tab 切換（從 HomeTab 的 APP_URL 連結進入時）
    const params = new URLSearchParams(window.location.search)
    const urlTab = params.get('tab') as AppTab | null
    if (urlTab && TABS.find(t => t.id === urlTab)) {
      setTab(urlTab)
      sessionStorage.setItem(TAB_KEY, urlTab)
      // 保留 ?tab= 在網址，讓 GA 追蹤到正確頁面，不再 replaceState 掉
    } else {
      const savedTab = sessionStorage.getItem(TAB_KEY) as AppTab | null
      if (savedTab && TABS.find(t => t.id === savedTab)) setTab(savedTab)
    }

    // 登入身分只來自 Supabase Auth session（不再讀 organizer_user cookie）
    let disposed = false
    getAuthUser().then(({ user: u, error, oauthError }) => {
      if (disposed) return
      if (error) {
        // 無法確認身分：維持 authReady=false，不以 Guest 身分讀寫任何資料
        console.error('auth init failed', error)
        setAuthError(true)
        return
      }
      applyAuthUser(u)
      if (oauthError) showToast('登入未完成，請再試一次')
      // 清掉 OAuth 回來時網址上的參數（保留 ?tab= 等其他參數）
      const url = new URL(window.location.href)
      let changed = false
      for (const k of ['code', 'error', 'error_code', 'error_description', 'state']) {
        if (url.searchParams.has(k)) { url.searchParams.delete(k); changed = true }
      }
      if (url.hash && /(^#|&)(error|access_token)=/.test(url.hash)) { url.hash = ''; changed = true }
      if (changed) window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    })
    // 之後的登入／登出／token 更新：延到下一個 tick 處理（避免在 Supabase auth callback 內直接呼叫其他 Supabase API）
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = toAppUser(session?.user)
      setTimeout(() => {
        if (disposed || !authResolvedRef.current) return   // 初始化由 getAuthUser 負責
        applyAuthUser(next)
      }, 0)
    })
    return () => { disposed = true; sub.subscription.unsubscribe() }
  }, [applyAuthUser, showToast])

  // ── Tab 切換（共用，帶捲到頂）────────────────────────────────
  const handleTabChange = useCallback((newTab: AppTab) => {
    setTab(newTab)
    sessionStorage.setItem(TAB_KEY, newTab)
    const url = newTab === 'home' ? '/' : `/?tab=${newTab}`
    window.history.replaceState({}, '', url)
    // 手動觸發 GA page_view，因為 replaceState 不會被 Next.js router 感知
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_title: newTab,
      })
    }
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [])

  // ── 資料操作 handlers ────────────────────────────────────────
  // 回傳 true 表示這筆紀錄已確實持久化（Supabase 或 LocalStorage）；DeclutterTab 只有在 true 時才進入成功流程
  const handleDeclutterSave = async (record: DeclutterRecord): Promise<boolean> => {
    // 告別文照片保留在 TossEntry.photo（DeclutterTab 已壓縮）：
    // Guest 為壓縮後的 data URL、登入為 Storage URL（上傳失敗時為 data URL）
    // 未登入時另寫一份到 IndexedDB 當快取，但 IDB 不再是照片唯一來源
    if (!user) {
      await Promise.all(
        record.tossEntries.map(e => {
          if (e.photo && e.photo.startsWith('data:')) return savePhoto(`toss_photo_${e.id}`, e.photo)
          return Promise.resolve()
        })
      )
    }
    const recordToSave: DeclutterRecord = record
    if (user) {
      // 登入：先確實寫入 Supabase，成功後才更新畫面 state（失敗時不加入假紀錄）
      const ok = await sbSaveDeclutterRecord(user.email, recordToSave)
      if (!ok) {
        showToast('儲存失敗，請檢查網路連線')
        return false
      }
      // 儲存期間已登出或換帳號 → 不寫進目前畫面（避免原帳號紀錄混入 Guest / 新帳號 state）；雲端已存好，仍回傳 true
      if (activeEmailRef.current !== user.email) return true
      setDeclutterRecords(prev => [recordToSave, ...prev])
      showToast('斷捨離紀錄已儲存', 'success')
      return true
    }
    // Guest：維持原本順序與 LocalStorage fallback，只補上回傳值
    setDeclutterRecords(prev => [recordToSave, ...prev])
    // 先記下 LocalStorage 目前實際保存的舊紀錄（saveLS 失敗時會先刪除該 key，需要用這份還原）
    const persistedOld = loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, [])
    if (saveLS(LS_DECLUTTER_RECORDS, [recordToSave, ...declutterRecords])) return true
    // LocalStorage 容量不足：只處理「這一筆新紀錄」—— 它的 data URL 照片退回 IndexedDB（上面已寫入），
    // 文字照樣保存；舊紀錄一律用原本已保存的內容，不修改、不移除其照片
    const newWithoutPhotos: DeclutterRecord = {
      ...recordToSave,
      tossEntries: recordToSave.tossEntries.map(e => (e.photo && e.photo.startsWith('data:') ? { ...e, photo: undefined } : e)),
    }
    if (saveLS(LS_DECLUTTER_RECORDS, [newWithoutPhotos, ...persistedOld])) return true
    // 仍放不下：至少把舊紀錄原樣寫回，避免 saveLS 刪 key 後舊紀錄整批遺失；新紀錄未寫入
    saveLS(LS_DECLUTTER_RECORDS, persistedOld)
    return false
  }

  // ── Storage lifecycle helpers ──
  // 從照片 references 取出「可以刪除」的 Storage object（key + path）；不符合條件的 reference 一律略過（不刪）
  const collectStorageTargets = (
    email: string,
    entries: { ref: unknown; prefix: string; exact?: boolean }[]
  ): { key: string; path: string }[] => {
    const out = new Map<string, { key: string; path: string }>()
    for (const { ref, prefix, exact } of entries) {
      const key = storageKeyFromPhotoRef(ref, email, prefix, exact)
      if (!key) continue
      const parsed = parsePhotoRef(ref)
      if (parsed.type !== 'storage') continue
      out.set(parsed.path, { key, path: parsed.path })
    }
    return [...out.values()]
  }
  // 照片 references 中所有 Storage path（用於「是否仍被其他紀錄引用」判斷）
  const referencedStoragePaths = (refs: unknown[]): Set<string> => {
    const paths = new Set<string>()
    for (const ref of refs) {
      const parsed = parsePhotoRef(ref)
      if (parsed.type === 'storage') paths.add(parsed.path)
    }
    return paths
  }
  const checklistPhotoEntries = (log: ChecklistLog) =>
    [...(log.beforePhotos ?? []), ...(log.afterPhotos ?? [])].map(ref => ({ ref, prefix: `checklist_${log.id}_` }))
  // best-effort 刪除：失敗只記錄 warning（保留 orphan），不 throw、不影響呼叫端結果
  const cleanupStorageObjects = async (email: string, targets: { key: string; path: string }[], context: string) => {
    if (targets.length === 0) return
    const results = await Promise.all(targets.map(t => deleteRemotePhoto(email, t.key)))
    const failed = targets.filter((_, i) => !results[i]).map(t => t.path)
    if (failed.length > 0) {
      console.warn(`[storage cleanup] ${context}: ${failed.length}/${targets.length} object(s) not deleted, left as orphan`, failed)
    }
  }

  // 回傳 true 表示這筆日記已確實持久化（Supabase 或 LocalStorage）；ChecklistTab 只有在 true 時才進入成功流程
  const handleChecklistSave = async (log: ChecklistLog): Promise<boolean> => {
    if (user) {
      // 登入：先確實寫入 Supabase，成功後才更新畫面 state
      const email = user.email
      const ok = await sbSaveChecklistLog(email, log)
      if (!ok) {
        // 本次 attempt 上傳成功的 Storage objects（stable logId 前綴的遠端照片）
        const attemptTargets = collectStorageTargets(email, checklistPhotoEntries(log))
        if (attemptTargets.length === 0) {
          showToast('儲存失敗，請檢查網路連線')
          return false
        }
        // DB 狀態可能不確定（例如實際已寫入但回應逾時）→ 先 read-only 確認，再決定是否清理
        const confirmation = await sbConfirmChecklistLog(email, log.id)
        if (confirmation.status === 'present') {
          const dbPaths = referencedStoragePaths([
            ...(confirmation.log.beforePhotos ?? []),
            ...(confirmation.log.afterPhotos ?? []),
          ])
          if (attemptTargets.every(t => dbPaths.has(t.path))) {
            // server-side save succeeded / client response uncertain → 視為成功，不刪 Storage
            console.warn('[checklist save] server-side save succeeded / client response uncertain', log.id)
            if (activeEmailRef.current !== email) return true
            setChecklistLogs(prev => [log, ...prev.filter(l => l.id !== log.id)])
            return true
          }
          // 紀錄存在但 references 不符 → 不刪（可能仍被引用），維持儲存失敗；retry 會以同一 ID upsert
          showToast('儲存失敗，請檢查網路連線')
          return false
        }
        if (confirmation.status === 'absent') {
          // 確認 DB 沒有這筆紀錄 → best-effort 清理本次上傳；清理失敗不覆蓋原本的儲存失敗
          await cleanupStorageObjects(email, attemptTargets, `checklist save failed (${log.id})`)
        } else {
          // 確認失敗 / 逾時 → 狀態不確定，不刪 Storage（寧可保留 orphan）
          console.warn('[checklist save] DB confirmation unknown; storage cleanup skipped', log.id)
        }
        showToast('儲存失敗，請檢查網路連線')
        return false
      }
      // 儲存期間已登出或換帳號 → 不寫進目前畫面（避免原帳號紀錄混入 Guest / 新帳號 state）；雲端已存好，仍回傳 true
      if (activeEmailRef.current !== email) return true
      setChecklistLogs(prev => [log, ...prev])
      return true
    }
    // Guest：以 LocalStorage 實際保存的資料為基準，安全寫入成功後才更新畫面；失敗時舊資料原樣保留
    if (!safeSaveChecklistLogs([log, ...loadPersistedChecklistLogs()])) {
      showToast('儲存失敗，本機儲存空間可能不足')
      return false
    }
    setChecklistLogs(prev => [log, ...prev])
    return true
  }

  const handleDeleteDeclutterRecord = async (savedAt: string) => {
    if (user) {
      // 登入：畫面行為維持原樣；DB 刪除成功後才清理該紀錄的 Storage 照片
      const email = user.email
      const targetsRecords = declutterRecords.filter(r => r.savedAt === savedAt)
      const otherRecords = declutterRecords.filter(r => r.savedAt !== savedAt)
      setDeclutterRecords(prev => prev.filter(r => r.savedAt !== savedAt))
      const ok = await sbDeleteDeclutterRecord(email, savedAt)
      if (!ok) { showToast('刪除失敗，請檢查網路連線'); return }
      const stillReferenced = referencedStoragePaths(otherRecords.flatMap(r => (r.tossEntries ?? []).map(e => e.photo)))
      const targets = collectStorageTargets(
        email,
        targetsRecords.flatMap(r => (r.tossEntries ?? []).map(e => ({ ref: e.photo, prefix: `toss_photo_${e.id}`, exact: true })))
      ).filter(t => !stillReferenced.has(t.path))
      await cleanupStorageObjects(email, targets, `declutter delete (${savedAt})`)
      return
    }
    // Guest：以 LocalStorage「實際保存的資料」為準（state 可能含 LocalStorage 已移除的照片，資料量較大）
    const persisted = loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, [])
    if (saveLS(LS_DECLUTTER_RECORDS, persisted.filter(r => r.savedAt !== savedAt))) {
      // 寫入成功後才更新畫面
      setDeclutterRecords(prev => prev.filter(r => r.savedAt !== savedAt))
    } else {
      // 寫入失敗：saveLS 可能已先移除 key，把原資料寫回；畫面 state 保持不變
      saveLS(LS_DECLUTTER_RECORDS, persisted)
    }
  }

  // 更新一筆既有的斷捨離紀錄（目前用於「補填分類」）
  // original：畫面上的原紀錄物件（state 以物件本身比對替換，不依賴 savedAt）
  // updated：只修改了指定欄位的新物件
  // 回傳 true 表示已確實持久化，才更新畫面
  const handleUpdateDeclutterRecord = async (original: DeclutterRecord, updated: DeclutterRecord): Promise<boolean> => {
    if (user) {
      // 登入：sbSaveDeclutterRecord 以 user_email + saved_at 找到既有列並更新整筆 data
      const ok = await sbSaveDeclutterRecord(user.email, updated)
      if (!ok) {
        showToast('儲存失敗，請檢查網路連線')
        return false
      }
      setDeclutterRecords(prev => prev.map(r => (r === original ? updated : r)))
      return true
    }
    // Guest：以 LocalStorage 實際保存的資料為準（state 可能含 LocalStorage 沒有的照片）
    const persisted = loadLS<DeclutterRecord[]>(LS_DECLUTTER_RECORDS, [])
    // 對應的紀錄：savedAt 相同，且每件物品的 id 依序相同（避免舊的分鐘格式 savedAt 碰撞時改到別筆）
    const idx = persisted.findIndex(r =>
      r.savedAt === original.savedAt &&
      r.items.length === original.items.length &&
      r.items.every((it, i) => it.id === original.items[i].id))
    if (idx < 0) return false
    // 只把 original → updated 之間有變動的 category 套用到 LocalStorage 那一筆，其餘欄位維持 LocalStorage 原樣
    const target = persisted[idx]
    const nextTarget: DeclutterRecord = {
      ...target,
      items: target.items.map((it, i) =>
        updated.items[i].category !== original.items[i].category ? { ...it, category: updated.items[i].category } : it),
    }
    const next = persisted.map((r, i) => (i === idx ? nextTarget : r))
    if (!saveLS(LS_DECLUTTER_RECORDS, next)) {
      // 寫入失敗：saveLS 可能已先移除 key，把原資料寫回；畫面 state 保持不變
      saveLS(LS_DECLUTTER_RECORDS, persisted)
      return false
    }
    setDeclutterRecords(prev => prev.map(r => (r === original ? updated : r)))
    return true
  }

  const handleDeleteChecklistLog = async (id: string): Promise<boolean> => {
    if (user) {
      // 登入：畫面行為維持原樣；DB 刪除成功後才清理該紀錄的 Storage 照片
      const email = user.email
      const targetLogs = checklistLogs.filter(l => l.id === id)
      const otherLogs = checklistLogs.filter(l => l.id !== id)
      setChecklistLogs(prev => prev.filter(l => l.id !== id))
      const ok = await sbDeleteChecklistLog(email, id)
      if (!ok) { showToast('刪除失敗，請檢查網路連線'); return ok }
      const stillReferenced = referencedStoragePaths(otherLogs.flatMap(l => [...(l.beforePhotos ?? []), ...(l.afterPhotos ?? [])]))
      const targets = collectStorageTargets(email, targetLogs.flatMap(checklistPhotoEntries))
        .filter(t => !stillReferenced.has(t.path))
      await cleanupStorageObjects(email, targets, `checklist delete (${id})`)
      return ok
    }
    // Guest：寫入成功後才更新畫面；失敗時 LocalStorage 與畫面都維持原樣（刪到 0 筆時寫入 []）
    if (!safeSaveChecklistLogs(loadPersistedChecklistLogs().filter(l => l.id !== id))) {
      showToast('刪除失敗，請稍後再試')
      return false
    }
    setChecklistLogs(prev => prev.filter(l => l.id !== id))
    return true
  }

  const handleEditChecklistLog = async (id: string, note: string): Promise<boolean> => {
    if (user) {
      // 登入：維持原本行為（本輪不修改）
      const updated = checklistLogs.map(l => l.id === id ? { ...l, note } : l)
      setChecklistLogs(updated)
      const log = updated.find(l => l.id === id)
      if (log) {
        const ok = await sbSaveChecklistLog(user.email, log)
        if (!ok) showToast('編輯儲存失敗')
        return ok
      }
      return true
    }
    // Guest：寫入成功後才更新畫面；失敗時 LocalStorage 與畫面都維持原樣
    if (!safeSaveChecklistLogs(loadPersistedChecklistLogs().map(l => l.id === id ? { ...l, note } : l))) {
      showToast('編輯儲存失敗')
      return false
    }
    setChecklistLogs(prev => prev.map(l => l.id === id ? { ...l, note } : l))
    return true
  }

  const handleUserChange = async (u: OAuthUser | null) => {
    setUser(u)
    if (u) await loadUserData(u)
    else {
      // 登出：清掉登入帳號的資料，改載入本機 Guest 資料（若有）
      activeEmailRef.current = null
      loadGuestData()
    }
  }

  // DeclutterTab → MemberTab 跳轉（帶子區塊）
  const handleGoToMember = useCallback((section?: string) => {
    handleTabChange('member')
    if (section) sessionStorage.setItem('member_section', section)
  }, [handleTabChange])

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: "'Noto Sans TC', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&family=Noto+Sans+TC:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* 頂部標題列 */}
      <div style={{
        background: '#FAF8F4', borderBottom: `1px solid ${bd}`,
        padding: '0 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 52,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 700, fontSize: 20, color: ink, letterSpacing: '0.02em' }}>
          整理<span style={{ color: sg }}>•</span>小幫手
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <a href="https://www.instagram.com/i.am.ych?igsh=ZWd5M3EwMGxsZ3E%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="https://www.threads.com/@i.am.ych?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: `1px solid ${bd}`, background: 'white', textDecoration: 'none', color: ink }}>
            <svg width="15" height="15" viewBox="0 0 192 192" fill="currentColor">
              <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.318-11.319 11.24-24.932 16.1-45.512 16.246-22.76-.164-39.959-7.069-51.115-20.518C35.096 138.478 29.44 120.17 29.234 97c.206-23.17 5.862-41.478 16.806-54.39C57.158 29.16 74.357 22.255 97.117 22.09c22.928.165 40.382 7.104 51.878 20.625 5.65 6.688 9.946 15.116 12.838 25.108l16.157-4.304c-3.463-12.674-8.958-23.532-16.456-32.488C147.044 14.284 125.038 5.13 97.19 4.918h-.368C69.021 5.13 47.121 14.316 32.613 30.205 19.608 44.485 12.798 64.551 12.544 97c.254 32.449 7.064 52.515 20.069 66.795 14.508 15.89 36.408 25.075 64.177 25.286h.369c24.537-.176 41.71-6.6 55.93-20.739 18.472-18.371 17.965-41.433 11.853-55.54-4.262-9.935-12.542-17.845-23.405-22.814Z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* 頁面內容 */}
      <div style={{ padding: '16px 16px calc(100px + env(safe-area-inset-bottom))', maxWidth: 480, margin: '0 auto' }}>

        {/* 登入身分確認前不渲染任何分頁（避免以錯誤身分讀寫本機資料） */}
        {!authReady && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: ml, fontSize: 14 }}>
            {authError ? '無法確認登入狀態，請重新整理頁面。' : '確認登入狀態中⋯'}
          </div>
        )}

        {authReady && tab === 'home' && (
          <HomeTab
            key="home"
            onNavigate={handleTabChange}
            user={user}
            onLoginClick={() => handleTabChange('member')}
            checklistLogs={checklistLogs}
            declutterRecords={declutterRecords}
          />
        )}

        {authReady && tab === 'checklist' && (
          <ChecklistTab
            key="checklist"
            onSaveLog={handleChecklistSave}
            onDeleteLog={handleDeleteChecklistLog}
            onEditLog={handleEditChecklistLog}
            initialLogs={checklistLogs}
            userId={user?.email}
          />
        )}

        {authReady && tab === 'declutter' && (
          <DeclutterTab
            key="declutter"
            onSaveToMember={handleDeclutterSave}
            onGoToMember={handleGoToMember}
            userEmail={user?.email}
          />
        )}

        {authReady && tab === 'challenge' && (
          <ChallengeTab
            key="challenge"
            userId={user?.email}
          />
        )}

        {authReady && tab === 'recommend' && (
          <RecommendTab
            key="recommend"
            fromSpace={
              typeof window !== 'undefined'
                ? (sessionStorage.getItem('recommend_space') ?? undefined)
                : undefined
            }
          />
        )}

        {authReady && tab === 'member' && (
          <MemberTab
            key="member"
            declutterRecords={declutterRecords}
            checklistLogs={checklistLogs}
            user={user}
            onUserChange={handleUserChange}
            onDeleteDeclutter={handleDeleteDeclutterRecord}
            onDeleteDiary={handleDeleteChecklistLog}
            onUpdateDeclutter={handleUpdateDeclutterRecord}
            onNavigate={handleTabChange}
          />
        )}

      </div>

      {/* 底部導覽列 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#FAF8F4', borderTop: `1px solid ${bd}`,
        display: 'flex', zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            flex: 1, padding: '10px 4px 8px', border: 'none',
            background: 'transparent', color: tab === t.id ? sg : ml,
            fontSize: 10, cursor: 'pointer',
            fontWeight: tab === t.id ? 600 : 400,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            borderTop: tab === t.id ? `2px solid ${sg}` : '2px solid transparent',
            minHeight: 56, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {loading && <LoadingOverlay />}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  )
}
