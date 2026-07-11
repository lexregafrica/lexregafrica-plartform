'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type PathId = 'existing_entity' | 'new_entity' | 'informal_business'

const PATH_META: Record<PathId, { label: string; sublabel: string; totalSteps: number }> = {
  existing_entity: { label: 'Existing Business', sublabel: 'Document verification', totalSteps: 4 },
  new_entity: { label: 'Register New Entity', sublabel: 'Entity registration', totalSteps: 12 },
  informal_business: { label: 'Informal Business', sublabel: 'Readiness assessment', totalSteps: 15 },
}

const PATH_HREF: Record<PathId, (step: number) => string> = {
  existing_entity: (step) => `/onboarding/existing/${step}`,
  new_entity: (step) => `/onboarding/new/${step}`,
  informal_business: () => '/onboarding/informal',
}

type DraftResumeShellProps = {
  path: PathId
  step: number
  completed?: boolean
  score?: number
}

export function DraftResumeShell({ path, step, completed, score }: DraftResumeShellProps) {
  const router = useRouter()
  const meta = PATH_META[path]
  const clampedStep = Math.min(Math.max(step, 1), meta.totalSteps)
  const continueHref = PATH_HREF[path](clampedStep)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Minimal shell header */}
      <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--system-fill-3)' }}>
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

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <p className="text-ios-footnote mb-1 text-center" style={{ color: 'var(--system-label-3)' }}>
            Welcome back
          </p>
          <h1 className="text-ios-title1 font-semibold mb-8 text-center" style={{ color: 'var(--system-label)' }}>
            You have a draft in progress
          </h1>

          <div className="ios-surface rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-ios-headline" style={{ color: 'var(--system-label)' }}>
                {meta.label}
              </span>
              <span
                className="text-ios-caption1 rounded-full px-2 py-0.5"
                style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
              >
                {meta.sublabel}
              </span>
            </div>

            {path === 'informal_business' ? (
              completed ? (
                <p className="text-ios-subhead" style={{ color: 'var(--system-label-2)' }}>
                  Assessment complete — readiness score{' '}
                  <span className="font-semibold" style={{ color: 'var(--brand-navy)' }}>{score}/100</span>
                </p>
              ) : (
                <p className="text-ios-subhead" style={{ color: 'var(--system-label-2)' }}>
                  Question {clampedStep} of {meta.totalSteps}
                </p>
              )
            ) : (
              <p className="text-ios-subhead" style={{ color: 'var(--system-label-2)' }}>
                Step {clampedStep} of {meta.totalSteps}
              </p>
            )}

            {!(path === 'informal_business' && completed) && (
              <div className="flex items-center gap-1.5 mt-3">
                {Array.from({ length: meta.totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full"
                    style={{ background: i < clampedStep ? 'var(--brand-navy)' : 'var(--system-fill-3)' }}
                  />
                ))}
              </div>
            )}
          </div>

          <Link
            href={continueHref}
            className="block w-full text-center py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 mb-3"
            style={{ background: 'var(--brand-navy)' }}
          >
            Continue
          </Link>

          <Link
            href="/onboarding"
            className="block w-full text-center text-ios-footnote font-medium"
            style={{ color: 'var(--system-label-3)' }}
          >
            Start a different path instead
          </Link>
        </div>
      </main>
    </div>
  )
}
