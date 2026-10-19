'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { IconMail, IconAlertCircle, IconClock, IconAlertTriangle } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthHeader, PasswordField, GoogleIcon } from '@/components/auth/auth-shell'

const CALLBACK_ERROR_MESSAGE =
  'We couldn’t complete that sign-in. Please try again — if it keeps happening, contact support.'

export function GlassLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => (searchParams.get('error') === 'auth_callback_failed' ? CALLBACK_ERROR_MESSAGE : ''))
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendSent, setResendSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter both email and password.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return }
    setError('')
    setUnconfirmedEmail('')
    setResendSent(false)
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setUnconfirmedEmail(email)
      } else {
        setError(authError.message)
      }
      return
    }
    router.replace('/dashboard')
  }

  const handleResendConfirmation = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resend({
      type: 'signup',
      email: unconfirmedEmail,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
    })
    setLoading(false)
    setResendSent(true)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
    })
  }

  return (
    <AuthShell>
      <AuthHeader title="Sign in to your account" subtitle="Welcome back. Pick up where you left off." />

      {error && (
        <div className="note note-bad rise" role="alert">
          <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {unconfirmedEmail && (
        <div className="note note-warn rise" role="status">
          <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p>Your email isn&rsquo;t confirmed yet. Check your inbox for the link we sent to <strong>{unconfirmedEmail}</strong>.</p>
            {resendSent ? (
              <p className="t-good">Confirmation email resent.</p>
            ) : (
              <button type="button" onClick={handleResendConfirmation} disabled={loading} className="btn btn-plain btn-sm self-start" style={{ paddingInline: 0 }}>
                Resend confirmation email
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSignIn} className="flex flex-col gap-6" noValidate>
        <div className="rise flex flex-col gap-4" style={{ '--d': 1 } as React.CSSProperties}>
          <div className={`field ${error ? 'is-invalid' : ''}`}>
            <label className="label" htmlFor="si-email">Email</label>
            <div className="input-wrap">
              <IconMail size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
              <input
                className="input"
                id="si-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                aria-invalid={!!error || undefined}
                style={{ paddingLeft: 38 }}
              />
            </div>
          </div>
          <PasswordField
            id="si-password"
            label="Password"
            value={password}
            onChange={(v) => { setPassword(v); setError('') }}
            autoComplete="current-password"
            invalid={!!error}
            trailingLabel={<Link className="t-subhead inline-flex min-h-8 items-center" href="/forgot-password">Forgot password?</Link>}
          />
        </div>

        <div className="rise flex flex-col gap-3" style={{ '--d': 2 } as React.CSSProperties}>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="t-footnote t-3 flex items-center justify-center gap-2 text-center">
            <IconClock size={15} stroke={1.75} aria-hidden="true" />You&rsquo;ll be signed out after 30 minutes of inactivity.
          </p>
        </div>
      </form>

      <div className="auth-or t-caption t-3 rise" style={{ '--d': 3 } as React.CSSProperties}>or</div>

      <div className="rise flex flex-col gap-2" style={{ '--d': 4 } as React.CSSProperties}>
        <button type="button" onClick={handleGoogle} disabled={googleLoading} className="btn btn-secondary btn-lg btn-block">
          <GoogleIcon />{googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <Link href="/signup" className="btn btn-gray btn-lg btn-block">Create an account</Link>
        <p className="t-footnote t-3 text-center">Invited by LexReg as a lawyer? Use the link in your invitation email.</p>
      </div>
    </AuthShell>
  )
}
