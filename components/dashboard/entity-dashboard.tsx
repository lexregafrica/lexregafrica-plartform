'use client'

import Link from 'next/link'
import { IconPlus, IconArrowRight } from '@tabler/icons-react'
import { DashboardShell } from '@/components/dashboard/shell'

export type DashboardEntity = {
  id: string
  displayName: string
  entityTypeLabel: string
  status: 'draft' | 'pending_registration' | 'active' | 'suspended' | 'dissolved'
  registrationNumber: string | null
  dateIncorporated: string | null
  onboardingPath: 'existing_entity' | 'new_entity' | 'informal_business'
  onboardingStep: number
  documentCount: number
  idpUrl: string | null
}

export type DashboardDeadline = {
  id: string
  title: string
  dueDate: string
  entityName: string
  entityId: string
}

const STATUS_META: Record<DashboardEntity['status'], { label: string; bg: string; fg: string }> = {
  draft: { label: 'Draft', bg: 'var(--system-fill-3)', fg: 'var(--system-label-2)' },
  pending_registration: { label: 'Pending registration', bg: 'rgba(255,149,0,0.14)', fg: '#C77700' },
  active: { label: 'Active', bg: 'rgba(52,199,89,0.14)', fg: '#1E9E45' },
  suspended: { label: 'Suspended', bg: 'rgba(255,59,48,0.12)', fg: '#D70015' },
  dissolved: { label: 'Dissolved', bg: 'var(--system-fill-3)', fg: 'var(--system-label-3)' },
}

function resumeHref(entity: DashboardEntity): string {
  // ?entity= tells the wizard exactly which onboarding_progress session
  // to resume — a user can have several drafts/submissions in flight at
  // once, so "just grab my most recent session" (the old behaviour)
  // would silently resume the wrong entity.
  if (entity.onboardingPath === 'existing_entity') return `/onboarding/existing/${entity.onboardingStep || 1}?entity=${entity.id}`
  if (entity.onboardingPath === 'new_entity') return `/onboarding/new/${entity.onboardingStep || 1}?entity=${entity.id}`
  return '/onboarding/informal'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return `${diff}d`
}

function StatusBadge({ status }: { status: DashboardEntity['status'] }) {
  const meta = STATUS_META[status]
  return (
    <span className="text-ios-caption1 whitespace-nowrap rounded-full px-2.5 py-1 font-semibold" style={{ background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  )
}

function StatTile({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: tint ?? 'var(--system-bg)' }}>
      <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-2)' }}>{label}</p>
      <p className="mt-1 text-[30px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>{value}</p>
    </div>
  )
}

function EntityCard({ entity }: { entity: DashboardEntity }) {
  const isActive = entity.status === 'active'

  const card = (
    <div className={`rounded-2xl p-5 ${isActive ? 'transition-opacity hover:opacity-80 active:opacity-60' : ''}`} style={{ background: 'var(--system-bg)' }}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-ios-headline min-w-0 break-words" style={{ color: 'var(--system-label)' }}>
          {entity.displayName}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={entity.status} />
          {isActive && <span className="text-ios-subhead" style={{ color: 'var(--system-label-3)' }}>›</span>}
        </div>
      </div>

      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        {entity.entityTypeLabel}
        {entity.registrationNumber ? ` · ${entity.registrationNumber}` : ''}
        {` · ${entity.documentCount} document${entity.documentCount === 1 ? '' : 's'}`}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {entity.status === 'draft' && (
          <Link
            href={resumeHref(entity)}
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-navy)' }}
          >
            Continue setup
          </Link>
        )}

        {entity.status === 'pending_registration' && (
          <>
            {entity.idpUrl && (
              <a
                href={entity.idpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-navy)' }}
              >
                Download IDP
              </a>
            )}
            <Link
              href={resumeHref(entity)}
              className="rounded-full border px-5 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
            >
              Upload certificate
            </Link>
          </>
        )}

        {isActive && (
          <span className="text-ios-footnote inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--brand-navy)' }}>
            Open dashboard <IconArrowRight size={14} stroke={2.5} />
          </span>
        )}
      </div>
    </div>
  )

  if (isActive) return <Link href={`/dashboard/${entity.id}`}>{card}</Link>
  return card
}

export function EntityDashboard({
  userName,
  userEmail,
  organisationName,
  entities,
  deadlines,
  isSuperAdmin,
}: {
  userName: string
  userEmail: string
  organisationName: string
  entities: DashboardEntity[]
  deadlines: DashboardDeadline[]
  isSuperAdmin?: boolean
}) {
  const activeCount = entities.filter((e) => e.status === 'active').length
  const pendingCount = entities.filter((e) => e.status === 'pending_registration').length
  const documentCount = entities.reduce((sum, e) => sum + e.documentCount, 0)
  const pendingCert = entities.filter((e) => e.status === 'pending_registration')

  return (
    <DashboardShell userName={userName} userEmail={userEmail} isSuperAdmin={isSuperAdmin}>
      <main className="px-4 py-6 md:px-8 md:py-7">
        {/* Stat tiles */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Entities" value={entities.length} tint="rgba(128,0,32,0.06)" />
          <StatTile label="Active" value={activeCount} tint="rgba(52,199,89,0.08)" />
          <StatTile label="Pending" value={pendingCount} tint="rgba(255,149,0,0.08)" />
          <StatTile label="Documents" value={documentCount} />
        </div>

        {pendingCert.length > 0 && (
          <div
            className="text-ios-footnote mb-6 rounded-2xl px-4 py-3 font-medium"
            style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}
          >
            {pendingCert.length === 1
              ? `${pendingCert[0].displayName} is awaiting BRS registration — upload the certificate once issued to activate it.`
              : `${pendingCert.length} entities are awaiting BRS registration. Upload certificates once issued.`}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column — entities */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-ios-title3" style={{ color: 'var(--system-label)' }}>Your entities</h2>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{organisationName}</p>
            </div>

            <div className="flex flex-col gap-3">
              {entities.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}

              <Link
                href="/onboarding"
                className="text-ios-subhead flex items-center justify-center gap-2 rounded-2xl border border-dashed py-5 font-medium transition-opacity hover:opacity-70"
                style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
              >
                <IconPlus size={17} stroke={2.5} /> Add another entity
              </Link>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Upcoming deadlines */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--system-bg)' }}>
              <h2 className="text-ios-subhead mb-3 font-bold" style={{ color: 'var(--system-label)' }}>
                Upcoming deadlines
              </h2>
              {deadlines.length === 0 ? (
                <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                  Nothing due yet. Deadlines appear once an entity is active.
                </p>
              ) : (
                <div className="flex flex-col">
                  {deadlines.map((d, i) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/${d.entityId}`}
                      className="flex items-center justify-between gap-3 py-2.5 transition-opacity hover:opacity-70"
                      style={i < deadlines.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}
                    >
                      <div className="min-w-0">
                        <p className="text-ios-footnote truncate font-medium" style={{ color: 'var(--system-label)' }}>{d.title}</p>
                        <p className="text-ios-caption1 truncate" style={{ color: 'var(--system-label-3)' }}>{d.entityName}</p>
                      </div>
                      <span
                        className="text-ios-caption1 shrink-0 rounded-full px-2 py-0.5 font-semibold"
                        style={daysUntil(d.dueDate) === 'overdue'
                          ? { background: 'rgba(255,59,48,0.12)', color: '#D70015' }
                          : { background: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
                      >
                        {formatDate(d.dueDate)} · {daysUntil(d.dueDate)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Legal Audit promo — the "upgrade" card slot */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--brand-navy)' }}>
              <h2 className="text-ios-subhead font-bold text-white">Legal Audit &amp; Risk Review</h2>
              <p className="text-ios-footnote mt-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                A full compliance health check across statutory, tax, employment, and data protection.
              </p>
              <p className="mt-4 text-[26px] font-bold leading-none text-white">KES 25,000</p>
              <p className="text-ios-caption1 mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>one-time, per entity</p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''}?text=${encodeURIComponent('Hello LexReg Africa, I would like to book a Legal Audit.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block w-full rounded-full bg-white py-2.5 text-center text-sm font-bold transition-opacity hover:opacity-90"
                style={{ color: 'var(--brand-navy)' }}
              >
                Book an audit
              </a>
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  )
}
