import type { Metadata } from 'next'
import { ShellMock } from '@/components/dashboard-mockups/lexreg-dashboards'

export const metadata: Metadata = { title: 'Dashboard shell — LexReg Africa' }

export default function Page() {
  return <ShellMock />
}
