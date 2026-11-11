import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateAudit } from '@/lib/ai/lexaudit'

// Start a LexAudit draft. Only Charles (super_admin) or the lawyer actively
// assigned to the entity may run it; the draft lands in their review queue.
export const maxDuration = 300

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
    supabase.from('lawyer_assignments').select('id').eq('entity_id', entityId).eq('lawyer_user_id', user.id).eq('status', 'active').maybeSingle(),
    supabase.from('entities').select('id, organisation_id, legal_name, trading_name').eq('id', entityId).is('deleted_at', null).maybeSingle(),
  ])
  if (!isSuperAdmin && !assignment) return NextResponse.json({ error: 'Only LexReg or the assigned lawyer can run a legal audit.' }, { status: 403 })
  if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

  const result = await generateAudit(supabase as unknown as SupabaseClient, user, {
    id: entity.id,
    organisation_id: entity.organisation_id,
    name: entity.legal_name || entity.trading_name || 'Unnamed entity',
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ draftId: result.draftId })
}
