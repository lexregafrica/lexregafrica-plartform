'use client'

import Link from 'next/link'

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

const EVENT_STATUS: Record<WorkspaceEvent['status'], { label: string; bg: string; fg: string }> = {
  pending: { label: 'Upcoming', bg: 'var(--system-fill-3)', fg: 'var(--system-label-2)' },
  complete: { label: 'Done', bg: 'rgba(52,199,89,0.14)', fg: '#1E9E45' },
  overdue: { label: 'Overdue', bg: 'rgba(255,59,48,0.12)', fg: '#D70015' },
}

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
  return `${diff} days away`
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

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
  const isActive = entity.status === 'active'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Back + header */}
      <Link href="/dashboard" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
        ← All entities
      </Link>

      <div className="mb-6 mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-ios-title1 break-words" style={{ color: 'var(--system-label)' }}>
            {entity.name}
          </h1>
          <p className="text-ios-subhead mt-1" style={{ color: 'var(--system-label-2)' }}>
            {entity.typeLabel}
            {entity.registrationNumber ? ` · ${entity.registrationNumber}` : ''}
          </p>
        </div>
        <span
          className="text-ios-caption1 mt-2 shrink-0 rounded-full px-2.5 py-1 font-semibold"
          style={isActive
            ? { background: 'rgba(52,199,89,0.14)', color: '#1E9E45' }
            : { background: 'rgba(255,149,0,0.14)', color: '#C77700' }}
        >
          {isActive ? 'Active' : 'Pending registration'}
        </span>
      </div>

      {/* Company details */}
      <Section title="Company details">
        <div className="ios-surface rounded-2xl px-4">
          {[
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
              <span className="text-ios-footnote text-right font-medium" style={{ color: 'var(--system-label)' }}>{value}</span>
            </div>
          ))}
          {entity.profileUrl && (
            <div className="py-3" style={{ borderTop: '1px solid var(--system-fill-3)' }}>
              <a
                href={entity.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ios-footnote font-semibold"
                style={{ color: 'var(--brand-navy)' }}
              >
                Download entity profile PDF →
              </a>
            </div>
          )}
        </div>
      </Section>

      {/* Compliance calendar */}
      <Section title="Compliance calendar">
        {events.length === 0 ? (
          <div className="ios-surface rounded-2xl p-4">
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              No compliance events yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {events.map((event) => {
              const overdue = event.status === 'pending' && new Date(event.dueDate) < new Date()
              const meta = EVENT_STATUS[overdue ? 'overdue' : event.status]
              return (
                <div key={event.id} className="ios-surface rounded-2xl p-4">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>
                      {event.title}
                    </p>
                    <span className="text-ios-caption1 shrink-0 rounded-full px-2 py-0.5 font-semibold" style={{ background: meta.bg, color: meta.fg }}>
                      {meta.label}
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-ios-footnote mb-1.5" style={{ color: 'var(--system-label-2)' }}>
                      {event.description}
                    </p>
                  )}
                  <p className="text-ios-caption1 font-medium" style={{ color: overdue ? '#D70015' : 'var(--system-label-3)' }}>
                    {formatDate(event.dueDate)} · {daysUntil(event.dueDate)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Documents */}
      <Section title={`Documents (${documents.length})`}>
        {documents.length === 0 ? (
          <div className="ios-surface rounded-2xl p-4">
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              No documents on file.
            </p>
          </div>
        ) : (
          <div className="ios-surface rounded-2xl px-4">
            {documents.map((doc, i) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 py-3"
                style={i < documents.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-ios-footnote truncate font-medium" style={{ color: 'var(--system-label)' }}>
                    {doc.name}
                  </p>
                  <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
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
        )}
      </Section>

      {/* People */}
      {(directors.length > 0 || shareholders.length > 0) && (
        <Section title="People">
          <div className="ios-surface rounded-2xl px-4">
            {directors.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 py-3"
                style={{ borderBottom: i < directors.length - 1 || shareholders.length > 0 ? '1px solid var(--system-fill-3)' : undefined }}
              >
                <div className="min-w-0">
                  <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{d.name}</p>
                  <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                    Director{d.kraPin ? ` · PIN ${d.kraPin}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {shareholders.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 py-3"
                style={i < shareholders.length - 1 ? { borderBottom: '1px solid var(--system-fill-3)' } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{s.name}</p>
                  <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                    Shareholder · {s.shares.toLocaleString()} shares{s.percentage != null ? ` (${s.percentage}%)` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
