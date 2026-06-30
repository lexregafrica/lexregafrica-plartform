import type { Metadata } from 'next'
import { GlassSignup } from '@/components/auth/glass-signup'

export const metadata: Metadata = {
  title: 'Create Account — LexReg Africa',
}

export default function SignupPage() {
  return <GlassSignup />
}
