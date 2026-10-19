'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconMail, IconUser, IconAlertCircle, IconMailCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthHeader, PasswordField, PasswordStrength, GoogleIcon } from '@/components/auth/auth-shell'

export function GlassSignup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!consent) {
      setError('Please accept the Terms and Privacy Policy to continue.')
      return
    }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSuccess(true)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <AuthShell>
        <span className="icon-tile icon-tile-lg good pop" aria-hidden="true"><IconMailCheck size={22} stroke={1.75} /></span>
        <AuthHeader
          title="Check your email"
          subtitle={<>We sent a confirmation link to <strong style={{ color: 'var(--label)' }}>{email}</strong>. Open it to activate your account.</>}
        />
        <Link href="/login" className="btn btn-gray btn-lg btn-block">Back to sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthHeader title="Create your account" subtitle="Set up LexReg for your business in a few minutes." />

      {error && (
        <div className="note note-bad rise" role="alert">
          <IconAlertCircle size={18} stroke={1.75} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSignUp} className="flex flex-col gap-6" noValidate>
        <div className="rise flex flex-col gap-4" style={{ '--d': 1 } as React.CSSProperties}>
          <div className="field">
            <label className="label" htmlFor="su-name">Full name</label>
            <div className="input-wrap">
              <IconUser size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
              <input className="input" id="su-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ paddingLeft: 38 }} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="su-email">Email</label>
            <div className="input-wrap">
              <IconMail size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
              <input className="input" id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 38 }} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <PasswordField id="su-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
            <PasswordStrength password={password} />
          </div>
          <div className="flex flex-col gap-1.5">
            <PasswordField id="su-confirm" label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" invalid={mismatch} />
            {mismatch && <p className="error">Passwords don&rsquo;t match yet.</p>}
          </div>
        </div>

        <label className="rise flex cursor-pointer items-start gap-3" style={{ '--d': 2 } as React.CSSProperties}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: 'var(--tint)' }} />
          <span className="t-footnote t-2 t-pretty">
            I agree to the <Link href="/legal/terms" target="_blank">Terms</Link> and <Link href="/legal/privacy" target="_blank">Privacy Policy</Link>, and consent to LexReg processing my data under the Kenya Data Protection Act 2019.
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block rise" style={{ '--d': 3 } as React.CSSProperties}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="auth-or t-caption t-3">or</div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleGoogle} disabled={googleLoading} className="btn btn-secondary btn-lg btn-block">
          <GoogleIcon />{googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <p className="t-footnote t-3 text-center">Already have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </AuthShell>
  )
}
