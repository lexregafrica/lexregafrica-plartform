import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { listReports } from '@/lib/ai/drafts'
import { getDashboardSession } from '@/lib/dashboard/session'
import { entityDisplayName } from '@/lib/dashboard/owner-data'
import { ReportList } from '@/components/ai/report-list'
import { StartAuditButton } from '@/components/ai/report-editor'

export const metadata: Metadata = { title: 'Reviews — LexReg Africa' }

// Assigned lawyers: start a LexAudit draft for an entity on a legal-audit
// assignment, and review / sign the drafts.
export default async function LawyerReviewsPage() {
  const { supabase, user, membership, entities } = await getDashboardSession()
  if (!user || !membership) redirect('/login')
  if (membership.role !== 'lawyer') redirect('/dashboard')

  const [{ data: assignments }, waiting, done] = await Promise.all([
    supabase.from('lawyer_assignments').select('entity_id').eq('lawyer_user_id', user.id).eq('status', 'active').eq('service_type', 'legal_audit'),
    listReports(supabase, { statuses: ['draft', 'in_review'] }),
    listReports(supabase, { statuses: ['released', 'rejected'] }),
  ])
  const auditEntities = entities.filter((e) => (assignments ?? []).some((a) => a.entity_id === e.id))

  return (
    <div className="lx">
      <main className="content">
        <header className="page-head rise">
          <div className="flex flex-col gap-1">
            <h1 className="t-title1">Reviews</h1>
            <p className="t-callout t-2">Draft legal audits for your assigned entities, then check, edit and sign them.</p>
          </div>
        </header>
        {auditEntities.length > 0 && (
          <section className="card card-pad flex flex-col gap-3" aria-label="Start an audit">
            <h2 className="t-title3">Start a LexAudit draft</h2>
            {auditEntities.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="t-subhead">{entityDisplayName(e)}</span>
                <StartAuditButton entityId={e.id} reviewBase="/dashboard/reviews" />
              </div>
            ))}
          </section>
        )}
        <section className="card" aria-labelledby="w-h">
          <div className="card-head"><h2 id="w-h">Awaiting your sign-off</h2></div>
          <ReportList reports={waiting} base="/dashboard/reviews" empty="Nothing waiting." />
        </section>
        <section className="card" aria-labelledby="d-h">
          <div className="card-head"><h2 id="d-h">Signed or rejected</h2></div>
          <ReportList reports={done} base="/dashboard/reviews" empty="No finished reports yet." />
        </section>
      </main>
    </div>
  )
}
