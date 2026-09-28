import type { Database } from '@/types/database.types'

export type EntityType = Database['public']['Enums']['entity_type']

// Canonical address shape — every address captured anywhere in the app
// (registered office, and every person: director, shareholder,
// beneficial owner, settlor, society member, company secretary) uses
// this same shape, field order, and the shared AddressFields component
// (components/onboarding/address-fields.tsx) that renders it. Defined
// here rather than in that component file so WizardData below can
// reference it without a circular import (address-fields.tsx already
// imports KENYA_COUNTIES/KENYA_POSTAL_CODES from this file).
export type AddressData = {
  buildingName?: string
  streetName?: string
  floorNumber?: string
  doorNumber?: string
  city?: string
  county?: string
  postalCode?: string
  postalAddress?: string
  country?: string
}

// Reads an AddressData out of a saved jsonb blob that might still be in
// the old scattered shape (a bare free-text line plus county/postalCode/
// postalAddress siblings, no building/street/floor/door split) rather
// than the new nested `address` object — so switching to the shared
// component doesn't blank out or lose anyone's already-saved address.
// The old free-text line (physicalAddress / residentialAddress /
// businessAddress, whichever that record used) lands in streetName —
// not a perfect split, but nothing is discarded, and it's editable.
// Lives here (not in components/onboarding/address-fields.tsx) — that
// file is 'use client', and app/api/onboarding/new-entity/route.ts (a
// server route) needs to call this too.
export function readLegacyAddress(raw: Record<string, unknown> | null | undefined, legacyFreeText?: string | null): AddressData {
  const nested = raw?.structuredAddress
  if (nested && typeof nested === 'object') return nested as AddressData
  if (!raw && !legacyFreeText) return {}
  return {
    streetName: legacyFreeText || undefined,
    city: typeof raw?.city === 'string' ? raw.city : undefined,
    county: typeof raw?.county === 'string' ? raw.county : undefined,
    postalCode: typeof raw?.postalCode === 'string' ? raw.postalCode : undefined,
    postalAddress: typeof raw?.postalAddress === 'string' ? raw.postalAddress : (typeof raw?.postalAddressLine === 'string' ? raw.postalAddressLine : undefined),
  }
}

// Single-line read-only rendering — review screens, IDP, dashboard cards.
// Same field order as the AddressFields form, minus empty fields.
export function formatAddress(a: AddressData | null | undefined): string {
  if (!a) return '—'
  const line1 = [a.buildingName, a.streetName].filter(Boolean).join(', ')
  const line2 = [a.floorNumber ? `Floor ${a.floorNumber}` : null, a.doorNumber ? `Door ${a.doorNumber}` : null].filter(Boolean).join(', ')
  const parts = [
    line1 || null,
    line2 || null,
    a.city ?? null,
    a.county ?? null,
    a.postalAddress ?? null,
    a.postalCode ?? null,
    a.country && a.country.toLowerCase() !== 'kenya' ? a.country : null,
  ].filter((p): p is string => !!p)
  return parts.length > 0 ? parts.join(', ') : '—'
}

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
// Trust Formation Workflow spec, 2026-08: fourth reference implementation
// — proves the engine can carry a legal model with no directors/
// shareholders at all (settlor/trustee/beneficiary instead).
// Society — New Entity Formation Workflow spec, 2026-08: fifth reference
// implementation — membership-based governance (members/officers/
// constitution) instead of ownership-based.
export const PHASE1_ENTITY_TYPES: EntityType[] = ['limited_company', 'partnership', 'sole_proprietorship', 'trust', 'society']

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

// Trust spec section 3, "first user decision" — same pattern as
// PARTNERSHIP_KINDS: selecting Trust asks which kind before launching the
// questionnaire. "Other/Not sure" stays disabled and routes to assisted
// legal onboarding rather than a self-serve flow, per the spec.
export const TRUST_FORMATION_ROUTES: Array<{ value: 'registration' | 'incorporation'; label: string; description: string }> = [
  {
    value: 'registration',
    label: 'Registered Trust',
    description:
      'The trust is registered with the Registrar but does not become a separate legal person — property and contracts stay in the trustees’ names.',
  },
  {
    value: 'incorporation',
    label: 'Incorporated Trust',
    description:
      'The trust becomes a body corporate that continues regardless of changes in trustees — it can own property, sign contracts and go to court in its own name. Requires name reservation.',
  },
]

export type CharitableObjectCategory =
  | 'relief_of_poverty'
  | 'advancement_of_education'
  | 'advancement_of_religion'
  | 'human_rights'
  | 'environment'
  | 'other_public_benefit'

export type CharitableObject = {
  category: CharitableObjectCategory
  description: string // what the trust will do and who will benefit
  publicBenefit?: string // "other" only: how it benefits the public or a section of it
  legalReviewStatus: 'pending' | 'approved'
}

export const CHARITABLE_OBJECT_CATEGORIES: Array<{ value: CharitableObjectCategory; label: string; example: string }> = [
  { value: 'relief_of_poverty', label: 'Relief of poverty', example: 'e.g. Provide monthly food parcels to elderly people living alone in Kibera.' },
  { value: 'advancement_of_education', label: 'Advancement of education', example: 'e.g. Provide secondary-school scholarships to students from low-income households in Kisumu County.' },
  { value: 'advancement_of_religion', label: 'Advancement of religion', example: 'e.g. Build and maintain a place of worship open to the public in Machakos town.' },
  { value: 'human_rights', label: 'Advancement of human rights and fundamental freedoms', example: 'e.g. Provide free legal aid to survivors of gender-based violence in Nairobi.' },
  { value: 'environment', label: 'Protection of the environment', example: 'e.g. Restore degraded forest land through community tree-planting in the Mau.' },
  { value: 'other_public_benefit', label: 'Other purpose beneficial to the general public', example: 'e.g. Run free health screening camps in rural Turkana.' },
]

export const CHARITABLE_ACTIVITY_LOCATIONS: Array<{ value: NonNullable<WizardData['charitableActivityLocation']>; label: string }> = [
  { value: 'kenya', label: 'In Kenya' },
  { value: 'outside_kenya', label: 'Other countries' },
  { value: 'both', label: 'Both' },
]

export const CHARITABLE_OBJECT_MIN_DESCRIPTION = 15

export function charitableObjectsError(w: WizardData): string | null {
  const objects = w.charitableObjects ?? []
  if (objects.length === 0) return 'Choose at least one charitable object.'
  for (const o of objects) {
    const label = CHARITABLE_OBJECT_CATEGORIES.find((c) => c.value === o.category)?.label ?? o.category
    if (o.description.trim().length < CHARITABLE_OBJECT_MIN_DESCRIPTION) return `Describe what the trust will do under “${label}”, and who will benefit.`
    if (o.category === 'other_public_benefit' && !o.publicBenefit?.trim()) return 'Explain how the “other” purpose benefits the general public or a section of it.'
  }
  if (!w.charitableActivityLocation) return 'Tell us where the trust’s activities will take place.'
  if (w.charitableActivityLocation !== 'kenya' && !w.charitableActivityCountries?.trim()) return 'List the countries outside Kenya where the trust will operate.'
  if (!w.charitableObjectsConfirmed) return 'Review and confirm the charitable objects.'
  return null
}

// Trust beneficiary extras, stored on the shareholders row's address
// jsonb (beneficiaries reuse that table). Adults are identified like any
// other party; for a child we record who to reach instead (Charles,
// 2026-09-25).
export type TrustBeneficiaryDetails = {
  isClass?: boolean
  relationship?: string
  isMinor?: boolean
  guardianName?: string
  guardianRelationship?: string
  guardianPhone?: string
  guardianEmail?: string
}

export type TrustEnforcer = {
  id: string
  isSuccessor: boolean
  successorToId?: string // the enforcer this person replaces; unset = any
  fullName: string
  idNumber: string
  kraPin: string
  nationality: string
  phone: string
  email: string
  address: AddressData
  powers: string
  appointmentDate: string
}

export function emptyEnforcer(isSuccessor = false): TrustEnforcer {
  return {
    id: crypto.randomUUID(), isSuccessor, fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan',
    phone: '', email: '', address: {}, powers: '', appointmentDate: '',
  }
}

// Reads the enforcer list, converting drafts saved with the old single
// protector/successor fields so nothing already entered is lost.
export function trustEnforcers(w: WizardData): TrustEnforcer[] {
  if (w.enforcers) return w.enforcers
  const fromLegacy = (name: string | undefined, idInfo: string | undefined, contact: string | undefined, isSuccessor: boolean, id: string): TrustEnforcer | null => {
    if (!name?.trim()) return null
    const c = contact?.trim() ?? ''
    return {
      ...emptyEnforcer(isSuccessor),
      id,
      fullName: name.trim(),
      idNumber: idInfo?.trim() ?? '',
      email: c.includes('@') ? c : '',
      phone: c.includes('@') ? '' : c,
      powers: isSuccessor ? '' : w.protectorPowers ?? '',
      appointmentDate: isSuccessor ? '' : w.protectorAppointmentDate ?? '',
    }
  }
  return [
    fromLegacy(w.protectorName, w.protectorIdInfo, w.protectorContact, false, 'legacy-enforcer'),
    w.hasSuccessorProtector ? fromLegacy(w.successorProtectorName, w.successorProtectorIdInfo, w.successorProtectorContact, true, 'legacy-successor') : null,
  ].filter((e): e is TrustEnforcer => !!e)
}

export function enforcerError(e: TrustEnforcer): string | null {
  const who = e.fullName.trim() || (e.isSuccessor ? 'the successor enforcer' : 'the enforcer')
  if (!e.fullName.trim()) return `Enter the full name of ${who}.`
  if (!e.idNumber.trim()) return `Enter the ID or passport number for ${who}.`
  if (e.kraPin.trim() && !KRA_PIN_REGEX.test(e.kraPin.trim().toUpperCase())) return `KRA PIN for ${who} must be in the format A123456789B.`
  if (!e.phone.trim() || !KENYA_PHONE_REGEX.test(e.phone)) return `Enter a valid phone number for ${who} (07XXXXXXXX or +2547XXXXXXXX).`
  if (!e.email.trim() || !EMAIL_REGEX.test(e.email)) return `Enter a valid email address for ${who}.`
  return null
}

export type TrusteeForRules = {
  name: string
  isCorporate: boolean
  dateOfBirth?: string | null
  nationality?: string | null
  notResidentInKenya?: boolean | null
}

export function ageOn(dateOfBirth: string, today: Date): number {
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const beforeBirthday = today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

// Trust Administration Act 2026, s. 11 and s. 36: a charitable trust needs
// three natural-person trustees or one corporate trustee (a family trust
// needs one); natural-person trustees must be adults, and at least one of
// them a Kenyan citizen or resident.
export function trusteeRuleError(
  trustKind: WizardData['trustKind'],
  trustees: TrusteeForRules[],
  today: Date = new Date()
): string | null {
  const individuals = trustees.filter((t) => !t.isCorporate)
  const corporates = trustees.filter((t) => t.isCorporate)
  if (trustees.length === 0) return 'Add at least one trustee.'
  if (trustKind === 'charitable_trust' && individuals.length < 3 && corporates.length === 0) {
    return `A charitable trust needs at least three individual trustees, or one corporate trustee — currently ${individuals.length} individual trustee${individuals.length === 1 ? '' : 's'}.`
  }
  for (const t of individuals) {
    if (t.dateOfBirth && ageOn(t.dateOfBirth, today) < 18) return `${t.name} must be at least 18 to act as a trustee.`
  }
  if (individuals.length > 0) {
    const hasKenyan = individuals.some((t) => !t.notResidentInKenya || (t.nationality ?? '').trim().toLowerCase() === 'kenyan')
    if (!hasKenyan) return 'At least one individual trustee must be a Kenyan citizen or resident in Kenya.'
  }
  return null
}

export function trustRouteNote(route: 'registration' | 'incorporation' | undefined): string {
  return route === 'incorporation'
    ? 'Once the Trust Deed is executed, the trust is filed for incorporation under the Trust Administration Act, 2026. The Registrar issues a certificate marked “Incorporated Trust”, and the trust becomes a body corporate that can hold property and contract in its own name.'
    : 'Once the Trust Deed is executed, it is lodged with the Registrar for registration under the Trust Administration Act, 2026. The certificate is marked “Registered Trust” — the trust does not become a separate legal person, and can apply to be incorporated later.'
}

export const TRUST_KINDS: Array<{ value: 'family_trust' | 'charitable_trust' | 'other'; label: string; description: string; enabled: boolean; guideUrl?: string }> = [
  {
    value: 'family_trust',
    label: 'Family Trust',
    description: 'Established principally for estate planning, preservation, or creation of wealth for beneficiaries and future generations.',
    enabled: true,
    guideUrl: '/docs/understanding-family-trusts-kenya.pdf',
  },
  {
    value: 'charitable_trust',
    label: 'Charitable Trust',
    description: 'Established for legally recognised charitable purposes, governed for the benefit of those objects rather than private profit.',
    enabled: true,
    guideUrl: '/docs/understanding-charitable-trusts-kenya.pdf',
  },
  {
    value: 'other',
    label: 'Other / Not sure',
    description: 'Non-charitable purpose trusts, discretionary trusts, testamentary trusts, and other specialised structures.',
    enabled: true,
  },
]

// Company secretary threshold — Charles, LLC-Only Developer
// Implementation Spec: private companies above this nominal share
// capital must appoint a secretary, same as PLCs. Below it, secretarial
// service stays an optional upsell rather than a mandatory field.
export const SECRETARY_CAPITAL_THRESHOLD_KES = 5_000_000

export const ENTITY_TYPES: Array<{ value: EntityType; label: string; description: string; guides?: Array<{ label: string; url: string }> }> = [
  { value: 'limited_company', label: 'Limited Company', description: 'Separate legal entity, limited liability, most common' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship', description: 'Single owner, unlimited liability, simplest structure' },
  { value: 'partnership', label: 'Partnership', description: 'Two or more partners, shared liability' },
  { value: 'public_limited_company', label: 'Public Limited Company', description: 'Can offer shares to public, complex governance' },
  { value: 'company_limited_by_guarantee', label: 'NGO / Non-Profit', description: 'Charitable or social purpose, no profit distribution' },
  { value: 'trust', label: 'Trust', description: 'Property held for beneficiaries, fiduciary arrangement', guides: [{ label: 'What is a family trust?', url: '/docs/understanding-family-trusts-kenya.pdf' }, { label: 'What is a charitable trust?', url: '/docs/understanding-charitable-trusts-kenya.pdf' }] },
  { value: 'society', label: 'Society', description: 'Membership-based organisation — residents’, welfare, alumni, or professional associations', guides: [{ label: 'What is a society?', url: '/docs/understanding-societies-kenya.pdf' }] },
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
  { value: 'partner', label: 'Partner' },
  { value: 'proprietor', label: 'Proprietor' },
  { value: 'settlor', label: 'Settlor' },
  { value: 'trustee', label: 'Trustee' },
  { value: 'member', label: 'Member' },
  { value: 'officer', label: 'Officer' },
  { value: 'advocate', label: 'Advocate' },
  { value: 'authorised_agent', label: 'Authorised Agent' },
]

// Kenya KRA PIN format: A + 9 digits + 1 letter
export const KRA_PIN_REGEX = /^[A-Z][0-9]{9}[A-Z]$/
// Old-format Kenyan national IDs run 7-8 digits; newer/next-gen IDs (and
// the digital Huduma ID rollout) issue 9-10 digit numbers — 7-8 alone
// rejected real IDs (reported live, 2026-08-30).
export const NATIONAL_ID_REGEX = /^[0-9]{7,10}$/
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
  'limited_liability_partnership', 'company_limited_by_guarantee', 'trust', 'society',
]

// Steps that require shareholders/members — company/cooperative/LLP only
export const SHAREHOLDER_TYPES: EntityType[] = [
  'limited_company', 'public_limited_company', 'cooperative', 'limited_liability_partnership',
]

// Share capital structuring — company/cooperative only (not LLP, which uses capital contributions differently)
const SHARE_CAPITAL_TYPES: EntityType[] = ['limited_company', 'public_limited_company', 'cooperative']

// Entity types that never file CR1/CR8 — no company incorporation event
// at all, just a business name registration (partnership/sole
// proprietorship) or a non-company statutory filing (trust/society).
const NO_COMPANY_FORM_TYPES: EntityType[] = ['partnership', 'sole_proprietorship', 'trust', 'society']

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
  { type: 'signed_cr1', label: 'Signed CR1', appliesTo: (t) => !NO_COMPANY_FORM_TYPES.includes(t) },
  { type: 'signed_cr2', label: 'Signed CR2', appliesTo: (t) => t === 'limited_company' || t === 'public_limited_company' },
  { type: 'signed_cr8', label: 'Signed CR8', appliesTo: (t) => !NO_COMPANY_FORM_TYPES.includes(t) },
  { type: 'statement_of_nominal_capital', label: 'Statement of nominal capital', appliesTo: (t) => t === 'limited_company' || t === 'public_limited_company' },
  { type: 'signed_bof1', label: 'Signed BOF1', appliesTo: (t) => SHAREHOLDER_TYPES.includes(t) },
  // Business Name Registration filing (BN2) — both General Partnership
  // and Sole Proprietorship register under a business name rather than
  // incorporating a company (Charles specs, 2026-08, both section 19/21).
  { type: 'signed_bn2', label: 'Signed BN2', appliesTo: (t) => t === 'partnership' || t === 'sole_proprietorship' },
  // Trust and Society formation specs, 2026-08: neither has a fixed BRS
  // form code, so the constitutive/governing document itself is the
  // checklist item instead.
  { type: 'trust_deed', label: 'Trust Deed', appliesTo: (t) => t === 'trust' },
  { type: 'constitution', label: 'Society Constitution', appliesTo: (t) => t === 'society' },
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
  // Step 1 — which kind of trust (Trust spec section 3's "first user
  // decision"); only family_trust/charitable_trust have a working flow.
  trustKind?: 'family_trust' | 'charitable_trust' | 'other'
  // Trust Administration Act 2026, ss. 24–33: a written trust is either
  // registered (unincorporated, no legal personality) or incorporated
  // (body corporate with perpetual succession).
  trustFormationRoute?: 'registration' | 'incorporation'
  // Step 4 (repurposed for trust — Company Basics' turnover/employee
  // fields don't apply) — Purpose Check, FT-001–004 for a family trust or
  // the charitable-objects list for a charitable trust (Trust spec
  // sections 6–7). trustCharitableObjects holds free-text entries since
  // the spec explicitly wants multiple objects permitted.
  ftPrincipalPurpose?: string
  ftCreatedDuringLifetime?: boolean
  ftSettlorAlsoBeneficiary?: boolean
  ftConductsTrading?: boolean
  trustCharitableObjects?: string[] // legacy free-text list, superseded by charitableObjects
  // Charitable objects (Charles, 2026-09-25; Trust Administration Act s. 8).
  // Each category stays paired with its description so the deed can be
  // drafted from it — the descriptions inform the objects clause, they
  // don't become it, and every entry is held for legal review.
  charitableObjects?: CharitableObject[]
  charitableActivityLocation?: 'kenya' | 'outside_kenya' | 'both'
  charitableActivityCountries?: string
  charitableObjectsConfirmed?: boolean
  // Step 6 (repurposed for trust — Shareholders doesn't apply) —
  // Charitable Trust beneficiary model, spec section 13. Family trust
  // beneficiaries are captured as person records instead (shareholders
  // table, repurposed) — these fields are charitable-trust only.
  charitableBeneficiaryClass?: string
  charitableGeographicArea?: string
  charitableProgrammeAreas?: string
  charitablePropertyRestrictions?: string
  // Step 8 (repurposed for trust — Beneficial Ownership doesn't apply) —
  // Trust Property, spec sections 15–16. Kept as a settings array rather
  // than its own table/register — the post-registration Trust Asset
  // Register itself is a later phase, not built this pass.
  trustPropertyItems?: Array<{
    id: string
    category: 'cash' | 'land' | 'shares' | 'investments' | 'business_interests' | 'intellectual_property' | 'movable_property' | 'other'
    description: string
    approxValue?: string
    ownershipBefore?: string
    dateSettled?: string
    registrationReference?: string
    isVested: boolean // Intended (false) vs Vested/Transferred (true) — spec section 16
    // Category-specific detail (Charles, 2026-08-31: cash needs the bank
    // account it sits in, land needs acreage/location/title — a single
    // generic "registration/reference" field wasn't enough for either).
    bankAccountName?: string
    bankAccountNumber?: string
    landAcreage?: string
    landLocation?: string
    landTitleReference?: string
  }>
  // Step 9 (repurposed for trust — Company Secretary doesn't apply) —
  // Protector/Enforcer, spec section 14. Single optional role, not a
  // repeating register, so it lives here rather than its own table.
  hasProtector?: boolean
  protectorName?: string
  protectorIdInfo?: string
  protectorContact?: string
  protectorPowers?: string
  protectorAppointmentDate?: string
  protectorReplacementMechanism?: string
  // Successor enforcer — contingency planning, same rationale as
  // successor trustees (Charles, 2026-08-31).
  hasSuccessorProtector?: boolean
  successorProtectorName?: string
  successorProtectorIdInfo?: string
  successorProtectorContact?: string
  // Replaces the single protector*/successorProtector* fields above
  // (kept only so older drafts can be read — see trustEnforcers()). A
  // trust may have more than one enforcer at a time, plus named
  // successors (Charles, 2026-09-25).
  enforcers?: TrustEnforcer[]
  // Step 3 — proposed name for the incorporated trustees (a body
  // corporate distinct from the trust itself, Trust spec section 17).
  trusteeCorporateName?: string
  // Step 10 (repurposed for trust — Constitutional Documents doesn't
  // apply) — Trust Deed, spec section 18.
  hasTrustDeed?: boolean
  // Step 5 — Society Eligibility Assessment, SOC-001–004.
  socFounderCount?: number
  socIsForProfit?: boolean
  socAlreadyRegisteredElsewhere?: boolean
  socClassification?: string
  // Step 4 (repurposed for society — Company Basics) — Objects & Purpose
  // plus Property, spec sections 7 and 16.
  socPrimaryObject?: string
  socAdditionalObjects?: string
  socGeographicScope?: 'estate' | 'county' | 'national' | 'other' | ''
  socPrincipalActivities?: string
  socIsAffiliated?: boolean
  socAffiliationName?: string
  socAffiliationJurisdiction?: string
  socAffiliationNature?: string
  socAffiliationIsPolitical?: boolean
  socOwnsProperty?: boolean
  socPropertyItems?: Array<{ id: string; description: string; location: string; titleReference?: string; vestedIn?: string }>
  // Step 6 (repurposed for society — Shareholders doesn't apply) —
  // Membership Structure settings, SOC-030–035. The founding member
  // list itself lives on the Initial Members step (person records).
  socMembershipEligibility?: string
  socHasMembershipClasses?: boolean
  socMembershipClasses?: string[]
  // Per-class description incl. voting rights (Charles, 2026-09-25);
  // socMembershipClasses is kept in step with the names.
  socMembershipClassDetails?: Array<{ name: string; rights: string }>
  socAdmissionProcess?: string
  socMembershipFees?: string
  socVotingRights?: string
  socTerminationRules?: string
  // Step 9 (repurposed for society — Company Secretary doesn't apply) —
  // Governing Committee, spec section 14. Settings only, not a repeating
  // register.
  socHasGoverningBody?: boolean
  socGoverningBodyName?: string
  socGoverningBodyPositions?: string
  socGoverningBodySize?: string
  socGoverningBodyQuorum?: string
  socGoverningBodyTerm?: string
  socGoverningBodyProcedure?: string
  socGoverningBodyDecisionThreshold?: string
  // Step 10 (repurposed for society — Constitutional Documents doesn't
  // apply) — Constitution, spec section 17.
  hasConstitution?: boolean
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
  secretary?: { fullName: string; idNumber: string; kraPin: string; phone: string; email: string; address: AddressData }
  // Step 10 — Constitutional documents (LLC spec screen 9)
  articlesType?: 'standard' | 'custom'
  // Step 12
  nssfNhifStatus?: 'yes' | 'no' | 'already_registered'
  payrollFrequency?: string
  // Step 13
  declared?: boolean
  consented?: boolean
  agreedTerms?: boolean
  signature?: string
  applicantRelationship?: Database['public']['Enums']['applicant_relationship']
  declarationDate?: string
  // Post-submission — chosen on the "Getting registered" screen, not
  // during the wizard itself. Feeds the IDP's "Service path" field,
  // which otherwise always read the placeholder "Not yet selected".
  servicePathChoice?: 'self_service' | 'assisted' | 'lawyer_assisted'
  // trustKind === 'other' — the guided flow only has legal-requirement
  // logic for family/charitable trusts (step 4's extra-fields gating),
  // so an "other" trust free-types what they need instead of being
  // asked the family/charitable-specific questions.
  trustOtherDescription?: string
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
      // partnership, Suitability Check for sole proprietorship, Settlor
      // Details for trust, and Eligibility Assessment for society
      // (Charles specs, 2026-08)
      return SHARE_CAPITAL_TYPES.includes(entityType) || entityType === 'partnership' || entityType === 'sole_proprietorship' || entityType === 'trust' || entityType === 'society'
    case 6: // Shareholders/Members — captured before directors so a
      // shareholder-who-is-also-a-director isn't typed twice (Charles, 2026-07-17)
      // Repurposed as Partnership Governance for partnership, Beneficiaries
      // for trust, and Membership Structure settings for society. Sole
      // proprietorship has no partners/governance — stays hidden.
      return SHAREHOLDER_TYPES.includes(entityType) || entityType === 'partnership' || entityType === 'trust' || entityType === 'society'
    case 7: // Directors/Partners/Trustees/Proprietor/Officers
      return DIRECTOR_TYPES.includes(entityType)
    case 8: // Beneficial Ownership — same entities that need a shareholder
      // register need a beneficial-ownership record (LLC spec, screen 8).
      // Repurposed as Trust Property for trust and Initial Members
      // (founding member register) for society.
      return SHAREHOLDER_TYPES.includes(entityType) || entityType === 'trust' || entityType === 'society'
    case 9: // Company Secretary — repurposed as Protector/Enforcer for
      // trust and Governing Committee for society, both conditional
      // Yes/No roles rather than mandatory ones.
      return SECRETARY_TYPES.includes(entityType) || entityType === 'trust' || entityType === 'society'
    case 10: // Constitutional Documents — repurposed as Partnership
      // Agreement for partnership, Trust Deed for trust, Constitution for
      // society; sole proprietorship has no constitution/agreement
      // concept at all (spec section 26) so this step is skipped entirely
      // rather than repurposed.
      return entityType !== 'sole_proprietorship'
    case 12: // Employee Info — the "will you have employees?" question
      // itself lives here now (Charles, 2026-09-11: consolidate every
      // employment question into one step instead of splitting it from
      // Company Basics), so this step's own visibility can't depend on
      // hasEmployees — same entity types that used to see it on Company
      // Basics.
      return entityType !== 'trust' && entityType !== 'society'
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
  4: 'Partnership Basics',
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

const TRUST_STEP_LABELS: Partial<Record<number, string>> = {
  3: 'Trust Name',
  4: 'Purpose Check',
  5: 'Settlor Details',
  6: 'Beneficiaries',
  7: 'Trustees',
  8: 'Trust Property',
  9: 'Protector / Enforcer',
  10: 'Trust Deed',
}

const SOCIETY_STEP_LABELS: Partial<Record<number, string>> = {
  3: 'Society Name',
  4: 'Objects & Registered Office',
  5: 'Eligibility Assessment',
  6: 'Membership Structure',
  7: 'Officers',
  8: 'Initial Members',
  9: 'Governing Committee',
  10: 'Constitution',
}

export function stepLabel(step: number, entityType: EntityType): string {
  if (entityType === 'partnership' && PARTNERSHIP_STEP_LABELS[step]) return PARTNERSHIP_STEP_LABELS[step]!
  if (entityType === 'sole_proprietorship' && SOLE_PROPRIETORSHIP_STEP_LABELS[step]) return SOLE_PROPRIETORSHIP_STEP_LABELS[step]!
  if (entityType === 'trust' && TRUST_STEP_LABELS[step]) return TRUST_STEP_LABELS[step]!
  if (entityType === 'society' && SOCIETY_STEP_LABELS[step]) return SOCIETY_STEP_LABELS[step]!
  return STEP_LABELS[step]
}
