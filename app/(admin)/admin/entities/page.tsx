import Link from 'next/link'
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link href="/admin" className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>
        ← Organisations
      </Link>
      <h1 className="text-ios-title1 mt-2" style={{ color: 'var(--system-label)' }}>
        {orgFilter ? 'Entities' : 'All entities'}
      </h1>

      <div className="mt-5 rounded-[20px] bg-white !p-2">
        {(entities ?? []).length === 0 && (
          <p className="p-4 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>No entities found.</p>
        )}
        {(entities ?? []).map((e, i) => {
          const stage = REGISTRATION_STAGES.find((s) => s.value === e.registration_status)
          return (
            <Link
              key={e.id}
              href={`/admin/entities/${e.id}`}
              className="flex items-center justify-between gap-3 px-3 py-3.5 transition-opacity hover:opacity-70"
              style={i < (entities?.length ?? 0) - 1 ? { borderBottom: '1px solid var(--system-fill-4)' } : undefined}
            >
              <div className="min-w-0">
                <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>{displayName(e)}</p>
                <p className="text-ios-caption1 mt-0.5" style={{ color: 'var(--system-label-3)' }}>
                  {(e.organisations as { name: string } | null)?.name ?? '—'} · {ENTITY_TYPES.find((t) => t.value === e.entity_type)?.label ?? e.entity_type}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className="text-ios-caption1 rounded-full px-2.5 py-1 font-semibold"
                  style={e.status === 'active'
                    ? { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }
                    : { background: 'rgba(255,149,0,0.14)', color: '#C77700' }}
                >
                  {e.status === 'active' ? 'Active' : 'Pending'}
                </span>
                {stage && (
                  <span className="text-ios-caption2" style={{ color: 'var(--system-label-3)' }}>{stage.label}</span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
