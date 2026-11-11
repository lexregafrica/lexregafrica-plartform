import 'server-only'
import { redirect } from 'next/navigation'
import type { AnalyticsDashboardPage, AnalyticsSettings } from '@/components/block/analytics-dashboard'
import { OwnerHome } from '@/components/dashboard/owner-home'
import { loadOwnerDashboard } from '@/lib/dashboard/owner-data'
import { displayUserName, getDashboardSession } from '@/lib/dashboard/session'

const ROLE_LABEL = { super_admin: 'LexReg admin', business_owner: 'Business owner', lawyer: 'Assigned lawyer' } as const

/** Server half of the Dashboard / Entities / Matters / Settings routes. */
export async function OwnerHomePage({ page }: { page: AnalyticsDashboardPage }) {
  const { supabase, user, membership, entities } = await getDashboardSession()
  if (!user) redirect('/login')
  if (!membership) redirect('/onboarding')
  // No entities yet: /dashboard shows the resume-onboarding screen instead
  if (!entities.length && membership.role !== 'lawyer') redirect('/dashboard')

  const { data } = await loadOwnerDashboard(supabase, user, membership.organisation_id, entities, membership.role)

  return (
    <OwnerHome
      page={page}
      data={data}
      user={{ name: displayUserName(user), email: user.email ?? '', role: ROLE_LABEL[membership.role] }}
      settings={{ ...(user.user_metadata?.preferences as Partial<AnalyticsSettings> | undefined), name: displayUserName(user) }}
    />
  )
}
