import Link from 'next/link'
import { IconBuilding, IconBuildingCommunity, IconCircleCheck, IconGavel, IconArrowRight } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [{ data: orgs }, { data: entities }, { data: members }] = await Promise.all([
    supabase.from('organisations').select('id, name, slug, created_at').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('entities').select('id, organisation_id, status').is('deleted_at', null),
    supabase.from('organisation_members').select('organisation_id, role'),
  ])

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

      <section className="card rise" aria-labelledby="orgs-h" style={{ '--d': 5 } as React.CSSProperties}>
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
