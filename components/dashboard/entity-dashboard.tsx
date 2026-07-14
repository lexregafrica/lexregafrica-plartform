'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

const STATUS_META: Record<DashboardEntity['status'], { label: string; bg: string; fg: string }> = {
  draft: { label: 'Draft', bg: 'var(--system-fill-3)', fg: 'var(--system-label-2)' },
  pending_registration: { label: 'Pending registration', bg: 'rgba(255,149,0,0.14)', fg: '#C77700' },
  active: { label: 'Active', bg: 'rgba(52,199,89,0.14)', fg: '#1E9E45' },
  suspended: { label: 'Suspended', bg: 'rgba(255,59,48,0.12)', fg: '#D70015' },
  dissolved: { label: 'Dissolved', bg: 'var(--system-fill-3)', fg: 'var(--system-label-3)' },
}

function resumeHref(entity: DashboardEntity): string {
  if (entity.onboardingPath === 'existing_entity') return `/onboarding/existing/${entity.onboardingStep || 1}`
  if (entity.onboardingPath === 'new_entity') return `/onboarding/new/${entity.onboardingStep || 1}`
  return '/onboarding/informal'
}

function StatusBadge({ status }: { status: DashboardEntity['status'] }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="text-ios-caption1 whitespace-nowrap rounded-full px-2.5 py-1 font-semibold"
      style={{ background: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  )
}

function EntityCard({ entity }: { entity: DashboardEntity }) {
  return (
    <div className="ios-surface flex flex-col rounded-2xl p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-ios-headline min-w-0 break-words" style={{ color: 'var(--system-label)' }}>
          {entity.displayName}
        </h3>
        <StatusBadge status={entity.status} />
      </div>

      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        {entity.entityTypeLabel}
        {entity.registrationNumber ? ` · ${entity.registrationNumber}` : ''}
      </p>

      <div className="text-ios-footnote mt-3 flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--system-label-3)' }}>
        <span>{entity.documentCount} document{entity.documentCount === 1 ? '' : 's'}</span>
        {entity.dateIncorporated && <span>Incorporated {entity.dateIncorporated}</span>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
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

        {entity.status === 'active' && entity.idpUrl && (
          <a
            href={entity.idpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border px-5 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            Download IDP
          </a>
        )}
      </div>
    </div>
  )
}

export function EntityDashboard({
  organisationName,
  entities,
}: {
  organisationName: string
  entities: DashboardEntity[]
}) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  const pendingCert = entities.filter((e) => e.status === 'pending_registration')

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: 'var(--system-fill-3)' }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="LexReg Africa" className="h-7 w-7 object-contain" />
          <span className="text-ios-subhead font-semibold" style={{ color: 'var(--brand-navy)' }}>
            LexReg Africa
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-ios-footnote font-medium"
          style={{ color: 'var(--system-label-2)' }}
        >
          Sign out
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-ios-footnote mb-1" style={{ color: 'var(--system-label-3)' }}>
          {organisationName}
        </p>
        <h1 className="text-ios-title1 mb-8" style={{ color: 'var(--system-label)' }}>
          Your entities
        </h1>

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

        <div className="flex flex-col gap-4">
          {entities.map((entity) => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>

        <Link
          href="/onboarding"
          className="ios-surface text-ios-subhead mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed py-5 font-medium transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)', background: 'transparent' }}
        >
          + Add another entity
        </Link>
      </main>
    </div>
  )
}
