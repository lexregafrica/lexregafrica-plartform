import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardComingSoon } from '@/components/dashboard/coming-soon'
import type { Database } from '@/types/database.types'

type OnboardingPath = Database['public']['Enums']['onboarding_path']

const PATH_SEGMENT: Record<OnboardingPath, string> = {
  existing_entity: 'existing',
  new_entity: 'new',
  informal_business: 'informal',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user belongs to an organisation yet
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/onboarding')

  // Check for an active entity in their org
  const { data: entities } = await supabase
    .from('entities')
    .select('id, status')
    .eq('organisation_id', membership.organisation_id)
    .is('deleted_at', null)

  const hasActiveEntity = entities?.some(e => e.status === 'active')

  if (!hasActiveEntity) {
    // Resume in-progress onboarding if it exists
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('onboarding_path, step')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (progress) {
      const segment = PATH_SEGMENT[progress.onboarding_path]
      const stepSuffix = progress.onboarding_path !== 'informal_business'
        ? `/${progress.step ?? 1}`
        : ''
      redirect(`/onboarding/${segment}${stepSuffix}`)
    }

    redirect('/onboarding')
  }

  return <DashboardComingSoon />
}
