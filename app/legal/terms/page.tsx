import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'
import { termsAndConditions } from '@/lib/legal/terms-content'

export const metadata: Metadata = {
  title: 'Terms and Conditions — LexReg Africa',
}

export default function TermsPage() {
  return <LegalDocument data={termsAndConditions} backHref="/" />
}
