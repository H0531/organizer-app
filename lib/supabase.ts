import { createClient } from '@supabase/supabase-js'
import type { ChecklistLog, DeclutterRecord } from './types'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(URL, KEY)

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

export async function sbSaveChecklistLog(email: string, log: ChecklistLog): Promise<void> {
  const { error } = await supabase
    .from('checklist_logs')
    .upsert({ id: log.id, user_email: email, data: log, updated_at: new Date().toISOString() })
  if (error) console.error('sbSaveChecklistLog', error)
}

export async function sbDeleteChecklistLog(email: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('checklist_logs')
    .delete()
    .eq('user_email', email)
    .eq('id', id)
  if (error) console.error('sbDeleteChecklistLog', error)
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

export async function sbSaveDeclutterRecord(email: string, record: DeclutterRecord): Promise<void> {
  const { error } = await supabase
    .from('declutter_records')
    .upsert({ saved_at: record.savedAt, user_email: email, data: record, updated_at: new Date().toISOString() })
  if (error) console.error('sbSaveDeclutterRecord', error)
}

export async function sbDeleteDeclutterRecord(email: string, savedAt: string): Promise<void> {
  const { error } = await supabase
    .from('declutter_records')
    .delete()
    .eq('user_email', email)
    .eq('saved_at', savedAt)
  if (error) console.error('sbDeleteDeclutterRecord', error)
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

export async function sbSaveChallengeData(email: string, payload: unknown): Promise<void> {
  const { error } = await supabase
    .from('challenge_data')
    .upsert({ user_email: email, data: payload, updated_at: new Date().toISOString() })
  if (error) console.error('sbSaveChallengeData', error)
}
