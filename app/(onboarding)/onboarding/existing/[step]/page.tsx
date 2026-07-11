import type { Metadata } from 'next'
import { ExistingEntityWizard } from '@/components/onboarding/existing-entity-wizard'

export const metadata: Metadata = {
  title: 'Verify Your Business — LexReg Africa',
}

// The wizard resumes from the server-saved step; the [step] URL param is
// only an entry point.
export default function ExistingEntityStepPage() {
  return <ExistingEntityWizard />
}
