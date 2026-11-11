import type { Metadata } from 'next'
import { CombinedMock } from '@/components/dashboard-mockups/lexreg-dashboards'

export const metadata: Metadata = { title: 'Dashboard revamp (combined) — LexReg Africa' }

export default function Page() {
  return <CombinedMock />
}
