import type { Metadata } from 'next'
import { AskYourFilingsMock } from '@/components/ai-mockups/ask-your-filings'

export const metadata: Metadata = { title: 'Mockup: Ask Your Filings — LexReg Africa' }

export default function Page() {
  return <AskYourFilingsMock />
}
