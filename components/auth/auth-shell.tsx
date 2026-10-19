'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconEye, IconEyeOff, IconLock } from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

// Shared frame for every auth screen (design system v2, mockups
// SignIn/SignUp/ResetPassword/LawyerInvite): looping brand video with a
// single line of copy on the left at regular width, the form alone on a
// phone. Reduced motion shows the still poster instead.

export function AuthShell({
  children,
  brandTitle = 'Every entity, filing and deadline in one calm place.',
}: {
  children: React.ReactNode
  brandTitle?: string
}) {
  return (
    <div className="lx">
      <div className="auth">
        <aside className="auth-brand" aria-label="About LexReg">
          <video className="auth-video" autoPlay muted loop playsInline preload="auto" poster="/videos/auth-bg-poster.jpg" aria-hidden="true">
            <source src="/videos/auth-bg.webm" type="video/webm" />
            <source src="/videos/auth-bg.mp4" type="video/mp4" />
          </video>
          <Link className="sb-brand" href="/">
            <LexRegLogoMark size={30} className="brand-logo" />
            <span className="sb-word">LexReg<small>Africa</small></span>
          </Link>
          <div className="rise flex max-w-md flex-col gap-2">
            <p className="t-eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>Governance &amp; Compliance Portal</p>
            <p className="t-title1 t-balance" style={{ color: '#fff' }}>{brandTitle}</p>
          </div>
        </aside>

        <main className="auth-main">
          <Link className="only-compact flex min-h-11 items-center gap-2 self-start" href="/" style={{ color: 'var(--label)' }}>
            <LexRegLogoMark size={28} />
            <span className="t-headline">LexReg</span>
          </Link>
          <div className="auth-form">{children}</div>
          <nav className="auth-foot t-footnote" aria-label="Legal">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy Policy</Link>
          </nav>
        </main>
      </div>
    </div>
  )
}

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <header className="rise flex flex-col gap-2">
      <h1 className="t-large">{title}</h1>
      {subtitle && <p className="t-body t-2 t-pretty">{subtitle}</p>}
    </header>
  )
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  invalid,
  trailingLabel,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  invalid?: boolean
  trailingLabel?: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={`field ${invalid ? 'is-invalid' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="label" htmlFor={id}>{label}</label>
        {trailingLabel}
      </div>
      <div className="input-wrap">
        <IconLock size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
        <input
          className="input"
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          style={{ paddingLeft: 38, paddingRight: 52 }}
        />
        <span className="trail">
          <button
            className="btn btn-plain btn-icon btn-sm"
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            style={{ color: 'var(--label-3)' }}
          >
            {show ? <IconEyeOff size={18} stroke={1.75} aria-hidden="true" /> : <IconEye size={18} stroke={1.75} aria-hidden="true" />}
          </button>
        </span>
      </div>
    </div>
  )
}

// Four-step strength guide. Only length (8+) is enforced — the rest is
// guidance, so nobody is locked out by rules the server doesn't apply.
export function passwordChecks(pw: string) {
  return [
    { label: 'At least 8 characters', ok: pw.length >= 8 },
    { label: 'Upper and lower case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: 'A number', ok: /\d/.test(pw) },
    { label: 'A symbol', ok: /[^A-Za-z0-9]/.test(pw) },
  ]
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = passwordChecks(password)
  const score = checks.filter((c) => c.ok).length
  const colour = score <= 1 ? 'var(--sys-red)' : score === 2 ? 'var(--sys-orange)' : score === 3 ? 'var(--sys-yellow)' : 'var(--sys-green)'
  const word = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score]
  if (!password) return null
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="strength" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <span key={i} style={i < score ? { background: colour } : undefined} />)}
      </div>
      <p className="t-footnote t-3">Strength: <span className="t-strong" style={{ color: 'var(--label)' }}>{word}</span></p>
      <ul className="grid cols-2 keep-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`t-footnote ${c.ok ? 't-good' : 't-3'}`}>{c.ok ? '✓' : '·'} {c.label}</li>
        ))}
      </ul>
    </div>
  )
}

export const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)
