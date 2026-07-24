import Link from 'next/link'
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>Platform admin</p>
      <h1 className="text-ios-title1 mt-0.5" style={{ color: 'var(--system-label)' }}>Organisations</h1>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          ['Organisations', orgs?.length ?? 0],
          ['Entities', totalEntities],
          ['Active', totalActive],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[20px] bg-white p-4">
            <p className="text-[28px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>{value}</p>
            <p className="text-ios-caption1 mt-1.5" style={{ color: 'var(--system-label-3)' }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-ios-headline font-bold" style={{ color: 'var(--system-label)' }}>All organisations</h2>
        <Link href="/admin/entities" className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }}>
          View all entities →
        </Link>
      </div>

      <div className="mt-3 rounded-[20px] bg-white !p-2">
        {(orgs ?? []).length === 0 && (
          <p className="p-4 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>No organisations yet.</p>
        )}
        {(orgs ?? []).map((org, i) => (
          <Link
            key={org.id}
            href={`/admin/entities?org=${org.id}`}
            className="flex items-center justify-between gap-3 px-3 py-3.5 transition-opacity hover:opacity-70"
            style={i < (orgs?.length ?? 0) - 1 ? { borderBottom: '1px solid var(--system-fill-4)' } : undefined}
          >
            <div className="min-w-0">
              <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>{org.name}</p>
              <p className="text-ios-caption1 mt-0.5" style={{ color: 'var(--system-label-3)' }}>
                {entityCountByOrg.get(org.id) ?? 0} entities · {activeCountByOrg.get(org.id) ?? 0} active · {lawyerCountByOrg.get(org.id) ?? 0} lawyers
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
