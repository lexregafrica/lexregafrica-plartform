import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Client-facing entity deletion — draft and pending_registration entities
// only. An entity already active (BRS certificate on file) is a real,
// registered business; deleting that record here would just hide a live
// legal entity from its own owner, not actually dissolve it — that needs
// the proper deregistration process, not a dashboard button.
//
// Soft delete only (architecture rule: never hard delete, Kenya DPA 2019
// 30-day retention) — sets deleted_at, same as every other delete path in
// this app. RLS's "business owner manages own entities" policy already
// scopes writes to the caller's own organisation, so the regular
// cookie-authenticated client is used here, not a service-role client.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { entityId } = body as { entityId?: string }
  if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, organisation_id, status, legal_name, trading_name, proposed_names')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

  if (entity.status !== 'draft' && entity.status !== 'pending_registration') {
    return NextResponse.json(
      { error: 'Only draft or pending-registration entities can be deleted here.' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('entities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', entityId)

  if (error) {
    console.error('entity delete error', error)
    return NextResponse.json({ error: 'failed to delete entity' }, { status: 500 })
  }

  const name = entity.legal_name ?? entity.trading_name ?? (entity.proposed_names as string[] | null)?.find((n) => n?.trim()) ?? 'Unnamed entity'
  await supabase.rpc('log_audit', {
    p_organisation_id: entity.organisation_id,
    p_action: 'entity.deleted',
    p_resource_type: 'entity',
    p_resource_id: entityId,
    p_metadata: { name, status_at_deletion: entity.status },
  })

  return NextResponse.json({ ok: true })
}
