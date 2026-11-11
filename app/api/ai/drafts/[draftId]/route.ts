import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { FINDING_STATUSES } from '@/lib/ai/lexaudit'

// Review gate actions on an AI draft: save edits, sign & release to the
// client, or reject. RLS lets only super_admin and the assigned lawyer
// change drafts; a released draft is final.

const EditedFinding = z.object({
  checkId: z.string(),
  area: z.string(),
  question: z.string(),
  status: z.enum(FINDING_STATUSES),
  summary: z.string().trim().min(1).max(600),
  detail: z.string().max(2000),
  recommendation: z.string().max(1000),
  sources: z.array(z.string().max(200)).max(10),
  aiGenerated: z.boolean(),
})

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), findings: z.array(EditedFinding).min(1).max(50) }),
  z.object({ action: z.literal('release'), findings: z.array(EditedFinding).min(1).max(50), confirm: z.literal(true) }),
  z.object({ action: z.literal('reject') }),
])

export async function POST(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  const body = parsed.data

  const server = await createClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const supabase = server as unknown as SupabaseClient

  const { data: draft } = await supabase.from('ai_drafts').select('id, organisation_id, entity_id, status, content').eq('id', draftId).maybeSingle()
  if (!draft) return NextResponse.json({ error: 'draft not found' }, { status: 404 })
  if (draft.status === 'released' || draft.status === 'rejected') return NextResponse.json({ error: 'This report is final.' }, { status: 409 })

  const now = new Date().toISOString()
  const update =
    body.action === 'reject'
      ? { status: 'rejected', reviewer_id: user.id, updated_at: now }
      : {
          content: { ...(draft.content as object), findings: body.findings },
          reviewer_id: user.id,
          updated_at: now,
          ...(body.action === 'release' ? { status: 'released', signed_at: now, released_at: now } : { status: 'in_review' }),
        }

  const { data: saved, error } = await supabase.from('ai_drafts').update(update).eq('id', draftId).select('id').maybeSingle()
  if (error || !saved) return NextResponse.json({ error: 'You cannot change this report.' }, { status: 403 })

  await supabase.rpc('log_audit', {
    p_organisation_id: draft.organisation_id,
    p_action: `ai.draft.${body.action === 'save' ? 'edited' : body.action === 'release' ? 'signed_released' : 'rejected'}`,
    p_resource_type: 'ai_draft',
    p_resource_id: draftId,
    p_metadata: { entity_id: draft.entity_id },
  })
  return NextResponse.json({ ok: true })
}
