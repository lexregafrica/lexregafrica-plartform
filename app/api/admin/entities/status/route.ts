import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { REGISTRATION_STAGES } from '@/lib/onboarding/registration-status'

// Advances an entity's BRS filing stage (registration_status). Several
// stages happen entirely outside the app — payment, BRS submission,
// registrar queries — so this is a manual super_admin action, not
// something the wizard can derive on its own.
//
// TODO: lawyers should also be able to advance status for their assigned
// entity, per the architecture's "lawyer scoped to one assigned entity"
// rule — but no lawyer-entity assignment table exists yet (open blocker,
// same one tracked for lawyer login). Restricted to super_admin until
// that's built.
//
// super_admin is a platform-wide role, not scoped to any one
// organisation's membership row — checking it against the *target*
// entity's org would wrongly 403 a super_admin whose own membership row
// lives in a different org. Uses the is_super_admin() DB function
// (security definer, checks membership rows across all orgs) instead.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { entityId, status } = body as { entityId?: string; status?: string }

  if (!entityId || !status) {
    return NextResponse.json({ error: 'entityId and status required' }, { status: 400 })
  }
  if (!REGISTRATION_STAGES.some((s) => s.value === status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, organisation_id')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (isSuperAdmin !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('entities').update({ registration_status: status }).eq('id', entityId)
  if (error) {
    console.error('registration status update error', error)
    return NextResponse.json({ error: 'failed to update status' }, { status: 500 })
  }

  await supabase.rpc('log_audit', {
    p_organisation_id: entity.organisation_id,
    p_action: 'entity.registration_status_changed',
    p_resource_type: 'entity',
    p_resource_id: entityId,
    p_metadata: { status },
  })

  return NextResponse.json({ ok: true })
}
