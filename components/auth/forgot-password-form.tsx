'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (authError) { setError(authError.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F4F6F8] px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 shadow-sm p-8 flex flex-col items-center text-center">
          <CheckCircle2 className="w-12 h-12 mb-4" style={{ color: '#C9A227' }} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 mb-6">
            We sent a password reset link to{' '}
            <span className="font-medium text-gray-900">{email}</span>.
          </p>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-900 underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F4F6F8] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-gray-200 shadow-sm p-8 flex flex-col items-center">

        <Link href="/" className="flex flex-col items-center gap-2 mb-7 hover:opacity-75 transition-opacity">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: '#1A1A2E' }}>
            <span className="text-xs font-bold tracking-tight" style={{ color: '#C9A227' }}>LR</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 leading-tight">LexReg Africa</p>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Governance &amp; Compliance Portal</p>
          </div>
        </Link>

        <h1 className="text-lg font-semibold text-gray-900 mb-1 text-center">Reset your password</h1>
        <p className="text-sm text-gray-400 mb-5 text-center">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/30 focus:border-[#1A1A2E]"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ background: '#1A1A2E' }}
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-6 text-center">
          Remember your password?{' '}
          <Link href="/login" className="text-gray-900 font-medium underline underline-offset-2 hover:opacity-70 transition-opacity">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-[11px] text-gray-400 mt-6 text-center">
        © {new Date().getFullYear()} LexReg Africa. All rights reserved.
      </p>
    </div>
  )
}
