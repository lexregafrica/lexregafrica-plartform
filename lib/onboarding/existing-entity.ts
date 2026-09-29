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

// Highest step id. Step ids are stable (a saved session resumes by id);
// each type's order comes from stepsFor(). Step 8 — a governing-instrument
// step — sits between 4 and 5 for types that need both it and the
// beneficial-ownership step (LLP).
export const EXISTING_TOTAL_STEPS = 8
export const EXISTING_REVIEW_STEP = 7

export const EXISTING_STEP_LABELS: Record<number, string> = {
  1: 'Tell Us About Your Entity',
  2: 'Upload Registry Documents',
  3: 'Confirm Entity Details',
  4: 'People & Roles',
  5: 'Beneficial Ownership',
  6: 'Changes Since Your Latest Record',
  7: 'Review & Activate',
  8: 'Agreement',
}

// Which of the seven steps a type uses. A sole proprietorship has no
// beneficial-ownership register — the proprietor owns and controls the
// business (Sole Proprietorship brief §13).
// A general partnership has no BO register step either; step 5 becomes
// its Partnership Agreement (General Partnership brief §4).
export function stepsFor(entityType: EntityType | undefined): number[] {
  if (entityType === 'sole_proprietorship') return [1, 2, 3, 4, 6, 7]
  if (entityType === 'limited_liability_partnership') return [1, 2, 3, 4, 8, 5, 6, 7]
  return [1, 2, 3, 4, 5, 6, 7]
}

export function stepLabel(entityType: EntityType | undefined, step: number): string {
  if (entityType === 'sole_proprietorship') {
    if (step === 3) return 'Confirm Business Details'
    if (step === 4) return 'Proprietor'
  }
  if (entityType === 'partnership') {
    if (step === 3) return 'Confirm Partnership Details'
    if (step === 4) return 'Partners'
    if (step === 5) return 'Partnership Agreement'
  }
  if (entityType === 'limited_liability_partnership') {
    if (step === 3) return 'Confirm LLP Details'
    if (step === 4) return 'Partners & Managers'
    if (step === 8) return 'LLP Agreement'
  }
  return EXISTING_STEP_LABELS[step]
}

// Noun used in headings and copy
export function entityNounFor(entityType: EntityType | undefined): string {
  return entityType === 'sole_proprietorship' ? 'business' : entityType === 'partnership' ? 'partnership' : entityType === 'limited_liability_partnership' ? 'LLP' : 'company'
}

// Entity types with a built existing-entity workflow. Others show "coming
// later" until their brief is implemented (one at a time, per the plan).
export const EXISTING_SUPPORTED_TYPES: EntityType[] = ['limited_company', 'sole_proprietorship', 'partnership', 'limited_liability_partnership']

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
  | 'natureOfBusiness'

export type EntityFieldSpec = { key: EntityFieldKey; label: string; ocr: string; material: boolean }

export const ENTITY_FIELDS: EntityFieldSpec[] = [
  { key: 'legalName', label: 'Registered name', ocr: 'business_name', material: true },
  { key: 'registrationNumber', label: 'Registration number', ocr: 'registration_number', material: true },
  { key: 'dateIncorporated', label: 'Date of incorporation', ocr: 'date_of_incorporation', material: true },
  { key: 'kraPin', label: 'Company KRA PIN', ocr: 'kra_pin', material: false },
  { key: 'addressLine1', label: 'Registered office', ocr: 'address_line1', material: true },
  { key: 'county', label: 'County', ocr: 'county', material: false },
  { key: 'postalAddress', label: 'Postal address', ocr: 'postal_address', material: false },
  { key: 'nominalCapital', label: 'Nominal share capital (KES)', ocr: 'nominal_share_capital', material: true },
]

// Business Name: no share capital, no company PIN — tax identity is the
// proprietor's own (Sole Proprietorship brief §5, §13).
export const SOLE_PROPRIETORSHIP_FIELDS: EntityFieldSpec[] = [
  { key: 'legalName', label: 'Registered business name', ocr: 'business_name', material: true },
  { key: 'registrationNumber', label: 'Registration number', ocr: 'registration_number', material: true },
  { key: 'dateIncorporated', label: 'Date of registration', ocr: 'date_of_incorporation', material: true },
  { key: 'addressLine1', label: 'Principal place of business', ocr: 'address_line1', material: true },
  { key: 'county', label: 'County', ocr: 'county', material: false },
  { key: 'postalAddress', label: 'Postal address', ocr: 'postal_address', material: false },
  { key: 'natureOfBusiness', label: 'Nature of business', ocr: 'nature_of_business', material: false },
]

export const PARTNERSHIP_FIELDS: EntityFieldSpec[] = [
  { key: 'legalName', label: 'Partnership name', ocr: 'business_name', material: true },
  { key: 'registrationNumber', label: 'Registration number', ocr: 'registration_number', material: true },
  { key: 'dateIncorporated', label: 'Date of registration', ocr: 'date_of_incorporation', material: true },
  { key: 'addressLine1', label: 'Principal place of business', ocr: 'address_line1', material: true },
  { key: 'county', label: 'County', ocr: 'county', material: false },
  { key: 'postalAddress', label: 'Postal address', ocr: 'postal_address', material: false },
  { key: 'natureOfBusiness', label: 'Nature of business', ocr: 'nature_of_business', material: false },
  { key: 'kraPin', label: 'Partnership KRA PIN', ocr: 'kra_pin', material: false },
]

export const LLP_FIELDS: EntityFieldSpec[] = [
  { key: 'legalName', label: 'LLP name', ocr: 'business_name', material: true },
  { key: 'registrationNumber', label: 'Registration number', ocr: 'registration_number', material: true },
  { key: 'dateIncorporated', label: 'Date of registration', ocr: 'date_of_incorporation', material: true },
  { key: 'addressLine1', label: 'Registered office', ocr: 'address_line1', material: true },
  { key: 'county', label: 'County', ocr: 'county', material: false },
  { key: 'postalAddress', label: 'Postal address', ocr: 'postal_address', material: false },
  { key: 'natureOfBusiness', label: 'Principal business activities', ocr: 'nature_of_business', material: false },
  { key: 'kraPin', label: 'LLP KRA PIN', ocr: 'kra_pin', material: false },
]

export function entityFieldsFor(entityType: EntityType | undefined): EntityFieldSpec[] {
  switch (entityType) {
    case 'sole_proprietorship': return SOLE_PROPRIETORSHIP_FIELDS
    case 'partnership': return PARTNERSHIP_FIELDS
    case 'limited_liability_partnership': return LLP_FIELDS
    default: return ENTITY_FIELDS
  }
}

// Partnership sub-type fork (General Partnership brief §1): LP and LLP
// have their own workflows.
export const PARTNERSHIP_SUBTYPES: Array<{ value: 'general' | 'limited' | 'llp'; label: string; description: string; available: boolean }> = [
  { value: 'general', label: 'General (ordinary) partnership', description: 'Two or more partners carrying on business together; partners can be personally liable.', available: true },
  { value: 'limited', label: 'Limited partnership (LP)', description: 'At least one general and one limited partner.', available: false },
  { value: 'llp', label: 'Limited liability partnership (LLP)', description: 'A separate body corporate — its own workflow.', available: false },
]

// ------------------------------------------------------------------
// Governing instrument → structured rules (General Partnership brief §4).
// The keys are what the extractor fills and the agreement step shows.
// ------------------------------------------------------------------
export type GovernanceRuleRecord = {
  summary: string
  clause?: string | null
  silent: boolean
  // 'document' = read from the uploaded agreement; 'user' = entered or
  // corrected by the user (evidence then rests on the agreement itself)
  source: 'document' | 'user'
  documentId?: string
}

export const PARTNERSHIP_AGREEMENT_FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'partners', label: 'Partners', hint: 'who the partners are, categories of partner and admission dates' },
  { key: 'capital', label: 'Capital', hint: 'initial and ongoing capital contributions, capital accounts, changes to contributions' },
  { key: 'profits_losses', label: 'Profits & losses', hint: 'profit/loss sharing percentages or formula, drawings, distribution rules' },
  { key: 'management', label: 'Management', hint: 'who may take part in management, any managing partner, delegated functions' },
  { key: 'decision_making', label: 'Decision-making', hint: 'voting thresholds, matters needing unanimity, meetings and quorum' },
  { key: 'authority', label: 'Authority', hint: 'signing, banking, borrowing and contracting powers and spending limits' },
  { key: 'duties', label: 'Duties & restrictions', hint: 'conflicts of interest, competing business, confidentiality and other duties' },
  { key: 'admission_retirement', label: 'Admission & retirement', hint: 'new partners, retirement, expulsion, death or incapacity, buy-out' },
  { key: 'disputes', label: 'Disputes', hint: 'negotiation, mediation, arbitration or court clauses' },
  { key: 'dissolution', label: 'Break-up / winding up', hint: 'trigger events, treatment of assets and liabilities, distribution' },
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

// Sole Proprietorship brief §2 + §9; ranks per §7 (Official Search /
// CR13 is the current anchor, BN4/BN5 changes next, certificate, BN2).
export const SOLE_PROPRIETORSHIP_PACK: DocSpec[] = [
  {
    documentType: 'certificate_of_registration',
    title: 'Certificate of Registration (Business Name)',
    hint: 'Your BRS business-name certificate — registered name, number and registration date.',
    priority: 'primary',
    treatment: 'identity_anchor',
    rank: 4,
    missing: { impact: 'high', behaviour: 'The business name can’t be marked registry-verified. Upload the certificate or other reliable registry evidence.' },
  },
  {
    documentType: 'official_search_bn',
    title: 'Official Search — Business Name (CR13)',
    hint: 'The current registry snapshot for the business name. Not the company CR12.',
    priority: 'strong',
    treatment: 'current_state',
    rank: 2,
    missing: { impact: 'high', behaviour: 'Onboarding continues provisionally — the current registry position isn’t anchored to a current search.' },
  },
  {
    documentType: 'bn2',
    title: 'BN2 — Registration application',
    hint: 'The original application: proprietor, place and nature of business as first registered. Kept as history.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 5,
    missing: { impact: 'low', behaviour: 'Doesn’t block onboarding — the original application is simply recorded as unavailable.' },
  },
  {
    documentType: 'bn_change',
    title: 'BN4 / BN5 — Change of particulars',
    hint: 'Any change of name, address, activity or proprietor particulars since registration.',
    priority: 'conditional',
    treatment: 'change',
    rank: 3,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed where the registered particulars have changed.' },
  },
  {
    documentType: 'single_business_permit',
    title: 'County Single Business Permit',
    hint: 'If you trade from premises — we’ll track the renewal date.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 6,
    missing: { impact: 'conditional', behaviour: 'Only needed where your location or activity requires one.' },
  },
  {
    documentType: 'sector_licence',
    title: 'Sector licences / approvals',
    hint: 'Any regulator licence your activity needs (e.g. pharmacy, transport, food).',
    priority: 'conditional',
    treatment: 'operational',
    rank: 6,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed for regulated activities.' },
  },
  {
    documentType: 'other',
    title: 'Other documents',
    hint: 'Leases, contracts, insurance or anything else you’d like on file.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 6,
    multiple: true,
    missing: { impact: 'conditional', behaviour: '' },
  },
]

// General Partnership brief §2 + §11; ranks per §9.
export const PARTNERSHIP_PACK: DocSpec[] = [
  {
    documentType: 'certificate_of_registration',
    title: 'Certificate of Registration',
    hint: 'The partnership’s registry certificate — name, number and registration date.',
    priority: 'primary',
    treatment: 'identity_anchor',
    rank: 5,
    missing: { impact: 'high', behaviour: 'The partnership’s identity can’t be marked registry-verified. Upload the certificate or other reliable registry evidence.' },
  },
  {
    documentType: 'official_search_bn',
    title: 'Current Official Search / registry extract',
    hint: 'The current registry snapshot — our anchor for who the partners are today.',
    priority: 'strong',
    treatment: 'current_state',
    rank: 2,
    missing: { impact: 'high', behaviour: 'Onboarding continues provisionally — the current partner list isn’t anchored to a current search.' },
  },
  {
    documentType: 'partnership_agreement',
    title: 'Partnership Agreement / Deed',
    hint: 'The partners’ own rules: capital, profit sharing, authority, admission/retirement, disputes and break-up.',
    priority: 'strong',
    treatment: 'governance',
    rank: 4,
    missing: { impact: 'high', behaviour: 'Your identity is onboarded, but governance and profit-sharing rules stay incomplete — a major gap. We can draft or review an agreement.' },
  },
  {
    documentType: 'bn2',
    title: 'Registration application (BN2)',
    hint: 'The original partners, business nature and addresses as first registered. Kept as history.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 6,
    missing: { impact: 'medium', behaviour: 'Doesn’t block onboarding — the formation record stays flagged as a gap.' },
  },
  {
    documentType: 'partner_change',
    title: 'Admission / retirement / change records',
    hint: 'Partner changes, address or name changes, agreement amendments.',
    priority: 'conditional',
    treatment: 'change',
    rank: 3,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed where partners or particulars have changed.' },
  },
  {
    documentType: 'partnership_kra_pin',
    title: 'Partnership KRA PIN certificate',
    hint: 'The partnership’s own tax PIN, if it has one.',
    priority: 'recommended',
    treatment: 'identity_anchor',
    rank: 5,
    missing: { impact: 'low', behaviour: 'Recorded as not provided — we never invent a PIN.' },
  },
  {
    documentType: 'single_business_permit',
    title: 'County Single Business Permit',
    hint: 'If you trade from premises — we’ll track the renewal date.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 7,
    missing: { impact: 'conditional', behaviour: 'Only needed where your location or activity requires one.' },
  },
  {
    documentType: 'sector_licence',
    title: 'Sector licences / approvals',
    hint: 'Any regulator licence your activity needs.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 7,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed for regulated activities.' },
  },
  {
    documentType: 'other',
    title: 'Other documents',
    hint: 'Mandates, resolutions, accounts or anything else you’d like on file.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 7,
    multiple: true,
    missing: { impact: 'conditional', behaviour: '' },
  },
]

// LLP Agreement → structured rules (LLP brief §4)
export const LLP_AGREEMENT_FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'partners', label: 'Partners', hint: 'categories and rights of partners, admission mechanics and cessation rules' },
  { key: 'contributions', label: 'Contributions', hint: 'capital or other contributions and contribution obligations' },
  { key: 'profits_losses', label: 'Profits & losses', hint: 'allocation or distribution formula and drawings' },
  { key: 'management', label: 'Management', hint: 'management rights, the manager role, committees and delegations' },
  { key: 'decision_making', label: 'Decision-making', hint: 'voting thresholds, reserved matters, meetings and quorum' },
  { key: 'authority', label: 'Authority', hint: 'contracting, banking, borrowing, signing and spending authority' },
  { key: 'duties', label: 'Duties & restrictions', hint: 'conflicts, confidentiality, competition and agreed duties' },
  { key: 'transfers', label: 'Transfers & changes', hint: 'transfer or assignment restrictions and partner-change mechanics' },
  { key: 'disputes', label: 'Disputes', hint: 'negotiation, mediation, arbitration or court provisions' },
  { key: 'exit_winding_up', label: 'Exit & winding up', hint: 'retirement, death or incapacity, expulsion, buy-out and winding-up rules' },
]

// LLP brief §2 + §11; ranks per §9 (current search, then annual return
// and LLP9 changes, agreement, BO filing, LLP1 formation).
export const LLP_PACK: DocSpec[] = [
  {
    documentType: 'certificate_of_registration',
    title: 'Certificate of Registration',
    hint: 'The LLP’s registration certificate — name, number and registration date.',
    priority: 'primary',
    treatment: 'identity_anchor',
    rank: 6,
    missing: { impact: 'high', behaviour: 'The LLP’s identity can’t be marked registry-verified. Upload the certificate or other reliable registry evidence.' },
  },
  {
    documentType: 'official_search_llp',
    title: 'Current Official Search / registry extract',
    hint: 'The current registry snapshot — our anchor for today’s partners and managers.',
    priority: 'strong',
    treatment: 'current_state',
    rank: 2,
    missing: { impact: 'high', behaviour: 'Onboarding continues provisionally — current partners and managers aren’t anchored to a current search.' },
  },
  {
    documentType: 'llp_agreement',
    title: 'LLP Agreement',
    hint: 'Contributions, profit sharing, management, authority, transfers, disputes and winding up.',
    priority: 'strong',
    treatment: 'governance',
    rank: 4,
    missing: { impact: 'high', behaviour: 'Your identity is onboarded, but governance and economic rules stay incomplete. We can draft or review an agreement.' },
  },
  {
    documentType: 'llp_bo',
    title: 'Beneficial ownership filing / register',
    hint: 'The LLP’s own beneficial-ownership filing under the LLP BO Regulations.',
    priority: 'strong',
    treatment: 'beneficial_ownership',
    rank: 5,
    missing: { impact: 'high', behaviour: 'A beneficial-ownership completion task is opened. Partners are never assumed to be beneficial owners.' },
  },
  {
    documentType: 'llp_annual_return',
    title: 'Latest annual return',
    hint: 'Includes the solvency/insolvency declaration and partner, manager and authorised-person particulars.',
    priority: 'recommended',
    treatment: 'compliance',
    rank: 3,
    missing: { impact: 'high', behaviour: 'Your annual-return status stays unverified — we’ll ask when it was last filed.' },
  },
  {
    documentType: 'llp1',
    title: 'LLP 1 — Registration application',
    hint: 'Formation particulars, first partners and managers as filed. Kept as history.',
    priority: 'recommended',
    treatment: 'formation',
    rank: 6,
    missing: { impact: 'low', behaviour: 'Doesn’t block onboarding — the formation record is noted as unavailable.' },
  },
  {
    documentType: 'llp9',
    title: 'LLP 9 — Statements of change',
    hint: 'Changes in partners, managers, registered office, name or business since registration.',
    priority: 'conditional',
    treatment: 'change',
    rank: 3,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Only needed where registered details have changed.' },
  },
  {
    documentType: 'llp10',
    title: 'LLP 10 — Solvency / insolvency declaration (historical)',
    hint: 'Older filings only — the annual return now carries this declaration.',
    priority: 'conditional',
    treatment: 'compliance',
    rank: 5,
    multiple: true,
    missing: { impact: 'conditional', behaviour: 'Historical only.' },
  },
  {
    documentType: 'llp_kra_pin',
    title: 'LLP KRA PIN certificate',
    hint: 'The LLP’s own tax PIN.',
    priority: 'recommended',
    treatment: 'identity_anchor',
    rank: 6,
    missing: { impact: 'low', behaviour: 'Recorded as not provided — we never invent a PIN.' },
  },
  {
    documentType: 'other',
    title: 'Other documents',
    hint: 'Resolutions, accounts, permits, licences or anything else you’d like on file.',
    priority: 'conditional',
    treatment: 'operational',
    rank: 7,
    multiple: true,
    missing: { impact: 'conditional', behaviour: '' },
  },
]

export const EXISTING_DOC_PACKS: Partial<Record<EntityType, DocSpec[]>> = {
  limited_liability_partnership: LLP_PACK,
  limited_company: LIMITED_COMPANY_PACK,
  sole_proprietorship: SOLE_PROPRIETORSHIP_PACK,
  partnership: PARTNERSHIP_PACK,
}

// Maps an OCR document_kind onto the pack's document type when the user
// dropped a file into the wrong box (or the generic "other" box).
const COMPANY_KIND_MAP: Record<string, string> = {
  certificate_of_incorporation: 'certificate_of_incorporation',
  cr12: 'cr12',
  cr1: 'cr1',
  cr2: 'cr2',
  cr8: 'cr8',
  bof1: 'bof1',
  statement_of_nominal_capital: 'statement_of_nominal_capital',
}
const BUSINESS_NAME_KIND_MAP: Record<string, string> = {
  business_registration: 'certificate_of_registration',
  cr13: 'official_search_bn',
  bn2: 'bn2',
}
export const OCR_KIND_TO_DOC_TYPE = COMPANY_KIND_MAP

const LLP_KIND_MAP: Record<string, string> = {
  certificate_of_incorporation: 'certificate_of_registration',
  business_registration: 'certificate_of_registration',
  llp1: 'llp1',
  llp9: 'llp9',
  cr12: 'official_search_llp',
  cr13: 'official_search_llp',
}

export function ocrKindToDocType(entityType: EntityType | undefined, kind: string): string | undefined {
  if (entityType === 'limited_liability_partnership') return LLP_KIND_MAP[kind]
  return (entityType === 'sole_proprietorship' || entityType === 'partnership' ? BUSINESS_NAME_KIND_MAP : COMPANY_KIND_MAP)[kind]
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

// Sole Proprietorship brief §12 — nothing inferred from legal form alone
// (a KRA PIN doesn't imply tax obligations; not every business needs a
// county permit or employs staff).
export const SOLE_PROPRIETORSHIP_BASELINE: BaselineQuestion[] = [
  {
    key: 'changes_particulars',
    question: 'Has the business name, place of business, nature of business or your own particulars changed since registration?',
    taskOn: 'yes',
    task: { title: 'File a change of particulars (BN4)', description: 'Changes to a registered business name’s particulars are notified to BRS on form BN4. Upload the BN4/BN5 if already filed, or ask us to prepare it.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'county_permit',
    question: 'Does the business trade from premises that need a county Single Business Permit?',
    taskOn: 'yes',
    task: { title: 'Upload your county Single Business Permit', description: 'So we can track its expiry and remind you before the annual renewal.', category: 'license', dueInDays: 30 },
  },
  {
    key: 'regulated_activity',
    question: 'Is the activity regulated — does it need a sector licence or approval?',
    taskOn: 'yes',
    task: { title: 'Record sector licences', description: 'Upload the licence(s) your activity needs so we can track renewals.', category: 'license', dueInDays: 30 },
  },
  {
    key: 'employs_staff',
    question: 'Do you employ staff in the business?',
    taskOn: 'yes',
    task: { title: 'Set up employment compliance', description: 'PAYE, NSSF, SHIF and Housing Levy obligations apply once you employ staff.', category: 'employment', dueInDays: 30 },
  },
  {
    key: 'tax_registered',
    question: 'Is the business registered for any tax obligations beyond your personal income tax (e.g. VAT or Turnover Tax)?',
    help: 'Having a KRA PIN alone doesn’t create these obligations.',
    taskOn: 'no_or_unsure',
    task: { title: 'Review your tax registrations', description: 'Confirm which tax obligations apply to the business (VAT above the threshold, Turnover Tax, etc.) — we don’t assume any from your PIN alone.', category: 'tax', dueInDays: 30 },
  },
  {
    key: 'ceased_or_converting',
    question: 'Have you stopped trading under this name, or are you planning to convert it into a company or LLP?',
    taskOn: 'yes',
    task: { title: 'Review cessation or conversion', description: 'A business that has ceased needs a cessation filing (BN6); a conversion needs its own workflow. We’ll review the right route with you.', category: 'legal_review', dueInDays: 14 },
  },
]

// General Partnership brief §14
export const PARTNERSHIP_BASELINE: BaselineQuestion[] = [
  {
    key: 'partners_match_registry',
    question: 'Do the partners listed in the previous step match the latest registry record?',
    taskOn: 'no_or_unsure',
    task: { title: 'Regularise the registered partner list', description: 'The current partners should match the registry. Upload a fresh Official Search, or file the change so the register reflects today’s partners.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'partner_changes',
    question: 'Has any partner joined, retired, died or otherwise left since the latest registry record?',
    taskOn: 'yes',
    task: { title: 'Record and file the partner change', description: 'Partner admissions and departures should be documented under the agreement and notified to the registry. Upload the records or ask us to prepare them.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'agreement_amended',
    question: 'Has the Partnership Agreement been amended since it was signed?',
    taskOn: 'yes',
    task: { title: 'Upload the agreement amendments', description: 'Amendments supersede the affected rules — upload them so your governance record is complete.', category: 'governance', dueInDays: 30 },
  },
  {
    key: 'particulars_changed',
    question: 'Has the partnership’s name, address or nature of business changed?',
    taskOn: 'yes',
    task: { title: 'File the change of particulars', description: 'Changes to registered particulars are notified to the registry. Upload the filing or ask us to prepare it.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'economics_changed',
    question: 'Have capital contributions, profit/loss sharing or signing authority changed?',
    taskOn: 'yes',
    task: { title: 'Document the change in partner economics or authority', description: 'Record the change in a signed variation or partner resolution so the agreement and practice match.', category: 'governance', dueInDays: 30 },
  },
  {
    key: 'employs_staff',
    question: 'Does the partnership employ staff?',
    taskOn: 'yes',
    task: { title: 'Set up employment compliance', description: 'PAYE, NSSF, SHIF and Housing Levy obligations apply once you employ staff.', category: 'employment', dueInDays: 30 },
  },
  {
    key: 'county_permit',
    question: 'Does the partnership trade from premises that need a county Single Business Permit?',
    taskOn: 'yes',
    task: { title: 'Upload your county Single Business Permit', description: 'So we can track its expiry and remind you before renewal.', category: 'license', dueInDays: 30 },
  },
  {
    key: 'regulated_activity',
    question: 'Is the activity regulated — does it need a sector licence?',
    taskOn: 'yes',
    task: { title: 'Record sector licences', description: 'Upload your sector licence(s) so we can track renewals.', category: 'license', dueInDays: 30 },
  },
  {
    key: 'tax_registered',
    question: 'Is the partnership registered for tax obligations such as VAT, or filing a partnership return?',
    help: 'Having a KRA PIN alone doesn’t create these obligations.',
    taskOn: 'no_or_unsure',
    task: { title: 'Review your tax registrations', description: 'Confirm which obligations apply — we don’t assume any from a PIN alone.', category: 'tax', dueInDays: 30 },
  },
]

// LLP brief §12
export const LLP_BASELINE: BaselineQuestion[] = [
  {
    key: 'participant_changes',
    question: 'Has any partner or manager joined or left since the latest registry record?',
    taskOn: 'yes',
    task: { title: 'File the change with LLP 9', description: 'A statement of change must be lodged within 14 days of a change in partners or managers (s. 33). Upload the LLP 9 if filed, or ask us to prepare it.', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'details_changed',
    question: 'Have the registered office, name or principal business activities changed?',
    taskOn: 'yes',
    task: { title: 'File the change of registered details (LLP 9)', description: 'Changes to registered details must be lodged within 14 days (s. 33).', category: 'regularisation', dueInDays: 14 },
  },
  {
    key: 'annual_return_current',
    question: 'Has the latest annual return (with its solvency declaration) been filed?',
    taskOn: 'no_or_unsure',
    task: { title: 'Bring the annual return up to date', description: 'The annual return is due within 30 days of each registration anniversary and includes the solvency/insolvency declaration.', category: 'annual_return', dueInDays: 30 },
  },
  {
    key: 'agreement_amended',
    question: 'Has the LLP Agreement been amended since it was signed?',
    taskOn: 'yes',
    task: { title: 'Upload the LLP Agreement amendments', description: 'Amendments supersede the affected rules — upload them so your governance record is complete.', category: 'governance', dueInDays: 30 },
  },
  {
    key: 'bo_changed',
    question: 'Have the LLP’s beneficial owners changed since its last BO filing?',
    taskOn: 'yes',
    task: { title: 'Update the LLP beneficial-ownership filing', description: 'BO changes must be lodged with the Registrar under the LLP BO Regulations.', category: 'bo_update', dueInDays: 14 },
  },
  {
    key: 'employs_staff',
    question: 'Does the LLP employ staff?',
    taskOn: 'yes',
    task: { title: 'Set up employment compliance', description: 'PAYE, NSSF, SHIF and Housing Levy obligations apply once you employ staff.', category: 'employment', dueInDays: 30 },
  },
  {
    key: 'regulated_activity',
    question: 'Does the LLP carry on a regulated activity or need county/sector licences?',
    taskOn: 'yes',
    task: { title: 'Record licences and permits', description: 'Upload your licences so we can track renewals.', category: 'license', dueInDays: 30 },
  },
]

export const EXISTING_BASELINES: Partial<Record<EntityType, BaselineQuestion[]>> = {
  limited_liability_partnership: LLP_BASELINE,
  limited_company: LIMITED_COMPANY_BASELINE,
  sole_proprietorship: SOLE_PROPRIETORSHIP_BASELINE,
  partnership: PARTNERSHIP_BASELINE,
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
  natureOfBusiness?: string
  partnershipKind?: 'general' | 'limited' | 'llp'
  // Structured rules from the governing instrument, keyed by the type's
  // agreement-field keys. Silence is recorded, never filled in.
  governance?: Record<string, GovernanceRuleRecord>
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
