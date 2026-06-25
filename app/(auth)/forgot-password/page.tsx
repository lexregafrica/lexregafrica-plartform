import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Reset password' }

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-navy)' }}>
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a reset link
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
