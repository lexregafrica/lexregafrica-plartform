'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  IconLayoutDashboard,
  IconCalendarTime,
  IconFiles,
  IconUsers,
  IconChevronLeft,
  IconDownload,
  IconArrowUpRight,
  IconCheck,
  IconHierarchy2,
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
  { id: 'compliance', label: 'Compliance', icon: IconCalendarTime },
  { id: 'documents', label: 'Document Vault', icon: IconFiles },
  { id: 'people', label: 'People', icon: IconUsers },
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
  return `in ${diff} days`
}

function isOverdue(event: WorkspaceEvent) {
  return event.status === 'pending' && new Date(event.dueDate) < new Date()
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className="text-ios-caption1 shrink-0 rounded-full px-3 py-1.5 font-semibold"
      style={active
        ? { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }
        : { background: 'rgba(255,149,0,0.14)', color: '#C77700' }}
    >
      {active ? 'Active' : 'Pending registration'}
    </span>
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
    <div className={CARD}>
      <h3 className="text-ios-subhead mb-4 font-bold" style={{ color: 'var(--system-label)' }}>Filing status</h3>
      <div className="flex flex-col">
        {REGISTRATION_STAGES.map((stage, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div key={stage.value} className="flex items-start gap-3 py-1.5">
              <div className="flex flex-col items-center">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={done || active
                    ? { background: 'var(--brand-navy)' }
                    : { background: 'var(--system-fill-4)' }}
                >
                  {done ? (
                    <IconCheck size={14} stroke={3} color="#fff" />
                  ) : (
                    <span className="text-[11px] font-bold" style={{ color: active ? '#fff' : 'var(--system-label-3)' }}>{i + 1}</span>
                  )}
                </span>
                {i < REGISTRATION_STAGES.length - 1 && (
                  <span className="my-0.5 h-4 w-0.5" style={{ background: done ? 'var(--brand-navy)' : 'var(--system-fill-4)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-ios-footnote font-semibold"
                    style={{ color: active ? 'var(--system-label)' : done ? 'var(--system-label-2)' : 'var(--system-label-3)' }}
                  >
                    {stage.label}
                  </p>
                  {canManage && !done && !active && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => advance(stage.value)}
                      className="text-ios-caption1 shrink-0 font-semibold disabled:opacity-50"
                      style={{ color: 'var(--brand-navy)' }}
                    >
                      Mark reached
                    </button>
                  )}
                </div>
                {active && (
                  <p className="text-ios-caption1 mt-0.5" style={{ color: 'var(--system-label-3)' }}>{stage.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="text-ios-caption1 mt-2" style={{ color: '#D70015' }}>{error}</p>}
    </div>
  )
}

function EventBadge({ event }: { event: WorkspaceEvent }) {
  const overdue = isOverdue(event)
  const meta = overdue
    ? { label: 'Overdue', bg: 'rgba(255,59,48,0.12)', fg: '#D70015' }
    : event.status === 'complete'
      ? { label: 'Done', bg: 'rgba(52,199,89,0.14)', fg: '#1E9E45' }
      : { label: 'Upcoming', bg: 'var(--system-fill-4)', fg: 'var(--system-label-2)' }
  return (
    <span className="text-ios-caption1 shrink-0 rounded-full px-2.5 py-1 font-semibold" style={{ background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  )
}

const CARD = 'rounded-[24px] bg-white p-5'

// ------------------------------------------------------------------
// Overview — desktop mosaic, mobile stacked cards
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {entity.missingDocs.length > 0 && (
        <div
          className="text-ios-footnote rounded-2xl px-4 py-3 font-medium lg:col-span-3"
          style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}
        >
          Still missing from the vault: {entity.missingDocs.join(', ')}.
        </div>
      )}
      {entity.onboarding && (
        <div className={`${CARD} lg:col-span-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>Onboarding status</p>
              <p className="text-ios-headline font-semibold" style={{ color: entity.onboarding.statusKey === 'verified_onboarded' ? '#15803d' : 'var(--brand-navy)' }}>
                {entity.onboarding.status}
              </p>
            </div>
            {(entity.onboarding.gaps.length > 0 || entity.onboarding.fields.length > 0) && (
              <button type="button" onClick={() => onNavigate('compliance')} className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }}>
                See follow-up tasks →
              </button>
            )}
          </div>
          {entity.onboarding.gaps.length === 0 && entity.onboarding.fields.length === 0 ? (
            <p className="text-ios-footnote mt-2" style={{ color: 'var(--system-label-2)' }}>Your core details are supported by your registry documents.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {entity.onboarding.gaps.length > 0 && (
                <div>
                  <p className="text-ios-caption1 font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--system-label-3)' }}>Evidence outstanding</p>
                  <ul className="space-y-1.5">
                    {entity.onboarding.gaps.map((g) => (
                      <li key={g.title} className="text-ios-footnote" style={{ color: 'var(--system-label)' }}>
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: g.impact === 'high' || g.impact === 'critical' ? '#dc2626' : '#d97706' }} />
                        {g.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {entity.onboarding.fields.length > 0 && (
                <div>
                  <p className="text-ios-caption1 font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--system-label-3)' }}>Not yet registry-verified</p>
                  <ul className="space-y-1.5">
                    {entity.onboarding.fields.map((f) => (
                      <li key={f.label} className="text-ios-footnote" style={{ color: 'var(--system-label)' }}>
                        {f.label} <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>— {f.state}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Left mosaic (2 cols on desktop) */}
      <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2">
        {/* Identity card — spans both mosaic columns */}
        <div className={`${CARD} sm:col-span-2`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>
                {entity.typeLabel}
              </p>
              <h2 className="text-ios-title2 mt-1 break-words" style={{ color: 'var(--system-label)' }}>
                {entity.name}
              </h2>
            </div>
            <StatusPill active={entity.status === 'active'} />
          </div>
          <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              ['Registration no.', entity.registrationNumber],
              ['KRA PIN', entity.kraPin],
              [entity.typeLabel === 'Sole Proprietorship' || entity.typeLabel === 'Partnership' || entity.typeLabel === 'LLP' ? 'Registered' : 'Incorporated', entity.dateIncorporated ? formatDate(entity.dateIncorporated) : null],
              [entity.typeLabel === 'Sole Proprietorship' || entity.typeLabel === 'Partnership' ? 'Place of business' : 'Registered office', entity.address],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-0.5">
                <span className="text-ios-caption1 shrink-0" style={{ color: 'var(--system-label-3)' }}>{label}</span>
                <span className="text-ios-footnote min-w-0 text-right font-semibold sm:text-left" style={{ color: 'var(--system-label)' }}>{value}</span>
              </div>
            ))}
          </div>
          {entity.profileUrl && (
            <a
              href={entity.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ios-footnote mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-semibold"
              style={{ background: 'var(--system-fill-4)', color: 'var(--brand-navy)' }}
            >
              <IconDownload size={15} stroke={2.25} /> Entity profile PDF
            </a>
          )}
        </div>

        {/* Documents stat card */}
        <button type="button" onClick={() => onNavigate('documents')} className={`${CARD} text-left transition-opacity hover:opacity-85`}>
          <div className="flex items-start justify-between">
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>Documents</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--system-fill-4)' }}>
              <IconArrowUpRight size={14} stroke={2.25} color="var(--system-label-2)" />
            </span>
          </div>
          <p className="mt-2 text-[34px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>
            {documents.length}
          </p>
          <p className="text-ios-caption1 mt-2" style={{ color: 'var(--system-label-3)' }}>on file in your vault</p>
        </button>

        {/* People stat card */}
        <button type="button" onClick={() => onNavigate('people')} className={`${CARD} text-left transition-opacity hover:opacity-85`}>
          <div className="flex items-start justify-between">
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>People</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'var(--system-fill-4)' }}>
              <IconArrowUpRight size={14} stroke={2.25} color="var(--system-label-2)" />
            </span>
          </div>
          <p className="mt-2 text-[34px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>
            {peopleCount}
          </p>
          <p className="text-ios-caption1 mt-2" style={{ color: 'var(--system-label-3)' }}>
            {entity.typeLabel === 'Sole Proprietorship'
              ? 'Proprietor'
              : entity.typeLabel === 'Partnership' || entity.typeLabel === 'LLP'
              ? `${directors.length} partner${directors.length === 1 ? '' : 's'}${entity.typeLabel === 'LLP' ? ' & managers' : ''}`
              : `${directors.length} director${directors.length === 1 ? '' : 's'} · ${shareholders.length} shareholder${shareholders.length === 1 ? '' : 's'}`}
          </p>
        </button>

        {/* Compliance progress card — spans both */}
        <button type="button" onClick={() => onNavigate('compliance')} className={`${CARD} text-left transition-opacity hover:opacity-85 sm:col-span-2`}>
          <div className="flex items-start justify-between">
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>Compliance</p>
            <span
              className="text-ios-caption1 rounded-full px-2.5 py-1 font-semibold"
              style={overdueCount > 0
                ? { background: 'rgba(255,59,48,0.12)', color: '#D70015' }
                : { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }}
            >
              {overdueCount > 0 ? `${overdueCount} overdue` : 'On track'}
            </span>
          </div>
          <p className="mt-2 text-[34px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>
            {upcoming.length}
            <span className="text-ios-subhead ml-1.5 font-medium" style={{ color: 'var(--system-label-3)' }}>open items</span>
          </p>
          {/* Simple timeline bars */}
          {upcoming.length > 0 && (
            <div className="mt-4 flex items-end gap-1.5">
              {upcoming.slice(0, 12).map((e) => {
                const d = Math.max(daysLeft(e.dueDate), -30)
                const h = Math.max(10, Math.min(44, 44 - (d / 400) * 44))
                return (
                  <div
                    key={e.id}
                    className="w-3 rounded-full"
                    style={{ height: h, background: isOverdue(e) ? '#D70015' : 'rgba(128,0,32,0.25)' }}
                    title={`${e.title} · ${formatDate(e.dueDate)}`}
                  />
                )
              })}
            </div>
          )}
        </button>
      </div>

      {/* Right rail */}
      <div className="grid content-start gap-4">
        {entity.status !== 'active' && (
          <StatusBoard entityId={entity.id} registrationStatus={entity.registrationStatus} canManage={canManageStatus} />
        )}

        {/* Deadline list */}
        <div className={CARD}>
          <h3 className="text-ios-subhead mb-3 font-bold" style={{ color: 'var(--system-label)' }}>Upcoming deadlines</h3>
          {upcoming.length === 0 ? (
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>Nothing due. You&apos;re all caught up.</p>
          ) : (
            <div className="flex flex-col">
              {upcoming.slice(0, 4).map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onNavigate('compliance')}
                  className="flex items-center justify-between gap-3 py-2.5 text-left transition-opacity hover:opacity-70"
                  style={i < Math.min(upcoming.length, 4) - 1 ? { borderBottom: '1px solid var(--system-fill-4)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="text-ios-footnote truncate font-medium" style={{ color: 'var(--system-label)' }}>{event.title}</p>
                    <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{formatDate(event.dueDate)}</p>
                  </div>
                  <EventBadge event={event} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dark feature card — next deadline countdown */}
        <div className="rounded-[24px] p-5" style={{ background: 'var(--brand-navy)' }}>
          {nextEvent ? (
            <>
              <p className="text-ios-caption1 font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Next deadline</p>
              <p className="mt-2 text-[40px] font-bold leading-none text-white">
                {Math.max(daysLeft(nextEvent.dueDate), 0)}
                <span className="text-ios-subhead ml-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>days</span>
              </p>
              <p className="text-ios-footnote mt-3 font-medium text-white">{nextEvent.title}</p>
              <p className="text-ios-caption1 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{formatDate(nextEvent.dueDate)}</p>
              <button
                type="button"
                onClick={() => onNavigate('compliance')}
                className="mt-4 w-full rounded-full bg-white py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ color: 'var(--brand-navy)' }}
              >
                View calendar
              </button>
            </>
          ) : (
            <>
              <p className="text-ios-caption1 font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>Compliance</p>
              <p className="mt-2 text-[28px] font-bold leading-tight text-white">All clear</p>
              <p className="text-ios-footnote mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                No deadlines on the calendar yet.
              </p>
            </>
          )}
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
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No compliance events yet</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>Deadlines appear here once your entity is active.</p>
      </div>
    )
  }
  return (
    <div className="grid content-start gap-3 lg:grid-cols-2">
      {events.map((event) => (
        <div key={event.id} className={CARD}>
          <div className="mb-1 flex items-start justify-between gap-3">
            <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{event.title}</p>
            <EventBadge event={event} />
          </div>
          {event.description && (
            <p className="text-ios-footnote mb-1.5" style={{ color: 'var(--system-label-2)' }}>{event.description}</p>
          )}
          <p className="text-ios-caption1 font-medium" style={{ color: isOverdue(event) ? '#D70015' : 'var(--system-label-3)' }}>
            {formatDate(event.dueDate)} · {daysUntil(event.dueDate)}
          </p>
        </div>
      ))}
    </div>
  )
}

function DocumentsTab({ documents }: { documents: WorkspaceDocument[] }) {
  if (documents.length === 0) {
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No documents on file</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>Documents you upload during onboarding and services live here.</p>
      </div>
    )
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
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No structure recorded yet</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>It appears here once people and holdings are captured.</p>
      </div>
    )
  }

  const total = shareholders.reduce((sum, s) => sum + s.shares, 0)
  return (
    <div className="space-y-4">
      <OwnershipStructure entityName={entity.name} typeLabel={entity.typeLabel} holders={holders} holderNoun={holderNoun} officers={officers} owners={owners} />

      {!partnerType && !soleProp && !clg && shareholders.length > 0 && (
        <div className={CARD}>
          <p className="text-ios-subhead font-semibold mb-2" style={{ color: 'var(--system-label)' }}>Share register</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-ios-footnote">
              <thead>
                <tr style={{ color: 'var(--system-label-3)' }}>
                  <th className="py-1.5 pr-3 font-medium">Holder</th>
                  <th className="py-1.5 pr-3 font-medium">Class</th>
                  <th className="py-1.5 pr-3 font-medium text-right">Shares</th>
                  <th className="py-1.5 font-medium text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {shareholders.map((s) => (
                  <tr key={s.id} className="border-t" style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label)' }}>
                    <td className="py-2 pr-3">{s.name}{s.isCorporate && <span className="ml-1.5 text-ios-caption2" style={{ color: 'var(--system-label-3)' }}>corporate</span>}{s.isNominee && <span className="ml-1.5 text-ios-caption2" style={{ color: 'var(--system-label-3)' }}>nominee</span>}</td>
                    <td className="py-2 pr-3">{s.shareClass ?? 'Ordinary'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.shares.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{s.percentage != null ? `${s.percentage}%` : '—'}</td>
                  </tr>
                ))}
                <tr className="border-t font-semibold" style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label)' }}>
                  <td className="py-2 pr-3" colSpan={2}>Total issued</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{total.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {beneficialOwners.length === 0 && !soleProp && t !== 'Partnership' && (
        <p className="text-ios-caption1 px-1" style={{ color: 'var(--system-label-3)' }}>
          No beneficial owners recorded. Shareholders aren’t automatically beneficial owners — add them from onboarding or ask us to review.
        </p>
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

function PeopleTab({ directors, shareholders, beneficialOwners, documents }: {
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  beneficialOwners: WorkspaceBeneficialOwner[]
  documents: WorkspaceDocument[]
}) {
  const [open, setOpen] = useState<string | null>(null)
  const people = buildPeople(directors, shareholders, beneficialOwners)
  if (people.length === 0) {
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No people recorded</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>Directors and shareholders appear here after onboarding.</p>
      </div>
    )
  }
  const current = people.filter((p) => !p.former)
  const former = people.filter((p) => p.former)

  const card = (p: PersonView) => {
    const expanded = open === p.key
    const docs = documents.filter((d) => d.tags?.some((t) => !!t.personId && p.ids.includes(t.personId)))
    const sources = [...new Map(p.sources.filter((x) => x.documentType).map((x) => [`${x.documentType}${x.documentDate}`, x])).values()]
    const missing = ['ID / passport', 'KRA PIN'].filter((l) => !p.isCorporate && !p.details.some(([k]) => k === l))
    return (
      <div key={p.key} className={CARD}>
        <button type="button" className="w-full text-left" onClick={() => setOpen(expanded ? null : p.key)} aria-expanded={expanded}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ios-subhead font-semibold break-words" style={{ color: 'var(--system-label)' }}>{p.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {[...new Set(p.roles)].map((r) => (
                  <span key={r} className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>{r}</span>
                ))}
                {p.isCorporate && <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'rgba(37,99,235,0.10)', color: '#1d4ed8' }}>Corporate</span>}
              </div>
            </div>
            <span className="text-ios-caption1 shrink-0 font-medium" style={{ color: 'var(--system-label-3)' }}>{expanded ? 'Hide' : 'Details'}</span>
          </div>
          {!expanded && (
            <p className="text-ios-caption1 mt-1.5 truncate" style={{ color: 'var(--system-label-3)' }}>
              {p.details.filter(([l]) => ['KRA PIN', 'Shares', 'Phone', 'Email', 'Profit share'].includes(l)).map(([, v]) => v).join(' · ') || '—'}
            </p>
          )}
        </button>
        {expanded && (
          <div className="mt-3 space-y-3">
            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {p.details.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-ios-caption2" style={{ color: 'var(--system-label-3)' }}>{label}</dt>
                  <dd className="text-ios-footnote break-words" style={{ color: 'var(--system-label)' }}>{value}</dd>
                </div>
              ))}
            </dl>
            {missing.length > 0 && (
              <p className="text-ios-caption1 rounded-lg px-2 py-1" style={{ background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
                Not on file: {missing.join(', ')}
              </p>
            )}
            {sources.length > 0 && (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                From: {sources.map((x) => `${DOC_LABEL[x.documentType!] ?? x.documentType}${x.documentDate ? ` (${formatDate(x.documentDate)})` : ''}`).join(' · ')}
              </p>
            )}
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {docs.map((d) => (
                  <a key={d.id} href={d.url ?? undefined} target="_blank" rel="noopener noreferrer"
                    className="text-ios-caption1 inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 font-medium"
                    style={{ borderColor: 'var(--system-fill-3)', color: 'var(--brand-navy)' }}>
                    <IconDownload size={13} /> <span className="truncate">{(d.documentType ?? 'document').replace(/^(director|shareholder|beneficial_owner|corporate)_/, '').replace(/_/g, ' ')}</span>
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
    <div className="space-y-4">
      <div className="grid content-start gap-3 sm:grid-cols-2">{current.map(card)}</div>
      {former.length > 0 && (
        <>
          <p className="text-ios-caption1 font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--system-label-3)' }}>Former</p>
          <div className="grid content-start gap-3 sm:grid-cols-2">{former.map(card)}</div>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Shell — desktop: top pill nav; mobile: floating header + bottom tabs
// ------------------------------------------------------------------
export function EntityWorkspace({
  entity,
  events,
  documents,
  directors,
  shareholders,
  beneficialOwners = [],
  canManageStatus,
}: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
  beneficialOwners?: WorkspaceBeneficialOwner[]
  canManageStatus: boolean
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
    <div className="mx-auto w-full max-w-6xl pb-28 md:pb-10">
      {/* ---- Desktop top bar: breadcrumb + pill nav ---- */}
      <header className="hidden items-center justify-between gap-6 px-8 pt-7 md:flex">
        <Link
          href="/dashboard"
          className="text-ios-footnote flex shrink-0 items-center gap-1 font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--system-label-2)' }}
        >
          <IconChevronLeft size={15} stroke={2.5} /> All entities
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-white p-1">
          {TABS.map((t) => {
            const selected = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="rounded-full px-4 py-2 text-[13px] font-semibold transition-colors"
                style={selected
                  ? { background: 'var(--brand-navy)', color: '#FFFFFF' }
                  : { color: 'var(--system-label-2)' }}
              >
                {t.label}
              </button>
            )
          })}
        </nav>

        <StatusPill active={isActive} />
      </header>

      {/* Desktop greeting row */}
      <div className="hidden px-8 pt-6 md:block">
        <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>Entity workspace</p>
        <h1 className="text-ios-title1 mt-0.5" style={{ color: 'var(--system-label)' }}>{entity.name}</h1>
      </div>

      {/* ---- Mobile floating header ---- */}
      <header className="px-4 pt-4 md:hidden">
        <div className="flex items-center gap-3 rounded-[24px] bg-white p-3">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--system-fill-4)', color: 'var(--system-label)' }}
          >
            <IconChevronLeft size={19} stroke={2.25} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-ios-subhead truncate font-bold" style={{ color: 'var(--system-label)' }}>{entity.name}</h1>
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{entity.typeLabel}</p>
          </div>
          <StatusPill active={isActive} />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-5 md:px-8 md:py-6">{panel}</main>

      {/* ---- Mobile bottom tab bar ---- */}
      <nav
        className="fixed inset-x-4 bottom-4 z-20 grid grid-cols-5 rounded-[28px] bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(26,26,46,0.12)] md:hidden"
      >
        {TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 rounded-[22px] py-2"
              style={selected
                ? { background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }
                : { color: 'var(--system-label-3)' }}
            >
              <t.icon size={22} stroke={selected ? 2.25 : 1.75} />
              <span className="text-[10.5px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
