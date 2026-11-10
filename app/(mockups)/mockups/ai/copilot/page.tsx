import type { Metadata } from 'next'
import { CopilotMock } from '@/components/ai-mockups/copilot'

export const metadata: Metadata = { title: 'Mockup: Lawyer Co-Pilot — LexReg Africa' }

export default function Page() {
  return <CopilotMock />
}
