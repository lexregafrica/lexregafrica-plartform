import type { Metadata } from 'next'
import { PathSelector } from '@/components/onboarding/path-selector'

export const metadata: Metadata = {
  title: 'Get Started — LexReg Africa',
}

export default function OnboardingPage() {
  return <PathSelector />
}
