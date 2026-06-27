'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[360px] space-y-2">
      {/* Grouped inputs */}
      <div className="ios-group">
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
            spellCheck="false"
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
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="flex-1 bg-transparent py-3 text-ios-body outline-none"
            style={{ color: 'var(--system-label)', caretColor: 'var(--brand-navy)' }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-ios-footnote px-4" style={{ color: 'var(--destructive)' }}>
          {error}
        </p>
      )}

      {/* Sign in button */}
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
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Forgot password */}
      <div className="text-center pt-1">
        <Link
          href="/forgot-password"
          className="text-ios-subhead"
          style={{ color: 'var(--brand-navy)' }}
        >
          Forgot Password?
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 hairline border-t" />
        <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          or
        </span>
        <div className="flex-1 hairline border-t" />
      </div>

      {/* Create account */}
      <Link href="/signup" className="block">
        <button
          type="button"
          className="w-full rounded-2xl py-4 text-ios-headline font-semibold transition-opacity active:opacity-70"
          style={{
            background: 'var(--system-fill-3)',
            color: 'var(--brand-navy)',
            minHeight: '50px',
          }}
        >
          Create Account
        </button>
      </Link>
    </form>
  )
}
