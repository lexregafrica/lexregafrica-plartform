import type { Metadata } from 'next'
import { Suspense } from 'react'
import { NewEntityWizard } from '@/components/onboarding/new-entity-wizard'

export const metadata: Metadata = {
  title: 'Register New Entity — LexReg Africa',
}

// The wizard resumes from the server-saved step, so the [step] URL param is
// only an entry point — actual position always comes from onboarding_progress.
// Suspense: the wizard reads ?recommended= via useSearchParams.
export default function NewEntityStepPage() {
  return (
    <Suspense>
      <NewEntityWizard />
    </Suspense>
  )
}
