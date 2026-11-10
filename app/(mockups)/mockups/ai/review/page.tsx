import type { Metadata } from 'next'
import { ReviewQueueMock } from '@/components/ai-mockups/review-queue'

export const metadata: Metadata = { title: 'Mockup: AI Review Queue — LexReg Africa' }

export default function Page() {
  return <ReviewQueueMock />
}
