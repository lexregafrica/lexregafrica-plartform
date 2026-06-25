import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-navy)' }}>
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start managing your business compliance today
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/login" className="font-medium underline underline-offset-2" style={{ color: 'var(--brand-navy)' }}>
          Sign in
        </a>
      </p>
    </div>
  )
}
