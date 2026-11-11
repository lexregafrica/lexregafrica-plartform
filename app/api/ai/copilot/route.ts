import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/ai/run'
import { entityTools } from '@/lib/ai/tools'

// Lawyer Co-Pilot: a pre-flight briefing on the one entity a lawyer is
// assigned to. For the lawyer (or Charles) only — it is never sent to the
// client and makes no changes.
export const maxDuration = 120

const Body = z.object({ entityId: z.uuid() })

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  const { entityId } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const [{ data: isSuperAdmin }, { data: assignment }, { data: entity }] = await Promise.all([
    supabase.rpc('is_super_admin'),
    supabase.from('lawyer_assignments').select('service_type').eq('entity_id', entityId).eq('lawyer_user_id', user.id).eq('status', 'active').maybeSingle(),
    supabase.from('entities').select('id, organisation_id, legal_name, trading_name').eq('id', entityId).is('deleted_at', null).maybeSingle(),
  ])
  if (!isSuperAdmin && !assignment) return NextResponse.json({ error: 'Co-Pilot is for the assigned lawyer only.' }, { status: 403 })
  if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

  const service = assignment?.service_type === 'legal_audit' ? 'a legal audit' : assignment ? 'corporate services work' : 'a review'
  const client = supabase as unknown as SupabaseClient
  const result = await runAgent({
    supabase: client,
    user,
    organisationId: entity.organisation_id,
    entityId,
    agent: 'copilot',
    system: `You are LexReg Co-Pilot, briefing a Kenyan advocate before ${service} for ${entity.legal_name || entity.trading_name || 'this entity'}. Read the register, documents, deadlines and saved facts with the tools first. Jurisdiction is Kenya (Companies Act 2015, BRS, KRA, ODPC); never mention other countries' bodies.`,
    prompt: `Write a pre-flight briefing with these headings:
1. Snapshot — type, status, registration number, incorporation date, people (2–3 lines).
2. What looks in order.
3. Gaps and inconsistencies to raise with the client (e.g. missing documents, mismatched PINs or names between documents and registers, overdue deadlines).
4. Suggested checklist — 3 to 6 concrete next steps.
Keep it under 300 words. Cite the source for each point.`,
    tools: entityTools(client, entityId),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ briefing: result.text })
}
