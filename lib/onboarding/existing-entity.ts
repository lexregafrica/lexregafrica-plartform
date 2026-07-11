// Existing Entity path — fastest onboarding: upload → OCR verify → active.
// 4 steps, no conditional visibility (every registered entity goes through all).

export const EXISTING_TOTAL_STEPS = 4

export const EXISTING_STEP_LABELS: Record<number, string> = {
  1: 'Upload Documents',
  2: 'Verify Company Details',
  3: 'Directors & Shareholders',
  4: 'Review & Activate',
}

import type { EntityType } from './new-entity'

export type ExistingWizardData = {
  entityType?: EntityType
  legalName?: string
  registrationNumber?: string
  kraPin?: string
  dateIncorporated?: string
  addressLine1?: string
  city?: string
  county?: string
  postalCode?: string
  // lowest OCR confidence seen across extractions — below 60 the verify
  // step shows a "double-check these details" banner (pipeline threshold
  // per the OCR decision doc)
  minConfidence?: number
}
