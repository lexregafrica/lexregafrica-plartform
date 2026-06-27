import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Create Account — LexReg Africa',
}

export default function SignupPage() {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-ios-title1" style={{ color: 'var(--system-label)' }}>
          Get started
        </h1>
        <p className="text-ios-subhead mt-1" style={{ color: 'var(--system-label-2)' }}>
          Register your business with confidence
        </p>
      </div>
      <SignupForm />
    </>
  )
}
