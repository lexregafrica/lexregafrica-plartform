import Link from 'next/link'
import { IconX } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'
import { ENTITY_TYPES } from '@/lib/onboarding/new-entity'
import { REGISTRATION_STAGES } from '@/lib/onboarding/registration-status'

function displayName(e: { legal_name: string | null; trading_name: string | null; proposed_names: unknown }): string {
  if (e.legal_name) return e.legal_name
  if (e.trading_name) return e.trading_name
  const proposed = e.proposed_names as string[] | null
  return proposed?.find((n) => n?.trim()) ?? 'Unnamed entity'
}

export default async function AdminEntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgFilter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('entities')
    .select('id, organisation_id, legal_name, trading_name, proposed_names, entity_type, status, registration_status, created_at, organisations(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (orgFilter) query = query.eq('organisation_id', orgFilter)

  const { data: entities } = await query
  const orgName = orgFilter ? (entities?.[0]?.organisations as { name: string } | null)?.name : null

  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex flex-col gap-1">
          <h1 className="t-title1">{orgFilter ? 'Entities' : 'All entities'}</h1>
          <p className="t-callout t-2 t-num">{entities?.length ?? 0} {entities?.length === 1 ? 'entity' : 'entities'}{orgName ? ` in ${orgName}` : ' across all organisations'}</p>
        </div>
        {orgFilter && (
          <div className="page-actions">
            <Link href="/admin/entities" className="btn btn-gray btn-sm"><IconX size={15} stroke={2} aria-hidden="true" />Clear organisation filter</Link>
          </div>
        )}
      </header>

      <section className="card rise" style={{ '--d': 1 } as React.CSSProperties} aria-label="Entities">
        {(entities ?? []).length === 0 ? (
          <p className="t-footnote t-3 p-5">No entities found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Entity</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Filing stage</th>
                  <th scope="col" className="num">Created</th>
                </tr>
              </thead>
              <tbody>
                {(entities ?? []).map((e) => {
                  const stage = REGISTRATION_STAGES.find((s) => s.value === e.registration_status)
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/admin/entities/${e.id}`} className="flex flex-col" style={{ color: 'var(--label)' }}>
                          <span className="t-subhead" style={{ fontWeight: 600 }}>{displayName(e)}</span>
                          <span className="t-footnote t-3">{(e.organisations as { name: string } | null)?.name ?? '—'}</span>
                        </Link>
                      </td>
                      <td className="t-2">{ENTITY_TYPES.find((t) => t.value === e.entity_type)?.label ?? e.entity_type}</td>
                      <td>
                        <span className={`pill ${e.status === 'active' ? 'pill-good' : 'pill-warn'}`}>
                          <span className="dot" aria-hidden="true" />{e.status === 'active' ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="t-2">{stage?.label ?? '—'}</td>
                      <td className="num t-3 whitespace-nowrap">{new Date(e.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
