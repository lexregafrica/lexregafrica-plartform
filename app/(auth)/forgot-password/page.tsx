import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = {
  title: 'Reset Password — LexReg Africa',
}

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-ios-title1" style={{ color: 'var(--system-label)' }}>
          Reset Password
        </h1>
        <p
          className="text-ios-subhead mt-1 max-w-[280px]"
          style={{ color: 'var(--system-label-2)' }}
        >
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}
