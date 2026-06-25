import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-navy)' }}>
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your LexReg account
        </p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <a href="/signup" className="font-medium underline underline-offset-2" style={{ color: 'var(--brand-navy)' }}>
          Create one
        </a>
      </p>
    </div>
  )
}
