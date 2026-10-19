import { IconBuilding, IconFileText } from '@tabler/icons-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ENTITY_TYPES } from '@/lib/onboarding/new-entity'
import { StatusBoard } from '@/components/dashboard/entity-workspace'
import { LawyerAssignmentPanel, type LawyerAssignment } from '@/components/admin/lawyer-assignment-panel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

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

  const people = (directors?.length ?? 0) + (shareholders?.length ?? 0)

  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex min-w-0 items-center gap-4">
          <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconBuilding size={22} stroke={1.75} /></span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="t-title1 break-words">{displayName(entity)}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="pill">{ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label ?? entity.entity_type}</span>
              <span className={`pill ${entity.status === 'active' ? 'pill-good' : 'pill-warn'}`}><span className="dot" aria-hidden="true" />{entity.status === 'active' ? 'Active' : 'Pending'}</span>
              <span className="t-footnote t-3">{(entity.organisations as { name: string } | null)?.name ?? '—'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid cols-5 keep gap-4">
        <div className="span-3 flex flex-col gap-4">
          <section className="card rise" aria-labelledby="id-h" style={{ '--d': 1 } as React.CSSProperties}>
            <div className="card-head"><h2 id="id-h">Identity</h2></div>
            {[['Registration no.', entity.registration_number], ['KRA PIN', entity.kra_pin]].filter(([, v]) => v).length === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">No registration details on file yet.</p>
            ) : (
              <dl className="flex flex-col pb-1.5">
                {[['Registration no.', entity.registration_number], ['KRA PIN', entity.kra_pin]].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="list-row" style={{ paddingInline: 20, minHeight: 44 }}>
                    <dt className="t-footnote t-3 w-40 shrink-0">{label}</dt>
                    <dd className="t-subhead t-num" style={{ color: 'var(--label)' }}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="card rise" aria-labelledby="people-h" style={{ '--d': 2 } as React.CSSProperties}>
            <div className="card-head"><h2 id="people-h">People</h2><span className="t-footnote t-3 t-num">{people}</span></div>
            {people === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">No people recorded yet.</p>
            ) : (
              <div className="flex flex-col pb-1.5">
                {(directors ?? []).map((d) => (
                  <div key={d.id} className="list-row" style={{ paddingInline: 20 }}>
                    <span className="avatar avatar-sm" aria-hidden="true">{initials(d.full_name)}</span>
                    <span className="t-subhead min-w-0 flex-1 truncate" style={{ color: 'var(--label)' }}>{d.full_name}</span>
                    <span className="t-footnote t-3 shrink-0 t-num">Director{d.kra_pin ? ` · ${d.kra_pin}` : ''}</span>
                  </div>
                ))}
                {(shareholders ?? []).map((sh) => (
                  <div key={sh.id} className="list-row" style={{ paddingInline: 20 }}>
                    <span className="avatar avatar-sm" aria-hidden="true">{initials(sh.legal_name)}</span>
                    <span className="t-subhead min-w-0 flex-1 truncate" style={{ color: 'var(--label)' }}>{sh.legal_name}</span>
                    <span className="t-footnote t-3 shrink-0 t-num">Shareholder · {sh.shares_held.toLocaleString()} shares{sh.share_percentage != null ? ` (${sh.share_percentage}%)` : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card rise" aria-labelledby="docs-h" style={{ '--d': 3 } as React.CSSProperties}>
            <div className="card-head"><h2 id="docs-h">Documents</h2><span className="t-footnote t-3 t-num">{documents?.length ?? 0}</span></div>
            {(documents?.length ?? 0) === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">No documents on file.</p>
            ) : (
              <div className="flex flex-col gap-2 px-5 pb-5">
                {(documents ?? []).map((doc) => (
                  <div key={doc.id} className="file-row">
                    <IconFileText size={18} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)', flex: 'none' }} />
                    <span className="name">{doc.name}</span>
                    <span className="meta">{doc.document_type?.replaceAll('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="span-2 flex flex-col gap-4">
          <StatusBoard entityId={entity.id} registrationStatus={entity.registration_status} canManage />
          <LawyerAssignmentPanel entityId={entity.id} assignments={lawyerAssignments} />
        </div>
      </div>
    </main>
  )
}
