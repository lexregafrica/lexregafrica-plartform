import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { listReports } from '@/lib/ai/drafts'
import { ReportList } from '@/components/ai/report-list'

export const metadata: Metadata = { title: 'Review queue — LexReg Admin' }

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const [waiting, done] = await Promise.all([
    listReports(supabase, { statuses: ['draft', 'in_review'] }),
    listReports(supabase, { statuses: ['released', 'rejected'] }),
  ])
  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex flex-col gap-1">
          <h1 className="t-title1">Review queue</h1>
          <p className="t-callout t-2">LexAudit drafts wait here until you or the assigned lawyer sign them. Start a new audit from an entity&rsquo;s page.</p>
        </div>
      </header>
      <section className="card" aria-labelledby="w-h">
        <div className="card-head"><h2 id="w-h">Awaiting sign-off</h2><span className="t-footnote t-3 t-num">{waiting.length}</span></div>
        <ReportList reports={waiting} base="/admin/reviews" empty="Nothing waiting for sign-off." />
      </section>
      <section className="card" aria-labelledby="d-h">
        <div className="card-head"><h2 id="d-h">Signed or rejected</h2><span className="t-footnote t-3 t-num">{done.length}</span></div>
        <ReportList reports={done} base="/admin/reviews" empty="No finished reports yet." />
      </section>
    </main>
  )
}
