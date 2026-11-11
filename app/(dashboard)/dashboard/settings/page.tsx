import type { Metadata } from 'next'
import { OwnerHomePage } from '@/components/dashboard/owner-home-page'

export const metadata: Metadata = { title: 'Settings — LexReg Africa' }

export default function Page() {
  return <OwnerHomePage page="settings" />
}
