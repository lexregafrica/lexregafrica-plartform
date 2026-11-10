import type { Metadata } from 'next'
import { LexAuditMock } from '@/components/ai-mockups/lex-audit'

export const metadata: Metadata = { title: 'Mockup: LexAudit — LexReg Africa' }

export default function Page() {
  return <LexAuditMock />
}
