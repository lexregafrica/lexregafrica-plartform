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
} from '@tabler/icons-react'
import { REGISTRATION_STAGES, registrationStageIndex } from '@/lib/onboarding/registration-status'
import { DocumentVaultTree } from '@/components/dashboard/document-vault-tree'

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

type WorkspacePerson = { id: string; name: string; kraPin?: string | null; email?: string | null; phone?: string | null }
type WorkspaceShareholder = { id: string; name: string; shares: number; percentage: number | null }

type TabId = 'overview' | 'compliance' | 'documents' | 'people'

const TABS: Array<{ id: TabId; label: string; icon: typeof IconLayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
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
              ['Incorporated', entity.dateIncorporated ? formatDate(entity.dateIncorporated) : null],
              ['Registered office', entity.address],
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
            {directors.length} director{directors.length === 1 ? '' : 's'} · {shareholders.length} shareholder{shareholders.length === 1 ? '' : 's'}
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

function PeopleTab({ directors, shareholders }: { directors: WorkspacePerson[]; shareholders: WorkspaceShareholder[] }) {
  if (directors.length === 0 && shareholders.length === 0) {
    return (
      <div className={`${CARD} py-10 text-center`}>
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No people recorded</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>Directors and shareholders appear here after onboarding.</p>
      </div>
    )
  }
  return (
    <div className="grid content-start gap-3 sm:grid-cols-2">
      {directors.map((d) => (
        <div key={d.id} className={CARD}>
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{d.name}</p>
          <p className="text-ios-caption1 mt-0.5 font-medium" style={{ color: 'var(--brand-navy)' }}>Director</p>
          <p className="text-ios-caption1 mt-1.5" style={{ color: 'var(--system-label-3)' }}>
            {[d.kraPin && `PIN ${d.kraPin}`, d.email, d.phone].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
      ))}
      {shareholders.map((s) => (
        <div key={s.id} className={CARD}>
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{s.name}</p>
          <p className="text-ios-caption1 mt-0.5 font-medium" style={{ color: 'var(--brand-navy)' }}>Shareholder</p>
          <p className="text-ios-caption1 mt-1.5" style={{ color: 'var(--system-label-3)' }}>
            {s.shares.toLocaleString()} shares{s.percentage != null ? ` · ${s.percentage}%` : ''}
          </p>
        </div>
      ))}
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
  canManageStatus,
}: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
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
    compliance: <ComplianceTab events={events} />,
    documents: <DocumentsTab documents={documents} />,
    people: <PeopleTab directors={directors} shareholders={shareholders} />,
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
        className="fixed inset-x-4 bottom-4 z-20 grid grid-cols-4 rounded-[28px] bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(26,26,46,0.12)] md:hidden"
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
