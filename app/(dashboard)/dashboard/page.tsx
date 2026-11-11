import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DraftResumeShell } from '@/components/dashboard/draft-resume-shell'
import { OwnerHomePage } from '@/components/dashboard/owner-home-page'
import { getDashboardSession } from '@/lib/dashboard/session'

export const metadata: Metadata = { title: 'Dashboard — LexReg Africa' }

export default async function DashboardPage() {
  const { supabase, user, membership, entities } = await getDashboardSession()
  if (!user) redirect('/login')
  if (!membership) redirect('/onboarding')
  if (membership.role === 'lawyer') redirect('/dashboard/matters')

  // No entities at all — fall back to the draft-resume / onboarding funnel
  if (!entities.length) {
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

  return <OwnerHomePage page="overview" />
}
