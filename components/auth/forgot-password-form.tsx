'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-[360px] text-center space-y-4">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--system-fill-3)' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--brand-navy)' }}
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div>
          <h2 className="text-ios-title3" style={{ color: 'var(--system-label)' }}>
            Check your email
          </h2>
          <p className="text-ios-subhead mt-1" style={{ color: 'var(--system-label-2)' }}>
            We sent a reset link to{' '}
            <span style={{ color: 'var(--system-label)' }}>{email}</span>
          </p>
        </div>
        <Link href="/login" className="block">
          <button
            type="button"
            className="w-full rounded-2xl py-4 text-ios-headline font-semibold transition-opacity active:opacity-70"
            style={{
              background: 'var(--system-fill-3)',
              color: 'var(--brand-navy)',
              minHeight: '50px',
            }}
          >
            Back to Sign In
          </button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[360px] space-y-2">
      <div className="ios-group">
        <div className="ios-group-row" style={{ borderBottom: 'none' }}>
          <label
            htmlFor="email"
            className="text-ios-subhead w-[88px] shrink-0"
            style={{ color: 'var(--system-label)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 bg-transparent py-3 text-ios-body outline-none"
            style={{ color: 'var(--system-label)', caretColor: 'var(--brand-navy)' }}
          />
        </div>
      </div>

      {error && (
        <p className="text-ios-footnote px-4" style={{ color: 'var(--destructive)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl py-4 text-ios-headline font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
        style={{
          background: 'var(--brand-navy)',
          color: '#ffffff',
          minHeight: '50px',
        }}
      >
        {loading ? 'Sending…' : 'Send Reset Link'}
      </button>

      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 hairline border-t" />
      </div>

      <Link href="/login" className="block">
        <button
          type="button"
          className="w-full rounded-2xl py-4 text-ios-headline font-semibold transition-opacity active:opacity-70"
          style={{
            background: 'var(--system-fill-3)',
            color: 'var(--brand-navy)',
            minHeight: '50px',
          }}
        >
          Back to Sign In
        </button>
      </Link>
    </form>
  )
}
