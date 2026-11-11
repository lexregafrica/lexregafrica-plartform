'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DeleteEntityDialog } from '@/components/dashboard/delete-entity-dialog'
import { CopilotBriefing } from '@/components/ai/copilot-briefing'
import {
  IconLayoutDashboard,
  IconCalendarTime,
  IconFiles,
  IconUsers,
  IconDownload,
  IconArrowUpRight,
  IconCheck,
  IconHierarchy2,
  IconBuilding,
  IconAlertTriangle,
  IconChevronDown,
  IconFileText,
} from '@tabler/icons-react'
import { REGISTRATION_STAGES, registrationStageIndex } from '@/lib/onboarding/registration-status'
import { DocumentVaultTree } from '@/components/dashboard/document-vault-tree'
import { OwnershipStructure, type StructureHolder, type StructureOfficer } from '@/components/dashboard/ownership-structure'

type WorkspaceEntity = {
  id: string
  name: string
  typeLabel: string
  status: string
  registrationStatus: string | null
  registrationNumber: string | null
  kraPin: string | null
  dateIncorporated: string | null
  natureOfBusiness: string | null
  address: string | null
  profileUrl: string | null
  // Moved off the global dashboard, 2026-08: per-entity missing-doc
  // detail was cluttering the "your entities" list with a wall of text
  // for every registered entity — it belongs on that entity's own page,
  // where there's room and it's actually actionable.
  missingDocs: string[]
  // Setup actions (moved here from the old overview cards)
  onboardingPath: string | null
  onboardingStep: number | null
  idpUrl: string | null
  // Existing-entity onboarding status + evidence still outstanding
  onboarding?: { status: string; statusKey: string; gaps: Array<{ title: string; impact: string; behaviour: string }>; fields: Array<{ label: string; state: string }> } | null
}

type WorkspaceEvent = {
  id: string
  title: string
  description: string | null
  category: string | null
  dueDate: string
  status: 'pending' | 'complete' | 'overdue'
}

type WorkspaceDocument = {
  id: string
  name: string
  documentType: string | null
  fileSize: number | null
  createdAt: string
  url: string | null
  tags?: Array<{ person?: string; personId?: string; role?: string }> | null
}

type SourceRef = { documentType: string | null; documentDate: string | null }

type WorkspacePerson = {
  id: string; name: string; kraPin?: string | null; email?: string | null; phone?: string | null
  idNumber?: string | null; nationality?: string | null; role?: string; isCorporate?: boolean
  appointmentDate?: string | null; dateOfBirth?: string | null; occupation?: string | null; address?: string | null
  profitShare?: string | null; contribution?: string | null; isManagingPartner?: boolean; signingAuthority?: string | null
  cessationDate?: string | null; cessationReason?: string | null; sources?: SourceRef[]
}
type WorkspaceShareholder = {
  id: string; name: string; shares: number; percentage: number | null
  idNumber?: string | null; kraPin?: string | null; email?: string | null; phone?: string | null
  isCorporate?: boolean; isNominee?: boolean; shareClass?: string | null; nationality?: string | null
  dateOfBirth?: string | null; address?: string | null; sources?: SourceRef[]
  isMember?: boolean; guaranteeAmount?: string | null; membershipClass?: string | null; cessationDate?: string | null
}
type WorkspaceBeneficialOwner = {
  id: string; name: string; idNumber: string | null; kraPin: string | null; email: string | null; phone: string | null
  nationality: string | null; dateOfBirth: string | null; occupation: string | null
  natureOfControl: string | null; percentage: number | null; since: string | null; address: string | null; sources?: SourceRef[]
}

type TabId = 'overview' | 'structure' | 'compliance' | 'documents' | 'people'

const TABS: Array<{ id: TabId; label: string; icon: typeof IconLayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
  { id: 'structure', label: 'Structure', icon: IconHierarchy2 },
  { id: 'people', label: 'People', icon: IconUsers },
  { id: 'compliance', label: 'Compliance', icon: IconCalendarTime },
  { id: 'documents', label: 'Documents', icon: IconFiles },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function daysUntil(iso: string) {
  const diff = daysLeft(iso)
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `In ${diff} days`
}

function isOverdue(event: WorkspaceEvent) {
  return event.status === 'pending' && new Date(event.dueDate) < new Date()
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card card-pad flex flex-col items-center gap-1 py-10 text-center">
      <p className="t-headline">{title}</p>
      <p className="t-footnote t-3 t-pretty">{body}</p>
    </div>
  )
}

// ------------------------------------------------------------------
// Filing status board — 8 BRS stages (LLC-Only Developer Implementation
// Spec, screen 12). Read-only for business owners; super_admin gets an
// inline control since several stages (payment, BRS submission,
// registrar queries) happen entirely outside the app.
// ------------------------------------------------------------------
export function StatusBoard({ entityId, registrationStatus, canManage }: {
  entityId: string
  registrationStatus: string | null
  canManage: boolean
}) {
  const [current, setCurrent] = useState(registrationStatus ?? 'draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const currentIndex = registrationStageIndex(current)

  const advance = async (status: string) => {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/admin/entities/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, status }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update')
      setCurrent(status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card" aria-labelledby="filing-h">
      <div className="card-head"><h3 id="filing-h">Filing status</h3></div>
      <ol className="flex flex-col px-5 pb-4">
        {REGISTRATION_STAGES.map((stage, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <li key={stage.value} className="flex items-start gap-3 py-1.5" aria-current={active ? 'step' : undefined}>
              <div className="flex flex-col items-center">
                <span
                  className="t-caption t-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold"
                  style={done ? { background: 'var(--good)', color: '#fff' } : active ? { background: 'var(--tint)', color: '#fff' } : { boxShadow: 'inset 0 0 0 1.25px var(--ink-300)', color: 'var(--label-3)' }}
                >
                  {done ? <IconCheck size={13} stroke={3} aria-hidden="true" /> : i + 1}
                </span>
                {i < REGISTRATION_STAGES.length - 1 && (
                  <span className="my-0.5 h-4 w-px" style={{ background: done ? 'var(--good)' : 'var(--sep)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`t-subhead ${active ? '' : done ? 't-2' : 't-3'}`} style={active ? { color: 'var(--label)', fontWeight: 600 } : undefined}>
                    {stage.label}
                  </p>
                  {canManage && !done && !active && (
                    <button type="button" disabled={saving} onClick={() => advance(stage.value)} className="btn btn-plain btn-sm">
                      Mark reached
                    </button>
                  )}
                </div>
                {active && <p className="t-footnote t-3 mt-0.5">{stage.description}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {error && <p className="error px-5 pb-4">{error}</p>}
    </section>
  )
}

function EventPill({ event }: { event: WorkspaceEvent }) {
  if (isOverdue(event)) return <span className="pill pill-bad">Overdue</span>
  if (event.status === 'complete') return <span className="pill pill-good">Done</span>
  const days = daysLeft(event.dueDate)
  return <span className={`pill t-num ${days <= 14 ? 'pill-warn' : ''}`}>{daysUntil(event.dueDate)}</span>
}

function EventRow({ event, onClick }: { event: WorkspaceEvent; onClick?: () => void }) {
  const date = new Date(event.dueDate)
  const body = (
    <>
      <span className={`date-tile ${isOverdue(event) ? 'is-urgent' : ''}`} aria-hidden="true">
        <span className="m">{date.toLocaleDateString('en-KE', { month: 'short' })}</span>
        <span className="d">{date.getDate()}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-subhead t-pretty" style={{ color: 'var(--label)' }}>{event.title}</span>
        <span className="t-footnote t-3 t-pretty">{event.description ?? formatDate(event.dueDate)}</span>
      </span>
      <EventPill event={event} />
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="list-row is-link" style={{ paddingInline: 20 }}>{body}</button>
  ) : (
    <div className="list-row" style={{ paddingInline: 20 }}>{body}</div>
  )
}

// ------------------------------------------------------------------
// Overview
// ------------------------------------------------------------------
function OverviewTab({ entity, events, documents, directors, shareholders, canManageStatus, onNavigate }: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  canManageStatus: boolean
  onNavigate: (tab: TabId) => void
}) {
  const upcoming = events.filter((e) => e.status !== 'complete')
  const overdueCount = events.filter(isOverdue).length
  const nextEvent = upcoming[0]
  const peopleCount = directors.length + shareholders.length
  const unincorporated = entity.typeLabel === 'Sole Proprietorship' || entity.typeLabel === 'Partnership'

  const facts = [
    ['Registration no.', entity.registrationNumber],
    ['KRA PIN', entity.kraPin],
    [unincorporated || entity.typeLabel === 'LLP' ? 'Registered' : 'Incorporated', entity.dateIncorporated ? formatDate(entity.dateIncorporated) : null],
    [unincorporated ? 'Place of business' : 'Registered office', entity.address],
    ['Nature of business', entity.natureOfBusiness],
  ].filter(([, v]) => v) as Array<[string, string]>

  const peopleSub = entity.typeLabel === 'Sole Proprietorship'
    ? 'Proprietor'
    : entity.typeLabel === 'Partnership' || entity.typeLabel === 'LLP'
    ? `${directors.length} partner${directors.length === 1 ? '' : 's'}${entity.typeLabel === 'LLP' ? ' & managers' : ''}`
    : `${directors.length} director${directors.length === 1 ? '' : 's'} · ${shareholders.length} shareholder${shareholders.length === 1 ? '' : 's'}`

  const onboardingDone = entity.onboarding?.statusKey === 'verified_onboarded'

  return (
    <div className="flex flex-col gap-4">
      {entity.missingDocs.length > 0 && (
        <div className="note note-warn rise" role="status">
          <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
          <p><strong>Still missing from the vault:</strong> {entity.missingDocs.join(', ')}.</p>
        </div>
      )}

      <section className="grid cols-3 keep-2 gap-4" aria-label="Summary">
        <button type="button" onClick={() => onNavigate('documents')} className="stat card-interactive rise text-left" style={{ '--d': 1 } as React.CSSProperties}>
          <span className="stat-label"><IconFiles size={15} stroke={1.75} aria-hidden="true" />Documents<IconArrowUpRight size={14} stroke={1.75} className="ml-auto" aria-hidden="true" /></span>
          <span className="t-stat">{documents.length}</span>
          <span className="stat-sub">On file in your vault</span>
        </button>
        <button type="button" onClick={() => onNavigate('people')} className="stat card-interactive rise text-left" style={{ '--d': 2 } as React.CSSProperties}>
          <span className="stat-label"><IconUsers size={15} stroke={1.75} aria-hidden="true" />People<IconArrowUpRight size={14} stroke={1.75} className="ml-auto" aria-hidden="true" /></span>
          <span className="t-stat">{peopleCount}</span>
          <span className="stat-sub">{peopleSub}</span>
        </button>
        <button type="button" onClick={() => onNavigate('compliance')} className="stat card-interactive rise text-left" style={{ '--d': 3 } as React.CSSProperties}>
          <span className="stat-label"><IconCalendarTime size={15} stroke={1.75} aria-hidden="true" />Open compliance items<IconArrowUpRight size={14} stroke={1.75} className="ml-auto" aria-hidden="true" /></span>
          <span className="t-stat">{upcoming.length}</span>
          <span className="stat-sub" style={overdueCount ? { color: 'var(--bad)' } : undefined}>{overdueCount ? `${overdueCount} overdue` : 'On track'}</span>
        </button>
      </section>

      {entity.onboarding && (
        <section className="card rise" aria-labelledby="onb-h" style={{ '--d': 4 } as React.CSSProperties}>
          <div className="card-head">
            <h2 id="onb-h">Onboarding status</h2>
            <span className={`pill ${onboardingDone ? 'pill-good' : 'pill-brand'}`}>{entity.onboarding.status}</span>
          </div>
          {entity.onboarding.gaps.length === 0 && entity.onboarding.fields.length === 0 ? (
            <p className="t-footnote t-2 px-5 pb-5">Your core details are supported by your registry documents.</p>
          ) : (
            <div className="grid cols-2 gap-4 px-5 pb-5">
              {entity.onboarding.gaps.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="t-eyebrow">Evidence outstanding</p>
                  <ul className="flex flex-col gap-1.5">
                    {entity.onboarding.gaps.map((g) => (
                      <li key={g.title} className="t-footnote flex items-start gap-2">
                        <span className="dot mt-1.5" style={{ color: g.impact === 'high' || g.impact === 'critical' ? 'var(--bad)' : 'var(--warn)' }} aria-hidden="true" />
                        {g.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {entity.onboarding.fields.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="t-eyebrow">Not yet registry-verified</p>
                  <ul className="flex flex-col gap-1.5">
                    {entity.onboarding.fields.map((f) => (
                      <li key={f.label} className="t-footnote">{f.label} <span className="t-3">— {f.state}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {(entity.onboarding.gaps.length > 0 || entity.onboarding.fields.length > 0) && (
            <div className="card-foot">
              <span className="t-footnote t-3">Follow-up tasks are on your compliance calendar.</span>
              <button type="button" onClick={() => onNavigate('compliance')} className="btn btn-plain btn-sm">See tasks</button>
            </div>
          )}
        </section>
      )}

      <div className="grid cols-5 keep gap-4">
        <div className="span-3 flex flex-col gap-4">
          <section className="card rise" aria-labelledby="facts-h" style={{ '--d': 5 } as React.CSSProperties}>
            <div className="card-head">
              <h2 id="facts-h">Key facts</h2>
              {entity.profileUrl && (
                <a href={entity.profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-tinted btn-sm">
                  <IconDownload size={15} stroke={1.75} aria-hidden="true" />Entity profile PDF
                </a>
              )}
            </div>
            {facts.length === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">Details appear once your registration documents are on file.</p>
            ) : (
              <dl className="flex flex-col pb-1.5">
                {facts.map(([label, value]) => (
                  <div key={label} className="list-row" style={{ paddingInline: 20, minHeight: 44, alignItems: 'baseline' }}>
                    <dt className="t-footnote t-3 w-40 shrink-0">{label}</dt>
                    <dd className="t-subhead min-w-0 break-words" style={{ color: 'var(--label)' }}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {entity.status !== 'active' && (
            <StatusBoard entityId={entity.id} registrationStatus={entity.registrationStatus} canManage={canManageStatus} />
          )}
        </div>

        <div className="span-2 flex flex-col gap-4">
          <section className="card card-pad rise flex flex-col gap-2" aria-labelledby="next-h" style={{ '--d': 6 } as React.CSSProperties}>
            <p id="next-h" className="t-eyebrow">Next deadline</p>
            {nextEvent ? (
              <>
                <p className="t-stat" style={isOverdue(nextEvent) ? { color: 'var(--bad)' } : undefined}>
                  {isOverdue(nextEvent) ? `${Math.abs(daysLeft(nextEvent.dueDate))} days late` : `${Math.max(daysLeft(nextEvent.dueDate), 0)} days`}
                </p>
                <p className="t-subhead" style={{ color: 'var(--label)' }}>{nextEvent.title}</p>
                <p className="t-footnote t-3">{formatDate(nextEvent.dueDate)}</p>
              </>
            ) : (
              <>
                <p className="t-stat">All clear</p>
                <p className="t-footnote t-3">No deadlines on the calendar yet.</p>
              </>
            )}
          </section>

          <section className="card rise" aria-labelledby="dl-h" style={{ '--d': 7 } as React.CSSProperties}>
            <div className="card-head"><h2 id="dl-h">Upcoming</h2></div>
            {upcoming.length === 0 ? (
              <p className="t-footnote t-3 px-5 pb-5">Nothing due. You&rsquo;re all caught up.</p>
            ) : (
              <div className="flex flex-col pb-1.5">
                {upcoming.slice(0, 4).map((event) => (
                  <EventRow key={event.id} event={event} onClick={() => onNavigate('compliance')} />
                ))}
              </div>
            )}
            {upcoming.length > 4 && (
              <div className="card-foot">
                <span className="t-footnote t-3 t-num">{upcoming.length - 4} more</span>
                <button type="button" onClick={() => onNavigate('compliance')} className="btn btn-plain btn-sm">View calendar</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Other tabs
// ------------------------------------------------------------------
function ComplianceTab({ events }: { events: WorkspaceEvent[] }) {
  if (events.length === 0) {
    return <EmptyCard title="No compliance events yet" body="Deadlines appear here once your entity is active." />
  }
  const open = events.filter((e) => e.status !== 'complete')
  const done = events.filter((e) => e.status === 'complete')
  return (
    <div className="flex flex-col gap-4">
      <section className="card" aria-labelledby="open-h">
        <div className="card-head">
          <h2 id="open-h">Open</h2>
          <span className="t-footnote t-3">You file on eCitizen or iTax; LexReg tracks the dates.</span>
        </div>
        {open.length === 0
          ? <p className="t-footnote t-3 px-5 pb-5">Nothing open.</p>
          : <div className="flex flex-col pb-1.5">{open.map((e) => <EventRow key={e.id} event={e} />)}</div>}
      </section>
      {done.length > 0 && (
        <section className="card" aria-labelledby="done-h">
          <div className="card-head"><h2 id="done-h">Done</h2></div>
          <div className="flex flex-col pb-1.5">{done.map((e) => <EventRow key={e.id} event={e} />)}</div>
        </section>
      )}
    </div>
  )
}

function DocumentsTab({ documents }: { documents: WorkspaceDocument[] }) {
  if (documents.length === 0) {
    return <EmptyCard title="No documents on file" body="Documents you upload during onboarding and services live here." />
  }
  return (
    <DocumentVaultTree
      documents={documents.map((d) => ({ id: d.id, name: d.name, document_type: d.documentType, tags: d.tags, url: d.url }))}
    />
  )
}

const ROLE_LABEL: Record<string, string> = {
  director: 'Director', secretary: 'Company Secretary', proprietor: 'Proprietor', partner: 'Partner',
  manager: 'Manager', authorised_person: 'Authorised person', trustee: 'Trustee',
}

function StructureTab({ entity, directors, shareholders, beneficialOwners }: {
  entity: WorkspaceEntity
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  beneficialOwners: WorkspaceBeneficialOwner[]
}) {
  const current = directors.filter((d) => !d.cessationDate)
  const t = entity.typeLabel
  const partnerType = t === 'Partnership' || t === 'LLP'
  const soleProp = t === 'Sole Proprietorship'
  const clg = shareholders.some((s) => s.isMember) || t === 'NGO / Non-Profit'

  // Who holds the entity: shareholders for a company, partners (with
  // their profit share) for a partnership/LLP, the proprietor otherwise.
  const holders: StructureHolder[] = partnerType
    ? current.filter((d) => d.role === 'partner').map((d) => ({
        id: d.id, name: d.name, isCorporate: !!d.isCorporate,
        stake: d.profitShare ? `${d.profitShare}%` : null,
        detail: [d.isManagingPartner && 'Managing partner', d.contribution && `Capital ${d.contribution}`].filter(Boolean).join(' · ') || null,
      }))
    : clg
      ? shareholders.filter((s) => !s.cessationDate).map((s) => ({
          id: s.id, name: s.name, isCorporate: !!s.isCorporate,
          stake: s.guaranteeAmount ? `KES ${s.guaranteeAmount}` : null,
          detail: [s.membershipClass, s.guaranteeAmount ? 'Guarantor' : 'Member'].filter(Boolean).join(' · '),
        }))
    : soleProp
      ? current.filter((d) => d.role === 'proprietor').map((d) => ({ id: d.id, name: d.name, isCorporate: false, stake: '100%', detail: 'Owns and controls the business' }))
      : shareholders.map((s) => ({
          id: s.id, name: s.name, isCorporate: !!s.isCorporate, isNominee: s.isNominee,
          stake: s.percentage != null ? `${s.percentage}%` : null,
          detail: `${s.shares.toLocaleString()} ${s.shareClass ? s.shareClass.toLowerCase() : ''} shares`.replace(/\s+/g, ' '),
        }))
  const officers: StructureOfficer[] = current
    .filter((d) => !(partnerType && d.role === 'partner') && !(soleProp && d.role === 'proprietor'))
    .map((d) => ({ id: d.id, name: d.name, role: ROLE_LABEL[d.role ?? 'director'] ?? 'Officer' }))
  const owners = beneficialOwners.map((b) => ({ id: b.id, name: b.name, control: b.natureOfControl }))
  const holderNoun = partnerType ? 'Partners' : soleProp ? 'Proprietor' : clg ? 'Members (guarantee)' : 'Shareholders'

  if (holders.length === 0 && officers.length === 0) {
    return <EmptyCard title="No structure recorded yet" body="It appears here once people and holdings are captured." />
  }

  const total = shareholders.reduce((sum, s) => sum + s.shares, 0)
  return (
    <div className="flex flex-col gap-4">
      <section className="card card-pad">
        <OwnershipStructure entityName={entity.name} typeLabel={entity.typeLabel} holders={holders} holderNoun={holderNoun} officers={officers} owners={owners} />
      </section>

      {!partnerType && !soleProp && !clg && shareholders.length > 0 && (
        <section className="card" aria-labelledby="reg-h">
          <div className="card-head"><h2 id="reg-h">Share register</h2></div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Holder</th>
                  <th scope="col">Class</th>
                  <th scope="col" className="num">Shares</th>
                  <th scope="col" className="num">%</th>
                </tr>
              </thead>
              <tbody>
                {shareholders.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {s.name}
                        {s.isCorporate && <span className="pill pill-info">Corporate</span>}
                        {s.isNominee && <span className="pill">Nominee</span>}
                      </span>
                    </td>
                    <td>{s.shareClass ?? 'Ordinary'}</td>
                    <td className="num">{s.shares.toLocaleString()}</td>
                    <td className="num">{s.percentage != null ? `${s.percentage}%` : '—'}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="t-strong">Total issued</td>
                  <td className="num t-strong">{total.toLocaleString()}</td>
                  <td className="num t-strong">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
      {beneficialOwners.length === 0 && !soleProp && t !== 'Partnership' && (
        <div className="note note-info">
          <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
          <p>No beneficial owners recorded. Shareholders aren&rsquo;t automatically beneficial owners — add them from onboarding or ask us to review.</p>
        </div>
      )}
    </div>
  )
}

// One card per person, however many roles they hold (brief §6: one
// person, several role badges), with everything captured at onboarding
// and the documents on file for them.
type PersonView = {
  key: string
  name: string
  roles: string[]
  former: boolean
  isCorporate: boolean
  details: Array<[string, string]>
  sources: SourceRef[]
  ids: string[]
}

const DOC_LABEL: Record<string, string> = {
  cr12: 'Official Search (CR12)', certificate_of_incorporation: 'Certificate of Incorporation', bof1: 'BOF-1',
  cr8: 'CR8', cr1: 'CR1', certificate_of_registration: 'Certificate of Registration', official_search_bn: 'Official Search',
  official_search_llp: 'Official Search', llp_bo: 'LLP BO filing', llp1: 'LLP 1', llp9: 'LLP 9', bn2: 'BN2',
}

function buildPeople(directors: WorkspacePerson[], shareholders: WorkspaceShareholder[], owners: WorkspaceBeneficialOwner[]): PersonView[] {
  const map = new Map<string, PersonView>()
  const keyOf = (name: string, id?: string | null) => (id?.trim() || name.trim()).toLowerCase()
  const get = (name: string, id: string | null | undefined, isCorporate: boolean) => {
    // Same ID, or same name when either side has no ID
    let key = keyOf(name, id)
    if (!map.has(key)) {
      const byName = [...map.values()].find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())
      if (byName) key = byName.key
    }
    if (!map.has(key)) map.set(key, { key, name, roles: [], former: true, isCorporate, details: [], sources: [], ids: [] })
    return map.get(key)!
  }
  const add = (p: PersonView, label: string, value: string | null | undefined) => {
    if (!value || p.details.some(([l]) => l === label)) return
    p.details.push([label, value])
  }
  for (const d of directors) {
    const p = get(d.name, d.idNumber, !!d.isCorporate)
    const role = ROLE_LABEL[d.role ?? 'director'] ?? 'Officer'
    p.roles.push(d.cessationDate ? `Former ${role.toLowerCase()}` : d.isManagingPartner ? 'Managing partner' : role)
    if (!d.cessationDate) p.former = false
    p.ids.push(d.id)
    add(p, d.isCorporate ? 'Registration no.' : 'ID / passport', d.idNumber)
    add(p, 'KRA PIN', d.kraPin)
    add(p, 'Nationality', d.nationality)
    add(p, 'Date of birth', d.dateOfBirth ? formatDate(d.dateOfBirth) : null)
    add(p, 'Occupation', d.occupation)
    add(p, 'Phone', d.phone)
    add(p, 'Email', d.email)
    add(p, 'Address', d.address)
    add(p, `${role} since`, d.appointmentDate ? formatDate(d.appointmentDate) : null)
    add(p, 'Profit share', d.profitShare ? `${d.profitShare}%` : null)
    add(p, 'Capital contribution', d.contribution)
    add(p, 'Signing authority', d.signingAuthority)
    add(p, 'Left', d.cessationDate ? `${formatDate(d.cessationDate)}${d.cessationReason ? ` — ${d.cessationReason}` : ''}` : null)
    p.sources.push(...(d.sources ?? []))
  }
  for (const s of shareholders) {
    const p = get(s.name, s.idNumber, !!s.isCorporate)
    p.roles.push(s.isMember ? (s.cessationDate ? 'Former member' : 'Member / guarantor') : s.isNominee ? 'Shareholder (nominee)' : 'Shareholder')
    if (!s.cessationDate) p.former = false
    p.ids.push(s.id)
    add(p, s.isCorporate ? 'Registration no.' : 'ID / passport', s.idNumber)
    add(p, 'KRA PIN', s.kraPin)
    if (s.isMember) {
      add(p, 'Guarantee', s.guaranteeAmount ? `KES ${s.guaranteeAmount}` : null)
      add(p, 'Membership class', s.membershipClass)
      add(p, 'Ceased', s.cessationDate ? formatDate(s.cessationDate) : null)
    } else {
      add(p, 'Shares', `${s.shares.toLocaleString()} ${s.shareClass ?? 'Ordinary'}${s.percentage != null ? ` (${s.percentage}%)` : ''}`)
    }
    add(p, 'Nationality', s.nationality)
    add(p, 'Date of birth', s.dateOfBirth ? formatDate(s.dateOfBirth) : null)
    add(p, 'Phone', s.phone)
    add(p, 'Email', s.email)
    add(p, 'Address', s.address)
    p.sources.push(...(s.sources ?? []))
  }
  for (const b of owners) {
    const p = get(b.name, b.idNumber, false)
    p.roles.push('Beneficial owner')
    p.former = false
    p.ids.push(b.id)
    add(p, 'ID / passport', b.idNumber)
    add(p, 'KRA PIN', b.kraPin)
    add(p, 'Nature of control', b.natureOfControl)
    add(p, 'Beneficial owner since', b.since ? formatDate(b.since) : null)
    add(p, 'Nationality', b.nationality)
    add(p, 'Date of birth', b.dateOfBirth ? formatDate(b.dateOfBirth) : null)
    add(p, 'Occupation', b.occupation)
    add(p, 'Phone', b.phone)
    add(p, 'Email', b.email)
    add(p, 'Address', b.address)
    p.sources.push(...(b.sources ?? []))
  }
  return [...map.values()]
}

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function PeopleTab({ directors, shareholders, beneficialOwners, documents }: {
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  beneficialOwners: WorkspaceBeneficialOwner[]
  documents: WorkspaceDocument[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const people = buildPeople(directors, shareholders, beneficialOwners)
  if (people.length === 0) {
    return <EmptyCard title="No people recorded" body="Directors and shareholders appear here after onboarding." />
  }
  const current = people.filter((p) => !p.former)
  const former = people.filter((p) => p.former)

  const card = (p: PersonView) => {
    const expanded = open === p.key
    const docs = documents.filter((d) => d.tags?.some((t) => !!t.personId && p.ids.includes(t.personId)))
    const sources = [...new Map(p.sources.filter((x) => x.documentType).map((x) => [`${x.documentType}${x.documentDate}`, x])).values()]
    const missing = ['ID / passport', 'KRA PIN'].filter((l) => !p.isCorporate && !p.details.some(([k]) => k === l))
    const panelId = `person-${p.key.replace(/[^a-z0-9]/g, '-')}`
    return (
      <div key={p.key} className="card" style={p.former ? { opacity: 0.75 } : undefined}>
        <button type="button" className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen(expanded ? null : p.key)} aria-expanded={expanded} aria-controls={panelId}>
          <span className={`avatar ${p.isCorporate ? 'avatar-corp' : ''}`} aria-hidden="true">
            {p.isCorporate ? <IconBuilding size={18} stroke={1.75} /> : initialsOf(p.name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="t-headline break-words">{p.name}</span>
            <span className="flex flex-wrap gap-1">
              {[...new Set(p.roles)].map((r) => <span key={r} className="pill pill-brand">{r}</span>)}
              {p.isCorporate && <span className="pill pill-info">Corporate</span>}
            </span>
            {!expanded && (
              <span className="t-footnote t-3 truncate">
                {p.details.filter(([l]) => ['KRA PIN', 'Shares', 'Phone', 'Email', 'Profit share'].includes(l)).map(([, v]) => v).join(' · ') || '—'}
              </span>
            )}
          </span>
          <IconChevronDown size={18} stroke={1.75} aria-hidden="true" className="mt-1 shrink-0 transition-transform" style={{ color: 'var(--label-3)', transform: expanded ? 'rotate(180deg)' : undefined }} />
        </button>
        {expanded && (
          <div id={panelId} className="fade flex flex-col gap-3 px-4 pb-4">
            <dl className="grid cols-2 gap-x-4 gap-y-2">
              {p.details.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="t-caption t-3">{label}</dt>
                  <dd className="t-subhead break-words" style={{ color: 'var(--label)' }}>{value}</dd>
                </div>
              ))}
            </dl>
            {missing.length > 0 && (
              <div className="note note-warn">
                <IconAlertTriangle size={16} stroke={1.75} aria-hidden="true" />
                <p>Not on file: {missing.join(', ')}</p>
              </div>
            )}
            {sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="t-footnote t-3">From</span>
                {sources.map((x) => (
                  <span key={`${x.documentType}${x.documentDate}`} className="src src-extracted">
                    {DOC_LABEL[x.documentType!] ?? x.documentType}{x.documentDate ? ` · ${formatDate(x.documentDate)}` : ''}
                  </span>
                ))}
              </div>
            )}
            {docs.length > 0 && (
              <div className="flex flex-col gap-2">
                {docs.map((d) => (
                  <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noopener noreferrer" className="file-row" style={{ color: 'var(--label)' }}>
                    <IconFileText size={18} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)' }} />
                    <span className="name">{(d.documentType ?? 'document').replace(/^(director|shareholder|beneficial_owner|corporate)_/, '').replace(/_/g, ' ')}</span>
                    <IconDownload size={16} stroke={1.75} aria-hidden="true" style={{ color: 'var(--tint-text)' }} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid cols-2 items-start gap-3">{current.map(card)}</div>
      {former.length > 0 && (
        <>
          <p className="t-eyebrow px-1">Former</p>
          <div className="grid cols-2 items-start gap-3">{former.map(card)}</div>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Workspace — app shell, entity header, tabs
// ------------------------------------------------------------------
export function EntityWorkspace({
  entity,
  events,
  documents,
  directors,
  shareholders,
  beneficialOwners = [],
  canManageStatus,
  reports = [],
  showCopilot = false,
}: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  beneficialOwners?: WorkspaceBeneficialOwner[]
  canManageStatus: boolean
  /** Signed LexAudit reports released to the client */
  reports?: Array<{ id: string; title: string; signedAt: string | null }>
  /** Assigned lawyer (or Charles): show the Co-Pilot briefing */
  showCopilot?: boolean
}) {
  const [tab, setTab] = useState<TabId>('overview')
  const isActive = entity.status === 'active'

  const panel = {
    overview: (
      <OverviewTab
        entity={entity}
        events={events}
        documents={documents}
        directors={directors}
        shareholders={shareholders}
        canManageStatus={canManageStatus}
        onNavigate={setTab}
      />
    ),
    structure: <StructureTab entity={entity} directors={directors} shareholders={shareholders} beneficialOwners={beneficialOwners} />,
    compliance: <ComplianceTab events={events} />,
    documents: <DocumentsTab documents={documents} />,
    people: <PeopleTab directors={directors} shareholders={shareholders} beneficialOwners={beneficialOwners} documents={documents} />,
  }[tab]

  return (
    // Frame (navigation, account) comes from the (dashboard) layout
    <div className="lx">
      <main className="content">
        <header className="page-head rise">
          <div className="flex min-w-0 items-center gap-4">
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconBuilding size={22} stroke={1.75} /></span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="t-title1 break-words">{entity.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="pill">{entity.typeLabel}</span>
                <span className={`pill ${isActive ? 'pill-good' : 'pill-warn'}`}><span className="dot" aria-hidden="true" />{isActive ? 'Active' : 'Pending registration'}</span>
                {entity.registrationNumber && <span className="t-footnote t-3 t-num">{entity.registrationNumber}</span>}
              </div>
            </div>
          </div>
        </header>

        <SetupActions entity={entity} />

        {showCopilot && <CopilotBriefing entityId={entity.id} />}

        {reports.length > 0 && (
          <div className="note note-brand">
            <IconFileText size={18} stroke={1.75} aria-hidden="true" />
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <span>Lawyer-signed reports:</span>
              {reports.map((r) => <Link key={r.id} href={`/dashboard/reports/${r.id}`} className="t-brand">{r.title}</Link>)}
            </p>
          </div>
        )}

        <nav className="tabs overflow-x-auto" aria-label="Entity sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined}>
              <t.icon size={17} stroke={1.75} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>

        <div key={tab} className="fade">{panel}</div>
      </main>
    </div>
  )
}

// Draft / pending entities: finish setup, upload the certificate, get the
// IDP, edit, or delete (pre-activation only — an active entity is a real
// registered business and is never deleted from here).
function resumeHref(entity: WorkspaceEntity) {
  if (entity.onboardingPath === 'existing_entity') return `/onboarding/existing/${entity.onboardingStep || 1}?entity=${entity.id}`
  if (entity.onboardingPath === 'new_entity') return `/onboarding/new/${entity.onboardingStep || 1}?entity=${entity.id}`
  return '/onboarding/informal'
}

function SetupActions({ entity }: { entity: WorkspaceEntity }) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  if (entity.status !== 'draft' && entity.status !== 'pending_registration') return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {entity.status === 'draft' ? (
        <Link href={resumeHref(entity)} className="btn btn-primary btn-sm">Continue setup</Link>
      ) : (
        <>
          <Link href={resumeHref(entity)} className="btn btn-primary btn-sm">Upload certificate</Link>
          {entity.idpUrl && <a href={entity.idpUrl} target="_blank" rel="noopener noreferrer" className="btn btn-tinted btn-sm">Download IDP</a>}
          {entity.onboardingPath === 'new_entity' && <Link href={`${resumeHref(entity)}&edit=1`} className="btn btn-secondary btn-sm">Edit details</Link>}
        </>
      )}
      <button type="button" onClick={() => setShowDelete(true)} className="btn btn-plain btn-sm btn-destructive-plain ml-auto">Delete</button>
      {showDelete && (
        <DeleteEntityDialog
          entityId={entity.id}
          entityName={entity.name}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); router.push('/dashboard/entities'); router.refresh() }}
        />
      )}
    </div>
  )
}
