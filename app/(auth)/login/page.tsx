import type { Metadata } from 'next'
import { GlassLogin } from '@/components/auth/glass-login'

export const metadata: Metadata = {
  title: 'Sign In — LexReg Africa',
}

export default function LoginPage() {
  return <GlassLogin />
}
