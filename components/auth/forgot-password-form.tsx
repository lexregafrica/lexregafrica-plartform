'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconMail, IconAlertCircle, IconMailCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthHeader } from '@/components/auth/auth-shell'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell>
        <span className="icon-tile icon-tile-lg good pop" aria-hidden="true"><IconMailCheck size={22} stroke={1.75} /></span>
        <AuthHeader
          title="Check your email"
          subtitle={<>We sent a password reset link to <strong style={{ color: 'var(--label)' }}>{email}</strong>. Open it on this device to choose a new password.</>}
        />
        <div className="flex flex-col gap-2">
          <Link href="/login" className="btn btn-gray btn-lg btn-block">Back to sign in</Link>
          <button type="button" className="btn btn-plain" onClick={() => setSent(false)}>Use a different email</button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeader title="Reset your password" subtitle="Enter your email and we’ll send you a reset link." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <div className={`field rise ${error ? 'is-invalid' : ''}`} style={{ '--d': 1 } as React.CSSProperties}>
          <label className="label" htmlFor="fp-email">Email</label>
          <div className="input-wrap">
            <IconMail size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
            <input
              className="input"
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'fp-error' : undefined}
              style={{ paddingLeft: 38 }}
            />
          </div>
          {error && <p className="error" id="fp-error"><IconAlertCircle size={15} stroke={1.75} aria-hidden="true" />{error}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block rise" style={{ '--d': 2 } as React.CSSProperties}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="t-footnote t-3 text-center">Remember your password? <Link href="/login">Sign in</Link></p>
    </AuthShell>
  )
}
