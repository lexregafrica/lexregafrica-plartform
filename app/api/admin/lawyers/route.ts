import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/supabase/require-super-admin'
import { createAdminClient } from '@/lib/supabase/admin'

// Lawyer invite/assignment — super_admin only. Charles enters an email,
// the lawyer gets a Supabase magic-link invite, sets their own password,
// and lands scoped to exactly the one entity + service they're assigned
// to (lawyer_assignments + entities RLS already enforce that scope —
// this route only ever runs as super_admin, verified below).
//
// organisation_members has no RLS policy letting super_admin INSERT into
// another org's membership list (only "self-join as owner" exists), so
// the invite path uses the service-role client, which bypasses RLS
// entirely. That's appropriate here since is_super_admin() is verified
// independently first, via the caller's own session.
export async function POST(request: Request) {
  const { user: currentUser, isSuperAdmin } = await requireSuperAdmin()
  if (!isSuperAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { action } = body as { action: string }
  const admin = createAdminClient()

  if (action === 'invite') {
    const { email, entityId, serviceType, notes } = body as {
      email?: string; entityId?: string; serviceType?: string; notes?: string
    }
    if (!email?.trim() || !entityId || !serviceType) {
      return NextResponse.json({ error: 'email, entityId, and serviceType are required' }, { status: 400 })
    }

    const { data: entity } = await admin.from('entities').select('id, organisation_id').eq('id', entityId).maybeSingle()
    if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email.trim())
    if (inviteError || !invited?.user) {
      return NextResponse.json({ error: inviteError?.message || 'failed to invite lawyer' }, { status: 500 })
    }
    const lawyerUserId = invited.user.id

    const { error: memberError } = await admin.from('organisation_members').insert({
      organisation_id: entity.organisation_id,
      user_id: lawyerUserId,
      role: 'lawyer',
      invited_by: currentUser?.id ?? null,
    })
    if (memberError) {
      console.error('lawyer membership insert error', memberError)
      return NextResponse.json({ error: 'invited, but failed to add to organisation' }, { status: 500 })
    }

    const { error: assignError } = await admin.from('lawyer_assignments').insert({
      entity_id: entityId,
      lawyer_user_id: lawyerUserId,
      assigned_by: currentUser?.id ?? lawyerUserId,
      service_type: serviceType,
      notes: notes || null,
    })
    if (assignError) {
      console.error('lawyer assignment insert error', assignError)
      return NextResponse.json({ error: 'invited, but failed to assign to entity' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, lawyerUserId })
  }

  if (action === 'unassign') {
    const { assignmentId } = body as { assignmentId?: string }
    if (!assignmentId) return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })
    const { error } = await admin
      .from('lawyer_assignments')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
    if (error) return NextResponse.json({ error: 'failed to unassign' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
