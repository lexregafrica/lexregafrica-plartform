import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GlassLogin } from '@/components/auth/glass-login'

export const metadata: Metadata = {
  title: 'Sign In — LexReg Africa',
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <GlassLogin />
    </Suspense>
  )
}
