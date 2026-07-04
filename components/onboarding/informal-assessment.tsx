'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  INFORMAL_QUESTIONS,
  TOTAL_QUESTIONS,
  CATEGORY_LABELS,
  type InformalResult,
} from '@/lib/onboarding/informal'

type LoadState = 'loading' | 'quiz' | 'results'

export function InformalAssessment() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<InformalResult | null>(null)
  const [convertLoading, setConvertLoading] = useState(false)

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

    setCurrentIndex((i) => i + 1)
  }

  const handleBack = () => {
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
    router.push('/onboarding/new/1')
  }

  if (loadState === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--brand-navy)' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (loadState === 'results' && result) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <p className="text-ios-footnote mb-1 text-center" style={{ color: 'var(--system-label-3)' }}>
            Your readiness score
          </p>
          <div className="flex items-baseline justify-center gap-1 mb-6">
            <span className="text-[56px] font-bold leading-none" style={{ color: 'var(--brand-navy)' }}>
              {result.score}
            </span>
            <span className="text-ios-title2" style={{ color: 'var(--system-label-3)' }}>
              /100
            </span>
          </div>

          {/* Category breakdown */}
          <div className="ios-surface rounded-2xl p-5 mb-4">
            <h2 className="text-ios-subhead font-semibold mb-3" style={{ color: 'var(--system-label)' }}>
              Category breakdown
            </h2>
            <div className="space-y-3">
              {(Object.keys(result.categoryScores) as Array<keyof typeof result.categoryScores>).map((cat) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>
                      {result.categoryScores[cat]}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--system-fill-3)' }}>
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${result.categoryScores[cat]}%`, background: 'var(--brand-navy)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gap analysis */}
          {result.gaps.length > 0 && (
            <div className="ios-surface rounded-2xl p-5 mb-4">
              <h2 className="text-ios-subhead font-semibold mb-3" style={{ color: 'var(--system-label)' }}>
                Priority gaps to close
              </h2>
              <div className="space-y-4">
                {result.gaps.map((gap) => (
                  <div key={gap.category}>
                    <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>
                      {gap.label}
                    </p>
                    <p className="text-ios-footnote mt-0.5 leading-snug" style={{ color: 'var(--system-label-2)' }}>
                      {gap.advice}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleConvertToNewEntity}
            disabled={convertLoading}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mb-3"
            style={{ background: 'var(--brand-navy)' }}
          >
            {convertLoading ? 'Starting…' : 'Start registering my business'}
          </button>

          <Link
            href="/dashboard"
            className="block w-full text-center py-2.5 rounded-full text-sm font-medium border"
            style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
          >
            Explore dashboard instead
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= currentIndex ? 'var(--brand-navy)' : 'var(--system-fill-3)' }}
            />
          ))}
        </div>

        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-3)' }}>
          Question {currentIndex + 1} of {TOTAL_QUESTIONS} — {CATEGORY_LABELS[question.category]}
        </p>
        <h1 className="text-ios-title2 font-semibold mb-6 leading-snug" style={{ color: 'var(--system-label)' }}>
          {question.prompt}
        </h1>

        <div className="space-y-2.5 mb-6">
          {question.options.map((option, i) => {
            const isSelected = selectedOption === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                className="w-full text-left rounded-xl border p-4 transition-colors"
                style={{
                  borderColor: isSelected ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: isSelected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                }}
              >
                <span className="text-ios-subhead" style={{ color: 'var(--system-label)' }}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex items-center gap-3">
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="py-2.5 px-5 rounded-full text-sm font-medium border"
              style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedOption === undefined || saving}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand-navy)' }}
          >
            {saving ? 'Saving…' : isLastQuestion ? 'See my results' : 'Continue'}
          </button>
        </div>

        <Link
          href="/onboarding"
          className="mt-6 inline-flex text-ios-footnote font-medium"
          style={{ color: 'var(--system-label-3)' }}
        >
          ← Back to path selection
        </Link>
      </div>
    </div>
  )
}
