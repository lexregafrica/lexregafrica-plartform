import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getReport } from '@/lib/ai/drafts'
import { ReportEditor } from '@/components/ai/report-editor'

export default async function AdminReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params
  const report = await getReport(await createClient(), draftId)
  if (!report) notFound()
  return <ReportEditor report={report} readOnly={false} backHref="/admin/reviews" />
}
