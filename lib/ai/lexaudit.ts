import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { AUDIT_CHECKLIST, type AuditCheck } from './audit-checklist'
import { AI_MODELS, DAILY_RUN_CAP, aiEnabled } from './provider'
import { callModel } from './run'
import { entityTools } from './tools'

// LexAudit: one model call per checklist item, run in parallel, each
// returning a finding with its sources. The whole report is saved as an
// ai_drafts row "in_review" — nothing reaches the client until a lawyer
// or Charles edits, signs and releases it.

export const FINDING_STATUSES = ['in_order', 'gap', 'unclear'] as const

export const Finding = z.object({
  status: z.enum(FINDING_STATUSES),
  summary: z.string().min(1).max(600),
  detail: z.string().max(2000).default(''),
  recommendation: z.string().max(1000).default(''),
  sources: z.array(z.string().max(200)).max(10).default([]),
})
export type Finding = z.infer<typeof Finding>

export type ReportFinding = Finding & { checkId: string; area: string; question: string; aiGenerated: boolean }
export type AuditReport = { checklist: 'placeholder' | 'final'; findings: ReportFinding[]; generatedWith: string }

const SYSTEM = `You are LexAudit, preparing ONE finding of a draft legal audit of a Kenyan business for a LexReg lawyer to review. Look the facts up with the tools first. Then call submit_finding exactly once with:
status: "in_order" | "gap" | "unclear" ("unclear" when the records cannot answer the question);
summary: one or two sentences; detail: what the records show, with specifics;
recommendation: what should be done, or empty if in order;
sources: e.g. "register: directors", "vault: CR12 (uploaded 3 Oct 2026)".
This is a draft for a lawyer, not advice to the client.
Jurisdiction is Kenya: Companies Act 2015, the Registrar of Companies via the Business Registration Service (BRS), KRA, and the Office of the Data Protection Commissioner. Never refer to other countries' bodies or forms (e.g. Companies House, PSC).`

function parseFinding(text: string): Finding | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = Finding.safeParse(JSON.parse(match[0]))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

async function checkOne(supabase: SupabaseClient, entityId: string, entityName: string, check: AuditCheck) {
  const prompt = `Entity: ${entityName}\nAudit area: ${check.area}\nQuestion: ${check.question}\nUseful evidence types: ${check.evidence.join(', ')}`
  let submitted: Finding | null = null
  const submit_finding = tool({
    description: 'Submit the finding for this audit item. Call once, when done.',
    inputSchema: Finding,
    execute: async (f) => {
      submitted = f
      return { saved: true }
    },
  })
  const result = await callModel({ system: SYSTEM, prompt, tools: { ...entityTools(supabase, entityId), submit_finding }, maxSteps: 8, stopOnTool: 'submit_finding' })
  const finding = submitted ?? parseFinding(result.text) ?? {
    status: 'unclear' as const,
    summary: 'LexAudit could not produce a finding for this item. The reviewer should complete it.',
    detail: result.text.slice(0, 1500),
    recommendation: '',
    sources: [],
  }
  return { finding, tokens: result.inputTokens + result.outputTokens, inputTokens: result.inputTokens, outputTokens: result.outputTokens, model: result.model }
}

export async function generateAudit(supabase: SupabaseClient, user: User, entity: { id: string; organisation_id: string; name: string }) {
  if (!aiEnabled()) return { ok: false as const, error: 'LexReg AI is switched off.', status: 503 }
  const { data: used } = await supabase.rpc('ai_runs_today', { org_id: entity.organisation_id })
  if ((used ?? 0) >= DAILY_RUN_CAP) return { ok: false as const, error: 'Daily AI limit reached for this organisation.', status: 429 }

  const { data: run, error: runError } = await supabase
    .from('ai_runs')
    .insert({ organisation_id: entity.organisation_id, entity_id: entity.id, user_id: user.id, agent: 'lex_audit', model: AI_MODELS.primary, question: `Legal audit: ${entity.name}` })
    .select('id')
    .single()
  if (runError || !run) return { ok: false as const, error: 'Not allowed to run LexAudit on this entity.', status: 403 }

  // Sequential: Groq's free tier allows ~8k tokens a minute, so parallel
  // calls would fail on rate limits.
  const settled: PromiseSettledResult<Awaited<ReturnType<typeof checkOne>>>[] = []
  for (const c of AUDIT_CHECKLIST) {
    try {
      settled.push({ status: 'fulfilled', value: await checkOne(supabase, entity.id, entity.name, c) })
    } catch (reason) {
      settled.push({ status: 'rejected', reason })
    }
  }
  const findings: ReportFinding[] = settled.map((s, i) => {
    const check = AUDIT_CHECKLIST[i]
    const base = { checkId: check.id, area: check.area, question: check.question, aiGenerated: true }
    if (s.status === 'fulfilled') return { ...base, ...s.value.finding }
    return { ...base, status: 'unclear', summary: 'LexAudit could not reach the model for this item. The reviewer should complete it.', detail: '', recommendation: '', sources: [] }
  })
  const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => (s as PromiseFulfilledResult<Awaited<ReturnType<typeof checkOne>>>).value)
  const input = ok.reduce((a, r) => a + r.inputTokens, 0)
  const output = ok.reduce((a, r) => a + r.outputTokens, 0)
  const model = ok[0]?.model ?? AI_MODELS.primary

  await supabase.from('ai_runs').update({
    status: ok.length ? 'succeeded' : 'failed',
    model,
    input_tokens: input,
    output_tokens: output,
    answer: `${findings.filter((f) => f.status === 'gap').length} gaps, ${findings.filter((f) => f.status === 'unclear').length} unclear`,
    finished_at: new Date().toISOString(),
  }).eq('id', run.id)
  if (!ok.length) return { ok: false as const, error: 'LexAudit could not reach the model. Try again in a minute.', status: 502 }

  const report: AuditReport = { checklist: 'placeholder', findings, generatedWith: model }
  const { data: draft, error: draftError } = await supabase
    .from('ai_drafts')
    .insert({ organisation_id: entity.organisation_id, entity_id: entity.id, run_id: run.id, kind: 'legal_audit_report', title: `Legal audit — ${entity.name}`, content: report, status: 'in_review' })
    .select('id')
    .single()
  if (draftError || !draft) return { ok: false as const, error: 'Could not save the draft report.', status: 500 }

  await supabase.rpc('log_audit', {
    p_organisation_id: entity.organisation_id,
    p_action: 'ai.lex_audit.drafted',
    p_resource_type: 'ai_draft',
    p_resource_id: draft.id,
    p_metadata: { entity_id: entity.id, run_id: run.id, model },
  })
  return { ok: true as const, draftId: draft.id }
}
