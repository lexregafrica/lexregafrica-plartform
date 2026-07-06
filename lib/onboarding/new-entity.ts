import type { Database } from '@/types/database.types'

export type EntityType = Database['public']['Enums']['entity_type']

export const ENTITY_TYPES: Array<{ value: EntityType; label: string; description: string }> = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', description: 'Single owner, unlimited liability, simplest structure' },
  { value: 'partnership', label: 'Partnership', description: 'Two or more partners, shared liability' },
  { value: 'limited_company', label: 'Limited Company', description: 'Separate legal entity, limited liability, most common' },
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

export const TOTAL_STEPS = 12

// Steps that require directors/partners/trustees — hidden for sole proprietorship
const DIRECTOR_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'partnership',
  'limited_liability_partnership', 'company_limited_by_guarantee', 'trust',
]

// Steps that require shareholders/members — company/cooperative/LLP only
const SHAREHOLDER_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'cooperative', 'limited_liability_partnership',
]

// Share capital structuring — company/cooperative only (not LLP, which uses capital contributions differently)
const SHARE_CAPITAL_TYPES: EntityType[] = ['limited_company', 'public_limited_company', 'cooperative']

// Company secretary — Ltd (optional) and PLC (required)
const SECRETARY_TYPES: EntityType[] = ['limited_company', 'public_limited_company']

export type WizardData = {
  // Step 1
  industry?: string
  employeeSegment?: string
  // Step 2
  proposedNames?: string[]
  // Step 3
  addressLine1?: string
  addressLine2?: string
  city?: string
  county?: string
  postalCode?: string
  country?: string
  // Step 4
  primaryActivity?: string
  secondaryActivities?: string
  sectorCode?: string
  turnoverRange?: string
  hasEmployees?: boolean
  // Step 7
  nominalValuePerShare?: number
  authorisedShareCapital?: number
  shareClasses?: 'ordinary' | 'ordinary_preference'
  votingRights?: 'one_share_one_vote' | 'weighted'
  // Step 8
  hasCompanySecretary?: boolean
  secretary?: { fullName: string; idNumber: string; kraPin: string; phone: string; email: string; address: string }
  // Step 9
  permanentEmployees?: number
  casualEmployees?: number
  hasDraftContracts?: boolean
  nssfNhifStatus?: 'yes' | 'no' | 'already_registered'
  payrollFrequency?: string
  // Step 11
  declared?: boolean
  consented?: boolean
  agreedTerms?: boolean
  signature?: string
  applicantRelationship?: Database['public']['Enums']['applicant_relationship']
  declarationDate?: string
}

export function isStepVisible(step: number, entityType: EntityType, data: WizardData): boolean {
  switch (step) {
    case 5: // Directors/Partners/Trustees
      return DIRECTOR_TYPES.includes(entityType)
    case 6: // Shareholders/Members
      return SHAREHOLDER_TYPES.includes(entityType)
    case 7: // Share Capital
      return SHARE_CAPITAL_TYPES.includes(entityType)
    case 8: // Company Secretary
      return SECRETARY_TYPES.includes(entityType)
    case 9: // Employee Info
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
  2: 'Business Names',
  3: 'Registered Office',
  4: 'Business Activities',
  5: 'Directors & Partners',
  6: 'Shareholders & Members',
  7: 'Share Capital',
  8: 'Company Secretary',
  9: 'Employee Information',
  10: 'Document Upload',
  11: 'Declaration & Consent',
  12: 'Review & Submit',
}
