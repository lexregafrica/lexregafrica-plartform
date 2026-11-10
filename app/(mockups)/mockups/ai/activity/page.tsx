import type { Metadata } from 'next'
import { AiActivityMock } from '@/components/ai-mockups/ai-activity'

export const metadata: Metadata = { title: 'Mockup: AI Activity — LexReg Africa' }

export default function Page() {
  return <AiActivityMock />
}
