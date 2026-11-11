import type { Metadata } from 'next'
import { AnalyticsMock } from '@/components/dashboard-mockups/lexreg-dashboards'

export const metadata: Metadata = { title: 'Analytics dashboard — LexReg Africa' }

export default function Page() {
  return <AnalyticsMock />
}
