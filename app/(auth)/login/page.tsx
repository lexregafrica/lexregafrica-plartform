import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In — LexReg Africa',
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-ios-title1" style={{ color: 'var(--system-label)' }}>
          Welcome back
        </h1>
        <p className="text-ios-subhead mt-1" style={{ color: 'var(--system-label-2)' }}>
          Sign in to your LexReg account
        </p>
      </div>
      <LoginForm />
    </>
  )
}
