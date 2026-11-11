import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EditorReport } from '@/components/ai/report-editor'

// Reads AI drafts through the caller's session: RLS decides who sees what
// (reviewers see drafts in review; clients only released reports).

type Row = { id: string; title: string; status: string; content: unknown; created_at: string; signed_at: string | null; entity_id: string; entities: { legal_name: string | null; trading_name: string | null } | null }

const SELECT = 'id, title, status, content, created_at, signed_at, entity_id, entities(legal_name, trading_name)'

function toReport(r: Row): EditorReport {
  const c = (r.content ?? {}) as { checklist?: string; findings?: EditorReport['findings'] }
  return {
    id: r.id,
    title: r.title,
    entityName: r.entities?.legal_name || r.entities?.trading_name || 'Entity',
    status: r.status,
    checklist: c.checklist ?? 'placeholder',
    createdAt: r.created_at,
    signedAt: r.signed_at,
    findings: c.findings ?? [],
  }
}

export async function listReports(supabase: unknown, opts: { statuses: string[]; entityId?: string }) {
  let q = (supabase as SupabaseClient).from('ai_drafts').select(SELECT).eq('kind', 'legal_audit_report').in('status', opts.statuses).is('deleted_at', null).order('created_at', { ascending: false }).limit(100)
  if (opts.entityId) q = q.eq('entity_id', opts.entityId)
  const { data } = await q
  return ((data ?? []) as unknown as Row[]).map(toReport)
}

export async function getReport(supabase: unknown, id: string) {
  const { data } = await (supabase as SupabaseClient).from('ai_drafts').select(SELECT).eq('id', id).is('deleted_at', null).maybeSingle()
  return data ? toReport(data as unknown as Row) : null
}
