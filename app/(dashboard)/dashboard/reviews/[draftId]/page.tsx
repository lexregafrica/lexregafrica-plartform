import { notFound, redirect } from 'next/navigation'
import { getReport } from '@/lib/ai/drafts'
import { getDashboardSession } from '@/lib/dashboard/session'
import { ReportEditor } from '@/components/ai/report-editor'

export default async function LawyerReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params
  const { supabase, user, membership } = await getDashboardSession()
  if (!user || !membership) redirect('/login')
  if (membership.role !== 'lawyer') redirect(`/dashboard/reports/${draftId}`)
  const report = await getReport(supabase, draftId)
  if (!report) notFound()
  return <div className="lx"><ReportEditor report={report} readOnly={false} backHref="/dashboard/reviews" /></div>
}
