'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  IconFileCertificate,
  IconPlus,
  IconActivity,
  IconCircleCheck,
  IconClock,
  IconInfoCircle,
  IconArrowRight,
  IconCloudCheck,
  IconAlertCircle,
} from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

type PathId = 'existing' | 'new' | 'informal'

const paths: Array<{
  id: PathId
  icon: typeof IconPlus
  label: string
  sublabel: string
  pill: string
  summary: string
  steps: string[]
  footIcon: typeof IconPlus
  foot: string
}> = [
  {
    id: 'existing',
    icon: IconFileCertificate,
    label: 'Existing business',
    sublabel: 'BRS registered',
    pill: 'pill-good',
    summary: 'You already hold a certificate from the Business Registration Service.',
    steps: [
      'Upload your certificate of incorporation, CR12 and KRA PIN certificate.',
      'Our OCR engine reads your company details and flags anything it isn’t sure of.',
      'You verify every extracted field — nothing is saved to your record without your sign-off.',
    ],
    footIcon: IconClock,
    foot: 'Usually the fastest path — your documents do most of the typing.',
  },
  {
    id: 'new',
    icon: IconPlus,
    label: 'Register a new entity',
    sublabel: 'Not registered',
    pill: 'pill-info',
    summary: 'Form a company, partnership or business name, guided step by step.',
    steps: [
      'Answer a structured questionnaire: proposed names, directors, shareholders and share capital.',
      'Take those details to BRS eCitizen to complete and sign the registration forms.',
      'Upload your certificate here once BRS issues it.',
    ],
    footIcon: IconInfoCircle,
    foot: 'BRS has no public API, so you file on eCitizen yourself — we guide every step.',
  },
  {
    id: 'informal',
    icon: IconActivity,
    label: 'Informal business',
    sublabel: 'Readiness assessment',
    pill: '',
    summary: 'Trading, but not registered and not sure where to start.',
    steps: [
      'Take a 15-question readiness assessment on registration, tax, governance, record-keeping and contracts.',
      'Get a maturity score out of 100 with a personalised gap analysis of what to fix first.',
      'Move straight into registering a new entity when you’re ready — without starting over.',
    ],
    footIcon: IconClock,
    foot: 'Fifteen questions, one per screen.',
  },
]

const PATH_NEXT: Record<PathId, string> = {
  existing: '/onboarding/existing/1',
  new: '/onboarding/new/1',
  informal: '/onboarding/informal',
}

export function PathSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<PathId | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    if (!selected) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push(PATH_NEXT[selected])
  }

  const current = paths.find((p) => p.id === selected)

  return (
    <div className="lx wz min-h-[100dvh]">
      <header className="wz-top glass sticky top-0 z-20">
        <Link className="flex items-center gap-2" href="/dashboard" style={{ color: 'var(--label)' }}>
          <LexRegLogoMark size={28} />
          <span className="t-headline hide-compact">LexReg</span>
        </Link>
        <span className="t-3 hide-compact" aria-hidden="true">/</span>
        <span className="t-subhead truncate">Get started</span>
        <div className="flex-1" />
        <span className="wz-saved"><IconCloudCheck size={15} stroke={1.75} aria-hidden="true" /><span className="hide-compact">Progress saves at every step</span></span>
      </header>

      <div className="wz-body" style={{ justifyContent: 'center' }}>
        <section className="wz-main">
          <header className="wz-head rise">
            <p className="t-eyebrow">Get started</p>
            <h1 className="t-large">How would you like to start?</h1>
            <p className="t-body t-2 t-pretty">Choose the path that describes your business today. You can switch paths later.</p>
          </header>

          <div className="flex flex-col gap-3" role="radiogroup" aria-label="Onboarding path">
            {paths.map((p, i) => {
              const isOn = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  onClick={() => setSelected(p.id)}
                  className={`choice rise ${isOn ? 'is-selected' : ''}`}
                  style={{ '--d': i + 1, flexDirection: 'column', gap: 0, padding: 0 } as React.CSSProperties}
                >
                  <span className="flex w-full items-start gap-4 p-4">
                    <span className="icon-tile icon-tile-lg" aria-hidden="true"><p.icon size={22} stroke={1.75} /></span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="t-headline">{p.label}</span>
                        <span className={`pill ${p.pill}`}>{p.sublabel}</span>
                      </span>
                      <span className="t-callout t-2 t-pretty">{p.summary}</span>
                    </span>
                    <span className="mark" aria-hidden="true" />
                  </span>
                  {isOn && (
                    <span className="fade flex w-full flex-col gap-3 px-4 pb-4" style={{ paddingLeft: 76 }}>
                      <span className="t-eyebrow">What happens</span>
                      <ol className="flex flex-col gap-2">
                        {p.steps.map((s, k) => (
                          <li key={s} className="flex items-start gap-3">
                            <span className="t-caption t-num flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: 'var(--tint)', color: '#fff' }}>{k + 1}</span>
                            <span className="t-callout t-pretty" style={{ color: 'var(--label)' }}>{s}</span>
                          </li>
                        ))}
                      </ol>
                      <span className="t-footnote t-3 flex items-start gap-2"><p.footIcon size={15} stroke={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />{p.foot}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {error && (
            <div className="note note-bad" role="alert">
              <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <div className="wz-actions glass">
            <span className="t-footnote t-3 flex min-w-0 items-center gap-2">
              {current ? <IconCircleCheck size={16} stroke={1.75} aria-hidden="true" style={{ color: 'var(--good)' }} /> : null}
              <span className="truncate">{current ? `Selected: ${current.label}` : 'Choose a path to continue'}</span>
            </span>
            <span className="spacer" />
            <button type="button" className="btn btn-primary" disabled={!selected || loading} onClick={handleContinue}>
              {loading ? 'Starting…' : 'Continue'}<IconArrowRight size={17} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
