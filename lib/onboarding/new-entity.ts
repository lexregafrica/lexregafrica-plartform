import type { Database } from '@/types/database.types'

export type EntityType = Database['public']['Enums']['entity_type']

export type ShareClass = {
  id: string
  name: string
  type: 'ordinary' | 'preference' | 'non_voting' | 'redeemable' | 'other'
  shares: number
  nominalValue: number
  votingRights: string
  dividendRights: string
  redemptionRights: string
  liquidationPriority: string
}

export const SHARE_CLASS_TYPES: Array<{ value: ShareClass['type']; label: string }> = [
  { value: 'ordinary', label: 'Ordinary' },
  { value: 'preference', label: 'Preference' },
  { value: 'non_voting', label: 'Non-voting / restricted-voting' },
  { value: 'redeemable', label: 'Redeemable' },
  { value: 'other', label: 'Other' },
]

// Phase 1 is scoped to private limited companies only (Charles,
// LLC-Only Developer Implementation Spec). Other entity types stay in
// this list for future expansion but render as "coming later" —
// disabled, not selectable — until the LLC flow is validated in
// production and the rules engine is generalised.
export const PHASE1_ENTITY_TYPES: EntityType[] = ['limited_company']

// Company secretary threshold — Charles, LLC-Only Developer
// Implementation Spec: private companies above this nominal share
// capital must appoint a secretary, same as PLCs. Below it, secretarial
// service stays an optional upsell rather than a mandatory field.
export const SECRETARY_CAPITAL_THRESHOLD_KES = 5_000_000

export const ENTITY_TYPES: Array<{ value: EntityType; label: string; description: string }> = [
  { value: 'limited_company', label: 'Limited Company', description: 'Separate legal entity, limited liability, most common' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', description: 'Single owner, unlimited liability, simplest structure' },
  { value: 'partnership', label: 'Partnership', description: 'Two or more partners, shared liability' },
  { value: 'public_limited_company', label: 'Public Limited Company', description: 'Can offer shares to public, complex governance' },
  { value: 'company_limited_by_guarantee', label: 'NGO / Non-Profit', description: 'Charitable or social purpose, no profit distribution' },
  { value: 'trust', label: 'Trust', description: 'Property held for beneficiaries, fiduciary arrangement' },
  { value: 'cooperative', label: 'Cooperative', description: 'Member-owned, democratic control, profit-sharing' },
  { value: 'limited_liability_partnership', label: 'LLP', description: 'Limited Liability Partnership, hybrid structure' },
]

export const KENYA_COUNTIES = [
  'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita-Taveta', 'Garissa', 'Wajir', 'Mandera',
  'Marsabit', 'Isiolo', 'Meru', 'Tharaka-Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua',
  'Nyeri', "Kirinyaga", 'Murang\'a', 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia',
  'Uasin Gishu', 'Elgeyo-Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado',
  'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay',
  'Migori', 'Kisii', 'Nyamira', 'Nairobi',
] as const

export const INDUSTRIES = [
  'Agriculture', 'Retail', 'Manufacturing', 'Services', 'Technology', 'Construction',
  'Hospitality', 'Healthcare', 'Education', 'Transport', 'Other',
] as const

export const EMPLOYEE_SEGMENTS = ['Just me', '2-10', '11-50', '50+'] as const

export const TURNOVER_RANGES = ['<500K', '500K-2M', '2M-10M', '10M-50M', '50M+'] as const

export const PAYROLL_FREQUENCIES = ['Monthly', 'Bi-weekly', 'Weekly'] as const

export const APPLICANT_RELATIONSHIPS: Array<{ value: Database['public']['Enums']['applicant_relationship']; label: string }> = [
  { value: 'promoter', label: 'Promoter' },
  { value: 'director', label: 'Director' },
  { value: 'shareholder', label: 'Shareholder' },
  { value: 'advocate', label: 'Advocate' },
  { value: 'authorised_agent', label: 'Authorised Agent' },
]

// Kenya KRA PIN format: A + 9 digits + 1 letter
export const KRA_PIN_REGEX = /^[A-Z][0-9]{9}[A-Z]$/
export const NATIONAL_ID_REGEX = /^[0-9]{7,8}$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const KENYA_PHONE_REGEX = /^(?:\+254|0)([17][0-9]{8})$/

export const TOTAL_STEPS = 14

// Steps that require directors/partners/trustees — hidden for sole proprietorship
const DIRECTOR_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'partnership',
  'limited_liability_partnership', 'company_limited_by_guarantee', 'trust',
]

// Steps that require shareholders/members — company/cooperative/LLP only
export const SHAREHOLDER_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'cooperative', 'limited_liability_partnership',
]

// Share capital structuring — company/cooperative only (not LLP, which uses capital contributions differently)
const SHARE_CAPITAL_TYPES: EntityType[] = ['limited_company', 'public_limited_company', 'cooperative']

// Company secretary — Ltd (optional) and PLC (required)
const SECRETARY_TYPES: EntityType[] = ['limited_company', 'public_limited_company']

export type WizardData = {
  // Step 1 — legacy fields, no longer collected on the entity-type screen
  // (LLC-Only spec screen map has no industry/employee-count field there;
  // kept optional here so old saved progress doesn't break).
  industry?: string
  employeeSegment?: string
  // Step 2 — Applicant & primary contact (LLC spec screen 2). This is
  // user-account/matter-contact data, distinct from the entity profile.
  applicantFullName?: string
  applicantEmail?: string
  applicantPhone?: string
  // Step 3
  proposedNames?: string[]
  // Step 4 — Company basics
  // Granular street/building fields — Charles, 2026-07-24 call: so once
  // captured here, the client never has to be asked again for BRS/lease
  // filings that want street, building name, floor, and door number
  // individually, not just a single free-text line.
  streetName?: string
  buildingName?: string
  floorNumber?: string
  doorNumber?: string
  city?: string
  county?: string
  postalCode?: string
  country?: string
  // Entity contact details — Charles 2026-07-17: email, contact person,
  // postal address, physical address all required on the LLC questionnaire
  entityEmail?: string
  entityPhone?: string
  postalAddress?: string
  contactPersonName?: string
  contactPersonEmail?: string
  contactPersonPhone?: string
  primaryActivity?: string
  secondaryActivities?: string
  sectorCode?: string
  turnoverRange?: string
  hasEmployees?: boolean
  // Step 5 — Share structure. Kenyan company law requires shares to be
  // 100% issued (Charles, 2026 call) — there's no such thing as
  // "authorised but unissued" anymore, so authorised capital is no
  // longer typed directly. The company is registered with a fixed total
  // number of shares at a nominal value; capital = nominal × total. That
  // total becomes the pool shareholders (step 6) allocate from, and
  // registration can't complete until the pool is fully allocated.
  totalShares?: number
  nominalValuePerShare?: number
  // Derived (nominalValuePerShare × totalShares in single-class mode) —
  // kept as a stored field since it mirrors onto entities.nominal_capital
  // and is read elsewhere (secretary threshold, review, IDP).
  authorisedShareCapital?: number
  shareClasses?: 'ordinary' | 'ordinary_preference'
  votingRights?: 'one_share_one_vote' | 'weighted'
  // Multiple share classes — Charles 2026-07-17: "elaborate classes of
  // shares section". Hidden by default behind useMultipleShareClasses;
  // the simple ordinary-only fields above remain the default path.
  useMultipleShareClasses?: boolean
  shareClassList?: ShareClass[]
  // Step 8 — no declarable beneficial owner escape hatch (records
  // themselves live in the beneficial_owners table, not the wizard)
  noBeneficialOwners?: boolean
  // Step 9
  hasCompanySecretary?: boolean
  secretary?: { fullName: string; idNumber: string; kraPin: string; phone: string; email: string; address: string }
  // Step 10 — Constitutional documents (LLC spec screen 9)
  articlesType?: 'standard' | 'custom'
  // Step 12
  permanentEmployees?: number
  casualEmployees?: number
  hasDraftContracts?: boolean
  nssfNhifStatus?: 'yes' | 'no' | 'already_registered'
  payrollFrequency?: string
  // Step 13
  declared?: boolean
  consented?: boolean
  agreedTerms?: boolean
  signature?: string
  applicantRelationship?: Database['public']['Enums']['applicant_relationship']
  declarationDate?: string
}

// Step order follows the LLC-Only Developer Implementation Spec screen
// map (Charles, 2026-07-17), with one deliberate deviation confirmed by
// Charles on a follow-up call: Shareholders are captured before
// Directors (not after, as the doc's screen 6/7 order literally reads)
// so a shareholder-who-is-also-a-director isn't typed twice.
//  1 Entity Type · 2 Applicant & Contact · 3 Company Name Reservation ·
//  4 Company Basics · 5 Share Structure · 6 Shareholders · 7 Directors ·
//  8 Beneficial Ownership · 9 Company Secretary · 10 Constitutional
//  Documents · 11 Uploads & Review · 12 Employee Information ·
//  13 Declaration & Consent · 14 Review & Submit
export function isStepVisible(step: number, entityType: EntityType, data: WizardData): boolean {
  switch (step) {
    case 5: // Share Structure
      return SHARE_CAPITAL_TYPES.includes(entityType)
    case 6: // Shareholders/Members — captured before directors so a
      // shareholder-who-is-also-a-director isn't typed twice (Charles, 2026-07-17)
      return SHAREHOLDER_TYPES.includes(entityType)
    case 7: // Directors/Partners/Trustees
      return DIRECTOR_TYPES.includes(entityType)
    case 8: // Beneficial Ownership — same entities that need a shareholder
      // register need a beneficial-ownership record (LLC spec, screen 8)
      return SHAREHOLDER_TYPES.includes(entityType)
    case 9: // Company Secretary
      return SECRETARY_TYPES.includes(entityType)
    case 12: // Employee Info
      return data.hasEmployees === true
    default:
      return true
  }
}

export function nextVisibleStep(current: number, entityType: EntityType, data: WizardData): number {
  let step = current + 1
  while (step <= TOTAL_STEPS && !isStepVisible(step, entityType, data)) step += 1
  return Math.min(step, TOTAL_STEPS)
}

export function prevVisibleStep(current: number, entityType: EntityType, data: WizardData): number {
  let step = current - 1
  while (step >= 1 && !isStepVisible(step, entityType, data)) step -= 1
  return Math.max(step, 1)
}

export const STEP_LABELS: Record<number, string> = {
  1: 'Entity Type',
  2: 'Applicant & Contact',
  3: 'Company Name Reservation',
  4: 'Company Basics',
  5: 'Share Structure',
  6: 'Shareholders & Members',
  7: 'Directors & Partners',
  8: 'Beneficial Ownership',
  9: 'Company Secretary',
  10: 'Constitutional Documents',
  11: 'Documents & Review',
  12: 'Employee Information',
  13: 'Declaration & Consent',
  14: 'Review & Submit',
}
