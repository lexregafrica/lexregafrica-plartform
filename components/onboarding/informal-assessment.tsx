'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconArrowLeft, IconArrowRight, IconCloudCheck, IconAlertCircle, IconMessageCircle } from '@tabler/icons-react'
import {
  INFORMAL_QUESTIONS,
  TOTAL_QUESTIONS,
  CATEGORY_LABELS,
  BAND_CONTENT,
  scoreBand,
  type InformalCategory,
  type InformalResult,
} from '@/lib/onboarding/informal'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

type LoadState = 'loading' | 'quiz' | 'results'

const CATEGORY_ORDER: InformalCategory[] = ['registration', 'tax', 'governance', 'records', 'contracts']

const BAND_COLOUR = {
  significant_gaps: 'var(--sys-red)',
  moderate: 'var(--sys-orange)',
  ready: 'var(--sys-green)',
} as const

function TopBar() {
  return (
    <header className="wz-top glass sticky top-0 z-20">
      <Link className="flex items-center gap-2" href="/dashboard" style={{ color: 'var(--label)' }}>
        <LexRegLogoMark size={28} />
        <span className="t-headline hide-compact">LexReg</span>
      </Link>
      <span className="t-3 hide-compact" aria-hidden="true">/</span>
      <span className="t-subhead truncate">Readiness assessment</span>
      <div className="flex-1" />
      <span className="wz-saved"><IconCloudCheck size={15} stroke={1.75} aria-hidden="true" /><span className="hide-compact">Answers save as you go</span></span>
    </header>
  )
}

export function InformalAssessment() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InformalResult | null>(null)
  const [convertLoading, setConvertLoading] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/onboarding/informal')
        if (!res.ok) {
          setLoadState('quiz')
          return
        }
        const { data } = await res.json()

        if (data?.completed && data?.result) {
          setResult(data.result)
          setLoadState('results')
          return
        }

        const savedAnswers = data?.answers ?? {}
        setAnswers(savedAnswers)
        const answeredCount = Object.keys(savedAnswers).length
        setCurrentIndex(Math.min(answeredCount, TOTAL_QUESTIONS - 1))
        setLoadState('quiz')
      } catch {
        setLoadState('quiz')
      }
    }
    load()
  }, [])

  const question = INFORMAL_QUESTIONS[currentIndex]
  const selectedOption = answers[question?.id]
  const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
  }

  const handleContinue = async () => {
    setError('')
    setSaving(true)
    const complete = isLastQuestion

    const res = await fetch('/api/onboarding/informal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, complete }),
    })

    setSaving(false)

    if (!res.ok) {
      setError('Something went wrong saving your answer. Please try again.')
      return
    }

    if (complete) {
      const { result: computedResult } = await res.json()
      setResult(computedResult)
      setLoadState('results')
      return
    }

    setDirection('forward')
    setCurrentIndex((i) => i + 1)
  }

  const handleBack = () => {
    setDirection('back')
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  const handleConvertToNewEntity = async () => {
    setConvertLoading(true)
    const res = await fetch('/api/onboarding/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'new' }),
    })
    if (!res.ok) {
      setConvertLoading(false)
      setError('Something went wrong. Please try again.')
      return
    }
    // Strong readiness pre-populates Path 2 with the recommended entity type
    router.push('/onboarding/new/1?recommended=limited_company')
  }

  if (loadState === 'loading') {
    return (
      <div className="lx wz min-h-[100dvh]">
        <TopBar />
        <div className="wz-body" style={{ justifyContent: 'center' }}>
          <section className="wz-main" aria-busy="true">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-9 w-3/4" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </section>
        </div>
      </div>
    )
  }

  if (loadState === 'results' && result) {
    const band = result.band ?? scoreBand(result.score)
    const content = BAND_CONTENT[band]
    const len = 2 * Math.PI * 64

    const formalise = (label: string, primary: boolean) => (
      <button type="button" onClick={handleConvertToNewEntity} disabled={convertLoading} className={`btn btn-block btn-lg ${primary ? 'btn-primary' : 'btn-secondary'}`}>
        {convertLoading ? 'Starting…' : label}
      </button>
    )
    const help = (label: string, primary: boolean) => (
      <button type="button" onClick={() => setShowHelp(true)} className={`btn btn-block btn-lg ${primary ? 'btn-primary' : 'btn-secondary'}`}>
        <IconMessageCircle size={18} stroke={1.75} aria-hidden="true" />{label}
      </button>
    )

    return (
      <div className="lx wz min-h-[100dvh]">
        <TopBar />
        <div className="wz-body" style={{ justifyContent: 'center' }}>
          <section className="wz-main" style={{ maxWidth: 880 }}>
            <section className="card card-pad rise flex flex-wrap items-center gap-6" aria-labelledby="score-h">
              <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
                <svg className="ring-chart" width="148" height="148" viewBox="0 0 148 148" aria-hidden="true">
                  <circle className="track" cx="74" cy="74" r="64" strokeWidth="14" />
                  <circle className="bar" cx="74" cy="74" r="64" strokeWidth="14" strokeDasharray={len} strokeDashoffset={len * (1 - result.score / 100)} style={{ '--len': len, stroke: BAND_COLOUR[band] } as React.CSSProperties} />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="t-stat" style={{ fontSize: 36, lineHeight: '40px' }}>{result.score}</span>
                  <span className="t-footnote t-3">out of 100</span>
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2" style={{ minWidth: 240 }}>
                <p className="t-eyebrow">Your readiness score</p>
                <h1 id="score-h" className="t-large t-balance">{content.headline}</h1>
                <p className="t-body t-2 t-pretty">{content.message}</p>
              </div>
            </section>

            <div className="grid cols-5 keep gap-4">
              <div className="span-3 flex flex-col gap-4">
                <section className="card rise" aria-labelledby="cat-h" style={{ '--d': 1 } as React.CSSProperties}>
                  <div className="card-head"><h2 id="cat-h">Category breakdown</h2></div>
                  <ul className="flex flex-col gap-3 px-5 pb-5">
                    {CATEGORY_ORDER.filter((c) => c in result.categoryScores).map((cat) => {
                      const v = result.categoryScores[cat]
                      return (
                        <li key={cat} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="t-subhead" style={{ color: 'var(--label)' }}>{CATEGORY_LABELS[cat]}</span>
                            <span className="t-footnote t-num t-2">{v}%{v < 70 ? ' · gap' : ''}</span>
                          </div>
                          <div className={`progress ${v >= 70 ? 'good' : 'warn'}`}><span style={{ width: `${v}%` }} /></div>
                        </li>
                      )
                    })}
                  </ul>
                </section>

                {result.gaps.length > 0 && (
                  <section className="card rise" aria-labelledby="gap-h" style={{ '--d': 2 } as React.CSSProperties}>
                    <div className="card-head">
                      <h2 id="gap-h">Priority gaps to close</h2>
                      <span className="t-footnote t-3">Lowest score first</span>
                    </div>
                    <ol className="flex flex-col pb-1.5">
                      {result.gaps.map((gap, i) => (
                        <li key={gap.category} className="list-row" style={{ alignItems: 'flex-start', paddingInline: 20 }}>
                          <span className="t-caption t-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: 'var(--brand-50)', color: 'var(--tint-text)' }}>{i + 1}</span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{gap.label}</span>
                            <span className="t-footnote t-2 t-pretty">{gap.advice}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>

              <aside className="span-2 flex flex-col gap-3 rise" style={{ '--d': 3 } as React.CSSProperties} aria-label="Next steps">
                <p className="t-eyebrow">Next step</p>
                {error && (
                  <div className="note note-bad" role="alert">
                    <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
                    <p>{error}</p>
                  </div>
                )}
                {band === 'ready' && formalise('Start registering my business', true)}
                {band === 'moderate' && (
                  <>
                    {formalise('Start formalisation now', true)}
                    {help('Get guided support', false)}
                  </>
                )}
                {band === 'significant_gaps' && (
                  <>
                    {help('Get personalised advice', true)}
                    {formalise('Start formalisation anyway', false)}
                  </>
                )}
                <Link href="/dashboard" className="btn btn-plain btn-block">Explore dashboard instead</Link>
              </aside>
            </div>
          </section>
        </div>

        {showHelp && (
          <HelpRequestSheet
            context={{
              source: `Informal business assessment — score ${result.score}/100 (${band.replace('_', ' ')})`,
            }}
            onClose={() => setShowHelp(false)}
          />
        )}
      </div>
    )
  }

  const answered = Object.keys(answers).length
  const pct = Math.round(((currentIndex + 1) / TOTAL_QUESTIONS) * 100)
  const currentCatIndex = CATEGORY_ORDER.indexOf(question.category)

  return (
    <div className="lx wz min-h-[100dvh]">
      <TopBar />
      <div className="wz-body" style={{ justifyContent: 'center' }}>
        <section className="wz-main">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="t-footnote t-3 t-num">Question {currentIndex + 1} of {TOTAL_QUESTIONS}</span>
              <span className="t-footnote t-3 t-num">{answered} answered</span>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Assessment progress">
              <span style={{ width: `${pct}%`, transition: 'width var(--dur-spring) var(--ease-spring)', animation: 'none' }} />
            </div>
            <ol className="hide-compact flex flex-wrap gap-1.5" aria-label="Categories">
              {CATEGORY_ORDER.map((cat, i) => (
                <li key={cat} className={`pill ${i < currentCatIndex ? 'pill-good' : i === currentCatIndex ? 'pill-brand' : ''}`} aria-current={i === currentCatIndex ? 'step' : undefined}>
                  {CATEGORY_LABELS[cat]}
                </li>
              ))}
            </ol>
          </div>

          <div key={currentIndex} className={`flex flex-col gap-5 ${direction === 'forward' ? 'enter-forward' : 'enter-back'}`}>
            <header className="wz-head">
              <p className="t-eyebrow">{CATEGORY_LABELS[question.category]}</p>
              <h1 className="t-title1 t-balance">{question.prompt}</h1>
            </header>

            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={question.prompt}>
              {question.options.map((option, i) => {
                const isSelected = selectedOption === i
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelect(i)}
                    className={`choice ${isSelected ? 'is-selected' : ''}`}
                    style={{ alignItems: 'center' }}
                  >
                    <span className="t-caption flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold" style={isSelected ? { background: 'var(--tint)', color: '#fff' } : { background: 'var(--fill-3)', color: 'var(--label-2)' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="t-body flex-1" style={{ color: 'var(--label)' }}>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="note note-bad" role="alert">
              <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <div className="wz-actions glass">
            {currentIndex > 0 ? (
              <button type="button" onClick={handleBack} className="btn btn-gray"><IconArrowLeft size={17} stroke={2} aria-hidden="true" />Back</button>
            ) : (
              <Link href="/onboarding" className="btn btn-gray"><IconArrowLeft size={17} stroke={2} aria-hidden="true" />Change path</Link>
            )}
            <span className="spacer" />
            <button type="button" onClick={handleContinue} disabled={selectedOption === undefined || saving} className="btn btn-primary">
              {saving ? 'Saving…' : isLastQuestion ? 'See my results' : 'Next'}<IconArrowRight size={17} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
