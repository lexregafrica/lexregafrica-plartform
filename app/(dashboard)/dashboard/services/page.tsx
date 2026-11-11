import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ServicesPage } from '@/components/dashboard/services-page'

export const metadata: Metadata = {
  title: 'Services — LexReg Africa',
}

export default async function DashboardServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) redirect('/onboarding')

  const { data: entities } = await supabase
    .from('entities')
    .select('id, legal_name, trading_name, proposed_names, status')
    .eq('organisation_id', membership.organisation_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Active entities first — services are mostly for registered businesses
  const list = (entities ?? [])
    .map((e) => ({
      id: e.id,
      name: e.legal_name ?? e.trading_name ?? (e.proposed_names as string[] | null)?.find((n) => n?.trim()) ?? 'Unnamed entity',
      active: e.status === 'active',
    }))
    .sort((a, b) => Number(b.active) - Number(a.active))
    .map(({ id, name }) => ({ id, name }))

  return (
    <ServicesPage
      userName={(user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Account'}
      userEmail={user.email ?? ''}
      entities={list}
    />
  )
}
