import type { Metadata } from 'next'
import { InformalAssessment } from '@/components/onboarding/informal-assessment'

export const metadata: Metadata = {
  title: 'Readiness Assessment — LexReg Africa',
}

export default function InformalBusinessPage() {
  return <InformalAssessment />
}
