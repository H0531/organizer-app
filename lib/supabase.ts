import { createClient, type User } from '@supabase/supabase-js'
import type { ChecklistLog, DeclutterRecord } from './types'
import type { OAuthUser } from './auth'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 瀏覽器端 Supabase client（anon key + Supabase Auth session）：
// - 登入後 session 由 supabase-js 自動保存與更新（persistSession / autoRefreshToken）
// - OAuth 回來時自動從網址取得並交換 session（detectSessionInUrl，PKCE 流程）
// - 登入後，所有資料庫請求自動帶目前使用者的 JWT
export const supabase = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Supabase Auth：App 唯一的登入身分來源 ─────────────────────
// Supabase Auth User → 現有 OAuthUser 結構（其餘元件仍以 user.email 為帳號識別）
// 沒有 email 的 session（例如匿名登入）一律不視為登入帳號
export function toAppUser(u: User | null | undefined): OAuthUser | null {
  const email = u?.email?.trim().toLowerCase()
  if (!u || !email) return null
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  return {
    name: str(meta.name) ?? str(meta.full_name) ?? email,
    email,
    picture: str(meta.avatar_url) ?? str(meta.picture),
    provider: 'google',
  }
}

// 初始化時取得目前登入者（讀 Supabase 保存的 session；OAuth 回來時會先完成 code 交換）
// - error：無法確認身分（呼叫端不可當成 Guest 繼續讀寫資料）
// - oauthError：網址帶有 OAuth 錯誤（例如使用者取消登入）→ 呼叫端以 Guest 繼續
export async function getAuthUser(): Promise<{ user: OAuthUser | null; error: unknown | null; oauthError: boolean }> {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const oauthError = search.has('error') || hash.has('error')
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error && !oauthError) return { user: null, error, oauthError }
    return { user: toAppUser(data.session?.user), error: null, oauthError }
  } catch (err) {
    if (oauthError) return { user: null, error: null, oauthError }
    return { user: null, error: err, oauthError }
  }
}

// Google 登入：由 Supabase Auth 處理 OAuth（state / PKCE / callback / session）
export async function signInWithGoogle(): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  })
  if (error) { console.error('signInWithGoogle', error); return false }
  return true
}

// 登出：成功時 Supabase 會發出 SIGNED_OUT 事件（page.tsx 監聽後切回 Guest）
export async function signOutAuth(): Promise<boolean> {
  const { error } = await supabase.auth.signOut()
  if (error) { console.error('signOutAuth', error); return false }
  return true
}

// 改名：寫入 Supabase Auth 的 user_metadata.name（只影響顯示名稱）
export async function updateAuthDisplayName(name: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({ data: { name } })
  if (error) { console.error('updateAuthDisplayName', error); return false }
  return true
}

// ── Checklist Logs ────────────────────────────────────────────

export async function sbLoadChecklistLogs(email: string): Promise<ChecklistLog[] | null> {
  const { data, error } = await supabase
    .from('checklist_logs')
    .select('data')
    .eq('user_email', email)
    .order('updated_at', { ascending: false })
  if (error) { console.error('sbLoadChecklistLogs', error); return null }
  return (data ?? []).map((r: { data: unknown }) => r.data as ChecklistLog)
}

export async function sbSaveChecklistLog(email: string, log: ChecklistLog): Promise<boolean> {
  const { error } = await supabase
    .from('checklist_logs')
    .upsert(
      { id: log.id, user_email: email, data: log, updated_at: new Date().toISOString() },
      { onConflict: 'id,user_email', ignoreDuplicates: false }
    )
  if (error) { console.error('sbSaveChecklistLog', error); return false }
  return true
}

export async function sbDeleteChecklistLog(email: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('checklist_logs')
    .delete()
    .eq('user_email', email)
    .eq('id', id)
  if (error) { console.error('sbDeleteChecklistLog', error); return false }
  return true
}

// Read-only：確認某筆 checklist log 是否已實際寫入（儲存回應失敗後判斷能否清理 Storage）
// - present：確定存在（id 與 user_email 皆相符），回傳 DB 中的 log
// - absent：查詢成功且確定不存在
// - unknown：無 session、帳號不符、查詢錯誤、例外或逾時（8 秒）→ 狀態不確定
export async function sbConfirmChecklistLog(
  email: string,
  id: string
): Promise<{ status: 'present'; log: ChecklistLog } | { status: 'absent' } | { status: 'unknown' }> {
  const UNKNOWN = { status: 'unknown' } as const
  const confirm = async (): Promise<
    { status: 'present'; log: ChecklistLog } | { status: 'absent' } | { status: 'unknown' }
  > => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionEmail = sessionData.session?.user?.email?.trim().toLowerCase()
      if (!sessionEmail || sessionEmail !== email.trim().toLowerCase()) return UNKNOWN
      const { data, error } = await supabase
        .from('checklist_logs')
        .select('id, user_email, data')
        .eq('user_email', email)
        .eq('id', id)
        .maybeSingle()
      if (error) { console.error('sbConfirmChecklistLog', error); return UNKNOWN }
      if (data === null) return { status: 'absent' }
      const row = data as { id: unknown; user_email: unknown; data: unknown }
      if (row.id !== id || row.user_email !== email || !row.data) return UNKNOWN
      return { status: 'present', log: row.data as ChecklistLog }
    } catch (err) {
      console.error('sbConfirmChecklistLog', err)
      return UNKNOWN
    }
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ status: 'unknown' }>(resolve => {
    timer = setTimeout(() => resolve(UNKNOWN), 8000)
  })
  try {
    return await Promise.race([confirm(), timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// ── Declutter Records ─────────────────────────────────────────

export async function sbLoadDeclutterRecords(email: string): Promise<DeclutterRecord[] | null> {
  const { data, error } = await supabase
    .from('declutter_records')
    .select('data')
    .eq('user_email', email)
    .order('updated_at', { ascending: false })
  if (error) { console.error('sbLoadDeclutterRecords', error); return null }
  return (data ?? []).map((r: { data: unknown }) => r.data as DeclutterRecord)
}

export async function sbSaveDeclutterRecord(email: string, record: DeclutterRecord): Promise<boolean> {
  // saved_at 可能含特殊字元，改用 user_email + ISO timestamp 作為 upsert key
  // 先嘗試 update，不存在再 insert
  const { data: existing } = await supabase
    .from('declutter_records')
    .select('saved_at')
    .eq('user_email', email)
    .eq('saved_at', record.savedAt)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('declutter_records')
      .update({ data: record, updated_at: new Date().toISOString() })
      .eq('user_email', email)
      .eq('saved_at', record.savedAt)
    if (error) { console.error('sbSaveDeclutterRecord update', error); return false }
  } else {
    const { error } = await supabase
      .from('declutter_records')
      .insert({ saved_at: record.savedAt, user_email: email, data: record, updated_at: new Date().toISOString() })
    if (error) { console.error('sbSaveDeclutterRecord insert', error); return false }
  }
  return true
}

export async function sbDeleteDeclutterRecord(email: string, savedAt: string): Promise<boolean> {
  const { error } = await supabase
    .from('declutter_records')
    .delete()
    .eq('user_email', email)
    .eq('saved_at', savedAt)
  if (error) { console.error('sbDeleteDeclutterRecord', error); return false }
  return true
}

// ── Challenge Data ────────────────────────────────────────────

export async function sbLoadChallengeData(email: string): Promise<{ mode: number | null; entries: unknown[] } | null> {
  const { data, error } = await supabase
    .from('challenge_data')
    .select('data')
    .eq('user_email', email)
    .single()
  if (error) { if (error.code !== 'PGRST116') console.error('sbLoadChallengeData', error); return null }
  return data?.data ?? null
}

// 可區分「查無資料」與「查詢失敗」的版本：
// - 查無資料 → { data: null, error: null }
// - 查詢失敗 → { data: null, error }
export async function sbLoadChallengeDataStatus(email: string): Promise<{
  data: { mode: number | null; entries: unknown[] } | null
  error: unknown | null
}> {
  try {
    const { data, error } = await supabase
      .from('challenge_data')
      .select('data')
      .eq('user_email', email)
      .maybeSingle()
    if (error) { console.error('sbLoadChallengeDataStatus', error); return { data: null, error } }
    return { data: data?.data ?? null, error: null }
  } catch (err) {
    console.error('sbLoadChallengeDataStatus', err)
    return { data: null, error: err }
  }
}

export async function sbSaveChallengeData(email: string, payload: unknown): Promise<boolean> {
  const { error } = await supabase
    .from('challenge_data')
    .upsert(
      { user_email: email, data: payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_email', ignoreDuplicates: false }
    )
  if (error) { console.error('sbSaveChallengeData', error); return false }
  return true
}
