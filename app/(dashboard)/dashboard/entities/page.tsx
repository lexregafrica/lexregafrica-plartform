import type { Metadata } from 'next'
import { OwnerHomePage } from '@/components/dashboard/owner-home-page'

export const metadata: Metadata = { title: 'Entities — LexReg Africa' }

export default function Page() {
  return <OwnerHomePage page="repositories" />
}
