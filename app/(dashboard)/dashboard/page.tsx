import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardComingSoon } from '@/components/dashboard/coming-soon'
import { DraftResumeShell } from '@/components/dashboard/draft-resume-shell'

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
    // Show a draft-resume preview instead of dropping the user straight back
    // into the onboarding flow — they land on the real dashboard shell first
    // and choose to continue.
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('onboarding_path, step, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (progress) {
      const progressData = progress.data as { completed?: boolean; result?: { score?: number } } | null
      return (
        <DraftResumeShell
          path={progress.onboarding_path}
          step={progress.step ?? 1}
          completed={progressData?.completed}
          score={progressData?.result?.score}
        />
      )
    }

    redirect('/onboarding')
  }

  return <DashboardComingSoon />
}
