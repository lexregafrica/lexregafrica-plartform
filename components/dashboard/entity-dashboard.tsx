'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconPlus, IconArrowRight, IconBuilding, IconCircleCheck, IconClock, IconFiles, IconGavel, IconAlertTriangle } from '@tabler/icons-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { DeleteEntityDialog } from '@/components/dashboard/delete-entity-dialog'

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
  missingDocs: string[]
}

export type DashboardDeadline = {
  id: string
  title: string
  dueDate: string
  entityName: string
  entityId: string
}

const STATUS_META: Record<DashboardEntity['status'], { label: string; pill: string }> = {
  draft: { label: 'Draft', pill: '' },
  pending_registration: { label: 'Awaiting BRS', pill: 'pill-warn' },
  active: { label: 'Active', pill: 'pill-good' },
  suspended: { label: 'Suspended', pill: 'pill-bad' },
  dissolved: { label: 'Dissolved', pill: '' },
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

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function whenLabel(days: number) {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  return `In ${days} day${days === 1 ? '' : 's'}`
}

function EntityCard({ entity, index }: { entity: DashboardEntity; index: number }) {
  const router = useRouter()
  const isActive = entity.status === 'active'
  // Deletable only pre-activation — an active entity has a real BRS
  // certificate on file, so "deleting" it here would just hide a live
  // registered business from its own owner rather than dissolve it.
  const isDeletable = entity.status === 'draft' || entity.status === 'pending_registration'
  const [showDelete, setShowDelete] = useState(false)
  const meta = STATUS_META[entity.status]

  const head = (
    <>
      <div className="flex items-start gap-3">
        <span className={`icon-tile ${isActive ? 'good' : 'gray'}`} aria-hidden="true">
          <IconBuilding size={18} stroke={1.75} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="t-headline clamp-2">{entity.displayName}</h3>
          <p className="t-footnote t-3">
            {entity.entityTypeLabel}
            {entity.registrationNumber ? ` · ${entity.registrationNumber}` : ''}
          </p>
        </div>
        <span className={`pill ${meta.pill}`}><span className="dot" aria-hidden="true" />{meta.label}</span>
      </div>
      <p className="t-footnote t-3 t-num">
        {entity.documentCount} document{entity.documentCount === 1 ? '' : 's'} on file
      </p>
    </>
  )

  return (
    <div className="rise flex flex-col" style={{ '--d': Math.min(index + 1, 8) } as React.CSSProperties}>
      {isActive ? (
        <Link href={`/dashboard/${entity.id}`} className="card card-pad card-interactive flex flex-1 flex-col gap-4" style={{ color: 'var(--label)' }}>
          {head}
          <div className="mt-auto flex items-center justify-between gap-2 pt-3" style={{ borderTop: 'var(--hairline-soft)' }}>
            <span className="t-footnote t-3">Compliance, people and documents</span>
            <span className="t-subhead t-brand flex shrink-0 items-center gap-1">Open <IconArrowRight size={15} stroke={2} aria-hidden="true" /></span>
          </div>
        </Link>
      ) : (
        <div className="card card-pad flex flex-1 flex-col gap-4">
          {head}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3" style={{ borderTop: 'var(--hairline-soft)' }}>
            {entity.status === 'draft' && (
              <Link href={resumeHref(entity)} className="btn btn-primary btn-sm">Continue setup</Link>
            )}
            {entity.status === 'pending_registration' && (
              <>
                <Link href={resumeHref(entity)} className="btn btn-primary btn-sm">Upload certificate</Link>
                {entity.idpUrl && (
                  <a href={entity.idpUrl} target="_blank" rel="noopener noreferrer" className="btn btn-tinted btn-sm">Download IDP</a>
                )}
                {entity.onboardingPath === 'new_entity' && (
                  <Link href={`${resumeHref(entity)}&edit=1`} className="btn btn-secondary btn-sm">Edit details</Link>
                )}
              </>
            )}
            {isDeletable && (
              <button type="button" onClick={() => setShowDelete(true)} className="btn btn-plain btn-sm btn-destructive-plain ml-auto">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
      {showDelete && (
        <DeleteEntityDialog
          entityId={entity.id}
          entityName={entity.displayName}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); router.refresh() }}
        />
      )}
    </div>
  )
}

export function EntityDashboard({
  userName,
  userEmail,
  organisationName,
  greeting,
  today,
  entities,
  deadlines,
  isSuperAdmin,
}: {
  userName: string
  userEmail: string
  organisationName: string
  greeting: string
  today: string
  entities: DashboardEntity[]
  deadlines: DashboardDeadline[]
  isSuperAdmin?: boolean
}) {
  const activeCount = entities.filter((e) => e.status === 'active').length
  const pendingCert = entities.filter((e) => e.status === 'pending_registration')
  const draftCount = entities.filter((e) => e.status === 'draft').length
  const documentCount = entities.reduce((sum, e) => sum + e.documentCount, 0)
  const overdue = deadlines.filter((d) => daysUntil(d.dueDate) < 0).length
  const firstName = userName.split(/\s+/)[0]

  return (
    <DashboardShell userName={userName} userEmail={userEmail} isSuperAdmin={isSuperAdmin} title="Overview">
      <main className="content">
        <header className="page-head rise">
          <div className="flex flex-col gap-1">
            <p className="t-eyebrow t-num">{today}</p>
            <h1 className="t-title1">{greeting}, {firstName}</h1>
            <p className="t-callout t-2 t-pretty">{organisationName}</p>
          </div>
          <div className="page-actions">
            <Link className="btn btn-primary" href="/onboarding"><IconPlus size={17} stroke={2} aria-hidden="true" />Add an entity</Link>
          </div>
        </header>

        <section className="grid cols-4 keep-2 gap-4" aria-label="Summary">
          <div className="stat rise" style={{ '--d': 1 } as React.CSSProperties}>
            <p className="stat-label"><IconBuilding size={15} stroke={1.75} aria-hidden="true" />Entities</p>
            <p className="t-stat">{entities.length}</p>
            <p className="stat-sub">{activeCount} active · {entities.length - activeCount} in progress</p>
          </div>
          <div className="stat rise" style={{ '--d': 2 } as React.CSSProperties}>
            <p className="stat-label"><IconClock size={15} stroke={1.75} aria-hidden="true" />Awaiting BRS</p>
            <p className="t-stat">{pendingCert.length}</p>
            <p className="stat-sub">{draftCount} draft{draftCount === 1 ? '' : 's'} in progress</p>
          </div>
          <div className="stat rise" style={{ '--d': 3 } as React.CSSProperties}>
            <p className="stat-label"><IconCircleCheck size={15} stroke={1.75} aria-hidden="true" />Upcoming deadlines</p>
            <p className="t-stat">{deadlines.length}</p>
            <p className="stat-sub" style={overdue ? { color: 'var(--bad)' } : undefined}>{overdue ? `${overdue} overdue` : 'None overdue'}</p>
          </div>
          <div className="stat rise" style={{ '--d': 4 } as React.CSSProperties}>
            <p className="stat-label"><IconFiles size={15} stroke={1.75} aria-hidden="true" />Documents</p>
            <p className="t-stat">{documentCount}</p>
            <p className="stat-sub">Across all entities</p>
          </div>
        </section>

        {pendingCert.length > 0 && (
          <div className="note note-warn rise" role="status">
            <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
            <p>
              {pendingCert.length === 1
                ? <><strong>{pendingCert[0].displayName}</strong> is awaiting BRS registration. Upload the certificate once it&rsquo;s issued to activate it.</>
                : <><strong>{pendingCert.length} entities</strong> are awaiting BRS registration. Upload each certificate once issued.</>}
            </p>
          </div>
        )}

        <section className="flex flex-col gap-3" aria-labelledby="ents-h">
          <h2 id="ents-h" className="t-title3">Your entities</h2>
          <div className="grid cols-3 gap-4">
            {entities.map((entity, i) => (
              <EntityCard key={entity.id} entity={entity} index={i} />
            ))}
            <Link
              href="/onboarding"
              className="card card-pad card-interactive rise flex flex-col justify-center gap-3"
              style={{ '--d': Math.min(entities.length + 1, 8), color: 'var(--label)', boxShadow: 'none', border: '1.5px dashed var(--ink-300)', background: 'transparent' } as React.CSSProperties}
            >
              <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconPlus size={22} stroke={1.75} /></span>
              <span className="flex flex-col gap-1">
                <span className="t-headline">Add an entity</span>
                <span className="t-footnote t-2 t-pretty">Onboard a registered business, register a new one, or check an informal business&rsquo;s readiness.</span>
              </span>
            </Link>
          </div>
        </section>

        <div className="grid cols-5 keep gap-4">
          <section className="card span-3 rise" aria-labelledby="dl-h" style={{ '--d': 6 } as React.CSSProperties}>
            <div className="card-head">
              <h2 id="dl-h">Upcoming deadlines</h2>
              <span className="t-footnote t-3">All entities</span>
            </div>
            {deadlines.length === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">Nothing due yet. Deadlines appear once an entity is active.</p>
            ) : (
              <div className="flex flex-col pb-1.5">
                {deadlines.map((d) => {
                  const days = daysUntil(d.dueDate)
                  const date = new Date(d.dueDate)
                  return (
                    <Link key={d.id} href={`/dashboard/${d.entityId}`} className="list-row is-link" style={{ color: 'var(--label)', paddingInline: 20 }}>
                      <span className={`date-tile ${days < 0 ? 'is-urgent' : ''}`} aria-hidden="true">
                        <span className="m">{date.toLocaleDateString('en-KE', { month: 'short' })}</span>
                        <span className="d">{date.getDate()}</span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="t-subhead t-pretty">{d.title}</span>
                        <span className="t-footnote t-3 truncate">{d.entityName}</span>
                      </span>
                      <span className={`pill t-num ${days < 0 ? 'pill-bad' : days <= 14 ? 'pill-warn' : ''}`}>{whenLabel(days)}</span>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="card-foot">
              <span className="t-footnote t-3">You file on eCitizen or iTax; LexReg tracks the dates.</span>
            </div>
          </section>

          <section className="card card-pad span-2 rise flex flex-col gap-4" aria-labelledby="promo-h" style={{ '--d': 7 } as React.CSSProperties}>
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconGavel size={22} stroke={1.75} /></span>
            <div className="flex flex-col gap-1">
              <p className="t-eyebrow">LexReg services</p>
              <h2 id="promo-h" className="t-title3">Legal audit &amp; risk review</h2>
              <p className="t-callout t-2 t-pretty">A full compliance health check across statutory, tax, employment and data protection.</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="t-stat">KES 25,000</p>
              <p className="t-footnote t-3">One-time, per entity</p>
            </div>
            <Link href="/dashboard/services" className="btn btn-secondary mt-auto">
              Book a legal audit<IconArrowRight size={16} stroke={2} aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
    </DashboardShell>
  )
}
