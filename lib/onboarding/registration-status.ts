// 8-stage BRS filing status board — LLC-Only Developer Implementation
// Spec (Charles, 2026-07-17), screen 12 "Submission and pending status".
// Stored in entities.registration_status (plain text, no CHECK constraint —
// see supabase/migrations/20260626000002_llc_tables.sql). Several of these
// stages happen entirely outside the app (BRS processing, payment,
// registrar queries), so they're advanced manually by a super_admin, not
// derived from wizard state.

export type RegistrationStage =
  | 'draft'
  | 'awaiting_signature'
  | 'awaiting_payment'
  | 'submitted_brs'
  | 'query_registrar'
  | 'approved'
  | 'certificate_issued'
  | 'onboarding_complete'

export const REGISTRATION_STAGES: Array<{ value: RegistrationStage; label: string; description: string }> = [
  { value: 'draft', label: 'Draft', description: 'Application being completed' },
  { value: 'awaiting_signature', label: 'Awaiting signature', description: 'Generated forms need signing' },
  { value: 'awaiting_payment', label: 'Awaiting payment', description: 'BRS filing fee outstanding' },
  { value: 'submitted_brs', label: 'Submitted to BRS', description: 'Filed with the registrar' },
  { value: 'query_registrar', label: 'Query from registrar', description: 'BRS has requested a correction' },
  { value: 'approved', label: 'Approved', description: 'BRS has approved the filing' },
  { value: 'certificate_issued', label: 'Certificate issued', description: 'Certificate of incorporation received' },
  { value: 'onboarding_complete', label: 'Onboarding complete', description: 'Entity fully set up on LexReg' },
]

export function registrationStageIndex(status: string | null): number {
  if (!status) return 0
  const i = REGISTRATION_STAGES.findIndex((s) => s.value === status)
  return i === -1 ? 0 : i
}
