'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'

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
    description:
      'You already have a certificate of incorporation from the Business Registration Service. Upload your registration documents — certificate of incorporation, CR12, KRA PIN — and our OCR engine extracts your company details automatically. You’ll verify the extracted information before anything is saved, so nothing goes into your record without your sign-off. This is the fastest path: most existing businesses are verified and ready to use LexReg within minutes, not days.',
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
    description:
      'Haven’t registered your business with BRS yet? We’ll walk you through a structured questionnaire covering your proposed company names, directors, shareholders, and share capital. LexReg then generates the registration documents you need — CR1, CR2, CR8, and the Memorandum & Articles — ready for filing. Because BRS has no public API, you’ll file these documents yourself and upload your certificate once it’s issued; we guide you through every step so nothing gets lost along the way.',
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
    description:
      'Not registered and not sure where to start? Take a short 15-question readiness assessment covering registration status, tax compliance, governance, and record-keeping. You’ll get a maturity score out of 100 along with a personalised gap analysis — a clear picture of what’s missing and what to prioritise first. If you decide to formalise afterwards, you can move straight into the New Entity registration path without starting over.',
  },
]

const PATH_NEXT: Record<PathId, string> = {
  existing: '/onboarding/existing/1',
  new: '/onboarding/new/1',
  informal: '/onboarding/informal',
}

export function PathSelector() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<PathId | null>(null)
  const [loading, setLoading] = useState<PathId | null>(null)
  const [error, setError] = useState('')

  const toggleExpand = (id: PathId) => {
    setExpanded(prev => (prev === id ? null : id))
  }

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
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
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
          Choose the path that describes your situation. Tap a card to read more.
        </p>
      </div>

      {/* Path cards — horizontal scroll strip on mobile, vertical stack on desktop */}
      <div className="w-full max-w-[420px] md:max-w-4xl">
        <div className="flex flex-col md:flex-row gap-3 items-start">
          {paths.map(path => {
            const isExpanded = expanded === path.id
            const isLoading = loading === path.id

            return (
              <div
                key={path.id}
                className="ios-surface rounded-2xl w-full md:flex-1 md:min-w-0 overflow-hidden transition-shadow"
                style={isExpanded ? { boxShadow: '0 4px 20px rgba(0,0,0,0.06)' } : undefined}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(path.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-5 flex items-start gap-4"
                >
                  {/* Icon */}
                  <div
                    className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--system-bg-2)', color: 'var(--brand-navy)' }}
                  >
                    {path.icon}
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

                    <div className="relative mt-1">
                      <p
                        className={`text-ios-subhead leading-snug ${isExpanded ? '' : 'line-clamp-2'}`}
                        style={{ color: 'var(--system-label-2)' }}
                      >
                        {path.description}
                      </p>
                      {!isExpanded && (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-4"
                          style={{ background: 'linear-gradient(to top, var(--system-bg), transparent)' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <div
                    className="mt-1 shrink-0 transition-transform duration-200"
                    style={{ color: 'var(--system-label-3)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pl-[76px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(path.id)
                          }}
                          disabled={loading !== null}
                          className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'var(--brand-navy)' }}
                        >
                          {isLoading ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            'Get started'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
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
