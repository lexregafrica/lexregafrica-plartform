// Existing Entity path — per the approved flowchart: tell us about your
// business → upload → OCR verify → people → declaration & activate.

export const EXISTING_TOTAL_STEPS = 5

export const EXISTING_STEP_LABELS: Record<number, string> = {
  1: 'Tell Us About Your Business',
  2: 'Upload Documents',
  3: 'Verify Company Details',
  4: 'Directors & Shareholders',
  5: 'Declaration & Activate',
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
  // Declaration & sign-off (flowchart: certify accuracy, typed legal
  // name as signature, date auto-filled)
  declared?: boolean
  signature?: string
  declarationDate?: string
}
