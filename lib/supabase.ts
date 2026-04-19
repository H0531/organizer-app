import { createClient } from '@supabase/supabase-js'
import type { ChecklistLog, DeclutterRecord } from './types'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPA_URL, SUPA_KEY)

// ── Checklist Logs ────────────────────────────────────────────

export async function sbLoadChecklistLogs(email: string): Promise<ChecklistLog[]> {
  const { data, error } = await supabase
    .from('checklist_logs')
    .select('data')
    .eq('user_email', email)
    .order('updated_at', { ascending: false })
  if (error) { console.error('sbLoadChecklistLogs', error); return [] }
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

// ── Declutter Records ─────────────────────────────────────────

export async function sbLoadDeclutterRecords(email: string): Promise<DeclutterRecord[]> {
  const { data, error } = await supabase
    .from('declutter_records')
    .select('data')
    .eq('user_email', email)
    .order('updated_at', { ascending: false })
  if (error) { console.error('sbLoadDeclutterRecords', error); return [] }
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
