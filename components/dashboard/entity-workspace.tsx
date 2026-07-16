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
} from '@tabler/icons-react'

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
}

type WorkspacePerson = { id: string; name: string; kraPin?: string | null; email?: string | null; phone?: string | null }
type WorkspaceShareholder = { id: string; name: string; shares: number; percentage: number | null }

type TabId = 'overview' | 'compliance' | 'documents' | 'people'

const TABS: Array<{ id: TabId; label: string; icon: typeof IconLayoutDashboard }> = [
  { id: 'overview', label: 'Overview', icon: IconLayoutDashboard },
  { id: 'compliance', label: 'Compliance', icon: IconCalendarTime },
  { id: 'documents', label: 'Documents', icon: IconFiles },
  { id: 'people', label: 'People', icon: IconUsers },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function daysUntil(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
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
      className="text-ios-caption1 shrink-0 rounded-full px-2.5 py-1 font-semibold"
      style={active
        ? { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }
        : { background: 'rgba(255,149,0,0.14)', color: '#C77700' }}
    >
      {active ? 'Active' : 'Pending registration'}
    </span>
  )
}

function EventBadge({ event }: { event: WorkspaceEvent }) {
  const overdue = isOverdue(event)
  const meta = overdue
    ? { label: 'Overdue', bg: 'rgba(255,59,48,0.12)', fg: '#D70015' }
    : event.status === 'complete'
      ? { label: 'Done', bg: 'rgba(52,199,89,0.14)', fg: '#1E9E45' }
      : { label: 'Upcoming', bg: 'var(--system-fill-3)', fg: 'var(--system-label-2)' }
  return (
    <span className="text-ios-caption1 shrink-0 rounded-full px-2 py-0.5 font-semibold" style={{ background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  )
}

// ------------------------------------------------------------------
// Tab panels
// ------------------------------------------------------------------

function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="ios-surface rounded-2xl p-4">
      <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>{label}</p>
      <p className="mt-1 text-[28px] font-bold leading-none" style={{ color: 'var(--system-label)' }}>{value}</p>
      {hint && <p className="text-ios-caption1 mt-1.5" style={{ color: 'var(--system-label-2)' }}>{hint}</p>}
    </div>
  )
}

function OverviewTab({ entity, events, documents, peopleCount, onNavigate }: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  peopleCount: number
  onNavigate: (tab: TabId) => void
}) {
  const upcoming = events.filter((e) => e.status !== 'complete')
  const overdueCount = events.filter(isOverdue).length
  const nextEvent = upcoming[0]

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Documents" value={documents.length} />
        <StatTile
          label="Compliance items"
          value={upcoming.length}
          hint={overdueCount > 0 ? `${overdueCount} overdue` : 'All on track'}
        />
        <StatTile label="People" value={peopleCount} />
        <StatTile
          label="Next deadline"
          value={nextEvent ? daysUntil(nextEvent.dueDate).replace('in ', '') : '—'}
          hint={nextEvent?.title}
        />
      </div>

      {/* Next deadline callout */}
      {nextEvent && (
        <button
          type="button"
          onClick={() => onNavigate('compliance')}
          className="ios-surface w-full rounded-2xl p-4 text-left transition-opacity hover:opacity-80"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-3)' }}>
                Next up
              </p>
              <p className="text-ios-subhead mt-0.5 font-semibold" style={{ color: 'var(--system-label)' }}>
                {nextEvent.title}
              </p>
              <p className="text-ios-footnote mt-0.5" style={{ color: isOverdue(nextEvent) ? '#D70015' : 'var(--system-label-2)' }}>
                {formatDate(nextEvent.dueDate)} · {daysUntil(nextEvent.dueDate)}
              </p>
            </div>
            <span className="text-ios-title3" style={{ color: 'var(--system-label-3)' }}>›</span>
          </div>
        </button>
      )}

      {/* Company details */}
      <div className="ios-surface rounded-2xl px-4">
        {[
          ['Entity type', entity.typeLabel],
          ['Registration number', entity.registrationNumber],
          ['KRA PIN', entity.kraPin],
          ['Incorporated', entity.dateIncorporated ? formatDate(entity.dateIncorporated) : null],
          ['Registered office', entity.address],
          ['Nature of business', entity.natureOfBusiness],
        ].filter(([, v]) => v).map(([label, value], i, arr) => (
          <div
            key={label}
            className="flex justify-between gap-4 py-3"
            style={i < arr.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}
          >
            <span className="text-ios-footnote shrink-0" style={{ color: 'var(--system-label-2)' }}>{label}</span>
            <span className="text-ios-footnote min-w-0 text-right font-medium" style={{ color: 'var(--system-label)' }}>{value}</span>
          </div>
        ))}
      </div>

      {entity.profileUrl && (
        <a
          href={entity.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ios-surface flex items-center justify-center gap-2 rounded-2xl py-3.5 text-ios-footnote font-semibold transition-opacity hover:opacity-80"
          style={{ color: 'var(--brand-navy)' }}
        >
          <IconDownload size={17} stroke={2} /> Entity profile PDF
        </a>
      )}
    </div>
  )
}

function ComplianceTab({ events }: { events: WorkspaceEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="ios-surface rounded-2xl p-8 text-center">
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No compliance events yet</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>
          Deadlines appear here once your entity is active.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      {events.map((event) => (
        <div key={event.id} className="ios-surface rounded-2xl p-4">
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
      <div className="ios-surface rounded-2xl p-8 text-center">
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No documents on file</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>
          Documents you upload during onboarding and services live here.
        </p>
      </div>
    )
  }
  return (
    <div className="ios-surface rounded-2xl px-4">
      {documents.map((doc, i) => (
        <div
          key={doc.id}
          className="flex items-center justify-between gap-3 py-3.5"
          style={i < documents.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}
        >
          <div className="min-w-0">
            <p className="text-ios-footnote truncate font-medium" style={{ color: 'var(--system-label)' }}>{doc.name}</p>
            <p className="text-ios-caption1 mt-0.5" style={{ color: 'var(--system-label-3)' }}>
              {[doc.documentType?.replaceAll('_', ' '), formatSize(doc.fileSize), formatDate(doc.createdAt)].filter(Boolean).join(' · ')}
            </p>
          </div>
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ios-footnote shrink-0 font-semibold"
              style={{ color: 'var(--brand-navy)' }}
            >
              View
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function PeopleTab({ directors, shareholders }: { directors: WorkspacePerson[]; shareholders: WorkspaceShareholder[] }) {
  if (directors.length === 0 && shareholders.length === 0) {
    return (
      <div className="ios-surface rounded-2xl p-8 text-center">
        <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>No people recorded</p>
        <p className="text-ios-footnote mt-1" style={{ color: 'var(--system-label-2)' }}>
          Directors and shareholders appear here after onboarding.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {directors.length > 0 && (
        <div>
          <h3 className="text-ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>
            Directors
          </h3>
          <div className="ios-surface rounded-2xl px-4">
            {directors.map((d, i) => (
              <div key={d.id} className="py-3" style={i < directors.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}>
                <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{d.name}</p>
                <p className="text-ios-caption1 mt-0.5" style={{ color: 'var(--system-label-3)' }}>
                  {[d.kraPin && `PIN ${d.kraPin}`, d.email, d.phone].filter(Boolean).join(' · ') || 'Director'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {shareholders.length > 0 && (
        <div>
          <h3 className="text-ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>
            Shareholders
          </h3>
          <div className="ios-surface rounded-2xl px-4">
            {shareholders.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3" style={i < shareholders.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}>
                <p className="text-ios-footnote min-w-0 font-medium" style={{ color: 'var(--system-label)' }}>{s.name}</p>
                <p className="text-ios-caption1 shrink-0" style={{ color: 'var(--system-label-2)' }}>
                  {s.shares.toLocaleString()} shares{s.percentage != null ? ` · ${s.percentage}%` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Shell: desktop sidebar rail + mobile bottom tab bar
// ------------------------------------------------------------------

export function EntityWorkspace({
  entity,
  events,
  documents,
  directors,
  shareholders,
}: {
  entity: WorkspaceEntity
  events: WorkspaceEvent[]
  documents: WorkspaceDocument[]
  directors: WorkspacePerson[]
  shareholders: WorkspaceShareholder[]
}) {
  const [tab, setTab] = useState<TabId>('overview')
  const isActive = entity.status === 'active'

  const panel = {
    overview: (
      <OverviewTab
        entity={entity}
        events={events}
        documents={documents}
        peopleCount={directors.length + shareholders.length}
        onNavigate={setTab}
      />
    ),
    compliance: <ComplianceTab events={events} />,
    documents: <DocumentsTab documents={documents} />,
    people: <PeopleTab directors={directors} shareholders={shareholders} />,
  }[tab]

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl">
      {/* Desktop sidebar rail */}
      <aside
        className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r px-4 py-6 md:flex"
        style={{ borderColor: 'var(--system-fill-3)' }}
      >
        <Link
          href="/dashboard"
          className="text-ios-footnote mb-6 flex items-center gap-1 font-medium"
          style={{ color: 'var(--system-label-2)' }}
        >
          <IconChevronLeft size={15} stroke={2.5} /> All entities
        </Link>

        <p className="text-ios-subhead mb-1 break-words font-bold" style={{ color: 'var(--system-label)' }}>
          {entity.name}
        </p>
        <div className="mb-6"><StatusPill active={isActive} /></div>

        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const selected = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-ios-footnote font-semibold transition-colors"
                style={selected
                  ? { background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }
                  : { color: 'var(--system-label-2)' }}
              >
                <t.icon size={19} stroke={2} />
                {t.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1 pb-24 md:pb-8">
        {/* Mobile header */}
        <header
          className="sticky top-0 z-10 border-b px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ borderColor: 'var(--system-fill-3)', background: 'color-mix(in srgb, var(--system-bg-2) 85%, transparent)' }}
        >
          <Link href="/dashboard" className="text-ios-footnote flex items-center gap-0.5 font-medium" style={{ color: 'var(--brand-navy)' }}>
            <IconChevronLeft size={15} stroke={2.5} /> All entities
          </Link>
          <div className="mt-1 flex items-center justify-between gap-2">
            <h1 className="text-ios-headline min-w-0 truncate" style={{ color: 'var(--system-label)' }}>{entity.name}</h1>
            <StatusPill active={isActive} />
          </div>
        </header>

        <main className="px-4 py-6 md:px-8">
          {/* Desktop tab title */}
          <h2 className="text-ios-title2 mb-5 hidden md:block" style={{ color: 'var(--system-label)' }}>
            {TABS.find((t) => t.id === tab)?.label}
          </h2>
          {panel}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        style={{ borderColor: 'var(--system-fill-3)', background: 'color-mix(in srgb, var(--system-bg) 88%, transparent)' }}
      >
        {TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 py-2.5"
              style={{ color: selected ? 'var(--brand-navy)' : 'var(--system-label-3)' }}
            >
              <t.icon size={23} stroke={selected ? 2.25 : 1.75} />
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
