import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// One request-scoped read of who is signed in, their organisation and
// role, and the entities they can see — shared by the dashboard layout and
// its pages so the frame and the page never disagree. RLS decides the
// entity list: owners see their organisation's, lawyers only assigned ones.

export type DashboardRole = 'super_admin' | 'business_owner' | 'lawyer'

export const getDashboardSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, membership: null, entities: [] as DashboardEntityRow[] }

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return { supabase, user, membership: null, entities: [] as DashboardEntityRow[] }

  let query = supabase
    .from('entities')
    .select('id, organisation_id, legal_name, trading_name, proposed_names, entity_type, status, registration_number, updated_at, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  // A lawyer's membership row is not the client's organisation; RLS alone
  // limits them to their assigned entities.
  if (membership.role !== 'lawyer') query = query.eq('organisation_id', membership.organisation_id)
  const { data: entities } = await query

  return {
    supabase,
    user,
    membership: membership as { organisation_id: string; role: DashboardRole },
    entities: (entities ?? []) as DashboardEntityRow[],
  }
})

export type DashboardEntityRow = {
  id: string
  organisation_id: string
  legal_name: string | null
  trading_name: string | null
  proposed_names: unknown
  entity_type: string
  status: string
  registration_number: string | null
  updated_at: string | null
  created_at: string
}

export function displayUserName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  return (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'Account'
}
