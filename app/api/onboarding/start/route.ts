import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

type OnboardingPath = Database['public']['Enums']['onboarding_path']

const PATH_MAP: Record<string, OnboardingPath> = {
  existing: 'existing_entity',
  new: 'new_entity',
  informal: 'informal_business',
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { path } = body as { path: string }

  const onboardingPath = PATH_MAP[path]
  if (!onboardingPath) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  // Get or create org
  let orgId: string

  const { data: existing } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.organisation_id) {
    orgId = existing.organisation_id
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    const orgName = profile?.full_name
      ? `${profile.full_name}'s Workspace`
      : 'My Workspace'
    const slug = `org-${crypto.randomUUID().slice(0, 8)}`

    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: orgName, slug })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('org create error', orgError)
      return NextResponse.json({ error: 'failed to create org' }, { status: 500 })
    }

    orgId = org.id

    const { error: memberError } = await supabase
      .from('organisation_members')
      .insert({ organisation_id: orgId, user_id: user.id, role: 'business_owner' })

    if (memberError) {
      console.error('member create error', memberError)
      return NextResponse.json({ error: 'failed to create membership' }, { status: 500 })
    }
  }

  // Reset progress for this user and start fresh on chosen path
  await supabase.from('onboarding_progress').delete().eq('user_id', user.id)

  const { error: progressError } = await supabase.from('onboarding_progress').insert({
    user_id: user.id,
    organisation_id: orgId,
    onboarding_path: onboardingPath,
    entity_type: 'limited_company',
    step: 1,
    data: {},
  })

  if (progressError) {
    console.error('progress create error', progressError)
    return NextResponse.json({ error: 'failed to save progress' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)('log_audit', {
    p_organisation_id: orgId,
    p_action: 'onboarding.path_selected',
    p_resource_type: 'onboarding_progress',
    p_metadata: { path: onboardingPath },
  })

  return NextResponse.json({ ok: true, orgId })
}
