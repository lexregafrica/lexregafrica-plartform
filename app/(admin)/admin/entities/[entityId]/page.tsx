import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ENTITY_TYPES } from '@/lib/onboarding/new-entity'
import { StatusBoard } from '@/components/dashboard/entity-workspace'
import { LawyerAssignmentPanel, type LawyerAssignment } from '@/components/admin/lawyer-assignment-panel'

const CARD = 'rounded-[24px] bg-white p-5'

function displayName(e: { legal_name: string | null; trading_name: string | null; proposed_names: unknown }): string {
  if (e.legal_name) return e.legal_name
  if (e.trading_name) return e.trading_name
  const proposed = e.proposed_names as string[] | null
  return proposed?.find((n) => n?.trim()) ?? 'Unnamed entity'
}

export default async function AdminEntityDetailPage({
  params,
}: {
  params: Promise<{ entityId: string }>
}) {
  const { entityId } = await params
  const supabase = await createClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, organisation_id, legal_name, trading_name, proposed_names, entity_type, status, registration_status, registration_number, kra_pin, organisations(name)')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!entity) notFound()

  const [{ data: directors }, { data: shareholders }, { data: documents }, { data: assignments }] = await Promise.all([
    supabase.from('directors').select('id, full_name, kra_pin').eq('entity_id', entityId).order('created_at'),
    supabase.from('shareholders').select('id, legal_name, shares_held, share_percentage').eq('entity_id', entityId).order('created_at'),
    supabase.from('documents').select('id, name, document_type').eq('entity_id', entityId).is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('lawyer_assignments').select('id, lawyer_user_id, service_type, status, notes, assigned_at').eq('entity_id', entityId).order('assigned_at', { ascending: false }),
  ])

  // Lawyer emails aren't on any RLS-visible table (auth.users isn't
  // exposed) — resolve them server-side with the service-role client.
  const admin = createAdminClient()
  const lawyerAssignments: LawyerAssignment[] = await Promise.all(
    (assignments ?? []).map(async (a) => {
      const { data } = await admin.auth.admin.getUserById(a.lawyer_user_id)
      return {
        id: a.id,
        lawyerUserId: a.lawyer_user_id,
        lawyerEmail: data?.user?.email ?? null,
        serviceType: a.service_type,
        status: a.status,
        notes: a.notes,
        assignedAt: a.assigned_at,
      }
    })
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <Link href="/admin/entities" className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>
        ← All entities
      </Link>

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>
            {(entity.organisations as { name: string } | null)?.name ?? '—'} · {ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label ?? entity.entity_type}
          </p>
          <h1 className="text-ios-title1 mt-0.5" style={{ color: 'var(--system-label)' }}>{displayName(entity)}</h1>
        </div>
        <span
          className="text-ios-caption1 shrink-0 rounded-full px-3 py-1.5 font-semibold"
          style={entity.status === 'active'
            ? { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }
            : { background: 'rgba(255,149,0,0.14)', color: '#C77700' }}
        >
          {entity.status === 'active' ? 'Active' : 'Pending'}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-4 lg:col-span-2">
          <div className={CARD}>
            <h3 className="text-ios-subhead mb-2 font-bold" style={{ color: 'var(--system-label)' }}>Identity</h3>
            {[
              ['Registration no.', entity.registration_number],
              ['KRA PIN', entity.kra_pin],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--system-fill-4)' }}>
                <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{label}</span>
                <span className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{value}</span>
              </div>
            ))}
          </div>

          <div className={CARD}>
            <h3 className="text-ios-subhead mb-2 font-bold" style={{ color: 'var(--system-label)' }}>
              People ({(directors?.length ?? 0) + (shareholders?.length ?? 0)})
            </h3>
            {(directors ?? []).map((d) => (
              <div key={d.id} className="flex justify-between gap-4 py-1.5 border-b" style={{ borderColor: 'var(--system-fill-4)' }}>
                <span className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{d.full_name}</span>
                <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Director{d.kra_pin ? ` · ${d.kra_pin}` : ''}</span>
              </div>
            ))}
            {(shareholders ?? []).map((s) => (
              <div key={s.id} className="flex justify-between gap-4 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--system-fill-4)' }}>
                <span className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{s.legal_name}</span>
                <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                  Shareholder · {s.shares_held.toLocaleString()} shares{s.share_percentage != null ? ` (${s.share_percentage}%)` : ''}
                </span>
              </div>
            ))}
            {(directors?.length ?? 0) + (shareholders?.length ?? 0) === 0 && (
              <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>No people recorded yet.</p>
            )}
          </div>

          <div className={CARD}>
            <h3 className="text-ios-subhead mb-2 font-bold" style={{ color: 'var(--system-label)' }}>Documents ({documents?.length ?? 0})</h3>
            {(documents ?? []).map((doc) => (
              <div key={doc.id} className="py-1.5 border-b last:border-0" style={{ borderColor: 'var(--system-fill-4)' }}>
                <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{doc.name}</p>
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{doc.document_type?.replaceAll('_', ' ')}</p>
              </div>
            ))}
            {(documents?.length ?? 0) === 0 && (
              <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>No documents on file.</p>
            )}
          </div>
        </div>

        <div className="grid content-start gap-4">
          <StatusBoard entityId={entity.id} registrationStatus={entity.registration_status} canManage />
          <LawyerAssignmentPanel entityId={entity.id} assignments={lawyerAssignments} />
        </div>
      </div>
    </div>
  )
}
