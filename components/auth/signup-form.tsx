'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[360px] space-y-2">
      <div className="ios-group">
        <div className="ios-group-row">
          <label
            htmlFor="fullName"
            className="text-ios-subhead w-[88px] shrink-0"
            style={{ color: 'var(--system-label)' }}
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Jane Wanjiku"
            className="flex-1 bg-transparent py-3 text-ios-body outline-none"
            style={{ color: 'var(--system-label)', caretColor: 'var(--brand-navy)' }}
          />
        </div>
        <div className="ios-group-row">
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
        <div className="ios-group-row" style={{ borderBottom: 'none' }}>
          <label
            htmlFor="password"
            className="text-ios-subhead w-[88px] shrink-0"
            style={{ color: 'var(--system-label)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="8+ characters"
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
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <p
        className="text-ios-footnote text-center px-4 pt-1 leading-relaxed"
        style={{ color: 'var(--system-label-2)' }}
      >
        By continuing you agree to our{' '}
        <span style={{ color: 'var(--brand-navy)' }}>Terms</span> and{' '}
        <span style={{ color: 'var(--brand-navy)' }}>Privacy Policy</span>.
      </p>

      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 hairline border-t" />
        <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          or
        </span>
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
          Sign In Instead
        </button>
      </Link>
    </form>
  )
}
