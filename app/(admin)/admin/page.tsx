import Link from 'next/link'
import { IconBuilding, IconBuildingCommunity, IconCircleCheck, IconGavel, IconArrowRight } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date())
  const [{ data: orgs }, { data: entities }, { data: members }, { data: overdue }, { data: assignments }] = await Promise.all([
    supabase.from('organisations').select('id, name, slug, created_at').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('entities').select('id, organisation_id, status, legal_name, trading_name, proposed_names, updated_at').is('deleted_at', null),
    supabase.from('organisation_members').select('organisation_id, role'),
    supabase.from('compliance_events').select('id, title, due_date, entity_id').neq('status', 'complete').lt('due_date', todayIso).order('due_date').limit(50),
    supabase.from('lawyer_assignments').select('id, entity_id, service_type, assigned_at').eq('status', 'active'),
  ])

  // Operations queue: what needs Charles's hand today
  const nameOf = new Map((entities ?? []).map((e) => [e.id, e.legal_name || e.trading_name || (e.proposed_names as string[] | null)?.find((n) => n?.trim()) || 'Unnamed entity']))
  const awaitingBrs = (entities ?? []).filter((e) => e.status === 'pending_registration')
    .sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))
  const queue = [
    ...awaitingBrs.slice(0, 4).map((e) => ({ key: `brs-${e.id}`, href: `/admin/entities/${e.id}`, title: nameOf.get(e.id) ?? '', what: 'Awaiting BRS certificate', tone: 'warn' })),
    ...(overdue ?? []).slice(0, 4).map((c) => ({ key: `od-${c.id}`, href: `/admin/entities/${c.entity_id}`, title: nameOf.get(c.entity_id) ?? '', what: `Overdue: ${c.title}`, tone: 'bad' })),
    ...(assignments ?? []).slice(0, 4).map((a) => ({ key: `la-${a.id}`, href: `/admin/entities/${a.entity_id}`, title: nameOf.get(a.entity_id) ?? '', what: `With lawyer: ${a.service_type === 'legal_audit' ? 'Legal audit' : 'Corporate services'}`, tone: 'info' })),
  ]

  const entityCountByOrg = new Map<string, number>()
  const activeCountByOrg = new Map<string, number>()
  for (const e of entities ?? []) {
    entityCountByOrg.set(e.organisation_id, (entityCountByOrg.get(e.organisation_id) ?? 0) + 1)
    if (e.status === 'active') activeCountByOrg.set(e.organisation_id, (activeCountByOrg.get(e.organisation_id) ?? 0) + 1)
  }
  const lawyerCountByOrg = new Map<string, number>()
  for (const m of members ?? []) {
    if (m.role === 'lawyer') lawyerCountByOrg.set(m.organisation_id, (lawyerCountByOrg.get(m.organisation_id) ?? 0) + 1)
  }

  const totalEntities = entities?.length ?? 0
  const totalActive = entities?.filter((e) => e.status === 'active').length ?? 0
  const totalLawyers = [...lawyerCountByOrg.values()].reduce((a, b) => a + b, 0)
  const today = new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' }).format(new Date())

  const stats = [
    { label: 'Organisations', value: orgs?.length ?? 0, sub: 'Client accounts', icon: IconBuildingCommunity },
    { label: 'Entities', value: totalEntities, sub: `${totalEntities - totalActive} in onboarding or awaiting BRS`, icon: IconBuilding },
    { label: 'Active entities', value: totalActive, sub: totalEntities ? `${Math.round((totalActive / totalEntities) * 100)}% of all entities` : 'None yet', icon: IconCircleCheck },
    { label: 'Lawyers', value: totalLawyers, sub: 'Invited across all organisations', icon: IconGavel },
  ]

  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex flex-col gap-1">
          <p className="t-eyebrow t-num">{today}</p>
          <h1 className="t-title1">Platform overview</h1>
          <p className="t-callout t-2">Every organisation and entity on LexReg.</p>
        </div>
        <div className="page-actions">
          <Link href="/admin/entities" className="btn btn-primary">View all entities<IconArrowRight size={17} stroke={2} aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="grid cols-4 keep-2 gap-4" aria-label="Summary">
        {stats.map((s, i) => (
          <div key={s.label} className="stat rise" style={{ '--d': i + 1 } as React.CSSProperties}>
            <p className="stat-label"><s.icon size={15} stroke={1.75} aria-hidden="true" />{s.label}</p>
            <p className="t-stat">{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
          </div>
        ))}
      </section>

      <section className="card rise" aria-labelledby="queue-h" style={{ '--d': 5 } as React.CSSProperties}>
        <div className="card-head">
          <h2 id="queue-h">Needs action</h2>
          <span className="t-footnote t-3 t-num">{awaitingBrs.length} awaiting BRS · {overdue?.length ?? 0} overdue · {assignments?.length ?? 0} with lawyers</span>
        </div>
        {queue.length === 0 ? (
          <p className="t-footnote t-3 px-5 pb-5">Nothing waiting. Every entity is up to date.</p>
        ) : (
          <ul className="flex flex-col px-2 pb-2">
            {queue.map((q) => (
              <li key={q.key}>
                <Link href={q.href} className="list-row is-link" style={{ color: 'var(--label)' }}>
                  <span className={`pill pill-${q.tone}`}>{q.what}</span>
                  <span className="t-subhead min-w-0 flex-1 truncate">{q.title}</span>
                  <IconArrowRight size={15} stroke={2} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card rise" aria-labelledby="orgs-h" style={{ '--d': 6 } as React.CSSProperties}>
        <div className="card-head">
          <h2 id="orgs-h">Organisations</h2>
          <span className="t-footnote t-3 t-num">{orgs?.length ?? 0} total</span>
        </div>
        {(orgs ?? []).length === 0 ? (
          <p className="t-footnote t-3 px-5 pb-5">No organisations yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Organisation</th>
                  <th scope="col" className="num">Entities</th>
                  <th scope="col" className="num">Active</th>
                  <th scope="col" className="num">Lawyers</th>
                  <th scope="col" className="num">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(orgs ?? []).map((org) => (
                  <tr key={org.id}>
                    <td>
                      <Link href={`/admin/entities?org=${org.id}`} className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{org.name}</Link>
                    </td>
                    <td className="num">{entityCountByOrg.get(org.id) ?? 0}</td>
                    <td className="num">{activeCountByOrg.get(org.id) ?? 0}</td>
                    <td className="num">{lawyerCountByOrg.get(org.id) ?? 0}</td>
                    <td className="num t-3 whitespace-nowrap">{new Date(org.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
