import type { Metadata } from 'next'
import { LegalDocument } from '@/components/legal/legal-document'
import { privacyPolicy } from '@/lib/legal/privacy-content'

export const metadata: Metadata = {
  title: 'Privacy Policy — LexReg Africa',
}

export default function PrivacyPolicyPage() {
  return <LegalDocument data={privacyPolicy} backHref="/" />
}
