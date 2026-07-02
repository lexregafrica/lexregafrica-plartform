'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type PathId = 'existing' | 'new' | 'informal'

const paths: Array<{
  id: PathId
  icon: React.ReactNode
  label: string
  sublabel: string
  description: string
}> = [
  {
    id: 'existing',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    label: 'Existing Business',
    sublabel: 'BRS registered',
    description: 'Upload your existing company documents. Our system verifies your registration automatically.',
  },
  {
    id: 'new',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    label: 'Register New Entity',
    sublabel: 'Not registered',
    description: 'We guide you through the entire BRS registration process — from questionnaire to filing.',
  },
  {
    id: 'informal',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    label: 'Informal Business',
    sublabel: 'Informal',
    description: 'Take a short readiness assessment and get a personalised path to formalisation.',
  },
]

const PATH_NEXT: Record<PathId, string> = {
  existing: '/onboarding/existing/1',
  new: '/onboarding/new/1',
  informal: '/onboarding/informal',
}

export function PathSelector() {
  const router = useRouter()
  const [loading, setLoading] = useState<PathId | null>(null)
  const [error, setError] = useState('')

  const handleSelect = async (pathId: PathId) => {
    setLoading(pathId)
    setError('')

    const res = await fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(null)
      return
    }

    router.push(PATH_NEXT[pathId])
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6 hover:opacity-75 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="LexReg Africa" className="h-9 w-9 object-contain" />
          <span className="text-ios-headline font-semibold" style={{ color: 'var(--brand-navy)' }}>
            LexReg Africa
          </span>
        </Link>

        <h1 className="text-ios-display" style={{ color: 'var(--system-label)', letterSpacing: '-0.5px' }}>
          How does your<br />business stand?
        </h1>
        <p className="text-ios-callout mt-3 max-w-[300px] mx-auto" style={{ color: 'var(--system-label-2)' }}>
          Choose the path that describes your situation. This guides your entire experience.
        </p>
      </div>

      {/* Path cards */}
      <div className="w-full max-w-[400px] space-y-3">
        {paths.map(path => (
          <button
            key={path.id}
            onClick={() => handleSelect(path.id)}
            disabled={loading !== null}
            className="w-full text-left disabled:opacity-60"
          >
            <div className="ios-surface rounded-2xl p-5 flex items-start gap-4 transition-opacity active:opacity-60">
              {/* Icon */}
              <div
                className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'var(--system-bg-2)', color: 'var(--brand-navy)' }}
              >
                {loading === path.id ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : path.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-ios-headline" style={{ color: 'var(--system-label)' }}>
                    {path.label}
                  </span>
                  <span
                    className="text-ios-caption1 rounded-full px-2 py-0.5 whitespace-nowrap"
                    style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
                  >
                    {path.sublabel}
                  </span>
                </div>
                <p className="text-ios-subhead mt-1 leading-snug" style={{ color: 'var(--system-label-2)' }}>
                  {path.description}
                </p>
              </div>

              {/* Chevron */}
              <div className="mt-1 shrink-0" style={{ color: 'var(--system-label-3)' }}>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-4 text-center">{error}</p>
      )}

      <p className="text-ios-footnote mt-8 text-center max-w-[280px]" style={{ color: 'var(--system-label-3)' }}>
        You can always change this later. Your progress is saved at every step.
      </p>
    </div>
  )
}
