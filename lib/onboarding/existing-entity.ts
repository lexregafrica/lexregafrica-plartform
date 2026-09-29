// Existing Entity path — document-led reconstruction of an entity that is
// already on the register (Charles's "Existing Registered … Onboarding
// Developer Brief" series, Sep 2026). The shared engine lives in
// existing-engine.ts; this file holds the per-entity-type configuration:
// document packs, field sets, source hierarchy and compliance-baseline
// questions. Registry form names and rules change, so they live here as
// data rather than in the wizard (every brief asks for this).

import type { EntityType } from './new-entity'
import type { BaselineAnswer, BaselineQuestion, DocSpec, FieldRecord, PackContext } from './existing-engine'
import { SECRETARY_CAPITAL_THRESHOLD_KES } from './new-entity'

export const EXISTING_TOTAL_STEPS = 7

export const EXISTING_STEP_LABELS: Record<number, string> = {
  1: 'Tell Us About Your Entity',
  2: 'Upload Registry Documents',
  3: 'Confirm Entity Details',
  4: 'People & Roles',
  5: 'Beneficial Ownership',
  6: 'Changes Since Your Latest Record',
  7: 'Review & Activate',
}

// Entity types with a built existing-entity workflow. Others show "coming
// later" until their brief is implemented (one at a time, per the plan).
export const EXISTING_SUPPORTED_TYPES: EntityType[] = ['limited_company']

// Company subtype fork (Limited Companies brief §2, §14)
export const COMPANY_SUBTYPES: Array<{ value: 'private' | 'public'; label: string; description: string }> = [
  { value: 'private', label: 'Private company limited by shares', description: 'The usual “Ltd” company — most Kenyan businesses.' },
  { value: 'public', label: 'Public limited company', description: 'A “PLC” — extra secretary and governance records are requested.' },
]

// ------------------------------------------------------------------
// Entity field set — the material fields shown on the review screen with
// a verification state each. `ocr` names the extraction field that feeds it.
// ------------------------------------------------------------------
export type EntityFieldKey =
  | 'legalName'
  | 'registrationNumber'
  | 'dateIncorporated'
  | 'kraPin'
  | 'addressLine1'
  | 'county'
  | 'postalAddress'
  | 'nominalCapital'

export const ENTITY_FIELDS: Array<{ key: EntityFieldKey; label: string; ocr: string; material: boolean }> = [
  { key: 'legalName', label: 'Registered name', ocr: 'business_name', material: true },
  { key: 'registrationNumber', label: 'Registration number', ocr: 'registration_number', material: true },
  { key: 'dateIncorporated', label: 'Date of incorporation', ocr: 'date_of_incorporation', material: true },
  { key: 'kraPin', label: 'Company KRA PIN', ocr: 'kra_pin', material: false },
  { key: 'addressLine1', label: 'Registered office', ocr: 'address_line1', material: true },
  { key: 'county', label: 'County', ocr: 'county', material: false },
  { key: 'postalAddress', label: 'Postal address', ocr: 'postal_address', material: false },
  { key: 'nominalCapital', label: 'Nominal share capital (KES)', ocr: 'nominal_share_capital', material: true },
]

// ------------------------------------------------------------------
// Document packs
// ------------------------------------------------------------------
const isPublic = (ctx: PackContext) => ctx.subtype === 'public'

// Limited Companies brief §3 + §10; ranks per §8 (Official Search is the
// current-state anchor; incorporation documents are historical).
export const LIMITED_COMPANY_PACK: DocSpec[] = [
  {
    documentType: 'certificate_of_incorporation',
    title: 'Certificate of Incorporation',
    hint: 'Primary evidence of the company’s identity — registered name, number and incorporation date.',
    priority: 'primary',
    treatment: 'identity_anchor',
    rank: 3,
    missing: { impact: 'high', behaviour: 'Company identity can’t be marked registry-verified. Upload the certificate or a certified registry record.' },
  },
  {
    documentType: 'cr12',
    title: 'Official Search / CR12 (company status report)',
    hint: 'The BRS status report — our anchor for the company’s current directors, shareholders and status.',
    priority: 'primary',
    treatment: 'current_state',
    rank: 2,
    missing: { impact: 'high', behaviour: 'Onboarding continues provisionally — current officers and status aren’t anchored to a current registry search.' },
  },
  {
    documentType: 'cr1',
    title: 'CR1 — Application to register the company',
    hint: 'Formation particulars as filed. Kept as history; later records take priority.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 5,
    missing: { impact: 'medium', behaviour: 'Doesn’t block onboarding. The historical formation record stays flagged as a gap.' },
  },
  {
    documentType: 'cr2',
    title: 'CR2 — Memorandum (subscribers)',
    hint: 'The founding subscribers. Original subscribers aren’t treated as current shareholders without current evidence.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 5,
    missing: { impact: 'medium', behaviour: 'Doesn’t block onboarding. Founding membership stays flagged as a historical gap.' },
  },
  {
    documentType: 'cr8',
    title: 'CR8 — Directors’ residential addresses',
    hint: 'Director addresses at the date of filing. Older addresses are kept as history.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 5,
    missing: { impact: 'medium', behaviour: 'Doesn’t block onboarding. Director address history stays flagged as a gap.' },
  },
  {
    documentType: 'statement_of_nominal_capital',
    title: 'Statement of Nominal Capital',
    hint: 'Original share classes, number of shares and nominal value.',
    priority: 'strong',
    treatment: 'formation',
    rank: 5,
    missing: { impact: 'high', behaviour: 'Share capital can’t be reconstructed from evidence — we won’t infer it. Upload capital or share records.' },
  },
  {
    documentType: 'bof1',
    title: 'BOF-1 — Beneficial ownership filing',
    hint: 'The natural persons who ultimately own or control the company, as at that filing.',
    priority: 'strong',
    treatment: 'beneficial_ownership',
    rank: 4,
    missing: { impact: 'high', behaviour: 'A beneficial-ownership completion task is opened. Shareholders are never assumed to be beneficial owners.' },
  },
  {
    documentType: 'company_kra_pin',
    title: 'Company KRA PIN certificate',
    hint: 'The company’s own tax PIN.',
    priority: 'recommended',
    treatment: 'identity_anchor',
    rank: 3,
    missing: { impact: 'medium', behaviour: 'The company PIN is marked outstanding — we never invent a PIN.' },
  },
  {
    documentType: 'change_filing',
    title: 'Later change filings (optional)',
    hint: 'Director, allotment, address or beneficial-ownership changes filed after incorporation.',
    priority: 'conditional',
    treatment: 'change',
    rank: 3,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed where the company has changed since its latest search.' },
  },
  {
    documentType: 'secretary_records',
    title: 'Company secretary appointment & particulars',
    hint: 'CR10–CR12 secretary forms — required for a public company.',
    priority: 'strong',
    treatment: 'governance',
    rank: 3,
    multiple: true,
    when: isPublic,
    missing: { impact: 'high', behaviour: 'A public company must have a secretary — a task is opened to provide the appointment records.' },
  },
  {
    documentType: 'annual_return',
    title: 'Latest annual return (CR29)',
    hint: 'Helps us establish your compliance baseline.',
    priority: 'recommended',
    treatment: 'compliance',
    rank: 3,
    missing: { impact: 'medium', behaviour: 'We’ll ask when the last annual return was filed instead.' },
  },
  {
    documentType: 'other',
    title: 'Other documents',
    hint: 'Articles, resolutions, permits or anything else you’d like on file.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 6,
    multiple: true,
    missing: { impact: 'conditional', behaviour: '' },
  },
]

export const EXISTING_DOC_PACKS: Partial<Record<EntityType, DocSpec[]>> = {
  limited_company: LIMITED_COMPANY_PACK,
}

// Maps an OCR document_kind onto the pack's document type when the user
// dropped a file into the wrong box (or the generic "other" box).
export const OCR_KIND_TO_DOC_TYPE: Record<string, string> = {
  certificate_of_incorporation: 'certificate_of_incorporation',
  cr12: 'cr12',
  cr1: 'cr1',
  cr2: 'cr2',
  cr8: 'cr8',
  bof1: 'bof1',
  statement_of_nominal_capital: 'statement_of_nominal_capital',
}

export function rankFor(entityType: EntityType | undefined) {
  const pack = EXISTING_DOC_PACKS[entityType ?? 'limited_company'] ?? LIMITED_COMPANY_PACK
  return (documentType: string) => pack.find((d) => d.documentType === documentType)?.rank ?? 6
}

// ------------------------------------------------------------------
// Compliance baseline (Limited Companies brief §13)
// ------------------------------------------------------------------
export const LIMITED_COMPANY_BASELINE: BaselineQuestion[] = [
  {
    key: 'changes_directors',
    question: 'Have any directors joined or left since your latest registry record?',
    taskOn: 'yes',
    task: { title: 'Confirm director changes are filed with BRS', description: 'You told us directors changed after the latest registry record. Upload the change filing or a fresh Official Search, or ask us to file it.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'changes_shares',
    question: 'Have shares been allotted or transferred, or the share capital changed?',
    taskOn: 'yes',
    task: { title: 'Confirm share allotments / transfers are filed', description: 'Share changes after the latest registry record need their filings (e.g. return of allotment) on record.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'changes_office',
    question: 'Has the registered office or company name changed?',
    taskOn: 'yes',
    task: { title: 'Confirm registered office / name change is filed', description: 'Address or name changes must be notified to the Registrar. Upload the filing or a fresh Official Search.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'changes_bo',
    question: 'Have your beneficial owners changed since the last BO filing?',
    taskOn: 'yes',
    task: { title: 'Update beneficial ownership filing', description: 'Beneficial-ownership changes must be lodged with the Registrar. We’ll help prepare the update.', category: 'bo_update', dueInDays: 14 },
  },
  {
    key: 'annual_returns_current',
    question: 'Are your annual returns filed up to date?',
    taskOn: 'no_or_unsure',
    task: { title: 'Bring annual returns up to date', description: 'Confirm the last annual return filed and file any that are outstanding.', category: 'annual_return', dueInDays: 30 },
  },
  {
    key: 'secretary_appointed',
    question: 'Does the company have a company secretary on record?',
    taskOn: 'no_or_unsure',
    when: (ctx) => ctx.subtype === 'public' || (ctx.nominalCapital ?? 0) >= SECRETARY_CAPITAL_THRESHOLD_KES,
    task: { title: 'Appoint / record a company secretary', description: 'Public companies, and private companies with capital of KES 5 million or more, must have a company secretary.', category: 'governance', dueInDays: 30 },
  },
  {
    key: 'employs_staff',
    question: 'Does the company employ staff?',
    taskOn: 'yes',
    task: { title: 'Set up employment compliance', description: 'PAYE, NSSF, SHIF and Housing Levy obligations apply once you employ staff.', category: 'employment', dueInDays: 30 },
  },
  {
    key: 'regulated_activity',
    question: 'Does the company carry on a regulated activity or need a sector licence?',
    taskOn: 'yes',
    task: { title: 'Record sector licences', description: 'Upload your sector licence(s) so we can track renewals.', category: 'license', dueInDays: 30 },
  },
]

export const EXISTING_BASELINES: Partial<Record<EntityType, BaselineQuestion[]>> = {
  limited_company: LIMITED_COMPANY_BASELINE,
}

// ------------------------------------------------------------------
// Wizard state (onboarding_progress.data.wizard)
// ------------------------------------------------------------------
export type ExistingWizardData = {
  entityType?: EntityType
  subtype?: 'private' | 'public'
  legalName?: string
  registrationNumber?: string
  kraPin?: string
  dateIncorporated?: string
  addressLine1?: string
  city?: string
  county?: string
  postalCode?: string
  postalAddress?: string
  nominalCapital?: string
  // Field-level provenance: every value each document proposed + what the
  // user confirmed. Never pruned (brief §4: preserve historical values).
  fieldEvidence?: Partial<Record<EntityFieldKey, FieldRecord>>
  // Founding subscribers from CR2 — formation history only, never current
  // shareholders without current evidence (brief §17 acceptance test).
  subscribers?: Array<{ name: string; idNumber?: string | null; shares?: number | null; documentId: string }>
  // Share classes as evidenced by the Statement of Nominal Capital / CR2
  shareClasses?: Array<{ className: string; numberOfShares: number | null; nominalValueEach: number | null; documentId: string }>
  // Document types the user said they don't have — still a gap, but a
  // declared one (drives the follow-up task wording).
  unavailableDocuments?: string[]
  // People the engine couldn't safely match (same name, no shared ID)
  possibleDuplicates?: Array<{ role: 'director' | 'shareholder'; existingId: string; name: string; documentId: string }>
  // Compliance baseline answers (step 6)
  baseline?: Record<string, BaselineAnswer>
  lastAnnualReturnDate?: string
  // lowest OCR confidence seen across extractions — below 60 the verify
  // step shows a "double-check these details" banner
  minConfidence?: number
  noBeneficialOwners?: boolean
  declared?: boolean
  signature?: string
  declarationDate?: string
}
