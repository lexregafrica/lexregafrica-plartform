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
// Charles, General Partnership Formation Workflow spec, 2026-08: second
// reference implementation of the formation engine — proves the "one
// engine, entity type determines the questions" architecture, not a
// parallel system. LLP and LP stay disabled until their own workflows
// are built on top of the same Partner object this introduces.
// Sole Proprietorship Workflow spec, 2026-08: third reference
// implementation — simplest of the three, single Proprietor, no
// governance objects at all.
export const PHASE1_ENTITY_TYPES: EntityType[] = ['limited_company', 'partnership', 'sole_proprietorship']

// The spec's "first user decision" (section 3): selecting Partnership
// doesn't launch the questionnaire directly — it first asks which kind.
// Only General Partnership is wired to a real workflow; LLP/LP are
// listed so the distinction is explained, but stay disabled.
export const PARTNERSHIP_KINDS: Array<{ value: 'general_partnership' | 'llp' | 'lp'; label: string; description: string; enabled: boolean }> = [
  {
    value: 'general_partnership',
    label: 'General Partnership',
    description: 'A business carried on jointly by two or more partners, who generally assume personal responsibility for its obligations.',
    enabled: true,
  },
  {
    value: 'llp',
    label: 'Limited Liability Partnership (LLP)',
    description: 'A registered body corporate with a legal identity separate from its partners and limited liability characteristics.',
    enabled: false,
  },
  {
    value: 'lp',
    label: 'Limited Partnership (LP)',
    description: 'A partnership with at least one general partner and one limited partner, with different liability arrangements.',
    enabled: false,
  },
]

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

// Postal Corporation of Kenya postcodes, keyed to county so the picker can
// filter as soon as a county is chosen (Charles call, 2026-08). Nairobi
// gets full coverage since that's where most of our clients sit; every
// other county currently has its main post office code only — flagged to
// Charles as a seed list to expand, not a claim of national completeness.
export const KENYA_POSTAL_CODES: Array<{ code: string; area: string; county: string }> = [
  // Nairobi
  { code: '00100', area: 'Nairobi GPO', county: 'Nairobi' },
  { code: '00200', area: 'City Square', county: 'Nairobi' },
  { code: '00300', area: 'Nairobi', county: 'Nairobi' },
  { code: '00400', area: 'Nairobi', county: 'Nairobi' },
  { code: '00500', area: 'Nairobi', county: 'Nairobi' },
  { code: '00506', area: 'Nairobi South', county: 'Nairobi' },
  { code: '00517', area: 'Industrial Area', county: 'Nairobi' },
  { code: '00521', area: 'Nairobi', county: 'Nairobi' },
  { code: '00606', area: 'Sarit Centre', county: 'Nairobi' },
  { code: '00610', area: 'Kabete', county: 'Nairobi' },
  { code: '00618', area: 'Ruaraka', county: 'Nairobi' },
  { code: '00619', area: 'Karen', county: 'Nairobi' },
  { code: '00621', area: 'Village Market', county: 'Nairobi' },
  { code: '00623', area: 'Parklands', county: 'Nairobi' },
  { code: '00625', area: 'Uhuru Gardens', county: 'Nairobi' },
  { code: '00630', area: 'Westlands', county: 'Nairobi' },
  { code: '00700', area: 'Kilimani', county: 'Nairobi' },
  { code: '00800', area: 'Kangemi', county: 'Nairobi' },
  { code: '00900', area: 'Kikuyu', county: 'Nairobi' },
  { code: '01000', area: 'Ruiru', county: 'Nairobi' },
  { code: '01100', area: 'Kajiado', county: 'Kajiado' },
  // One head-office code per remaining county — expand as needed.
  { code: '80100', area: 'Mombasa', county: 'Mombasa' },
  { code: '80400', area: 'Kwale', county: 'Kwale' },
  { code: '80108', area: 'Kilifi', county: 'Kilifi' },
  { code: '70101', area: 'Hola', county: 'Tana River' },
  { code: '80500', area: 'Lamu', county: 'Lamu' },
  { code: '80300', area: 'Voi', county: 'Taita-Taveta' },
  { code: '70100', area: 'Garissa', county: 'Garissa' },
  { code: '70200', area: 'Wajir', county: 'Wajir' },
  { code: '70300', area: 'Mandera', county: 'Mandera' },
  { code: '60500', area: 'Marsabit', county: 'Marsabit' },
  { code: '60300', area: 'Isiolo', county: 'Isiolo' },
  { code: '60200', area: 'Meru', county: 'Meru' },
  { code: '60400', area: 'Chuka', county: 'Tharaka-Nithi' },
  { code: '60100', area: 'Embu', county: 'Embu' },
  { code: '90200', area: 'Kitui', county: 'Kitui' },
  { code: '90100', area: 'Machakos', county: 'Machakos' },
  { code: '90300', area: 'Makueni', county: 'Makueni' },
  { code: '20300', area: 'Ol Kalou', county: 'Nyandarua' },
  { code: '10100', area: 'Nyeri', county: 'Nyeri' },
  { code: '10300', area: 'Kerugoya', county: "Kirinyaga" },
  { code: '10200', area: 'Murang\'a', county: 'Murang\'a' },
  { code: '00900', area: 'Kiambu', county: 'Kiambu' },
  { code: '30500', area: 'Lodwar', county: 'Turkana' },
  { code: '30600', area: 'Kapenguria', county: 'West Pokot' },
  { code: '20600', area: 'Maralal', county: 'Samburu' },
  { code: '30200', area: 'Kitale', county: 'Trans Nzoia' },
  { code: '30100', area: 'Eldoret', county: 'Uasin Gishu' },
  { code: '30700', area: 'Iten', county: 'Elgeyo-Marakwet' },
  { code: '30300', area: 'Kapsabet', county: 'Nandi' },
  { code: '30400', area: 'Kabarnet', county: 'Baringo' },
  { code: '20300', area: 'Nanyuki', county: 'Laikipia' },
  { code: '20100', area: 'Nakuru', county: 'Nakuru' },
  { code: '20500', area: 'Narok', county: 'Narok' },
  { code: '01100', area: 'Kajiado', county: 'Kajiado' },
  { code: '20200', area: 'Kericho', county: 'Kericho' },
  { code: '20400', area: 'Bomet', county: 'Bomet' },
  { code: '50100', area: 'Kakamega', county: 'Kakamega' },
  { code: '50300', area: 'Vihiga', county: 'Vihiga' },
  { code: '50200', area: 'Bungoma', county: 'Bungoma' },
  { code: '50400', area: 'Busia', county: 'Busia' },
  { code: '40600', area: 'Siaya', county: 'Siaya' },
  { code: '40100', area: 'Kisumu', county: 'Kisumu' },
  { code: '40300', area: 'Homa Bay', county: 'Homa Bay' },
  { code: '40400', area: 'Migori', county: 'Migori' },
  { code: '40200', area: 'Kisii', county: 'Kisii' },
  { code: '40500', area: 'Nyamira', county: 'Nyamira' },
]

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

// Steps that require directors/partners/trustees/proprietor. Sole
// Proprietorship Workflow spec, 2026-08: the proprietor is captured the
// same way as a director (identity, OCR, address) even though there's no
// directors register — reuses this step rather than a parallel one, capped
// to exactly one person by the step component itself.
const DIRECTOR_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'partnership', 'sole_proprietorship',
  'limited_liability_partnership', 'company_limited_by_guarantee', 'trust',
]

// Steps that require shareholders/members — company/cooperative/LLP only
export const SHAREHOLDER_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'cooperative', 'limited_liability_partnership',
]

// Share capital structuring — company/cooperative only (not LLP, which uses capital contributions differently)
const SHARE_CAPITAL_TYPES: EntityType[] = ['limited_company', 'public_limited_company', 'cooperative']

// Single source of truth for "what documents does this entity still need"
// — used by both the Document Vault step (live, during onboarding) and
// the post-registration dashboard alert (Charles call, 2026-08: the
// missing-docs nudge was confusing mid-onboarding since some of these
// can't exist yet; moved to fire once the certificate is on file,
// staying in the Document Vault too). Deliberately excludes anything
// conditional/optional (proof of address, corporate-party docs, BO docs,
// foreign constitutional docs, "other") — those can't be flagged as
// "missing" without knowing whether they even apply.
export const REQUIRED_DOCUMENT_CHECKLIST: Array<{ type: string; label: string; appliesTo: (t: EntityType) => boolean }> = [
  { type: 'director_id_copy', label: 'Director/partner documents', appliesTo: () => true },
  { type: 'shareholder_id_copy', label: 'Shareholder/member documents', appliesTo: (t) => SHAREHOLDER_TYPES.includes(t) },
  { type: 'signed_cr1', label: 'Signed CR1', appliesTo: (t) => t !== 'partnership' && t !== 'sole_proprietorship' },
  { type: 'signed_cr2', label: 'Signed CR2', appliesTo: (t) => t === 'limited_company' || t === 'public_limited_company' },
  { type: 'signed_cr8', label: 'Signed CR8', appliesTo: (t) => t !== 'partnership' && t !== 'sole_proprietorship' },
  { type: 'statement_of_nominal_capital', label: 'Statement of nominal capital', appliesTo: (t) => t === 'limited_company' || t === 'public_limited_company' },
  { type: 'signed_bof1', label: 'Signed BOF1', appliesTo: (t) => SHAREHOLDER_TYPES.includes(t) },
  // Business Name Registration filing (BN2) — both General Partnership
  // and Sole Proprietorship register under a business name rather than
  // incorporating a company (Charles specs, 2026-08, both section 19/21).
  { type: 'signed_bn2', label: 'Signed BN2', appliesTo: (t) => t === 'partnership' || t === 'sole_proprietorship' },
]

export function missingRequiredDocuments(entityType: EntityType, presentTypes: Set<string>): string[] {
  return REQUIRED_DOCUMENT_CHECKLIST
    .filter((r) => r.appliesTo(entityType) && !presentTypes.has(r.type))
    .map((r) => r.label)
}

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
  commencementDate?: string
  // Step 1 — which kind of partnership (spec section 3's "first user
  // decision"); only 'general_partnership' has a working flow so far.
  partnershipKind?: 'general_partnership' | 'llp' | 'lp'
  // Step 5 (repurposed for partnership — Share Structure is hidden for
  // this entity type, so the slot is reused rather than adding a new
  // step number) — Partnership Suitability, GP-001–004. Advisory only:
  // per spec, the user may continue after acknowledging a mismatch.
  gpOwnerCount?: number
  gpWantsSeparateLegalPersonality?: boolean
  gpWantsLimitedLiability?: boolean
  gpSameLiabilityBasis?: boolean
  gpSuitabilityAcknowledged?: boolean
  // Step 6 (repurposed for partnership — Shareholders is hidden) —
  // partnership-level governance, GP-062–067. Per-partner interest %
  // and contribution (GP-060/061) live on the partner record itself,
  // not here.
  profitLossSharing?: 'proportional' | 'equal' | 'custom'
  profitLossSharingCustom?: string
  bankAccountOperators?: string
  bindingAuthority?: string
  authorityLimits?: string
  unanimousDecisions?: string
  majorityDecisions?: string
  // Step 10 (repurposed for partnership — Constitutional Documents
  // doesn't apply) — Partnership Agreement, spec section 16.
  hasPartnershipAgreement?: boolean
  // Step 5 (repurposed for sole proprietorship — Share Structure is
  // hidden for this entity type) — Suitability Check, Sole
  // Proprietorship Workflow spec, 2026-08, SP-001–004. Advisory only,
  // same pattern as the partnership suitability check.
  spOwnerCount?: 'one' | 'two_or_more'
  spWantsSeparateLegalPersonality?: boolean
  spWantsLimitedLiability?: boolean
  spComfortableInPersonalCapacity?: boolean
  spSuitabilityAcknowledged?: boolean
  // Step 4 (Company/Business Basics) — sole proprietorship business
  // profile flags, spec sections 14–18. Captured now so the review
  // screen can show them; the compliance modules they eventually
  // activate are a follow-up phase, not built this pass.
  hasAdditionalLocations?: boolean
  isRegulatedActivity?: boolean
  processesPersonalData?: boolean
  isOnlineBusiness?: boolean
  businessWebsite?: string
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
    case 5: // Share Structure — repurposed as Partnership Suitability for
      // partnership and Suitability Check for sole proprietorship, since
      // all three are mutually exclusive by entity type (Charles specs, 2026-08)
      return SHARE_CAPITAL_TYPES.includes(entityType) || entityType === 'partnership' || entityType === 'sole_proprietorship'
    case 6: // Shareholders/Members — captured before directors so a
      // shareholder-who-is-also-a-director isn't typed twice (Charles, 2026-07-17)
      // Repurposed as Partnership Governance for partnership. Sole
      // proprietorship has no partners/governance — stays hidden.
      return SHAREHOLDER_TYPES.includes(entityType) || entityType === 'partnership'
    case 7: // Directors/Partners/Trustees/Proprietor
      return DIRECTOR_TYPES.includes(entityType)
    case 8: // Beneficial Ownership — same entities that need a shareholder
      // register need a beneficial-ownership record (LLC spec, screen 8)
      return SHAREHOLDER_TYPES.includes(entityType)
    case 9: // Company Secretary
      return SECRETARY_TYPES.includes(entityType)
    case 10: // Constitutional Documents — repurposed as Partnership
      // Agreement for partnership; sole proprietorship has no
      // constitution/agreement concept at all (spec section 26) so this
      // step is skipped entirely rather than repurposed.
      return entityType !== 'sole_proprietorship'
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

const STEP_LABELS: Record<number, string> = {
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
  11: 'Document Vault',
  12: 'Employee Information',
  13: 'Declaration & Consent',
  14: 'Review & Submit',
}

const PARTNERSHIP_STEP_LABELS: Partial<Record<number, string>> = {
  3: 'Business Name Reservation',
  4: 'Business Basics',
  5: 'Partnership Suitability',
  6: 'Partnership Governance',
  7: 'Partners',
  10: 'Partnership Agreement',
}

const SOLE_PROPRIETORSHIP_STEP_LABELS: Partial<Record<number, string>> = {
  3: 'Business Name Reservation',
  4: 'Business Basics',
  5: 'Suitability Check',
  7: 'Proprietor',
}

export function stepLabel(step: number, entityType: EntityType): string {
  if (entityType === 'partnership' && PARTNERSHIP_STEP_LABELS[step]) return PARTNERSHIP_STEP_LABELS[step]!
  if (entityType === 'sole_proprietorship' && SOLE_PROPRIETORSHIP_STEP_LABELS[step]) return SOLE_PROPRIETORSHIP_STEP_LABELS[step]!
  return STEP_LABELS[step]
}
