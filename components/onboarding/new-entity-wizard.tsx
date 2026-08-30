'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ENTITY_TYPES,
  PHASE1_ENTITY_TYPES,
  PARTNERSHIP_KINDS,
  TRUST_KINDS,
  SECRETARY_CAPITAL_THRESHOLD_KES,
  KENYA_COUNTIES,
  KENYA_POSTAL_CODES,
  TURNOVER_RANGES,
  PAYROLL_FREQUENCIES,
  APPLICANT_RELATIONSHIPS,
  KRA_PIN_REGEX,
  NATIONAL_ID_REGEX,
  EMAIL_REGEX,
  KENYA_PHONE_REGEX,
  TOTAL_STEPS,
  stepLabel,
  isStepVisible,
  nextVisibleStep,
  prevVisibleStep,
  SHARE_CLASS_TYPES,
  SHAREHOLDER_TYPES,
  type EntityType,
  type WizardData,
  type ShareClass,
} from '@/lib/onboarding/new-entity'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'

// ------------------------------------------------------------------
// Shared styles
// ------------------------------------------------------------------
const inputCls =
  'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30'
const inputStyle = {
  borderColor: 'var(--system-fill-3)',
  background: 'var(--system-bg)',
  color: 'var(--system-label)',
} as const
const labelCls = 'block text-ios-footnote font-medium mb-1.5'
const labelStyle = { color: 'var(--system-label-2)' } as const

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled, type = 'button' }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: 'var(--brand-navy)' }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-2.5 px-5 rounded-full text-sm font-medium border"
      style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
    >
      {children}
    </button>
  )
}

// Simple growable list of free-text entries — charitable trust objects
// (Trust spec section 7, "permit multiple objects"), Society membership
// classes, etc. Always keeps at least one (possibly empty) row visible.
function StringListEditor({ values, onChange, placeholder }: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  const rows = values.length > 0 ? values : ['']
  const setAt = (i: number, v: string) => {
    const next = [...rows]
    next[i] = v
    onChange(next)
  }
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i).length > 0 ? rows.filter((_, idx) => idx !== i) : [''])
  return (
    <div className="space-y-2">
      {rows.map((v, i) => (
        <div key={i} className="flex gap-2">
          <input type="text" className={inputCls} style={inputStyle} value={v} placeholder={placeholder} onChange={(e) => setAt(i, e.target.value)} />
          {rows.length > 1 && (
            <button type="button" onClick={() => removeAt(i)} className="text-ios-footnote font-medium text-red-500 shrink-0 px-2">Remove</button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, ''])}
        className="text-ios-caption1 font-semibold"
        style={{ color: 'var(--brand-navy)' }}
      >
        + Add another
      </button>
    </div>
  )
}

// ------------------------------------------------------------------
// Types for related records
// ------------------------------------------------------------------
// Corporate party record — LLC corporate-shareholder-director field spec
// (Charles, 2026-07-17), tables B (corporate party), E (authorised
// representative). OCR may pre-fill name/reg number/rep identity but is
// never relied on for ownership %, role, board authority, or BO
// conclusions — those always stay user-confirmed.
export type CorporateParticipant = {
  registeredName: string
  tradeName: string
  corporateEntityType: 'private_company' | 'public_company' | 'llp' | 'foundation' | 'other' | ''
  regNumber: string
  countryOfIncorporation: string
  isForeign: boolean
  incorporationDate: string
  goodStandingStatus: string
  kraPin: string // the company's own KRA PIN, distinct from any person's
  foreignTaxId: string
  registeredOfficeAddress: string
  postalAddress: string
  corporateEmail: string
  corporatePhone: string
  // Authorised representative (natural person acting for this company)
  repName: string
  repTitle: string
  repNationality: string
  repIdType: 'kenyan_id' | 'passport' | 'foreign_id' | 'other' | ''
  repIdNumber: string
  repKraPin: string
  repEmail: string
  repPhone: string
  repAuthorityCapacity: string
  // Director-specific — only meaningful when this corporate party is
  // acting as a director (table D)
  serviceAddressForNotices: string
  basisOfAuthorityToAct: 'board_resolution' | 'power_of_attorney' | 'constitutional_document' | 'other' | ''
}

type DirectorRow = {
  id: string
  full_name: string
  id_number: string
  kra_pin: string | null
  phone: string | null
  email: string | null
  nationality: string
  appointment_date: string | null
  is_foreign?: boolean
  residential_address: {
    role?: string
    dateOfBirth?: string
    isCorporate?: boolean
    corporate?: CorporateParticipant
    foreignAddress?: string
    physicalAddress?: string
    postalAddress?: string
    county?: string
    occupation?: string
    postalCode?: string
    postalAddressLine?: string
    interestPercentage?: string
    contributionType?: string
    contributionValue?: string
    position?: string
    isRegistrationSignatory?: boolean
    termOfOffice?: string
    termExpiryDate?: string
  } | null
}

type ShareholderRow = {
  id: string
  legal_name: string
  id_or_reg_number: string | null
  kra_pin: string | null
  phone?: string | null
  email?: string | null
  shares_held: number
  share_percentage: number | null
  address: {
    isForeign?: boolean; foreignAddress?: string; physicalAddress?: string; postalAddress?: string
    nationality?: string; dateOfBirth?: string; county?: string; occupation?: string; postalCode?: string; postalAddressLine?: string
    // Society only — Society Formation Workflow spec, 2026-08, section 9.
    membershipClass?: string
    isFoundingMember?: boolean
    dateAdmitted?: string
    votingStatus?: string
    memberStatus?: string
  } | null
  corporate_details: {
    nominee?: boolean
    isCorporate?: boolean
    corporate?: CorporateParticipant
  } | null
}

type DocumentRow = {
  id: string
  name: string
  document_type: string | null
  file_path: string | null
  file_size: number | null
  tags?: Array<{ person?: string; personId?: string; role?: string }> | null
}

// Finds the most recent document tagged for a given person + document_type
// so an edit-mode upload control can show "already on file" instead of a
// blank dropzone. Matches by personId when the row has one — the name-only
// match was a race: if a person's name hadn't finished landing in form
// state by the moment a second document (e.g. the photo) was uploaded
// right after the ID scan, that upload got tagged with an empty/stale
// name and could never be found again on reopen (Charles call, 2026-08:
// reproduced live — ID showed on edit, photo didn't). personId comes from
// the actual saved row, so it can't drift.
function findPersonDocument(documents: DocumentRow[], personId: string | undefined, personName: string, documentType: string): { name: string; filePath: string } | null {
  const byId = personId
    ? [...documents].reverse().find((d) => d.document_type === documentType && d.tags?.some((t) => t.personId === personId))
    : undefined
  if (byId?.file_path) return { name: byId.name, filePath: byId.file_path }
  if (!personName.trim()) return null
  const match = [...documents]
    .reverse()
    .find((d) => d.document_type === documentType && d.tags?.some((t) => t.person?.toLowerCase() === personName.trim().toLowerCase()))
  return match?.file_path ? { name: match.name, filePath: match.file_path } : null
}

type BeneficialOwnerRow = {
  id: string
  full_name: string
  id_number: string | null
  kra_pin: string | null
  nationality: string
  date_of_birth: string | null
  postal_address: { text?: string } | null
  business_address: { text?: string } | null
  residential_address: { text?: string } | null
  phone: string | null
  email: string | null
  occupation: string | null
  nature_of_control: string | null
  date_became_bo: string | null
  share_percentage: number | null
}

type LoadState = 'loading' | 'wizard' | 'submitted' | 'error'

const DOCUMENT_TYPES = [
  { value: 'id_copy', label: 'ID document scan' },
  { value: 'passport_photo', label: 'Passport photo' },
  { value: 'proof_of_address', label: 'Proof of registered office address' },
  { value: 'partnership_deed', label: 'Partnership / trust deed / by-laws' },
  { value: 'employment_contract', label: 'Draft employment contract' },
  { value: 'other', label: 'Other document' },
]

// ------------------------------------------------------------------
// The wizard
// ------------------------------------------------------------------
export function NewEntityWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Set when arriving from a strong informal-assessment result (flowchart:
  // 60-100 pre-populates Path 2 with the recommended entity type)
  const recommendedType = (searchParams.get('recommended') as EntityType | null) ?? null
  // Which entity's session to resume — the dashboard links to a specific
  // entity ("Continue setup" / "Upload certificate" per card), since a
  // user can have several new-entity drafts/submissions at once. Falls
  // back to whichever session is most recent when absent (a brand-new
  // /onboarding/new/1 visit, before any entity exists yet).
  const entityParam = searchParams.get('entity')
  // Dashboard "Edit" button on a submitted/pending entity jumps straight
  // into the wizard instead of the SubmittedScreen — Charles: business
  // owners waiting on BRS should be able to fix a mistake and re-download
  // an updated IDP without an extra "Edit application" click first.
  const editParam = searchParams.get('edit') === '1'
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [step, setStep] = useState(1)
  const [entityType, setEntityType] = useState<EntityType>('limited_company')
  const [entityId, setEntityId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [wizard, setWizard] = useState<WizardData>({})
  const [directors, setDirectors] = useState<DirectorRow[]>([])
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwnerRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [entityStatus, setEntityStatus] = useState<string | null>(null)
  const [idpUrl, setIdpUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load saved state
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/onboarding/new-entity${entityParam ? `?entity=${entityParam}` : ''}`)
        if (!res.ok) {
          setLoadState('error')
          return
        }
        const data = await res.json()
        setEntityType(data.entityType ?? 'limited_company')
        setEntityId(data.entityId)
        setOrgId(data.orgId)
        setWizard(data.wizard ?? {})
        setDirectors(data.directors ?? [])
        setShareholders(data.shareholders ?? [])
        setBeneficialOwners(data.beneficialOwners ?? [])
        setDocuments(data.documents ?? [])
        setEntityStatus(data.entityStatus ?? null)
        setIdpUrl(data.idpUrl ?? null)
        setStep(editParam ? TOTAL_STEPS : Math.min(Math.max(data.step ?? 1, 1), TOTAL_STEPS))
        setLoadState(data.submitted && !editParam ? 'submitted' : 'wizard')
      } catch {
        setLoadState('error')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = useCallback((partial: Partial<WizardData>) => {
    setWizard((prev) => ({ ...prev, ...partial }))
  }, [])

  // Re-pull server state after an OCR extraction so pre-filled directors,
  // shareholders, and wizard fields land in local state without a reload.
  // Wizard fields are merged, not replaced — the server only has whatever
  // was last saved on "Continue", so overwriting wholesale would wipe out
  // anything the user had typed on the current screen but not saved yet.
  // Local values always win; only fields the user hasn't touched locally
  // get pulled in from the server (e.g. gap-fill from this extraction).
  const refresh = useCallback(async () => {
    try {
      const idForRefresh = entityId ?? entityParam
      const res = await fetch(`/api/onboarding/new-entity${idForRefresh ? `?entity=${idForRefresh}` : ''}`)
      if (!res.ok) return
      const data = await res.json()
      setWizard((prev) => ({ ...(data.wizard ?? {}), ...prev }))
      setDirectors(data.directors ?? [])
      setShareholders(data.shareholders ?? [])
      setBeneficialOwners(data.beneficialOwners ?? [])
      setDocuments(data.documents ?? [])
      setEntityStatus(data.entityStatus ?? null)
      setIdpUrl(data.idpUrl ?? null)
    } catch {
      // non-fatal — extraction already persisted server-side
    }
  }, [entityId, entityParam])

  // The applicant step (and registered office) already captured this
  // person's own phone/email/address — reused to seed the first
  // shareholder/director form instead of asking again, since that first
  // person is almost always the applicant themselves (reported live,
  // 2026-08-30: "phone and email and the addresses I had put in earlier
  // steps should also appear here"). Only a default for the auto-opened
  // first-person form — never overwrites anything already typed.
  const applicantDefaults = useMemo(() => ({
    phone: wizard.applicantPhone ?? '',
    email: wizard.applicantEmail ?? '',
    physicalAddress: [wizard.buildingName, wizard.streetName, wizard.city, wizard.county].filter(Boolean).join(', '),
    postalAddress: wizard.postalAddress ?? '',
  }), [wizard.applicantPhone, wizard.applicantEmail, wizard.buildingName, wizard.streetName, wizard.city, wizard.county, wizard.postalAddress])

  // Every write must target the same entity's onboarding_progress row —
  // a user can have several new-entity sessions going at once, so the
  // server can't just assume "the most recent one."
  const api = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/onboarding/new-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityId: entityId ?? entityParam ?? undefined, ...payload }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Request failed')
    }
    return res.json()
  }, [entityId, entityParam])

  // ---- per-step validation --------------------------------------
  const validateStep = useCallback((): string | null => {
    switch (step) {
      case 1:
        if (!entityType) return 'Choose an entity type.'
        if (entityType === 'partnership' && wizard.partnershipKind !== 'general_partnership') {
          return 'Choose which type of partnership you want to establish.'
        }
        if (entityType === 'trust' && wizard.trustKind !== 'family_trust' && wizard.trustKind !== 'charitable_trust') {
          return 'Choose what type of trust you want to establish.'
        }
        return null
      case 2:
        if (!wizard.applicantFullName?.trim()) return 'Enter the applicant’s full name.'
        if (!wizard.applicantEmail?.trim() || !EMAIL_REGEX.test(wizard.applicantEmail)) return 'Enter a valid applicant email address.'
        if (!wizard.applicantPhone?.trim() || !KENYA_PHONE_REGEX.test(wizard.applicantPhone)) return 'Applicant phone must be +2547XXXXXXXX or 07XXXXXXXX.'
        if (!wizard.applicantRelationship) return 'Choose your relationship to the company.'
        return null
      case 3: {
        const names = (wizard.proposedNames ?? []).map((n) => n.trim()).filter(Boolean)
        if (names.length < 3) return 'Enter at least 3 proposed business names.'
        return null
      }
      case 4:
        if (entityType !== 'trust' && !wizard.primaryActivity?.trim()) return 'Describe the business activity.'
        if (!wizard.entityEmail?.trim()) return 'Company email is required.'
        if (!EMAIL_REGEX.test(wizard.entityEmail)) return 'Enter a valid company email address.'
        if (!wizard.entityPhone?.trim()) return 'Entity phone is required.'
        if (!KENYA_PHONE_REGEX.test(wizard.entityPhone)) return 'Phone must be +2547XXXXXXXX or 07XXXXXXXX.'
        if (!wizard.contactPersonName?.trim()) return 'Contact person is required.'
        if (!wizard.city?.trim()) return 'City/Town is required.'
        if (!wizard.county) return 'Choose a county.'
        if (!wizard.postalCode?.trim()) return 'Postal code is required.'
        if (!wizard.postalAddress?.trim()) return 'Postal address is required.'
        if (entityType !== 'trust' && entityType !== 'society') {
          if (!wizard.turnoverRange) return 'Choose an expected turnover range.'
          if (wizard.hasEmployees === undefined) return 'Tell us whether the business will have employees.'
        }
        if (entityType === 'sole_proprietorship') {
          if (wizard.hasAdditionalLocations === undefined) return 'Tell us whether the business has additional locations.'
          if (wizard.isRegulatedActivity === undefined) return 'Tell us whether the business operates in a regulated profession or industry.'
          if (wizard.processesPersonalData === undefined) return 'Tell us whether the business will process personal data.'
          if (wizard.isOnlineBusiness === undefined) return 'Tell us whether the business will operate online.'
        }
        if (entityType === 'trust' && wizard.trustKind === 'family_trust') {
          if (!wizard.ftPrincipalPurpose) return 'Choose the principal purpose of the trust.'
          if (wizard.ftCreatedDuringLifetime === undefined) return "Tell us whether the trust will be created during the settlor's lifetime."
          if (wizard.ftSettlorAlsoBeneficiary === undefined) return 'Tell us whether the settlor will also be a beneficiary.'
          if (wizard.ftConductsTrading === undefined) return 'Tell us whether the trust will conduct ordinary trading activities.'
        }
        if (entityType === 'trust' && wizard.trustKind === 'charitable_trust') {
          if (!(wizard.trustCharitableObjects ?? []).some((o) => o.trim())) return 'List at least one charitable object.'
        }
        if (entityType === 'society') {
          if (!wizard.socPrimaryObject?.trim()) return 'Describe the primary object of the Society.'
          if (!wizard.socGeographicScope) return 'Choose the geographic scope.'
          if (wizard.socIsAffiliated === undefined) return 'Tell us whether the Society is affiliated with another organisation.'
          if (wizard.socIsAffiliated && wizard.socAffiliationIsPolitical === undefined) return 'Tell us whether the affiliation is political in nature.'
          if (wizard.socOwnsProperty === undefined) return 'Tell us whether the Society currently owns property.'
        }
        return null
      case 5: {
        if (entityType === 'partnership') {
          if (wizard.gpOwnerCount == null) return 'Enter how many people will own the business.'
          if (wizard.gpWantsSeparateLegalPersonality == null) return 'Answer whether you want a separate legal personality.'
          if (wizard.gpWantsLimitedLiability == null) return 'Answer whether you require limited liability.'
          if (wizard.gpSameLiabilityBasis == null) return 'Answer whether all partners share the same liability basis.'
          const mismatch =
            wizard.gpOwnerCount < 2 || wizard.gpWantsSeparateLegalPersonality || wizard.gpWantsLimitedLiability || wizard.gpSameLiabilityBasis === false
          if (mismatch && !wizard.gpSuitabilityAcknowledged) {
            return 'Please acknowledge the suitability note above before continuing, or adjust your answers.'
          }
          return null
        }
        if (entityType === 'sole_proprietorship') {
          if (!wizard.spOwnerCount) return 'Tell us how many people will own the business.'
          if (wizard.spWantsSeparateLegalPersonality == null) return 'Answer whether you want a separate legal identity.'
          if (wizard.spWantsLimitedLiability == null) return 'Answer whether you require limited liability protection.'
          if (wizard.spComfortableInPersonalCapacity == null) return 'Answer whether you are comfortable operating in your personal capacity.'
          const mismatch =
            wizard.spOwnerCount === 'two_or_more' || wizard.spWantsSeparateLegalPersonality || wizard.spWantsLimitedLiability || wizard.spComfortableInPersonalCapacity === false
          if (mismatch && !wizard.spSuitabilityAcknowledged) {
            return 'Please acknowledge the suitability note above before continuing, or adjust your answers.'
          }
          return null
        }
        if (entityType === 'trust') {
          if (beneficialOwners.length < 1) return 'Add at least one settlor.'
          for (const s of beneficialOwners) {
            if (!s.id_number) return `Add an ID/passport number for ${s.full_name}.`
            if (!s.kra_pin) return `Add a KRA PIN for ${s.full_name}.`
          }
          return null
        }
        if (entityType === 'society') {
          if (wizard.socFounderCount == null) return 'Enter how many persons are forming the organisation.'
          if (wizard.socIsForProfit === undefined) return 'Answer whether the organisation is being formed for profit.'
          if (wizard.socAlreadyRegisteredElsewhere === undefined) return 'Answer whether the organisation is already registered under another legal framework.'
          if (!wizard.socClassification) return 'Choose what best describes the organisation.'
          return null
        }
        if (wizard.useMultipleShareClasses) {
          const classes = wizard.shareClassList ?? []
          if (classes.length === 0) return 'Add at least one share class.'
          for (const c of classes) {
            if (!c.name.trim()) return 'Every share class needs a name.'
            if (!c.shares) return `Enter the number of shares for ${c.name || 'this class'}.`
          }
          return null
        }
        if (!wizard.nominalValuePerShare) return 'Enter the nominal value per share.'
        if (!wizard.totalShares) return 'Enter the total number of shares the company will be registered with.'
        return null
      }
      case 6: {
        if (entityType === 'partnership') {
          if (!wizard.profitLossSharing) return 'Choose how profits and losses will be shared.'
          if (wizard.profitLossSharing === 'custom' && !wizard.profitLossSharingCustom?.trim()) {
            return 'Describe the custom profit/loss sharing arrangement.'
          }
          if (!wizard.bankAccountOperators?.trim()) return "Describe who may operate the partnership's bank account."
          if (!wizard.bindingAuthority?.trim()) return 'Describe who has authority to bind the partnership.'
          return null
        }
        if (entityType === 'trust') {
          if (wizard.trustKind === 'charitable_trust') {
            if (!wizard.charitableBeneficiaryClass?.trim()) return 'Describe the intended beneficiary class.'
            return null
          }
          if (shareholders.length < 1) return 'Add at least one beneficiary or class of beneficiaries.'
          return null
        }
        if (entityType === 'society') {
          if (!wizard.socMembershipEligibility?.trim()) return 'Describe who is eligible to become a member.'
          if (wizard.socHasMembershipClasses === undefined) return 'Tell us whether there are different classes of membership.'
          if (!wizard.socAdmissionProcess?.trim()) return 'Describe the admission process.'
          if (!wizard.socTerminationRules?.trim()) return 'Describe the termination/resignation/expulsion rules.'
          return null
        }
        if (shareholders.length < 1) return 'Add at least one shareholder/member.'
        for (const s of shareholders) {
          if (!s.id_or_reg_number) return `Add an ID/registration number for ${s.legal_name}.`
          if (!s.corporate_details?.isCorporate && !s.kra_pin) return `Add a KRA PIN for ${s.legal_name}.`
        }
        // Kenyan law: shares must be 100% issued — no partial/unissued
        // pool once registration completes (Charles, 2026 call).
        if (!wizard.useMultipleShareClasses && wizard.totalShares) {
          const allocated = shareholders.reduce((s, x) => s + x.shares_held, 0)
          if (allocated !== wizard.totalShares) {
            return `All ${wizard.totalShares.toLocaleString()} shares must be allocated before continuing — ${allocated.toLocaleString()} allocated so far.`
          }
        }
        return null
      }
      case 7: {
        const minimum = entityType === 'public_limited_company' || entityType === 'partnership' ? 2 : 1
        if (directors.length < minimum) return `Add at least ${minimum} ${minimum > 1 ? 'people' : 'person'}.`
        // SP-001: a sole proprietorship has exactly one proprietor.
        if (entityType === 'sole_proprietorship' && directors.length > 1) {
          return 'A sole proprietorship can only have one proprietor.'
        }
        // Spec: KRA PIN, date of birth, phone, and email are required per
        // natural-person director. Corporate directors carry rep contact
        // details instead, captured on the corporate sub-form.
        for (const d of directors) {
          if (d.residential_address?.isCorporate) continue
          if (!d.kra_pin) return `Add a KRA PIN for ${d.full_name}.`
          if (!d.residential_address?.dateOfBirth) return `Add a date of birth for ${d.full_name}.`
          if (!d.phone) return `Add a phone number for ${d.full_name}.`
          if (!d.email) return `Add an email address for ${d.full_name}.`
        }
        // GP-060: percentage interest across all partners must total 100%.
        if (entityType === 'partnership') {
          const total = directors.reduce((sum, d) => sum + (parseFloat(d.residential_address?.interestPercentage ?? '0') || 0), 0)
          if (Math.round(total * 100) / 100 !== 100) {
            return `Partner interests must total 100% — currently ${total.toLocaleString()}%.`
          }
        }
        return null
      }
      case 8:
        // Trust Property (spec sections 15–16) — optional at this stage,
        // a trust may legitimately have no settled property yet.
        if (entityType === 'trust') return null
        if (entityType === 'society') {
          if (shareholders.length < 1) return 'Add at least one founding member.'
          return null
        }
        // Spec: BO details required unless the user explicitly confirms
        // no declarable beneficial owner presently exists (10%+ direct/
        // indirect interest or significant control — Charles, LLC spec)
        if (beneficialOwners.length === 0 && !wizard.noBeneficialOwners) {
          return 'Add at least one beneficial owner, or confirm none currently apply.'
        }
        return null
      case 9: {
        if (entityType === 'trust') {
          if (wizard.hasProtector === undefined) return 'Tell us whether the trust will have a Protector or Enforcer.'
          if (wizard.hasProtector && !wizard.protectorName?.trim()) return 'Enter the Protector/Enforcer’s name.'
          return null
        }
        if (entityType === 'society') {
          if (wizard.socHasGoverningBody === undefined) return 'Tell us whether the Society has a Committee, Council, or other governing body.'
          if (wizard.socHasGoverningBody) {
            if (!wizard.socGoverningBodyName?.trim()) return 'Enter the name of the governing body.'
            if (!wizard.socGoverningBodyQuorum?.trim()) return 'Enter the quorum for the governing body.'
          }
          return null
        }
        const secretaryMandatory = entityType === 'public_limited_company' || (wizard.authorisedShareCapital ?? 0) > SECRETARY_CAPITAL_THRESHOLD_KES
        if (secretaryMandatory && wizard.hasCompanySecretary !== true) {
          return 'A company secretary is required for this entity.'
        }
        if (wizard.hasCompanySecretary === undefined) return 'Choose whether you will appoint a company secretary.'
        if (wizard.hasCompanySecretary && !wizard.secretary?.fullName?.trim()) return 'Enter the secretary’s details.'
        return null
      }
      case 10:
        if (entityType === 'partnership') {
          if (wizard.hasPartnershipAgreement === undefined) return 'Tell us whether you already have a Partnership Agreement.'
          return null
        }
        if (entityType === 'trust') {
          if (wizard.hasTrustDeed === undefined) return 'Tell us whether you already have a Trust Deed.'
          return null
        }
        if (entityType === 'society') {
          if (wizard.hasConstitution === undefined) return 'Tell us whether you already have a Constitution.'
          return null
        }
        if (!wizard.articlesType) return 'Choose which articles of association the company will use.'
        return null
      case 11:
        // v2.0: identity docs are captured per-person as directors/shareholders
        // are added, so nothing is mandatory here. Proof of address is
        // optional per Charles (2026-07-17) — not everyone has a utility
        // bill yet at registration time.
        return null
      case 12:
        if (wizard.nssfNhifStatus === undefined) return 'Tell us about NSSF/NHIF registration.'
        if (!wizard.payrollFrequency) return 'Choose a payroll frequency.'
        return null
      case 13:
        if (!wizard.declared || !wizard.consented || !wizard.agreedTerms) return 'All three declarations are required.'
        if (!wizard.signature?.trim()) return 'Type your full name as a signature.'
        return null
      default:
        return null
    }
  }, [step, entityType, wizard, directors, shareholders, documents, beneficialOwners])

  // ---- navigation -------------------------------------------------
  const handleContinue = async () => {
    const validationError = validateStep()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSaving(true)
    try {
      if (step === 1) {
        const result = await api({ action: 'init', entityType, wizard })
        setEntityId(result.entityId)
        setStep(2)
      } else {
        const next = nextVisibleStep(step, entityType, wizard)
        await api({ action: 'save_step', step, wizard, advanceTo: next })
        setStep(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    setError('')
    setStep(prevVisibleStep(step, entityType, wizard))
  }

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    try {
      await api({ action: 'save_step', step: TOTAL_STEPS, wizard })
      const result = await api({ action: 'submit' }) as { idpUrl?: string | null }
      setIdpUrl(result.idpUrl ?? null)
      setLoadState('submitted')
      // Best-effort resync of entity status etc — idpUrl above is already
      // the source of truth, this shouldn't clobber it with a stale null
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ---- render states ----------------------------------------------
  if (loadState === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--brand-navy)' }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
        <p className="text-ios-body mb-4" style={{ color: 'var(--system-label-2)' }}>
          We couldn’t load your application.
        </p>
        <Link href="/onboarding" className="text-ios-subhead font-medium" style={{ color: 'var(--brand-navy)' }}>
          ← Back to path selection
        </Link>
      </div>
    )
  }

  if (loadState === 'submitted') {
    return (
      <SubmittedScreen
        onDashboard={() => router.push('/dashboard')}
        orgId={orgId}
        entityId={entityId}
        entityStatus={entityStatus}
        idpUrl={idpUrl}
        businessName={wizard.proposedNames?.find((n) => n.trim()) ?? null}
        applicantName={wizard.signature ?? wizard.contactPersonName ?? null}
        applicantPhone={wizard.contactPersonPhone ?? wizard.entityPhone ?? null}
        api={api}
        onActivated={() => setEntityStatus('active')}
        onEdit={() => { setStep(TOTAL_STEPS); setLoadState('wizard') }}
      />
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background: i + 1 <= step
                  ? isStepVisible(i + 1, entityType, wizard) ? 'var(--brand-navy)' : 'var(--system-fill-2, #d1d1d6)'
                  : 'var(--system-fill-3)',
              }}
            />
          ))}
        </div>

        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-3)' }}>
          Step {step} of {TOTAL_STEPS} — {stepLabel(step, entityType)}
        </p>

        {/* ---- step bodies ---- */}
        {step === 1 && (
          <StepEntityType entityType={entityType} setEntityType={setEntityType} wizard={wizard} patch={patch} recommendedType={recommendedType} />
        )}
        {step === 2 && <StepApplicant wizard={wizard} patch={patch} />}
        {step === 3 && <StepNames wizard={wizard} patch={patch} />}
        {step === 4 && (
          <StepCompanyBasics
            entityType={entityType}
            wizard={wizard}
            patch={patch}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            onExtracted={refresh}
          />
        )}
        {step === 5 && (
          entityType === 'partnership' ? <StepPartnershipSuitability wizard={wizard} patch={patch} /> :
          entityType === 'sole_proprietorship' ? <StepSoleProprietorshipSuitability wizard={wizard} patch={patch} setEntityType={setEntityType} /> :
          entityType === 'trust' ? (
            <StepTrustSettlors
              settlors={beneficialOwners}
              setSettlors={setBeneficialOwners}
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              documents={documents}
            />
          ) :
          entityType === 'society' ? <StepSocietyEligibility wizard={wizard} patch={patch} /> :
          <StepShareCapital wizard={wizard} patch={patch} shareholders={shareholders} />
        )}
        {step === 6 && (
          entityType === 'partnership' ? <StepPartnershipGovernance wizard={wizard} patch={patch} /> :
          entityType === 'trust' ? (
            <StepTrustBeneficiaries
              wizard={wizard}
              patch={patch}
              beneficiaries={shareholders}
              setBeneficiaries={setShareholders}
              api={api}
              setError={setError}
            />
          ) :
          entityType === 'society' ? <StepSocietyMembershipStructure wizard={wizard} patch={patch} /> : (
            <StepShareholders
              entityType={entityType}
              shareholders={shareholders}
              setShareholders={setShareholders}
              directors={directors}
              setDirectors={setDirectors}
              totalShares={wizard.totalShares}
              useMultipleShareClasses={wizard.useMultipleShareClasses}
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              onExtracted={refresh}
              documents={documents}
              applicant={applicantDefaults}
            />
          )
        )}
        {step === 7 && (
          <StepDirectors
            entityType={entityType}
            directors={directors}
            setDirectors={setDirectors}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            onExtracted={refresh}
            documents={documents}
            applicant={applicantDefaults}
          />
        )}
        {step === 8 && (
          entityType === 'trust' ? (
            <StepTrustProperty wizard={wizard} patch={patch} />
          ) : entityType === 'society' ? (
            <StepSocietyMembers members={shareholders} setMembers={setShareholders} api={api} setError={setError} />
          ) : (
            <StepBeneficialOwners
              shareholders={shareholders}
              beneficialOwners={beneficialOwners}
              setBeneficialOwners={setBeneficialOwners}
              wizard={wizard}
              patch={patch}
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              documents={documents}
              onDocumentsCloned={refresh}
            />
          )
        )}
        {step === 9 && (
          entityType === 'trust' ? <StepTrustProtector wizard={wizard} patch={patch} /> :
          entityType === 'society' ? <StepSocietyGoverningCommittee wizard={wizard} patch={patch} /> :
          <StepSecretary entityType={entityType} wizard={wizard} patch={patch} />
        )}
        {step === 10 && (
          <StepConstitutional
            entityType={entityType}
            wizard={wizard}
            patch={patch}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            documents={documents}
            onExtracted={refresh}
          />
        )}
        {step === 11 && (
          <StepDocuments
            entityType={entityType}
            wizard={wizard}
            orgId={orgId}
            entityId={entityId}
            documents={documents}
            setDocuments={setDocuments}
            api={api}
            setError={setError}
            onExtracted={refresh}
          />
        )}
        {step === 12 && <StepEmployees wizard={wizard} patch={patch} />}
        {step === 13 && <StepDeclaration wizard={wizard} patch={patch} />}
        {step === 14 && (
          <StepReview
            entityType={entityType}
            wizard={wizard}
            directors={directors}
            shareholders={shareholders}
            beneficialOwners={beneficialOwners}
            documents={documents}
          />
        )}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        {/* ---- nav buttons ---- */}
        <div className="flex items-center gap-3 mt-6">
          {step > 1 && <SecondaryButton onClick={handleBack}>Back</SecondaryButton>}
          {step < TOTAL_STEPS ? (
            <PrimaryButton onClick={handleContinue} disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit for processing'}
            </PrimaryButton>
          )}
        </div>

        <p className="text-ios-caption1 mt-3 text-center" style={{ color: 'var(--system-label-3)' }}>
          Your progress is saved automatically at every step.
        </p>

        <Link
          href="/dashboard"
          className="mt-4 block text-center text-ios-footnote font-medium"
          style={{ color: 'var(--system-label-3)' }}
        >
          Save &amp; exit
        </Link>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 1 — Entity type
// ------------------------------------------------------------------
function StepEntityType({ entityType, setEntityType, wizard, patch, recommendedType }: {
  entityType: EntityType
  setEntityType: (t: EntityType) => void
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  recommendedType?: EntityType | null
}) {
  // Spec section 3, "first user decision": picking Partnership doesn't
  // launch the questionnaire directly — first ask which kind, since
  // General Partnership / LLP / LP are legally distinct workflows.
  if (entityType === 'partnership' && wizard.partnershipKind !== 'general_partnership') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setEntityType('limited_company')}
          className="text-ios-footnote font-medium"
          style={{ color: 'var(--brand-navy)' }}
        >
          ← Back to entity types
        </button>
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          What type of partnership would you like to establish?
        </h1>
        <div className="space-y-2">
          {PARTNERSHIP_KINDS.map((k) => {
            const selected = wizard.partnershipKind === k.value
            return (
              <button
                key={k.value}
                type="button"
                disabled={!k.enabled}
                onClick={() => k.enabled && patch({ partnershipKind: k.value })}
                className="w-full text-left rounded-xl border p-4 transition-colors disabled:cursor-not-allowed"
                style={{
                  borderColor: selected ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: selected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                  opacity: k.enabled ? 1 : 0.45,
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{k.label}</span>
                  {!k.enabled && (
                    <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-3)' }}>
                      Coming later
                    </span>
                  )}
                </span>
                <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{k.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Trust spec section 3, "first user decision" — same pattern.
  if (entityType === 'trust' && wizard.trustKind !== 'family_trust' && wizard.trustKind !== 'charitable_trust') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => setEntityType('limited_company')}
          className="text-ios-footnote font-medium"
          style={{ color: 'var(--brand-navy)' }}
        >
          ← Back to entity types
        </button>
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          What type of trust do you wish to establish?
        </h1>
        <div className="space-y-2">
          {TRUST_KINDS.map((k) => {
            const selected = wizard.trustKind === k.value
            return (
              <button
                key={k.value}
                type="button"
                disabled={!k.enabled}
                onClick={() => k.enabled && patch({ trustKind: k.value })}
                className="w-full text-left rounded-xl border p-4 transition-colors disabled:cursor-not-allowed"
                style={{
                  borderColor: selected ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: selected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                  opacity: k.enabled ? 1 : 0.45,
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{k.label}</span>
                  {!k.enabled && (
                    <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-3)' }}>
                      Talk to us
                    </span>
                  )}
                </span>
                <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{k.description}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        What kind of entity are you forming?
      </h1>

      {recommendedType && (
        <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
          Based on your readiness assessment, we&apos;ve highlighted the entity type we recommend.
        </p>
      )}

      <div className="space-y-2">
        {ENTITY_TYPES.map((t) => {
          const selected = entityType === t.value
          const recommended = recommendedType === t.value
          const available = PHASE1_ENTITY_TYPES.includes(t.value)
          return (
            <button
              key={t.value}
              type="button"
              disabled={!available}
              onClick={() => { if (!available) return; setEntityType(t.value); patch({ partnershipKind: t.value === 'partnership' ? wizard.partnershipKind : undefined, trustKind: t.value === 'trust' ? wizard.trustKind : undefined }) }}
              className="w-full text-left rounded-xl border p-4 transition-colors disabled:cursor-not-allowed"
              style={{
                borderColor: selected || recommended ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: selected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                opacity: available ? 1 : 0.45,
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>
                  {t.label}
                </span>
                {recommended && (
                  <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: 'var(--brand-navy)' }}>
                    Recommended
                  </span>
                )}
                {!available && (
                  <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-3)' }}>
                    Coming later
                  </span>
                )}
              </span>
              <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                {t.description}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        LexReg currently supports Limited Companies, Partnerships, Sole Proprietorships, Trusts, and Societies. Other entity types are on the roadmap.
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 2 — Applicant & primary contact (LLC spec screen 2). User-account
// and matter-contact data, distinct from the entity profile below.
// ------------------------------------------------------------------
function StepApplicant({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Applicant & primary contact
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Who is filing this application? We use this to reach you about your matter.
      </p>
      <Field label="Applicant full name" required>
        <input type="text" className={inputCls} style={inputStyle} value={wizard.applicantFullName ?? ''} onChange={(e) => patch({ applicantFullName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" required>
          <input type="email" className={inputCls} style={inputStyle} value={wizard.applicantEmail ?? ''} onChange={(e) => patch({ applicantEmail: e.target.value })} />
        </Field>
        <Field label="Mobile number" required>
          <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={wizard.applicantPhone ?? ''} onChange={(e) => patch({ applicantPhone: e.target.value })} />
        </Field>
      </div>
      <Field label="Relationship to company" required>
        <select className={inputCls} style={inputStyle} value={wizard.applicantRelationship ?? ''} onChange={(e) => patch({ applicantRelationship: e.target.value as WizardData['applicantRelationship'] })}>
          <option value="" disabled>Choose…</option>
          {APPLICANT_RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 3 — Proposed names
// ------------------------------------------------------------------
function StepNames({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const names = wizard.proposedNames ?? ['', '', '', '', '', '']
  const setName = (i: number, value: string) => {
    const next = [...names]
    while (next.length < 6) next.push('')
    next[i] = value
    patch({ proposedNames: next })
  }
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Proposed business names
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        List names in order of preference. BRS checks availability during registration — we store your options
        for the filing, names are not validated live.
      </p>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Field key={i} label={`Name option ${i + 1}`} required={i < 3}>
          <input
            type="text"
            className={inputCls}
            style={inputStyle}
            value={names[i] ?? ''}
            onChange={(e) => setName(i, e.target.value)}
            placeholder={i < 3 ? 'Required' : 'Optional'}
          />
        </Field>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 3 — Registered office
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Step 4 — Company basics (LLC spec screen 4: company type locked,
// activity description, new-vs-existing, registered office, postal
// address, company email). Entity contact-person fields folded in too —
// not spec-required but the natural home for them now that step 1 no
// longer captures activity/industry/employee-count.
// ------------------------------------------------------------------
function StepCompanyBasics({ entityType, wizard, patch, orgId, entityId, api, setError, onExtracted }: {
  entityType: EntityType
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
}) {
  const handleExtracted = (fields: Record<string, unknown> | undefined) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { city?: string; county?: string; postal_code?: string }
    patch({
      city: wizard.city || f.city || undefined,
      county: wizard.county || f.county || undefined,
      postalCode: wizard.postalCode || f.postal_code || undefined,
    })
    onExtracted()
  }

  const entityLabel = ENTITY_TYPES.find((t) => t.value === entityType)?.label ?? entityType

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        {entityType === 'trust' ? 'Trust basics' : entityType === 'society' ? 'Objects & registered office' : 'Company basics'}
      </h1>

      {entityType === 'trust' ? (
        // Unlike company/society type (locked by design once chosen),
        // family vs. charitable trust diverges the rest of this step's
        // fields — previously only changeable by going all the way back
        // to the entity-type picker, and this field just showed the
        // generic "Trust" label regardless of which kind was actually
        // picked there (reported live, 2026-08-30).
        <Field label="Trust type">
          <select
            className={inputCls}
            style={inputStyle}
            value={wizard.trustKind ?? ''}
            onChange={(e) => patch({ trustKind: e.target.value as WizardData['trustKind'] })}
          >
            {TRUST_KINDS.map((k) => (
              <option key={k.value} value={k.value} disabled={!k.enabled}>{k.label}{!k.enabled ? ' (talk to us)' : ''}</option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label={entityType === 'society' ? 'Entity type' : 'Company type'}>
          <input type="text" className={inputCls} style={{ ...inputStyle, opacity: 0.7 }} value={entityLabel} disabled readOnly />
        </Field>
      )}

      {entityType === 'society' && (
        <div className="space-y-4">
          <Field label="Primary object of the Society" required>
            <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socPrimaryObject ?? ''} onChange={(e) => patch({ socPrimaryObject: e.target.value })} />
          </Field>
          <Field label="Additional objects">
            <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socAdditionalObjects ?? ''} onChange={(e) => patch({ socAdditionalObjects: e.target.value })} />
          </Field>
          <Field label="Geographic scope" required>
            <select className={inputCls} style={inputStyle} value={wizard.socGeographicScope ?? ''} onChange={(e) => patch({ socGeographicScope: e.target.value as WizardData['socGeographicScope'] })}>
              <option value="" disabled>Choose…</option>
              <option value="estate">Estate / neighbourhood</option>
              <option value="county">County</option>
              <option value="national">National</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Is the Society affiliated with or connected to another organisation?" required>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)} type="button" onClick={() => patch({ socIsAffiliated: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: wizard.socIsAffiliated === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.socIsAffiliated === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </Field>
          {wizard.socIsAffiliated === true && (
            <div className="ios-surface rounded-2xl p-4 space-y-3">
              <Field label="Organisation name">
                <input type="text" className={inputCls} style={inputStyle} value={wizard.socAffiliationName ?? ''} onChange={(e) => patch({ socAffiliationName: e.target.value })} />
              </Field>
              <Field label="Jurisdiction">
                <input type="text" className={inputCls} style={inputStyle} value={wizard.socAffiliationJurisdiction ?? ''} onChange={(e) => patch({ socAffiliationJurisdiction: e.target.value })} />
              </Field>
              <Field label="Nature of affiliation">
                <input type="text" className={inputCls} style={inputStyle} value={wizard.socAffiliationNature ?? ''} onChange={(e) => patch({ socAffiliationNature: e.target.value })} />
              </Field>
              <Field label="Is the affiliation political in nature?" required>
                <div className="grid grid-cols-2 gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)} type="button" onClick={() => patch({ socAffiliationIsPolitical: v })}
                      className="py-2.5 rounded-xl border text-sm font-medium"
                      style={{
                        borderColor: wizard.socAffiliationIsPolitical === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                        background: wizard.socAffiliationIsPolitical === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                        color: 'var(--system-label)',
                      }}
                    >
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
                {wizard.socAffiliationIsPolitical === true && (
                  <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
                    A political affiliation will be flagged for professional review.
                  </p>
                )}
              </Field>
            </div>
          )}
        </div>
      )}

      {entityType !== 'trust' && (
        <Field label={entityType === 'society' ? 'Principal activities' : 'Nature of business / business activity'} required>
          <textarea
            className={inputCls}
            style={inputStyle}
            rows={3}
            maxLength={200}
            placeholder={entityType === 'society' ? 'Briefly describe the Society’s principal activities…' : 'Briefly describe the business activity…'}
            value={wizard.primaryActivity ?? ''}
            onChange={(e) => patch({ primaryActivity: e.target.value })}
          />
          <p className="text-ios-caption1 mt-1 text-right" style={{ color: 'var(--system-label-3)' }}>
            {(wizard.primaryActivity ?? '').length}/200
          </p>
        </Field>
      )}

      <div className="space-y-4">
        <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Entity contact details
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company email" required>
            <input type="email" className={inputCls} style={inputStyle} value={wizard.entityEmail ?? ''} onChange={(e) => patch({ entityEmail: e.target.value })} />
          </Field>
          <Field label="Entity phone" required>
            <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={wizard.entityPhone ?? ''} onChange={(e) => patch({ entityPhone: e.target.value })} />
          </Field>
        </div>
        <Field label="Contact person" required>
          <input type="text" className={inputCls} style={inputStyle} value={wizard.contactPersonName ?? ''} onChange={(e) => patch({ contactPersonName: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact person email">
            <input type="email" className={inputCls} style={inputStyle} placeholder="Defaults to entity email" value={wizard.contactPersonEmail ?? ''} onChange={(e) => patch({ contactPersonEmail: e.target.value })} />
          </Field>
          <Field label="Contact person phone">
            <input type="tel" className={inputCls} style={inputStyle} placeholder="Defaults to entity phone" value={wizard.contactPersonPhone ?? ''} onChange={(e) => patch({ contactPersonPhone: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Registered office address
        </h2>
        <InlineOcrUpload
          section="address"
          documentType="proof_of_address"
          label="Upload proof of address to auto-fill →"
          orgId={orgId}
          entityId={entityId}
          api={api}
          onExtracted={handleExtracted}
          setError={setError}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Building name">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.buildingName ?? ''} onChange={(e) => patch({ buildingName: e.target.value })} />
          </Field>
          <Field label="Street name">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.streetName ?? ''} onChange={(e) => patch({ streetName: e.target.value })} />
          </Field>
        </div>
        <Field label="City / Town" required>
          <input type="text" className={inputCls} style={inputStyle} value={wizard.city ?? ''} onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Floor">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.floorNumber ?? ''} onChange={(e) => patch({ floorNumber: e.target.value })} />
          </Field>
          <Field label="Door / unit number">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.doorNumber ?? ''} onChange={(e) => patch({ doorNumber: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Postal code" required>
            <input type="text" className={inputCls} style={inputStyle} value={wizard.postalCode ?? ''} onChange={(e) => patch({ postalCode: e.target.value })} />
          </Field>
          <Field label="Postal address" required>
            <input type="text" className={inputCls} style={inputStyle} placeholder="P.O. Box" value={wizard.postalAddress ?? ''} onChange={(e) => patch({ postalAddress: e.target.value })} />
          </Field>
        </div>
        <Field label="County" required>
          <select className={inputCls} style={inputStyle} value={wizard.county ?? ''} onChange={(e) => patch({ county: e.target.value })}>
            <option value="" disabled>Choose a county…</option>
            {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Country">
          <input type="text" className={inputCls} style={inputStyle} value={wizard.country ?? 'Kenya'} onChange={(e) => patch({ country: e.target.value })} />
        </Field>
        <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          Proof of address is optional — upload above to auto-fill the fields, type them yourself, or add the
          document later from the review step if you don’t have one yet.
        </p>
      </div>

      {entityType !== 'trust' && entityType !== 'society' && (
        <div className="space-y-4">
          <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
            Turnover & employment
          </h2>
          <Field label="Expected annual turnover (KES)" required>
            <select className={inputCls} style={inputStyle} value={wizard.turnoverRange ?? ''} onChange={(e) => patch({ turnoverRange: e.target.value })}>
              <option value="" disabled>Choose a range…</option>
              {TURNOVER_RANGES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Will the business have employees?" required>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => patch({ hasEmployees: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: wizard.hasEmployees === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.hasEmployees === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {entityType === 'trust' && wizard.trustKind === 'family_trust' && (
        <div className="space-y-4">
          <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
            Purpose check
          </h2>
          <Field label="What is the principal purpose of the trust?" required>
            <select className={inputCls} style={inputStyle} value={wizard.ftPrincipalPurpose ?? ''} onChange={(e) => patch({ ftPrincipalPurpose: e.target.value })}>
              <option value="" disabled>Choose…</option>
              <option value="estate_planning">Estate planning</option>
              <option value="preservation_of_wealth">Preservation of family wealth</option>
              <option value="succession_planning">Succession planning</option>
              <option value="holding_family_assets">Holding family assets</option>
              <option value="supporting_beneficiaries">Supporting beneficiaries</option>
              <option value="intergenerational_wealth_planning">Inter-generational wealth planning</option>
              <option value="combination">Combination of the above</option>
            </select>
          </Field>
          <Field label="Will the trust be created during the settlor's lifetime?" required>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
                <button
                  key={String(v)} type="button" onClick={() => patch({ ftCreatedDuringLifetime: v })}
                  className="py-2.5 rounded-xl border text-xs font-medium"
                  style={{
                    borderColor: wizard.ftCreatedDuringLifetime === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.ftCreatedDuringLifetime === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Will the settlor also be a beneficiary?" required>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
                <button
                  key={String(v)} type="button" onClick={() => patch({ ftSettlorAlsoBeneficiary: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: wizard.ftSettlorAlsoBeneficiary === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.ftSettlorAlsoBeneficiary === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Will the trust conduct ordinary trading activities?" required>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
                <button
                  key={String(v)} type="button" onClick={() => patch({ ftConductsTrading: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: wizard.ftConductsTrading === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.ftConductsTrading === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {wizard.ftConductsTrading === true && (
              <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
                A family trust is intended as a non-trading vehicle — this will be flagged for legal review.
              </p>
            )}
          </Field>
        </div>
      )}

      {entityType === 'trust' && wizard.trustKind === 'charitable_trust' && (
        <div className="space-y-4">
          <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
            Charitable objects
          </h2>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            List each intended charitable object — e.g. relief of poverty, education, religion, health,
            environmental protection, community development. You can list more than one.
          </p>
          <StringListEditor
            values={wizard.trustCharitableObjects ?? ['']}
            onChange={(values) => patch({ trustCharitableObjects: values })}
            placeholder="e.g. Education"
          />
        </div>
      )}

      {entityType === 'sole_proprietorship' && (
        <div className="space-y-4">
          <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
            Business profile
          </h2>
          <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
            These help us activate the right compliance modules once you&apos;re registered.
          </p>
          {([
            ['hasAdditionalLocations', 'Will the business operate from any additional locations?'],
            ['isRegulatedActivity', 'Does the business operate in a regulated profession or industry?'],
            ['processesPersonalData', 'Will the business collect or process personal data about customers, employees, or suppliers?'],
            ['isOnlineBusiness', 'Will the business sell online or operate through a website, app, or social media?'],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label} required>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => patch({ [key]: v })}
                    className="py-2.5 rounded-xl border text-sm font-medium"
                    style={{
                      borderColor: wizard[key] === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                      background: wizard[key] === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                      color: 'var(--system-label)',
                    }}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </Field>
          ))}
          {wizard.isOnlineBusiness === true && (
            <Field label="Website (if any)">
              <input
                type="text" className={inputCls} style={inputStyle} placeholder="e.g. www.example.co.ke"
                value={wizard.businessWebsite ?? ''} onChange={(e) => patch({ businessWebsite: e.target.value })}
              />
            </Field>
          )}
        </div>
      )}

      {entityType === 'society' && (
        <div className="space-y-4">
          <h2 className="text-ios-headline font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
            Property
          </h2>
          <Field label="Does the Society currently own land, premises or other significant property?" required>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)} type="button" onClick={() => patch({ socOwnsProperty: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: wizard.socOwnsProperty === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: wizard.socOwnsProperty === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </Field>
          {wizard.socOwnsProperty === true && (
            <SocietyPropertyEditor
              items={wizard.socPropertyItems ?? []}
              onChange={(items) => patch({ socPropertyItems: items })}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SocietyPropertyEditor({ items, onChange }: {
  items: NonNullable<WizardData['socPropertyItems']>
  onChange: (items: NonNullable<WizardData['socPropertyItems']>) => void
}) {
  const [form, setForm] = useState<NonNullable<WizardData['socPropertyItems']>[number] | null>(null)
  const save = () => {
    if (!form) return
    onChange(items.some((i) => i.id === form.id) ? items.map((i) => (i.id === form.id ? form : i)) : [...items, form])
    setForm(null)
  }
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.id} className="ios-surface rounded-2xl p-3 flex items-start justify-between gap-3">
          <p className="text-ios-footnote" style={{ color: 'var(--system-label)' }}>{i.description} — {i.location}</p>
          <div className="flex gap-3 shrink-0">
            <button type="button" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }} onClick={() => setForm(i)}>Edit</button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => onChange(items.filter((x) => x.id !== i.id))}>Remove</button>
          </div>
        </div>
      ))}
      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Description" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Location" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Title / reference">
            <input type="text" className={inputCls} style={inputStyle} value={form.titleReference ?? ''} onChange={(e) => setForm({ ...form, titleReference: e.target.value })} />
          </Field>
          <Field label="How is it legally vested?">
            <input type="text" className={inputCls} style={inputStyle} value={form.vestedIn ?? ''} onChange={(e) => setForm({ ...form, vestedIn: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={save}>{items.some((i) => i.id === form.id) ? 'Update' : 'Add property'}</PrimaryButton>
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm({ id: crypto.randomUUID(), description: '', location: '' })}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add property
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 7 — Directors / partners / trustees
// ------------------------------------------------------------------
const ROLE_BY_TYPE: Partial<Record<EntityType, string>> = {
  partnership: 'Partner',
  sole_proprietorship: 'Proprietor',
  limited_liability_partnership: 'Designated Member',
  trust: 'Trustee',
  company_limited_by_guarantee: 'Trustee',
  society: 'Officer',
}

type DirectorForm = {
  id?: string
  fullName: string
  idNumber: string
  kraPin: string
  dateOfBirth: string
  nationality: string
  occupation: string
  county: string
  postalCode: string
  phone: string
  email: string
  // Charles, corporate-shareholder call: CR8 needs a physical/postal
  // address per director, distinct from the entity's registered office.
  physicalAddress: string
  postalAddress: string
  // Full mailing address line — distinct from the P.O. Box (postalAddress
  // above); Charles wanted both captured, not one standing in for the
  // other.
  postalAddressLine: string
  appointmentDate: string
  isCorporate: boolean
  corporate: CorporateParticipant
  isForeign: boolean
  foreignAddress: string
  // Partnership only (General Partnership Formation Workflow spec,
  // 2026-08, GP-060/061) — an economic interest, not a governance role,
  // so it lives on the partner record itself rather than a separate
  // shareholders-style step.
  interestPercentage: string
  contributionType: 'cash' | 'property' | 'intellectual_property' | 'equipment' | 'services' | 'other' | ''
  contributionValue: string
  // Society only (Society Formation Workflow spec, 2026-08, SOC-040–051)
  // — officer-specific fields, not meaningful for any other entity type.
  position: string
  isRegistrationSignatory: boolean
  termOfOffice: string
  termExpiryDate: string
}

export const emptyCorporate: CorporateParticipant = {
  registeredName: '', tradeName: '', corporateEntityType: '', regNumber: '',
  countryOfIncorporation: 'Kenya', isForeign: false, incorporationDate: '',
  goodStandingStatus: '', kraPin: '', foreignTaxId: '', registeredOfficeAddress: '',
  postalAddress: '', corporateEmail: '', corporatePhone: '',
  repName: '', repTitle: '', repNationality: 'Kenyan', repIdType: '', repIdNumber: '',
  repKraPin: '', repEmail: '', repPhone: '', repAuthorityCapacity: '',
  serviceAddressForNotices: '', basisOfAuthorityToAct: '',
}

const emptyDirector: DirectorForm = {
  fullName: '', idNumber: '', kraPin: '', dateOfBirth: '', nationality: 'Kenyan', occupation: '', county: '', postalCode: '',
  phone: '', email: '', physicalAddress: '', postalAddress: '', postalAddressLine: '',
  appointmentDate: new Date().toISOString().slice(0, 10),
  isCorporate: false, corporate: { ...emptyCorporate },
  isForeign: false, foreignAddress: '',
  interestPercentage: '', contributionType: '', contributionValue: '',
  position: '', isRegistrationSignatory: false, termOfOffice: '', termExpiryDate: '',
}

// Human-readable label per document_type — shown alongside the person's
// name right where a document is uploaded (director/shareholder/BO/
// settlor forms, and the shared vault), not just the raw filename.
// Charles call, 2026-08: once a KRA PIN or ID is uploaded it should read
// as "Ian Love's KRA PIN", not a bare filename you have to click into.
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  director_id_copy: 'ID / Passport',
  director_kra_pin_copy: 'KRA PIN Certificate',
  shareholder_id_copy: 'ID / Passport',
  shareholder_kra_pin_copy: 'KRA PIN Certificate',
  beneficial_owner_id_copy: 'ID / Passport',
  beneficial_owner_kra_pin_copy: 'KRA PIN Certificate',
  passport_photo: 'Passport Photo',
  proof_of_address: 'Proof of Address',
  partnership_agreement: 'Partnership Agreement',
  trust_deed: 'Trust Deed',
  constitution: 'Constitution',
  founding_minutes: 'Founding Meeting Records',
  trust_property_document: 'Trust Property Document',
  society_property_document: 'Property Document',
  foreign_constitutional_documents: 'Foreign Constitutional Documents',
  corporate_certificate_of_incorporation: 'Certificate of Incorporation',
  corporate_authority_document: 'Board Resolution / Power of Attorney',
  corporate_tax_certificate: 'Tax Certificate',
  corporate_good_standing: 'Good Standing Certificate',
  corporate_representative_id: 'Representative ID',
}

function documentTypeLabel(documentType?: string): string {
  if (!documentType) return 'Document'
  return DOCUMENT_TYPE_LABELS[documentType] ?? documentType.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Label shown for an already-uploaded document — "{person}'s {document
// type}" when we know who it's for, just the document type otherwise.
// The raw filename stays visible underneath so a person can still tell
// two same-named files apart (Charles call, 2026-08).
function uploadedDocLabel(personName: string | undefined, documentType: string | undefined): string {
  const type = documentTypeLabel(documentType)
  const name = personName?.trim()
  return name ? `${name}’s ${type}` : type
}

// Shared inline OCR uploader — used inside the director/shareholder "add
// new person" forms. Per Charles (2026-07-17): OCR should trigger as soon
// as identity documents are uploaded, not batched at the final doc step.
// Upload + register + extract, then the caller re-syncs from the server
// (mergeExtraction already dedupes/creates the person row) and opens that
// row in edit mode so the rest of the form is just confirmation.
// Opens a private-bucket file in a new tab via a short-lived signed URL —
// shared by InlineOcrUpload, PhotoUpload, and StepDocuments so a person can
// confirm what's actually behind a filename (Charles call, 2026-08: two
// docs can share a name, and scraped fields alone don't prove which file
// produced them).
async function openStoredDocument(filePath: string, setError: (e: string) => void) {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 300)
  if (error || !data?.signedUrl) { setError('Could not open document — try again.'); return }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export function InlineOcrUpload({ section, documentType = 'id_copy', label, orgId, entityId, api, onExtracted, setError, initialUploaded, personName, personRole, personId, onDocumentRegistered }: {
  section: 'director' | 'shareholder' | 'address' | 'other'
  documentType?: string
  label?: string
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; fields?: Record<string, unknown>; personId?: string }>
  onExtracted: (fields: Record<string, unknown> | undefined, personId?: string, wasReplace?: boolean) => void
  setError: (e: string) => void
  // Lets a parent pre-fill "already uploaded" state when reopening an edit
  // form for a person who already has a document on file, so the control
  // doesn't look like a fresh empty dropzone on every re-open.
  initialUploaded?: { name: string; filePath: string } | null
  // Tags the document with who it's for, so the document vault can group
  // by person instead of just by type (Charles call, 2026-08).
  personName?: string
  personRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
  // Tags by the saved row's own id when there is one — name-only tagging
  // raced with typing (Charles call, 2026-08: photo uploaded right after
  // the ID scan got tagged before the OCR-filled name had landed in form
  // state, so it could never be found again on reopen).
  personId?: string
  // Called with the new document's id right after it's registered — the
  // parent form tracks these so it can re-tag them with the row's real
  // id once Save actually creates/confirms that row (Charles call,
  // 2026-08: uploads made before a brand-new person has a saved id, or
  // after the name was edited post-upload, could tag with the wrong or
  // no personId/name and then never be found again).
  onDocumentRegistered?: (documentId: string) => void
}) {
  const [state, setState] = useState<'idle' | 'uploading' | 'extracting'>('idle')
  const [uploaded, setUploaded] = useState<{ name: string; filePath: string } | null>(initialUploaded ?? null)
  const [replacing, setReplacing] = useState(false)
  const [opening, setOpening] = useState(false)

  // This control no longer remounts when the parent switches between
  // people (that used to wipe an in-progress upload the instant OCR
  // auto-created the person mid-form). But without a remount, `uploaded`
  // never re-reads a changed initialUploaded prop on its own — so
  // switching to a *different* person (e.g. closing one form and opening
  // "add another") kept showing the previous person's file. Re-sync
  // whenever the prop identifies a different (or no) document.
  useEffect(() => {
    setUploaded(initialUploaded ?? null)
    setReplacing(false)
  }, [initialUploaded?.filePath])

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !orgId || !entityId) return
    if (file.size > 10 * 1024 * 1024) { setError('File is over 10MB — please compress it.'); return }
    setError('')
    setState('uploading')
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) { setError('Upload failed — try again.'); return }

      const registered = await api({
        action: 'register_document',
        document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType, personName, personRole, personId },
      }) as { id?: string }
      if (registered.id) onDocumentRegistered?.(registered.id)

      setState('extracting')
      // Pass personId through when we already know it (a second document
      // for someone whose row already exists, e.g. KRA PIN right after
      // the ID scan) — otherwise the server has to re-guess who this is
      // for by name/id_number, which a KRA PIN certificate alone can
      // easily fail to match (no national ID number on it, and OCR name
      // formatting can differ from the ID scan's reading), silently
      // leaving that field blank on the saved row (reported live,
      // 2026-08-30: KRA PIN uploaded fine, tagged fine, field stayed empty).
      const result = await api({ action: 'ocr_extract', documentId: registered.id, section, personId })

      // This document was registered before the person existed (personId
      // prop was still undefined), tagged only by name at that instant —
      // so it never carried the id OCR just matched-or-created. Relying on
      // Save to retag it left it permanently untagged for anyone
      // auto-created purely by OCR and never explicitly saved (Charles's
      // by-design auto-create-on-OCR flow), which is exactly what made
      // this person's own ID document vanish from the edit screen later
      // (reported live, 2026-08-30). Retag it now, using the same id this
      // upload's own extraction just resolved.
      if (registered.id && result.personId && !personId) {
        const f = result.fields as { full_name?: string } | undefined
        void api({
          action: 'retag_documents',
          documentIds: [registered.id],
          personId: result.personId,
          personName: f?.full_name ?? personName,
          personRole,
        })
      }

      onExtracted(result.fields, result.personId, replacing)
      setUploaded({ name: file.name, filePath: path })
      setReplacing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed — enter details manually.')
    } finally {
      setState('idle')
    }
  }

  if (uploaded && !replacing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}>
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <button
          type="button"
          onClick={async () => { setOpening(true); await openStoredDocument(uploaded.filePath, setError); setOpening(false) }}
          disabled={opening}
          className="text-left flex-1 disabled:opacity-50"
        >
          <span className="block text-ios-footnote font-medium truncate underline decoration-dotted" style={{ color: 'var(--system-label)' }}>
            {opening ? 'Opening…' : uploadedDocLabel(personName, documentType)}
          </span>
          <span className="block text-ios-caption1 truncate" style={{ color: 'var(--system-label-3)' }}>
            {uploaded.name}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setReplacing(true)}
          className="text-ios-caption1 font-semibold shrink-0"
          style={{ color: 'var(--brand-navy)' }}
        >
          Replace
        </button>
      </div>
    )
  }

  return (
    <label
      className="block w-full rounded-xl border-2 border-dashed p-4 text-center cursor-pointer"
      style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={state !== 'idle'}
        onChange={(e) => { handleFile(e.target.files); e.target.value = '' }}
      />
      <span className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
        {state === 'uploading' ? 'Uploading…' : state === 'extracting' ? 'Reading document…' : (label ?? 'Upload ID or passport to auto-fill →')}
      </span>
    </label>
  )
}

// Passport-size photo — plain upload, no OCR. Charles, corporate-shareholder
// call: capture a passport photo per person alongside their ID documents.
export function PhotoUpload({ orgId, entityId, api, onUploaded, setError, initialUploaded, personName, personRole, personId, onDocumentRegistered }: {
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  onUploaded: (fileName: string) => void
  setError: (e: string) => void
  initialUploaded?: { name: string; filePath: string } | null
  personName?: string
  personRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
  personId?: string
  onDocumentRegistered?: (documentId: string) => void
}) {
  const [state, setState] = useState<'idle' | 'uploading'>('idle')
  const [uploaded, setUploaded] = useState<{ name: string; filePath: string } | null>(initialUploaded ?? null)
  const [replacing, setReplacing] = useState(false)
  const [opening, setOpening] = useState(false)

  // See matching comment in InlineOcrUpload — same stale-state risk now
  // that this control doesn't remount between people.
  useEffect(() => {
    setUploaded(initialUploaded ?? null)
    setReplacing(false)
  }, [initialUploaded?.filePath])

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !orgId || !entityId) return
    if (file.size > 10 * 1024 * 1024) { setError('File is over 10MB — please compress it.'); return }
    setError('')
    setState('uploading')
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) { setError('Upload failed — try again.'); return }

      const registered = await api({
        action: 'register_document',
        document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: 'passport_photo', personName, personRole, personId },
      }) as { id?: string }
      if (registered.id) onDocumentRegistered?.(registered.id)
      onUploaded(file.name)
      setUploaded({ name: file.name, filePath: path })
      setReplacing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — try again.')
    } finally {
      setState('idle')
    }
  }

  if (uploaded && !replacing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-2.5" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}>
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <button
          type="button"
          onClick={async () => { setOpening(true); await openStoredDocument(uploaded.filePath, setError); setOpening(false) }}
          disabled={opening}
          className="text-left flex-1 disabled:opacity-50"
        >
          <span className="block text-ios-caption1 font-medium truncate underline decoration-dotted" style={{ color: 'var(--system-label)' }}>
            {opening ? 'Opening…' : uploadedDocLabel(personName, 'passport_photo')}
          </span>
          <span className="block text-ios-caption1 truncate" style={{ color: 'var(--system-label-3)' }}>
            {uploaded.name}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setReplacing(true)}
          className="text-ios-caption1 font-semibold shrink-0"
          style={{ color: 'var(--brand-navy)' }}
        >
          Replace
        </button>
      </div>
    )
  }

  return (
    <label
      className="block w-full rounded-xl border-2 border-dashed p-3 text-center cursor-pointer"
      style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}
    >
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        disabled={state !== 'idle'}
        onChange={(e) => { handleFile(e.target.files); e.target.value = '' }}
      />
      <span className="text-ios-caption1 font-medium" style={{ color: 'var(--brand-navy)' }}>
        {state === 'uploading' ? 'Uploading…' : 'Upload passport-size photo →'}
      </span>
    </label>
  )
}

const CORPORATE_ENTITY_TYPES: Array<{ value: CorporateParticipant['corporateEntityType']; label: string }> = [
  { value: 'private_company', label: 'Private company' },
  { value: 'public_company', label: 'Public company' },
  { value: 'llp', label: 'LLP' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'other', label: 'Other' },
]

const REP_ID_TYPES: Array<{ value: CorporateParticipant['repIdType']; label: string }> = [
  { value: 'kenyan_id', label: 'Kenyan ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'foreign_id', label: 'Foreign ID' },
  { value: 'other', label: 'Other' },
]

const AUTHORITY_BASIS_OPTIONS: Array<{ value: CorporateParticipant['basisOfAuthorityToAct']; label: string }> = [
  { value: 'board_resolution', label: 'Board resolution' },
  { value: 'power_of_attorney', label: 'Power of attorney' },
  { value: 'constitutional_document', label: 'Constitutional document' },
  { value: 'other', label: 'Other' },
]

export function CorporateFields({ value, onChange, context }: {
  value: CorporateParticipant
  onChange: (p: Partial<CorporateParticipant>) => void
  context: 'director' | 'shareholder'
}) {
  return (
    <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
      <Field label="Registered company name" required>
        <input type="text" className={inputCls} style={inputStyle} value={value.registeredName} onChange={(e) => onChange({ registeredName: e.target.value })} />
      </Field>
      <Field label="Trade name (if different)">
        <input type="text" className={inputCls} style={inputStyle} value={value.tradeName} onChange={(e) => onChange({ tradeName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Entity type" required>
          <select className={inputCls} style={inputStyle} value={value.corporateEntityType} onChange={(e) => onChange({ corporateEntityType: e.target.value as CorporateParticipant['corporateEntityType'] })}>
            <option value="" disabled>Choose…</option>
            {CORPORATE_ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Registration number" required>
          <input type="text" className={inputCls} style={inputStyle} value={value.regNumber} onChange={(e) => onChange({ regNumber: e.target.value })} />
        </Field>
      </div>
      <Field label="Is this company local (Kenyan) or foreign?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: false, label: 'Kenyan' }, { v: true, label: 'Foreign' }].map(({ v, label }) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange({ isForeign: v })}
              className="py-2 rounded-xl border text-xs font-medium"
              style={{
                borderColor: value.isForeign === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: value.isForeign === v ? 'var(--system-bg)' : 'var(--system-bg-2)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country of incorporation" required>
          <input type="text" className={inputCls} style={inputStyle} value={value.countryOfIncorporation} onChange={(e) => onChange({ countryOfIncorporation: e.target.value })} />
        </Field>
        <Field label="Date of incorporation">
          <input type="date" className={inputCls} style={inputStyle} value={value.incorporationDate} onChange={(e) => onChange({ incorporationDate: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={value.isForeign ? 'Foreign tax ID' : 'Company KRA PIN'} required>
          <input type="text" className={inputCls} style={inputStyle} value={value.isForeign ? value.foreignTaxId : value.kraPin} onChange={(e) => onChange(value.isForeign ? { foreignTaxId: e.target.value } : { kraPin: e.target.value.toUpperCase() })} />
        </Field>
        {value.isForeign && (
          <Field label="Good standing status">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Active / Certificate on file" value={value.goodStandingStatus} onChange={(e) => onChange({ goodStandingStatus: e.target.value })} />
          </Field>
        )}
      </div>
      <Field label="Registered office address" required>
        <input type="text" className={inputCls} style={inputStyle} value={value.registeredOfficeAddress} onChange={(e) => onChange({ registeredOfficeAddress: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Postal address">
          <input type="text" className={inputCls} style={inputStyle} value={value.postalAddress} onChange={(e) => onChange({ postalAddress: e.target.value })} />
        </Field>
        <Field label="Company email">
          <input type="email" className={inputCls} style={inputStyle} value={value.corporateEmail} onChange={(e) => onChange({ corporateEmail: e.target.value })} />
        </Field>
      </div>
      <Field label="Company phone">
        <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={value.corporatePhone} onChange={(e) => onChange({ corporatePhone: e.target.value })} />
      </Field>

      {context === 'director' && (
        <>
          <div className="h-px" style={{ background: 'var(--system-fill-3)' }} />
          <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-2)' }}>
            Director-specific
          </p>
          <Field label="Service address for notices" required>
            <input type="text" className={inputCls} style={inputStyle} value={value.serviceAddressForNotices} onChange={(e) => onChange({ serviceAddressForNotices: e.target.value })} />
          </Field>
          <Field label="Basis of authority to act as director" required>
            <select className={inputCls} style={inputStyle} value={value.basisOfAuthorityToAct} onChange={(e) => onChange({ basisOfAuthorityToAct: e.target.value as CorporateParticipant['basisOfAuthorityToAct'] })}>
              <option value="" disabled>Choose…</option>
              {AUTHORITY_BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <p className="text-ios-caption1 rounded-lg p-2" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
            A corporate director is flagged for legal review before filing — our team will confirm the authority
            document before this application is submitted to BRS.
          </p>
        </>
      )}

      <div className="h-px" style={{ background: 'var(--system-fill-3)' }} />
      <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-2)' }}>
        Authorised representative (natural person who acts for this company)
      </p>
      <Field label="Representative full name" required>
        <input type="text" className={inputCls} style={inputStyle} value={value.repName} onChange={(e) => onChange({ repName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title / capacity">
          <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Director, Company Secretary" value={value.repTitle} onChange={(e) => onChange({ repTitle: e.target.value })} />
        </Field>
        <Field label="Nationality">
          <input type="text" className={inputCls} style={inputStyle} value={value.repNationality} onChange={(e) => onChange({ repNationality: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID type" required>
          <select className={inputCls} style={inputStyle} value={value.repIdType} onChange={(e) => onChange({ repIdType: e.target.value as CorporateParticipant['repIdType'] })}>
            <option value="" disabled>Choose…</option>
            {REP_ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="ID number" required>
          <input type="text" className={inputCls} style={inputStyle} value={value.repIdNumber} onChange={(e) => onChange({ repIdNumber: e.target.value })} />
        </Field>
      </div>
      <Field label="Representative KRA PIN">
        <input type="text" className={inputCls} style={inputStyle} value={value.repKraPin} onChange={(e) => onChange({ repKraPin: e.target.value.toUpperCase() })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Representative email" required>
          <input type="email" className={inputCls} style={inputStyle} value={value.repEmail} onChange={(e) => onChange({ repEmail: e.target.value })} />
        </Field>
        <Field label="Representative phone" required>
          <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={value.repPhone} onChange={(e) => onChange({ repPhone: e.target.value })} />
        </Field>
      </div>
      <Field label="Authority / capacity to act">
        <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Appointed by board resolution dated…" value={value.repAuthorityCapacity} onChange={(e) => onChange({ repAuthorityCapacity: e.target.value })} />
      </Field>
      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        Upload the certificate of incorporation, board resolution or power of attorney, tax certificate, and
        representative ID in the document step.
      </p>
    </div>
  )
}

function StepDirectors({ entityType, directors, setDirectors, orgId, entityId, api, setError, onExtracted, documents, applicant }: {
  entityType: EntityType
  directors: DirectorRow[]
  setDirectors: (d: DirectorRow[]) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
  documents: DocumentRow[]
  applicant?: { phone: string; email: string; physicalAddress: string; postalAddress: string }
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<DirectorForm | null>(directors.length === 0 ? {
    ...emptyDirector,
    phone: applicant?.phone ?? '',
    email: applicant?.email ?? '',
    physicalAddress: applicant?.physicalAddress ?? '',
    postalAddress: applicant?.postalAddress ?? '',
  } : null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)
  // Documents uploaded during this open form session, before the row has
  // (or has its final) id — re-tagged with the real id once Save
  // confirms it, so they're findable again on reopen.
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])

  const set = (partial: Partial<DirectorForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const setCorporate = (partial: Partial<CorporateParticipant>) =>
    setForm((prev) => (prev ? { ...prev, corporate: { ...prev.corporate, ...partial } } : prev))

  const validate = (f: DirectorForm): string | null => {
    if (entityType === 'partnership') {
      if (!f.interestPercentage.trim() || Number(f.interestPercentage) <= 0) return 'Enter this partner’s percentage interest.'
      if (!f.contributionType) return 'Choose what this partner is contributing.'
    }
    if (entityType === 'society' && !f.position.trim()) return 'Enter this officer’s position/title.'
    if (f.isCorporate) {
      const c = f.corporate
      if (!c.registeredName.trim()) return 'Registered company name is required.'
      if (!c.corporateEntityType) return 'Choose the corporate entity type.'
      if (!c.regNumber.trim()) return 'Registration number is required.'
      if (!c.countryOfIncorporation.trim()) return 'Country of incorporation is required.'
      if (c.isForeign) {
        if (!c.foreignTaxId.trim()) return 'Foreign tax ID is required.'
      } else if (!c.kraPin.trim()) {
        return 'Company KRA PIN is required.'
      }
      if (!c.registeredOfficeAddress.trim()) return 'Registered office address is required.'
      if (!c.serviceAddressForNotices.trim()) return 'Service address for notices is required.'
      if (!c.basisOfAuthorityToAct) return 'Choose the basis of authority to act as director.'
      if (!c.repName.trim()) return 'Representative name is required.'
      if (!c.repIdType) return 'Choose the representative’s ID type.'
      if (!c.repIdNumber.trim()) return 'Representative ID number is required.'
      if (!c.repEmail.trim() || !EMAIL_REGEX.test(c.repEmail)) return 'Enter a valid representative email.'
      if (!c.repPhone.trim() || !KENYA_PHONE_REGEX.test(c.repPhone)) return 'Enter a valid representative phone.'
      return null
    }
    if (!f.fullName.trim()) return 'Full name is required.'
    if (!f.idNumber.trim()) return f.isForeign ? 'Passport number is required.' : 'ID number is required.'
    if (!f.isForeign && !NATIONAL_ID_REGEX.test(f.idNumber)) return 'Kenyan national ID must be 7–10 digits.'
    if (f.isForeign && !f.nationality.trim()) return 'Nationality is required for foreign directors.'
    if (!f.kraPin.trim()) return 'KRA PIN is required.'
    if (!KRA_PIN_REGEX.test(f.kraPin.trim().toUpperCase())) return 'KRA PIN format: A123456789B.'
    if (!f.dateOfBirth) return 'Date of birth is required.'
    if (!f.phone.trim()) return 'Phone number is required.'
    if (!KENYA_PHONE_REGEX.test(f.phone)) return 'Phone must be +2547XXXXXXXX or 07XXXXXXXX.'
    if (!f.email.trim()) return 'Email address is required.'
    if (!EMAIL_REGEX.test(f.email)) return 'Enter a valid email address.'
    if (!f.physicalAddress.trim()) return 'Physical address is required.'
    return null
  }

  const save = async () => {
    if (!form) return
    const v = validate(form)
    if (v) { setError(v); return }
    setError('')
    setBusy(true)
    try {
      const displayName = form.isCorporate ? form.corporate.registeredName.trim() : form.fullName.trim()
      const result = await api({
        action: 'upsert_director',
        director: {
          id: form.id,
          fullName: displayName,
          idNumber: form.isCorporate ? form.corporate.regNumber.trim() : form.idNumber.trim(),
          kraPin: form.kraPin.trim().toUpperCase() || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          nationality: form.isCorporate ? form.corporate.countryOfIncorporation : form.nationality,
          phone: form.isCorporate ? form.corporate.repPhone : form.phone || undefined,
          email: form.isCorporate ? form.corporate.repEmail : form.email || undefined,
          role: roleLabel.toLowerCase().replace(' ', '_'),
          appointmentDate: form.appointmentDate || undefined,
          isCorporate: form.isCorporate,
          corporate: form.isCorporate ? form.corporate : undefined,
          isForeign: form.isForeign,
          foreignAddress: form.isForeign ? form.foreignAddress : undefined,
          physicalAddress: form.isCorporate ? undefined : form.physicalAddress || undefined,
          postalAddress: form.isCorporate ? undefined : form.postalAddress || undefined,
          county: form.isCorporate ? undefined : form.county || undefined,
          postalCode: form.isCorporate ? undefined : form.postalCode || undefined,
          postalAddressLine: form.isCorporate ? undefined : form.postalAddressLine || undefined,
          occupation: form.isCorporate ? undefined : form.occupation || undefined,
          interestPercentage: entityType === 'partnership' ? form.interestPercentage || undefined : undefined,
          contributionType: entityType === 'partnership' ? form.contributionType || undefined : undefined,
          contributionValue: entityType === 'partnership' ? form.contributionValue || undefined : undefined,
          position: entityType === 'society' ? form.position || undefined : undefined,
          isRegistrationSignatory: entityType === 'society' ? form.isRegistrationSignatory : undefined,
          termOfOffice: entityType === 'society' ? form.termOfOffice || undefined : undefined,
          termExpiryDate: entityType === 'society' ? form.termExpiryDate || undefined : undefined,
        },
      })
      const updated: DirectorRow = {
        id: result.id!,
        full_name: displayName,
        id_number: form.isCorporate ? form.corporate.regNumber.trim() : form.idNumber.trim(),
        kra_pin: form.kraPin.trim().toUpperCase() || null,
        phone: (form.isCorporate ? form.corporate.repPhone : form.phone) || null,
        email: (form.isCorporate ? form.corporate.repEmail : form.email) || null,
        nationality: form.isCorporate ? form.corporate.countryOfIncorporation : form.nationality,
        appointment_date: form.appointmentDate || null,
        is_foreign: form.isForeign,
        residential_address: {
          role: roleLabel,
          dateOfBirth: form.dateOfBirth,
          isCorporate: form.isCorporate,
          corporate: form.isCorporate ? form.corporate : undefined,
          foreignAddress: form.isForeign ? form.foreignAddress : undefined,
          physicalAddress: form.isCorporate ? undefined : form.physicalAddress || undefined,
          postalAddress: form.isCorporate ? undefined : form.postalAddress || undefined,
          county: form.isCorporate ? undefined : form.county || undefined,
          postalCode: form.isCorporate ? undefined : form.postalCode || undefined,
          postalAddressLine: form.isCorporate ? undefined : form.postalAddressLine || undefined,
          occupation: form.isCorporate ? undefined : form.occupation || undefined,
          interestPercentage: entityType === 'partnership' ? form.interestPercentage || undefined : undefined,
          contributionType: entityType === 'partnership' ? form.contributionType || undefined : undefined,
          contributionValue: entityType === 'partnership' ? form.contributionValue || undefined : undefined,
          position: entityType === 'society' ? form.position || undefined : undefined,
          isRegistrationSignatory: entityType === 'society' ? form.isRegistrationSignatory : undefined,
          termOfOffice: entityType === 'society' ? form.termOfOffice || undefined : undefined,
          termExpiryDate: entityType === 'society' ? form.termExpiryDate || undefined : undefined,
        },
      }
      setDirectors(form.id ? directors.map((d) => (d.id === form.id ? updated : d)) : [...directors, updated])
      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: result.id, personName: displayName, personRole: 'director' })
      }
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_director', id })
      setDirectors(directors.filter((d) => d.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  // Inline OCR extracted fields — prefill the open "add new" form directly
  // rather than relying on the server's auto-created row, so there is
  // exactly one record once the user hits Save.
  const handleExtracted = (fields: Record<string, unknown> | undefined, personId?: string, wasReplace?: boolean) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    // Silent misses looked like a bug ("first try doesn't pick up the
    // name, have to replace and redo it") when it was really the scan
    // just not reading a name — Charles call, 2026-08. Say so instead of
    // leaving the field blank with no explanation.
    if (!f.full_name) setError('Couldn’t read a name off that document — please enter it manually.')
    setForm((prev) => {
      if (!prev) return prev
      // Only the explicit "Replace" button on an already-uploaded
      // document means overwrite — not just "this form has an id",
      // which becomes true the moment OCR auto-creates the person from
      // the FIRST document, before a second document (e.g. KRA PIN
      // right after the ID scan) is even uploaded. Treating that as a
      // replace let the KRA scan's own (possibly differently-ordered)
      // name reading silently overwrite the name the ID scan had just
      // filled in — which then drifted the name used to look up "already
      // uploaded" documents, surfacing an unrelated stale upload tagged
      // under that other spelling in the passport-photo slot (reported
      // live, 2026-08-30: uploading a KRA PIN populated the photo field
      // with someone else's old test photo).
      const isReplace = !!wasReplace
      return {
        ...prev,
        // Adopt the server's matched-or-created row id so Save updates
        // it instead of inserting a second row — without this, OCR
        // auto-create + then Save always duplicated the person (Charles
        // call, 2026-08: reproduced live, "created yet another Charles
        // Adede").
        id: prev.id ?? personId,
        fullName: (isReplace ? f.full_name : prev.fullName || f.full_name) || prev.fullName,
        idNumber: (isReplace ? f.id_number : prev.idNumber || f.id_number) || prev.idNumber,
        kraPin: ((isReplace ? f.kra_pin : prev.kraPin || f.kra_pin) || prev.kraPin)?.trim().toUpperCase(),
        dateOfBirth: (isReplace ? f.date_of_birth : prev.dateOfBirth || f.date_of_birth) || prev.dateOfBirth,
      }
    })
    // The server may also have auto-created a person row from this
    // extraction — refresh so the list (and the id we just adopted) reflect reality.
    onExtracted()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        {roleLabel} details
      </h1>

      {directors.map((d) => (
        <div key={d.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>
              {d.full_name}{d.residential_address?.isCorporate ? ' (corporate)' : ''}
            </p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              {d.residential_address?.isCorporate ? `Reg. ${d.id_number}` : `ID ${d.id_number}`}{d.kra_pin ? ` · PIN ${d.kra_pin}` : ''}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => { setPhotoUploaded(null); setUploadedDocIds([]); setForm({
                id: d.id,
                fullName: d.residential_address?.isCorporate ? '' : d.full_name,
                idNumber: d.residential_address?.isCorporate ? '' : d.id_number,
                kraPin: d.kra_pin ?? '',
                dateOfBirth: d.residential_address?.dateOfBirth ?? '',
                nationality: d.residential_address?.isCorporate ? 'Kenyan' : d.nationality,
                occupation: d.residential_address?.occupation ?? '',
                county: d.residential_address?.county ?? '',
                postalCode: d.residential_address?.postalCode ?? '',
                postalAddressLine: d.residential_address?.postalAddressLine ?? '',
                interestPercentage: d.residential_address?.interestPercentage ?? '',
                contributionType: (d.residential_address?.contributionType ?? '') as DirectorForm['contributionType'],
                contributionValue: d.residential_address?.contributionValue ?? '',
                position: d.residential_address?.position ?? '',
                isRegistrationSignatory: !!d.residential_address?.isRegistrationSignatory,
                termOfOffice: d.residential_address?.termOfOffice ?? '',
                termExpiryDate: d.residential_address?.termExpiryDate ?? '',
                phone: d.residential_address?.isCorporate ? '' : (d.phone ?? ''),
                email: d.residential_address?.isCorporate ? '' : (d.email ?? ''),
                appointmentDate: d.appointment_date ?? '',
                isCorporate: !!d.residential_address?.isCorporate,
                corporate: d.residential_address?.corporate ?? { ...emptyCorporate },
                isForeign: !!d.is_foreign,
                foreignAddress: d.residential_address?.foreignAddress ?? '',
                physicalAddress: d.residential_address?.physicalAddress ?? '',
                postalAddress: d.residential_address?.postalAddress ?? '',
              }) }}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(d.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {form ? (
        // No key={form.id} here deliberately — this used to be keyed by
        // form.id, which forces a full remount (wiping every child's local
        // state, including each InlineOcrUpload's "already uploaded"
        // indicator) the instant OCR auto-creates the person mid-typing and
        // form.id flips from undefined to a real id. The uploaded file was
        // always fine in storage/DB — the UI just forgot it uploaded and
        // showed the empty dropzone again (Charles call, 2026-08:
        // reproduced live — uploaded ID/KRA docs "disappeared" from the
        // shareholder form while the prefilled OCR fields stayed put).
        // This div isn't in a list, so it never needed a key at all.
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <div className="flex rounded-xl p-1" style={{ background: 'var(--system-bg-2)' }}>
            {(['individual', 'corporate'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set({ isCorporate: opt === 'corporate' })}
                className="flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors"
                style={(opt === 'corporate') === form.isCorporate
                  ? { background: 'var(--brand-navy)', color: '#fff' }
                  : { color: 'var(--system-label-2)' }}
              >
                {opt}
              </button>
            ))}
          </div>

          {form.isCorporate ? (
            <CorporateFields value={form.corporate} onChange={setCorporate} context="director" />
          ) : (
            <>
              <InlineOcrUpload
                section="director"
                documentType="director_id_copy"
                label={form.id ? 'Upload a replacement ID/passport →' : 'Upload ID/passport to auto-fill →'}
                orgId={orgId}
                entityId={entityId}
                api={api}
                onExtracted={handleExtracted}
                setError={setError}
                personName={form.fullName}
                personRole="director"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'director_id_copy')}
              />
              <InlineOcrUpload
                section="director"
                documentType="director_kra_pin_copy"
                label={form.id ? 'Upload a replacement KRA PIN certificate →' : 'Upload KRA PIN certificate to auto-fill →'}
                orgId={orgId}
                entityId={entityId}
                api={api}
                onExtracted={handleExtracted}
                setError={setError}
                personName={form.fullName}
                personRole="director"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'director_kra_pin_copy')}
              />
              <PhotoUpload
                orgId={orgId}
                entityId={entityId}
                api={api}
                onUploaded={(name) => setPhotoUploaded(name)}
                setError={setError}
                personName={form.fullName}
                personRole="director"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'passport_photo')}
              />
              {photoUploaded && (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Uploaded: {photoUploaded}</p>
              )}
              <Field label="Full name" required>
                <input type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isForeign} onChange={(e) => set({ isForeign: e.target.checked, nationality: e.target.checked ? '' : 'Kenyan' })} />
                This person is not resident in Kenya
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label={form.isForeign ? 'Passport number' : 'National ID number'} required>
                  <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
                </Field>
                <Field label="KRA PIN" required>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of birth" required>
                  <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
                </Field>
                <Field label="Nationality" required={form.isForeign}>
                  <input type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
                </Field>
              </div>
              {form.isForeign && (
                <Field label="Foreign residential address">
                  <input type="text" className={inputCls} style={inputStyle} value={form.foreignAddress} onChange={(e) => set({ foreignAddress: e.target.value })} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" required>
                  <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label="Email" required>
                  <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
              </div>
              <Field label="Physical address" required>
                <input type="text" className={inputCls} style={inputStyle} placeholder="Street, building, ward" value={form.physicalAddress} onChange={(e) => set({ physicalAddress: e.target.value })} />
              </Field>
              <Field label="County">
                <select className={inputCls} style={inputStyle} value={form.county} onChange={(e) => set({ county: e.target.value, postalCode: '' })}>
                  <option value="">—</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Postal address">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddressLine} onChange={(e) => set({ postalAddressLine: e.target.value, postalAddress: e.target.value })} />
              </Field>
              <Field label="Postal code">
                <select className={inputCls} style={inputStyle} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} disabled={!form.county}>
                  <option value="">{form.county ? '—' : 'Choose county first'}</option>
                  {KENYA_POSTAL_CODES.filter((p) => p.county === form.county).map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.area}</option>
                  ))}
                </select>
              </Field>
              <Field label="Occupation">
                <input type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
              </Field>
              {form.isForeign && (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                  Foreign directors may need a work/immigration permit depending on their role — our team can
                  advise on this during review. It isn&apos;t required to complete this step.
                </p>
              )}
            </>
          )}

          {entityType === 'partnership' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Percentage interest" required>
                  <input
                    type="number" min={0} max={100} step="0.01" className={inputCls} style={inputStyle}
                    value={form.interestPercentage} onChange={(e) => set({ interestPercentage: e.target.value })}
                  />
                </Field>
                <Field label="Contribution type" required>
                  <select
                    className={inputCls} style={inputStyle} value={form.contributionType}
                    onChange={(e) => set({ contributionType: e.target.value as DirectorForm['contributionType'] })}
                  >
                    <option value="" disabled>Choose…</option>
                    <option value="cash">Cash</option>
                    <option value="property">Property</option>
                    <option value="intellectual_property">Intellectual property</option>
                    <option value="equipment">Equipment</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
              <Field label="Describe the contribution">
                <input
                  type="text" className={inputCls} style={inputStyle} placeholder="e.g. KES 500,000 cash, or a description of the property/services"
                  value={form.contributionValue} onChange={(e) => set({ contributionValue: e.target.value })}
                />
              </Field>
            </>
          )}

          {entityType === 'society' && (
            <>
              <Field label="Position / title" required>
                <input
                  type="text" className={inputCls} style={inputStyle} placeholder="e.g. Chairperson, Secretary, Treasurer"
                  value={form.position} onChange={(e) => set({ position: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Term of office">
                  <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. 2 years" value={form.termOfOffice} onChange={(e) => set({ termOfOffice: e.target.value })} />
                </Field>
                <Field label="Term expiry date">
                  <input type="date" className={inputCls} style={inputStyle} value={form.termExpiryDate} onChange={(e) => set({ termExpiryDate: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isRegistrationSignatory} onChange={(e) => set({ isRegistrationSignatory: e.target.checked })} />
                This officer will sign the statutory registration documentation
              </label>
            </>
          )}

          <Field label={entityType === 'partnership' ? 'Admission date' : entityType === 'sole_proprietorship' ? 'Start date' : entityType === 'society' ? 'Appointment / election date' : 'Appointment date'}>
            <input type="date" className={inputCls} style={inputStyle} value={form.appointmentDate} onChange={(e) => set({ appointmentDate: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : `Add ${roleLabel.toLowerCase()}`}</PrimaryButton>
            {directors.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : entityType === 'sole_proprietorship' && directors.length >= 1 ? null : (
        <button
          type="button"
          onClick={() => { setPhotoUploaded(null); setUploadedDocIds([]); setForm({ ...emptyDirector }) }}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add another {roleLabel.toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step — Shareholders / members (comes before Directors — Charles
// 2026-07-17: capture shareholding first, offer to auto-copy into the
// director profile so the same person isn't typed twice).
// ------------------------------------------------------------------
type ShareholderForm = {
  id?: string
  legalName: string
  idNumber: string
  kraPin: string
  dateOfBirth: string
  nationality: string
  occupation: string
  county: string
  postalCode: string
  phone: string
  email: string
  physicalAddress: string
  postalAddress: string
  postalAddressLine: string
  sharesHeld: string
  isNominee: boolean
  isCorporate: boolean
  corporate: CorporateParticipant
  alsoDirector: boolean
  isForeign: boolean
  foreignAddress: string
}

// Shareholders are captured before directors in this wizard (Charles,
// 2026-07-17 reorder), so this is the earliest point most people are
// entered — Charles call, 2026-08: capture as comprehensively as
// possible here (nationality, DOB, both addresses) so the director and
// beneficial-owner screens further down can gap-fill from this record
// instead of re-asking for the same person.
const emptyShareholder: ShareholderForm = {
  legalName: '', idNumber: '', kraPin: '', dateOfBirth: '', nationality: 'Kenyan', occupation: '', county: '', postalCode: '',
  phone: '', email: '',
  physicalAddress: '', postalAddress: '', postalAddressLine: '',
  sharesHeld: '', isNominee: false, isCorporate: false, corporate: { ...emptyCorporate }, alsoDirector: false,
  isForeign: false, foreignAddress: '',
}

function StepShareholders({ entityType, shareholders, setShareholders, directors, setDirectors, totalShares, useMultipleShareClasses, orgId, entityId, api, setError, onExtracted, documents, applicant }: {
  entityType: EntityType
  shareholders: ShareholderRow[]
  setShareholders: (s: ShareholderRow[]) => void
  directors: DirectorRow[]
  setDirectors: (d: DirectorRow[]) => void
  totalShares?: number
  useMultipleShareClasses?: boolean
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
  documents: DocumentRow[]
  applicant?: { phone: string; email: string; physicalAddress: string; postalAddress: string }
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<ShareholderForm | null>(shareholders.length === 0 ? {
    ...emptyShareholder,
    phone: applicant?.phone ?? '',
    email: applicant?.email ?? '',
    physicalAddress: applicant?.physicalAddress ?? '',
    postalAddress: applicant?.postalAddress ?? '',
  } : null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])
  const total = shareholders.reduce((s, x) => s + x.shares_held, 0)

  const set = (partial: Partial<ShareholderForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const setCorporate = (partial: Partial<CorporateParticipant>) =>
    setForm((prev) => (prev ? { ...prev, corporate: { ...prev.corporate, ...partial } } : prev))

  const save = async () => {
    if (!form) return
    if (form.isCorporate) {
      const c = form.corporate
      if (!c.registeredName.trim()) { setError('Registered company name is required.'); return }
      if (!c.corporateEntityType) { setError('Choose the corporate entity type.'); return }
      if (!c.regNumber.trim()) { setError('Registration number is required.'); return }
      if (!c.countryOfIncorporation.trim()) { setError('Country of incorporation is required.'); return }
      if (c.isForeign ? !c.foreignTaxId.trim() : !c.kraPin.trim()) {
        setError(c.isForeign ? 'Foreign tax ID is required.' : 'Company KRA PIN is required.')
        return
      }
      if (!c.registeredOfficeAddress.trim()) { setError('Registered office address is required.'); return }
      if (!c.repName.trim()) { setError('Representative name is required.'); return }
      if (!c.repIdType) { setError('Choose the representative’s ID type.'); return }
      if (!c.repIdNumber.trim()) { setError('Representative ID number is required.'); return }
    } else {
      if (!form.legalName.trim()) { setError('Name is required.'); return }
      if (!form.idNumber.trim()) { setError('National ID / registration number is required.'); return }
      if (!form.kraPin.trim()) { setError('KRA PIN is required.'); return }
      if (!KRA_PIN_REGEX.test(form.kraPin.trim().toUpperCase())) { setError('KRA PIN format: A123456789B.'); return }
      if (!form.physicalAddress.trim()) { setError('Physical address is required.'); return }
    }
    const shares = parseInt(form.sharesHeld, 10)
    if (!shares || shares < 1) { setError('Enter the number of shares/units held.'); return }
    if (!useMultipleShareClasses && totalShares) {
      const othersAllocated = shareholders.filter((s) => s.id !== form.id).reduce((s, x) => s + x.shares_held, 0)
      if (othersAllocated + shares > totalShares) {
        setError(`Only ${(totalShares - othersAllocated).toLocaleString()} shares remain unallocated out of ${totalShares.toLocaleString()} total.`)
        return
      }
    }
    setError('')
    setBusy(true)
    try {
      const displayName = form.isCorporate ? form.corporate.registeredName.trim() : form.legalName.trim()
      const idOrReg = form.isCorporate ? form.corporate.regNumber.trim() : form.idNumber.trim()
      const result = await api({
        action: 'upsert_shareholder',
        shareholder: {
          id: form.id,
          legalName: displayName,
          idNumber: idOrReg || undefined,
          kraPin: form.kraPin.trim().toUpperCase() || undefined,
          sharesHeld: shares,
          isNominee: form.isNominee,
          isCorporate: form.isCorporate,
          corporate: form.isCorporate ? form.corporate : undefined,
          isForeign: form.isForeign,
          foreignAddress: form.isForeign ? form.foreignAddress : undefined,
          physicalAddress: form.isCorporate ? undefined : form.physicalAddress || undefined,
          postalAddress: form.isCorporate ? undefined : form.postalAddress || undefined,
          nationality: form.isCorporate ? undefined : form.nationality || undefined,
          dateOfBirth: form.isCorporate ? undefined : form.dateOfBirth || undefined,
          county: form.isCorporate ? undefined : form.county || undefined,
          postalCode: form.isCorporate ? undefined : form.postalCode || undefined,
          postalAddressLine: form.isCorporate ? undefined : form.postalAddressLine || undefined,
          occupation: form.isCorporate ? undefined : form.occupation || undefined,
          // Typed into the form (phone/email inputs exist on this step)
          // but never actually sent to the server — silently dropped on
          // every save, so they never persisted (reported live,
          // 2026-08-30: "phone, email... should be carried over").
          phone: form.isCorporate ? undefined : form.phone || undefined,
          email: form.isCorporate ? undefined : form.email || undefined,
        },
      })
      const updated: ShareholderRow = {
        id: result.id!,
        legal_name: displayName,
        id_or_reg_number: idOrReg || null,
        kra_pin: form.kraPin.trim().toUpperCase() || null,
        phone: form.isCorporate ? null : form.phone || null,
        email: form.isCorporate ? null : form.email || null,
        shares_held: shares,
        share_percentage: null,
        address: {
          isForeign: form.isForeign,
          foreignAddress: form.isForeign ? form.foreignAddress : undefined,
          physicalAddress: form.isCorporate ? undefined : form.physicalAddress || undefined,
          postalAddress: form.isCorporate ? undefined : form.postalAddress || undefined,
          nationality: form.isCorporate ? undefined : form.nationality || undefined,
          dateOfBirth: form.isCorporate ? undefined : form.dateOfBirth || undefined,
          county: form.isCorporate ? undefined : form.county || undefined,
          postalCode: form.isCorporate ? undefined : form.postalCode || undefined,
          postalAddressLine: form.isCorporate ? undefined : form.postalAddressLine || undefined,
          occupation: form.isCorporate ? undefined : form.occupation || undefined,
        },
        corporate_details: {
          nominee: form.isNominee || undefined,
          isCorporate: form.isCorporate,
          corporate: form.isCorporate ? form.corporate : undefined,
        },
      }
      const next = form.id ? shareholders.map((s) => (s.id === form.id ? updated : s)) : [...shareholders, updated]
      const newTotal = next.reduce((s, x) => s + x.shares_held, 0)
      setShareholders(next.map((s) => ({ ...s, share_percentage: newTotal > 0 ? Math.round((s.shares_held / newTotal) * 10000) / 100 : null })))

      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: result.id, personName: displayName, personRole: 'shareholder' })
      }

      // "Also a director?" — auto-copy this person's (or company's)
      // identity into a director profile instead of re-typing it
      // (Charles, 2026-07-17; extended to corporate parties 2026-07-24;
      // enabled on edit too 2026-08 — someone can realize this later and
      // go back). Guard against a duplicate row if they're already
      // migrated across (by matching name or ID/reg number).
      const alreadyADirector = directors.some((d) =>
        d.full_name.trim().toLowerCase() === displayName.toLowerCase() || (!!idOrReg && d.id_number === idOrReg)
      )
      if (form.alsoDirector && !alreadyADirector) {
        const dirResult = await api({
          action: 'upsert_director',
          director: form.isCorporate ? {
            fullName: form.corporate.registeredName.trim(),
            idNumber: form.corporate.regNumber.trim(),
            kraPin: form.corporate.isForeign ? undefined : form.corporate.kraPin.toUpperCase() || undefined,
            nationality: form.corporate.countryOfIncorporation,
            phone: form.corporate.repPhone || undefined,
            email: form.corporate.repEmail || undefined,
            role: roleLabel.toLowerCase().replace(' ', '_'),
            appointmentDate: new Date().toISOString().slice(0, 10),
            isCorporate: true,
            corporate: form.corporate,
            isForeign: form.corporate.isForeign,
          } : {
            fullName: form.legalName.trim(),
            idNumber: form.idNumber.trim(),
            kraPin: form.kraPin.trim().toUpperCase() || undefined,
            dateOfBirth: form.dateOfBirth || undefined,
            nationality: form.nationality || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            physicalAddress: form.physicalAddress || undefined,
            postalAddress: form.postalAddress || undefined,
            county: form.county || undefined,
            occupation: form.occupation || undefined,
            isForeign: form.isForeign,
            foreignAddress: form.isForeign ? form.foreignAddress : undefined,
            role: roleLabel.toLowerCase().replace(' ', '_'),
            appointmentDate: new Date().toISOString().slice(0, 10),
          },
        })
        const displayNameForDirector = form.isCorporate ? form.corporate.registeredName.trim() : form.legalName.trim()
        setDirectors([...directors, {
          id: dirResult.id!,
          full_name: displayNameForDirector,
          id_number: form.isCorporate ? form.corporate.regNumber.trim() : form.idNumber.trim(),
          kra_pin: form.isCorporate ? (form.corporate.isForeign ? null : form.corporate.kraPin.toUpperCase() || null) : (form.kraPin.trim().toUpperCase() || null),
          phone: (form.isCorporate ? form.corporate.repPhone : form.phone) || null,
          email: (form.isCorporate ? form.corporate.repEmail : form.email) || null,
          nationality: form.isCorporate ? form.corporate.countryOfIncorporation : (form.nationality || 'Kenyan'),
          appointment_date: new Date().toISOString().slice(0, 10),
          is_foreign: form.isCorporate ? form.corporate.isForeign : form.isForeign,
          residential_address: {
            role: roleLabel,
            dateOfBirth: form.dateOfBirth,
            isCorporate: form.isCorporate,
            corporate: form.isCorporate ? form.corporate : undefined,
            foreignAddress: form.isForeign ? form.foreignAddress : undefined,
            physicalAddress: form.isCorporate ? undefined : form.physicalAddress || undefined,
            postalAddress: form.isCorporate ? undefined : form.postalAddress || undefined,
            county: form.isCorporate ? undefined : form.county || undefined,
            postalCode: form.isCorporate ? undefined : form.postalCode || undefined,
            postalAddressLine: form.isCorporate ? undefined : form.postalAddressLine || undefined,
            occupation: form.isCorporate ? undefined : form.occupation || undefined,
          },
        }])

        // The copy above only carries text fields across — their ID/KRA
        // PIN documents are still shareholder-typed and tagged to the
        // shareholder's id, so the new director row had nothing to show
        // as "already uploaded" even though the files exist.
        if (dirResult.id) {
          await api({
            action: 'clone_person_documents',
            sourcePersonId: result.id,
            targetPersonId: dirResult.id,
            targetName: displayNameForDirector,
            targetRole: 'director',
            typeMap: { shareholder_id_copy: 'director_id_copy', shareholder_kra_pin_copy: 'director_kra_pin_copy' },
          })
          await onExtracted()
        }
      }

      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_shareholder', id })
      const next = shareholders.filter((s) => s.id !== id)
      const newTotal = next.reduce((s, x) => s + x.shares_held, 0)
      setShareholders(next.map((s) => ({ ...s, share_percentage: newTotal > 0 ? Math.round((s.shares_held / newTotal) * 10000) / 100 : null })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  const handleExtracted = (fields: Record<string, unknown> | undefined, personId?: string, wasReplace?: boolean) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    if (!f.full_name) setError('Couldn’t read a name off that document — please enter it manually.')
    setForm((prev) => {
      if (!prev) return prev
      // Only the explicit "Replace" button means overwrite — see the
      // matching comment in StepDirectors' handleExtracted for why
      // `!!prev.id` was wrong (true the instant OCR auto-creates the
      // person from the first document, well before any explicit replace).
      const isReplace = !!wasReplace
      return {
        ...prev,
        // Adopt the server's matched-or-created row id — otherwise Save
        // always inserted a second row on top of the OCR auto-create
        // (Charles call, 2026-08: reproduced live, duplicate row + shares
        // total not updating).
        id: prev.id ?? personId,
        legalName: (isReplace ? f.full_name : prev.legalName || f.full_name) || prev.legalName,
        idNumber: (isReplace ? f.id_number : prev.idNumber || f.id_number) || prev.idNumber,
        kraPin: ((isReplace ? f.kra_pin : prev.kraPin || f.kra_pin) || prev.kraPin)?.trim().toUpperCase(),
        dateOfBirth: (isReplace ? f.date_of_birth : prev.dateOfBirth || f.date_of_birth) || prev.dateOfBirth,
      }
    })
    onExtracted()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Shareholders &amp; members
      </h1>

      {shareholders.map((s) => (
        <div key={s.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>
              {s.legal_name}
              {s.corporate_details?.isCorporate ? ' (corporate)' : ''}
              {s.corporate_details?.nominee ? ' · nominee' : ''}
            </p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              {s.shares_held.toLocaleString()} shares{s.share_percentage != null ? ` · ${s.share_percentage}%` : ''}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => { setPhotoUploaded(null); setUploadedDocIds([]); setForm({
                id: s.id,
                legalName: s.corporate_details?.isCorporate ? '' : s.legal_name,
                idNumber: s.corporate_details?.isCorporate ? '' : (s.id_or_reg_number ?? ''),
                kraPin: s.kra_pin ?? '',
                dateOfBirth: s.address?.dateOfBirth ?? '',
                nationality: s.address?.nationality ?? 'Kenyan',
                occupation: s.address?.occupation ?? '',
                county: s.address?.county ?? '',
                postalCode: s.address?.postalCode ?? '',
                postalAddressLine: s.address?.postalAddressLine ?? '',
                phone: s.phone ?? '',
                email: s.email ?? '',
                physicalAddress: s.address?.physicalAddress ?? '',
                postalAddress: s.address?.postalAddress ?? '',
                sharesHeld: String(s.shares_held),
                isNominee: !!s.corporate_details?.nominee,
                isCorporate: !!s.corporate_details?.isCorporate,
                corporate: s.corporate_details?.corporate ?? { ...emptyCorporate },
                alsoDirector: directors.some((d) => d.full_name.trim().toLowerCase() === s.legal_name.trim().toLowerCase() || (!!s.id_or_reg_number && d.id_number === s.id_or_reg_number)),
                isForeign: !!s.address?.isForeign,
                foreignAddress: s.address?.foreignAddress ?? '',
              }) }}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(s.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {total > 0 && (
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          {!useMultipleShareClasses && !!totalShares ? (
            <>Allocated: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>{total.toLocaleString()} of {totalShares.toLocaleString()}</span></>
          ) : (
            <>Total shares issued: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>{total.toLocaleString()}</span></>
          )}
        </p>
      )}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <div className="flex rounded-xl p-1" style={{ background: 'var(--system-bg-2)' }}>
            {(['individual', 'corporate'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set({ isCorporate: opt === 'corporate' })}
                className="flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors"
                style={(opt === 'corporate') === form.isCorporate
                  ? { background: 'var(--brand-navy)', color: '#fff' }
                  : { color: 'var(--system-label-2)' }}
              >
                {opt}
              </button>
            ))}
          </div>

          {form.isCorporate ? (
            <CorporateFields value={form.corporate} onChange={setCorporate} context="shareholder" />
          ) : (
            <>
              <InlineOcrUpload
                section="shareholder"
                documentType="shareholder_id_copy"
                label={form.id ? 'Upload a replacement ID/passport →' : 'Upload ID/passport to auto-fill →'}
                orgId={orgId}
                entityId={entityId}
                api={api}
                onExtracted={handleExtracted}
                setError={setError}
                personName={form.legalName}
                personRole="shareholder"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.legalName, 'shareholder_id_copy')}
              />
              <InlineOcrUpload
                section="shareholder"
                documentType="shareholder_kra_pin_copy"
                label={form.id ? 'Upload a replacement KRA PIN certificate →' : 'Upload KRA PIN certificate to auto-fill →'}
                orgId={orgId}
                entityId={entityId}
                api={api}
                onExtracted={handleExtracted}
                setError={setError}
                personName={form.legalName}
                personRole="shareholder"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.legalName, 'shareholder_kra_pin_copy')}
              />
              <PhotoUpload
                orgId={orgId}
                entityId={entityId}
                api={api}
                onUploaded={(name) => setPhotoUploaded(name)}
                setError={setError}
                personName={form.legalName}
                personRole="shareholder"
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.legalName, 'passport_photo')}
              />
              {photoUploaded && (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Uploaded: {photoUploaded}</p>
              )}
              <Field label="Full name" required>
                <input type="text" className={inputCls} style={inputStyle} value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isForeign} onChange={(e) => set({ isForeign: e.target.checked })} />
                This person is not resident in Kenya
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label={form.isForeign ? 'Passport number' : 'National ID number'} required>
                  <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
                </Field>
                <Field label="KRA PIN" required>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value })} />
                </Field>
              </div>
              {form.isForeign && (
                <Field label="Foreign residential address">
                  <input type="text" className={inputCls} style={inputStyle} value={form.foreignAddress} onChange={(e) => set({ foreignAddress: e.target.value })} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of birth">
                  <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
                </Field>
                <Field label="Nationality">
                  <input type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
              </div>
              <Field label="Physical address" required>
                <input type="text" className={inputCls} style={inputStyle} placeholder="Street, building, ward" value={form.physicalAddress} onChange={(e) => set({ physicalAddress: e.target.value })} />
              </Field>
              <Field label="County">
                <select className={inputCls} style={inputStyle} value={form.county} onChange={(e) => set({ county: e.target.value, postalCode: '' })}>
                  <option value="">—</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Postal address">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddressLine} onChange={(e) => set({ postalAddressLine: e.target.value, postalAddress: e.target.value })} />
              </Field>
              <Field label="Postal code">
                <select className={inputCls} style={inputStyle} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} disabled={!form.county}>
                  <option value="">{form.county ? '—' : 'Choose county first'}</option>
                  {KENYA_POSTAL_CODES.filter((p) => p.county === form.county).map((p) => (
                    <option key={p.code} value={p.code}>{p.code} — {p.area}</option>
                  ))}
                </select>
              </Field>
              <Field label="Occupation">
                <input type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
              </Field>
              {form.isForeign && (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                  Foreign shareholders may need additional documentation depending on structure — our team can
                  advise during review.
                </p>
              )}
            </>
          )}

          <Field label="Shares / membership units held" required>
            <input type="number" min={1} className={inputCls} style={inputStyle} value={form.sharesHeld} onChange={(e) => set({ sharesHeld: e.target.value })} />
            {!useMultipleShareClasses && !!totalShares && (
              <p className="text-ios-caption1 mt-1" style={{ color: 'var(--system-label-3)' }}>
                {(totalShares - shareholders.filter((s) => s.id !== form.id).reduce((s, x) => s + x.shares_held, 0)).toLocaleString()} of {totalShares.toLocaleString()} shares still unallocated.
              </p>
            )}
          </Field>
          <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            <input type="checkbox" checked={form.isNominee} onChange={(e) => set({ isNominee: e.target.checked })} />
            Nominee shareholder
          </label>
          <label className="flex items-center gap-2 text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
            <input type="checkbox" checked={form.alsoDirector} onChange={(e) => set({ alsoDirector: e.target.checked })} />
            {form.isCorporate
              ? `This company is also a ${roleLabel.toLowerCase()} — copy these details across`
              : `This person is also a ${roleLabel.toLowerCase()} — copy these details across`}
          </label>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add shareholder'}</PrimaryButton>
            {shareholders.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setPhotoUploaded(null); setUploadedDocIds([]); setForm({ ...emptyShareholder }) }}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add another shareholder
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 7 — Beneficial ownership (LLC-Only Developer Implementation
// Spec, screen 8). Separate compliance record from the shareholder
// register — a shareholder can be marked as a BO to prefill, but the
// two lists are independent per the spec.
// ------------------------------------------------------------------
type BeneficialOwnerForm = {
  id?: string
  fullName: string
  idNumber: string
  kraPin: string
  nationality: string
  dateOfBirth: string
  postalAddress: string
  businessAddress: string
  residentialAddress: string
  phone: string
  email: string
  occupation: string
  natureOfControl: string
  dateBecameBo: string
  sharePercentage: string
  // Set by prefillFrom — the shareholder this BO was copied from, so
  // Save can also clone their ID/KRA PIN documents across once the BO
  // row has a real id, the same way "also a director" does for directors.
  sourceShareholderId?: string
}

function emptyBeneficialOwner(): BeneficialOwnerForm {
  return {
    fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan', dateOfBirth: '',
    postalAddress: '', businessAddress: '', residentialAddress: '', phone: '', email: '',
    occupation: '', natureOfControl: '', dateBecameBo: new Date().toISOString().slice(0, 10), sharePercentage: '',
  }
}

function StepBeneficialOwners({ shareholders, beneficialOwners, setBeneficialOwners, wizard, patch, orgId, entityId, api, setError, documents, onDocumentsCloned }: {
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  setBeneficialOwners: (b: BeneficialOwnerRow[]) => void
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  documents: DocumentRow[]
  // Cloning a shareholder's documents across (see save()) writes new rows
  // straight to the server — the local `documents` list has no idea they
  // exist until something re-fetches it, so the freshly cloned ID/KRA PIN
  // still looked missing the instant you reopened Edit in the same
  // session (only a full page reload picked them up) (reported live,
  // 2026-08-30).
  onDocumentsCloned?: () => Promise<void>
}) {
  const [form, setForm] = useState<BeneficialOwnerForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])

  // Charles, corporate-shareholder call: whatever can be scraped from a
  // document should be, same as directors/shareholders. Uses section
  // 'other' deliberately — it extracts and returns fields for the form
  // to gap-fill, but performs no server-side auto-create/merge, since BO
  // conclusions (ownership %, control basis) must always be user-entered
  // and confirmed, never inferred from OCR (spec: never auto-decide BO
  // status from a document).
  const handleExtracted = (fields: Record<string, unknown> | undefined) => {
    if (!fields) return
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => (prev ? {
      ...prev,
      fullName: prev.fullName || f.full_name || '',
      idNumber: prev.idNumber || f.id_number || '',
      kraPin: prev.kraPin || f.kra_pin || '',
      dateOfBirth: prev.dateOfBirth || f.date_of_birth || '',
    } : prev))
  }

  // Shareholders holding 10%+ who aren't already recorded as a BO —
  // one-tap prefill per the spec's "permit the user to mark that a
  // shareholder is also a beneficial owner" guidance. Corporate
  // shareholders are excluded here: a company can never itself be a
  // beneficial owner — Kenyan BO rules require tracing through it to the
  // natural person(s) who ultimately own/control it (corporate-party
  // field spec, Table F). They're surfaced separately below instead.
  const recordedNames = new Set(beneficialOwners.map((b) => b.full_name.toLowerCase()))
  const tenPercentPlus = shareholders.filter((s) => (s.share_percentage ?? 0) >= 10)
  const candidateShareholders = tenPercentPlus.filter(
    (s) => !s.corporate_details?.isCorporate && !recordedNames.has(s.legal_name.toLowerCase())
  )
  const corporateShareholdersNeedingTrace = tenPercentPlus.filter((s) => s.corporate_details?.isCorporate)

  const set = (partial: Partial<BeneficialOwnerForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))

  // Gap-fills from the shareholder record instead of re-asking — Charles
  // call, 2026-08: whatever was captured comprehensively at the
  // shareholder screen (the first, most detailed capture point) should
  // carry across to here when it's the same person.
  const prefillFrom = (s: ShareholderRow) => {
    patch({ noBeneficialOwners: false })
    setUploadedDocIds([])
    setForm({
      ...emptyBeneficialOwner(),
      fullName: s.legal_name,
      idNumber: s.id_or_reg_number ?? '',
      kraPin: s.kra_pin ?? '',
      nationality: s.address?.nationality ?? '',
      dateOfBirth: s.address?.dateOfBirth ?? '',
      occupation: s.address?.occupation ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      residentialAddress: s.address?.physicalAddress ?? '',
      postalAddress: s.address?.postalAddress ?? '',
      sharePercentage: s.share_percentage != null ? String(s.share_percentage) : '',
      natureOfControl: `Shareholding of ${s.share_percentage ?? '—'}%`,
      sourceShareholderId: s.id,
    })
  }

  const save = async () => {
    if (!form) return
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (!form.natureOfControl.trim()) { setError('Describe the nature of ownership or control.'); return }
    setError('')
    setBusy(true)
    try {
      const result = await api({
        action: 'upsert_beneficial_owner',
        beneficialOwner: {
          id: form.id,
          fullName: form.fullName.trim(),
          idNumber: form.idNumber.trim() || undefined,
          kraPin: form.kraPin.trim().toUpperCase() || undefined,
          nationality: form.nationality || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          postalAddress: form.postalAddress || undefined,
          businessAddress: form.businessAddress || undefined,
          residentialAddress: form.residentialAddress || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          occupation: form.occupation || undefined,
          natureOfControl: form.natureOfControl.trim(),
          dateBecameBo: form.dateBecameBo || undefined,
          sharePercentage: form.sharePercentage ? parseFloat(form.sharePercentage) : undefined,
        },
      })
      const updated: BeneficialOwnerRow = {
        id: result.id!,
        full_name: form.fullName.trim(),
        id_number: form.idNumber.trim() || null,
        kra_pin: form.kraPin.trim().toUpperCase() || null,
        nationality: form.nationality,
        date_of_birth: form.dateOfBirth || null,
        postal_address: form.postalAddress ? { text: form.postalAddress } : null,
        business_address: form.businessAddress ? { text: form.businessAddress } : null,
        residential_address: form.residentialAddress ? { text: form.residentialAddress } : null,
        phone: form.phone || null,
        email: form.email || null,
        occupation: form.occupation || null,
        nature_of_control: form.natureOfControl.trim(),
        date_became_bo: form.dateBecameBo || null,
        share_percentage: form.sharePercentage ? parseFloat(form.sharePercentage) : null,
      }
      setBeneficialOwners(form.id ? beneficialOwners.map((b) => (b.id === form.id ? updated : b)) : [...beneficialOwners, updated])
      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: result.id, personName: form.fullName.trim(), personRole: 'beneficial_owner' })
      }
      // Prefilled from a shareholder — their ID/KRA PIN documents are
      // still shareholder-typed and tagged to the shareholder's own id,
      // same gap "also a director" had (fixed 2026-08-30). Clone them
      // across now that this BO row has a real id.
      if (form.sourceShareholderId && result.id) {
        await api({
          action: 'clone_person_documents',
          sourcePersonId: form.sourceShareholderId,
          targetPersonId: result.id,
          targetName: form.fullName.trim(),
          targetRole: 'beneficial_owner',
          typeMap: { shareholder_id_copy: 'beneficial_owner_id_copy', shareholder_kra_pin_copy: 'beneficial_owner_kra_pin_copy' },
        })
        await onDocumentsCloned?.()
      }
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_beneficial_owner', id })
      setBeneficialOwners(beneficialOwners.filter((b) => b.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Beneficial ownership
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Anyone with 10% or more direct or indirect interest, or who otherwise exercises significant control,
        must be declared separately from the shareholder register.
      </p>

      {candidateShareholders.length > 0 && !form && (
        <div className="ios-surface rounded-2xl p-4 space-y-2">
          <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>
            These shareholders hold 10%+ — add them as beneficial owners?
          </p>
          {candidateShareholders.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => prefillFrom(s)}
              className="w-full rounded-xl border p-3 text-left text-ios-footnote"
              style={{ borderColor: 'var(--system-fill-3)' }}
            >
              <span className="font-medium" style={{ color: 'var(--system-label)' }}>{s.legal_name}</span>
              <span style={{ color: 'var(--system-label-2)' }}> — {s.share_percentage}% shares</span>
            </button>
          ))}
        </div>
      )}

      {corporateShareholdersNeedingTrace.length > 0 && !form && (
        <div className="ios-surface rounded-2xl p-4 space-y-2" style={{ background: 'rgba(128,0,32,0.06)' }}>
          <p className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }}>
            Corporate shareholders holding 10%+ — declare who ultimately owns/controls them
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            A company can&apos;t itself be a beneficial owner. For each corporate shareholder below, add the
            natural person(s) who ultimately own or control it as beneficial owners.
          </p>
          {corporateShareholdersNeedingTrace.map((s) => (
            <p key={s.id} className="text-ios-footnote" style={{ color: 'var(--system-label)' }}>
              • {s.legal_name} — {s.share_percentage}% shares
            </p>
          ))}
        </div>
      )}

      {beneficialOwners.map((b) => (
        <div key={b.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{b.full_name}</p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{b.nature_of_control}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => { setPhotoUploaded(null); setUploadedDocIds([]); setForm({
                id: b.id,
                fullName: b.full_name,
                idNumber: b.id_number ?? '',
                kraPin: b.kra_pin ?? '',
                nationality: b.nationality,
                dateOfBirth: b.date_of_birth ?? '',
                postalAddress: b.postal_address?.text ?? '',
                businessAddress: b.business_address?.text ?? '',
                residentialAddress: b.residential_address?.text ?? '',
                phone: b.phone ?? '',
                email: b.email ?? '',
                occupation: b.occupation ?? '',
                natureOfControl: b.nature_of_control ?? '',
                dateBecameBo: b.date_became_bo ?? '',
                sharePercentage: b.share_percentage != null ? String(b.share_percentage) : '',
              }) }}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(b.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <InlineOcrUpload
            section="other"
            documentType="beneficial_owner_id_copy"
            label="Upload ID/passport to auto-fill →"
            orgId={orgId}
            entityId={entityId}
            api={api}
            onExtracted={handleExtracted}
            setError={setError}
            personName={form.fullName}
            personRole="beneficial_owner"
            personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_id_copy')}
          />
          <InlineOcrUpload
            section="other"
            documentType="beneficial_owner_kra_pin_copy"
            label="Upload KRA PIN certificate to auto-fill →"
            orgId={orgId}
            entityId={entityId}
            api={api}
            onExtracted={handleExtracted}
            setError={setError}
            personName={form.fullName}
            personRole="beneficial_owner"
            personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_kra_pin_copy')}
          />
          <PhotoUpload
            orgId={orgId}
            entityId={entityId}
            api={api}
            onUploaded={(name) => setPhotoUploaded(name)}
            setError={setError}
            personName={form.fullName}
            personRole="beneficial_owner"
            personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'passport_photo')}
          />
          {photoUploaded && (
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Uploaded: {photoUploaded}</p>
          )}
          <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
            Scraped details are a starting point only — please confirm everything, especially the nature and
            percentage of control, before saving.
          </p>
          <Field label="Full name" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID / passport number">
              <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </Field>
            <Field label="KRA PIN">
              <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nationality">
              <input type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
            </Field>
          </div>
          <Field label="Occupation / profession">
            <input type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Residential address">
            <input type="text" className={inputCls} style={inputStyle} value={form.residentialAddress} onChange={(e) => set({ residentialAddress: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Postal address">
              <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
            </Field>
            <Field label="Business address">
              <input type="text" className={inputCls} style={inputStyle} value={form.businessAddress} onChange={(e) => set({ businessAddress: e.target.value })} />
            </Field>
          </div>
          <Field label="Nature of ownership or control" required>
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. 25% shareholding, or right to appoint directors" value={form.natureOfControl} onChange={(e) => set({ natureOfControl: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Share percentage (if applicable)">
              <input type="number" min={0} max={100} className={inputCls} style={inputStyle} value={form.sharePercentage} onChange={(e) => set({ sharePercentage: e.target.value })} />
            </Field>
            <Field label="Date became beneficial owner">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateBecameBo} onChange={(e) => set({ dateBecameBo: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add beneficial owner'}</PrimaryButton>
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { patch({ noBeneficialOwners: false }); setForm(emptyBeneficialOwner()); setPhotoUploaded(null); setUploadedDocIds([]) }}
            className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            + Add beneficial owner
          </button>
          {beneficialOwners.length === 0 && (
            <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              <input
                type="checkbox"
                checked={wizard.noBeneficialOwners ?? false}
                onChange={(e) => patch({ noBeneficialOwners: e.target.checked })}
              />
              No declarable beneficial owner information is presently available
            </label>
          )}
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Partnership — Suitability (repurposes the Share Structure step slot,
// General Partnership Formation Workflow spec, 2026-08, section 5,
// GP-001–004). Advisory only — flags a mismatch but never blocks
// progress, per spec: "the user may nevertheless continue after
// acknowledging the distinction."
// ------------------------------------------------------------------
function StepPartnershipSuitability({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const mismatch =
    (wizard.gpOwnerCount != null && wizard.gpOwnerCount < 2) ||
    wizard.gpWantsSeparateLegalPersonality === true ||
    wizard.gpWantsLimitedLiability === true ||
    wizard.gpSameLiabilityBasis === false

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Is a general partnership right for you?
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        A few quick questions before we collect the full application — a general partnership isn&apos;t always
        the right structure, and it&apos;s cheaper to find that out now than after registration.
      </p>

      <Field label="How many people will own the business?" required>
        <input
          type="number" min={0} className={inputCls} style={inputStyle}
          value={wizard.gpOwnerCount ?? ''}
          onChange={(e) => patch({ gpOwnerCount: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        />
        {wizard.gpOwnerCount != null && wizard.gpOwnerCount < 2 && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A general partnership needs at least two owners. With one owner, a Sole Proprietorship is the
            appropriate structure — you can switch entity type on step 1.
          </p>
        )}
      </Field>

      <Field label="Do you want the business to have a legal personality separate from its owners?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ gpWantsSeparateLegalPersonality: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.gpWantsSeparateLegalPersonality === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.gpWantsSeparateLegalPersonality === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.gpWantsSeparateLegalPersonality === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A general partnership has no legal identity separate from its partners — an LLP or a limited
            company may suit you better. You can still continue with a general partnership if you prefer.
          </p>
        )}
      </Field>

      <Field label="Do you require the partners’ liability to be limited?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ gpWantsLimitedLiability: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.gpWantsLimitedLiability === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.gpWantsLimitedLiability === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.gpWantsLimitedLiability === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            In a general partnership, partners are personally responsible for the business&apos;s obligations.
            An LLP, Limited Partnership, or limited company would give you limited liability instead.
          </p>
        )}
      </Field>

      <Field label="Will all partners participate on substantially the same liability basis?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ gpSameLiabilityBasis: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.gpSameLiabilityBasis === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.gpSameLiabilityBasis === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.gpSameLiabilityBasis === false && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            If some partners should carry less liability than others, a Limited Partnership (at least one
            general partner and one limited partner) may be the better fit.
          </p>
        )}
      </Field>

      {mismatch && (
        <label className="flex items-start gap-3 ios-surface rounded-2xl p-4 cursor-pointer">
          <input
            type="checkbox" className="mt-0.5"
            checked={!!wizard.gpSuitabilityAcknowledged}
            onChange={(e) => patch({ gpSuitabilityAcknowledged: e.target.checked })}
          />
          <span className="text-ios-footnote leading-relaxed" style={{ color: 'var(--system-label)' }}>
            I understand a general partnership may not be the ideal structure based on my answers above, and
            I want to continue with a general partnership anyway.
          </span>
        </label>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Partnership — Governance (repurposes the Shareholders step slot,
// spec section 15, GP-062–067). Whole-partnership rules; per-partner
// interest % and contribution (GP-060/061) are captured on the
// Partners step instead, alongside each partner's identity.
// ------------------------------------------------------------------
function StepPartnershipGovernance({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Partnership governance
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        This isn&apos;t required by BRS to register the business name, but it gives you a proper governance
        record and feeds directly into your Partnership Agreement.
      </p>

      <Field label="How will profits and losses be shared?" required>
        <div className="grid grid-cols-3 gap-2">
          {([['proportional', 'By interest'], ['equal', 'Equally'], ['custom', 'Custom']] as const).map(([v, label]) => (
            <button
              key={v} type="button" onClick={() => patch({ profitLossSharing: v })}
              className="py-2.5 rounded-xl border text-xs font-medium"
              style={{
                borderColor: wizard.profitLossSharing === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.profitLossSharing === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      {wizard.profitLossSharing === 'custom' && (
        <Field label="Describe the custom arrangement" required>
          <textarea
            className={inputCls} style={inputStyle} rows={3}
            value={wizard.profitLossSharingCustom ?? ''}
            onChange={(e) => patch({ profitLossSharingCustom: e.target.value })}
          />
        </Field>
      )}

      <Field label="Who may operate the partnership's bank account?" required>
        <textarea
          className={inputCls} style={inputStyle} rows={2}
          placeholder="e.g. Any two partners acting jointly"
          value={wizard.bankAccountOperators ?? ''}
          onChange={(e) => patch({ bankAccountOperators: e.target.value })}
        />
      </Field>

      <Field label="Who has authority to bind the partnership?" required>
        <textarea
          className={inputCls} style={inputStyle} rows={2}
          placeholder="e.g. Each partner, acting individually, within the ordinary course of business"
          value={wizard.bindingAuthority ?? ''}
          onChange={(e) => patch({ bindingAuthority: e.target.value })}
        />
      </Field>

      <Field label="Are there limits on individual partner authority?">
        <textarea
          className={inputCls} style={inputStyle} rows={2}
          placeholder="e.g. No partner may commit the firm to spend above KES 500,000 without consent"
          value={wizard.authorityLimits ?? ''}
          onChange={(e) => patch({ authorityLimits: e.target.value })}
        />
      </Field>

      <Field label="What decisions require unanimous approval?">
        <textarea
          className={inputCls} style={inputStyle} rows={2}
          placeholder="e.g. Admitting a new partner, borrowing above a set limit"
          value={wizard.unanimousDecisions ?? ''}
          onChange={(e) => patch({ unanimousDecisions: e.target.value })}
        />
      </Field>

      <Field label="What decisions may be taken by majority?">
        <textarea
          className={inputCls} style={inputStyle} rows={2}
          placeholder="e.g. Day-to-day operational decisions"
          value={wizard.majorityDecisions ?? ''}
          onChange={(e) => patch({ majorityDecisions: e.target.value })}
        />
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Sole Proprietorship — Suitability Check (repurposes the Share
// Structure step slot, Sole Proprietorship Workflow spec, 2026-08,
// section 4, SP-001–004). Advisory, same pattern as the partnership
// suitability step — never blocks progress on its own.
// ------------------------------------------------------------------
function StepSoleProprietorshipSuitability({ wizard, patch, setEntityType }: {
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  setEntityType: (t: EntityType) => void
}) {
  const mismatch =
    wizard.spOwnerCount === 'two_or_more' ||
    wizard.spWantsSeparateLegalPersonality === true ||
    wizard.spWantsLimitedLiability === true ||
    wizard.spComfortableInPersonalCapacity === false

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Is a sole proprietorship right for you?
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        A few quick questions before we collect the full application.
      </p>

      <Field label="How many people will own the business?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'one' as const, label: 'One' }, { v: 'two_or_more' as const, label: 'Two or more' }].map(({ v, label }) => (
            <button
              key={v} type="button" onClick={() => patch({ spOwnerCount: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.spOwnerCount === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.spOwnerCount === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.spOwnerCount === 'two_or_more' && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A sole proprietorship has exactly one owner. With two or more, a General Partnership, LLP, or
            Limited Company is the appropriate structure.
          </p>
        )}
      </Field>

      <Field label="Do you want the business to have a legal identity separate from you personally?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ spWantsSeparateLegalPersonality: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.spWantsSeparateLegalPersonality === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.spWantsSeparateLegalPersonality === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.spWantsSeparateLegalPersonality === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A sole proprietorship does not provide that separation — you and the business are legally the
            same. A Limited Company or LLP would give you that instead.
          </p>
        )}
      </Field>

      <Field label="Do you require limited liability protection?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ spWantsLimitedLiability: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.spWantsLimitedLiability === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.spWantsLimitedLiability === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.spWantsLimitedLiability === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A sole proprietorship does not ordinarily provide limited liability — you remain personally
            responsible for the business&apos;s obligations. An incorporated structure would suit you better.
          </p>
        )}
      </Field>

      <Field label="Are you comfortable operating the business in your personal capacity as proprietor?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ spComfortableInPersonalCapacity: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.spComfortableInPersonalCapacity === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.spComfortableInPersonalCapacity === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {mismatch && (
        <label className="flex items-start gap-3 ios-surface rounded-2xl p-4 cursor-pointer">
          <input
            type="checkbox" className="mt-0.5"
            checked={!!wizard.spSuitabilityAcknowledged}
            onChange={(e) => patch({ spSuitabilityAcknowledged: e.target.checked })}
          />
          <span className="text-ios-footnote leading-relaxed" style={{ color: 'var(--system-label)' }}>
            I understand a sole proprietorship may not be the ideal structure based on my answers above, and
            I want to continue with a sole proprietorship anyway.
          </span>
        </label>
      )}
      {wizard.spOwnerCount === 'two_or_more' && (
        <button
          type="button"
          onClick={() => setEntityType('partnership')}
          className="text-ios-footnote font-medium"
          style={{ color: 'var(--brand-navy)' }}
        >
          Switch to General Partnership instead →
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Trust — Settlor Details (repurposes the Share Structure step slot,
// Trust Formation Workflow spec, 2026-08, section 8, TR-010–019).
// Reuses the beneficial_owners table/actions — same shape (identity +
// residential/postal address), no ownership-percentage semantics
// involved, so no schema change was needed. nature_of_control carries
// "relationship to proposed beneficiaries" (TR-019) instead.
// ------------------------------------------------------------------
type SettlorForm = {
  id?: string
  fullName: string
  idNumber: string
  kraPin: string
  nationality: string
  dateOfBirth: string
  postalAddress: string
  residentialAddress: string
  phone: string
  email: string
  relationshipToBeneficiaries: string
}

function emptySettlor(): SettlorForm {
  return {
    fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan', dateOfBirth: '',
    postalAddress: '', residentialAddress: '', phone: '', email: '', relationshipToBeneficiaries: '',
  }
}

function StepTrustSettlors({ settlors, setSettlors, orgId, entityId, api, setError, documents }: {
  settlors: BeneficialOwnerRow[]
  setSettlors: (s: BeneficialOwnerRow[]) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  documents: DocumentRow[]
}) {
  const [form, setForm] = useState<SettlorForm | null>(settlors.length === 0 ? emptySettlor() : null)
  const [busy, setBusy] = useState(false)
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])

  const set = (partial: Partial<SettlorForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))

  const handleExtracted = (fields: Record<string, unknown> | undefined) => {
    if (!fields) return
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => (prev ? {
      ...prev,
      fullName: prev.fullName || f.full_name || '',
      idNumber: prev.idNumber || f.id_number || '',
      kraPin: prev.kraPin || f.kra_pin || '',
      dateOfBirth: prev.dateOfBirth || f.date_of_birth || '',
    } : prev))
  }

  const save = async () => {
    if (!form) return
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (!form.idNumber.trim()) { setError('ID / passport number is required.'); return }
    if (!form.kraPin.trim()) { setError('KRA PIN is required.'); return }
    setError('')
    setBusy(true)
    try {
      const result = await api({
        action: 'upsert_beneficial_owner',
        beneficialOwner: {
          id: form.id,
          fullName: form.fullName.trim(),
          idNumber: form.idNumber.trim(),
          kraPin: form.kraPin.trim().toUpperCase(),
          nationality: form.nationality || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          postalAddress: form.postalAddress || undefined,
          residentialAddress: form.residentialAddress || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          natureOfControl: form.relationshipToBeneficiaries.trim() || 'Settlor',
        },
      })
      const updated: BeneficialOwnerRow = {
        id: result.id!,
        full_name: form.fullName.trim(),
        id_number: form.idNumber.trim(),
        kra_pin: form.kraPin.trim().toUpperCase(),
        nationality: form.nationality,
        date_of_birth: form.dateOfBirth || null,
        postal_address: form.postalAddress ? { text: form.postalAddress } : null,
        business_address: null,
        residential_address: form.residentialAddress ? { text: form.residentialAddress } : null,
        phone: form.phone || null,
        email: form.email || null,
        occupation: null,
        nature_of_control: form.relationshipToBeneficiaries.trim() || 'Settlor',
        date_became_bo: null,
        share_percentage: null,
      }
      setSettlors(form.id ? settlors.map((s) => (s.id === form.id ? updated : s)) : [...settlors, updated])
      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: result.id, personName: form.fullName.trim(), personRole: 'beneficial_owner' })
      }
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_beneficial_owner', id })
      setSettlors(settlors.filter((s) => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Settlor details
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        The person or persons establishing the trust. A trust may have one settlor, or several joint settlors.
      </p>

      {settlors.map((s) => (
        <div key={s.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{s.full_name}</p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>ID {s.id_number}{s.kra_pin ? ` · PIN ${s.kra_pin}` : ''}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => { setUploadedDocIds([]); setForm({
                id: s.id,
                fullName: s.full_name,
                idNumber: s.id_number ?? '',
                kraPin: s.kra_pin ?? '',
                nationality: s.nationality ?? 'Kenyan',
                dateOfBirth: s.date_of_birth ?? '',
                postalAddress: s.postal_address?.text ?? '',
                residentialAddress: s.residential_address?.text ?? '',
                phone: s.phone ?? '',
                email: s.email ?? '',
                relationshipToBeneficiaries: s.nature_of_control === 'Settlor' ? '' : (s.nature_of_control ?? ''),
              }) }}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(s.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <InlineOcrUpload
            section="other"
            documentType="beneficial_owner_id_copy"
            label={form.id ? 'Upload a replacement ID/passport →' : 'Upload ID/passport to auto-fill →'}
            orgId={orgId}
            entityId={entityId}
            api={api}
            onExtracted={handleExtracted}
            setError={setError}
            personName={form.fullName}
            personRole="beneficial_owner"
            personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_id_copy')}
          />
          <InlineOcrUpload
            section="other"
            documentType="beneficial_owner_kra_pin_copy"
            label={form.id ? 'Upload a replacement KRA PIN certificate →' : 'Upload KRA PIN certificate to auto-fill →'}
            orgId={orgId}
            entityId={entityId}
            api={api}
            onExtracted={handleExtracted}
            setError={setError}
            personName={form.fullName}
            personRole="beneficial_owner"
            personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_kra_pin_copy')}
          />
          <Field label="Full legal name" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID / passport number" required>
              <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </Field>
            <Field label="KRA PIN" required>
              <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nationality">
              <input type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Residential address">
            <input type="text" className={inputCls} style={inputStyle} value={form.residentialAddress} onChange={(e) => set({ residentialAddress: e.target.value })} />
          </Field>
          <Field label="Postal address">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
          </Field>
          <Field label="Relationship to proposed beneficiaries (if any)">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Parent of the beneficiaries" value={form.relationshipToBeneficiaries} onChange={(e) => set({ relationshipToBeneficiaries: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add settlor'}</PrimaryButton>
            {settlors.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setUploadedDocIds([]); setForm(emptySettlor()) }}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add another settlor
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Trust — Beneficiaries (repurposes the Shareholders step slot, Trust
// Formation Workflow spec, section 12). Named beneficiaries or a class
// (family trust) — reuses the shareholders table/actions purely for its
// person-record shape; shares_held is unused (kept at 0). Charitable
// trusts skip named beneficiaries entirely per spec section 13 — they
// capture charitable-objects fields on the Purpose Check step instead.
// ------------------------------------------------------------------
type BeneficiaryForm = {
  id?: string
  isClass: boolean
  name: string
  relationship: string
  dateOfBirth: string
  status: 'named' | 'future_unborn'
}

function emptyBeneficiary(): BeneficiaryForm {
  return { isClass: false, name: '', relationship: '', dateOfBirth: '', status: 'named' }
}

function StepTrustBeneficiaries({ wizard, patch, beneficiaries, setBeneficiaries, api, setError }: {
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  beneficiaries: ShareholderRow[]
  setBeneficiaries: (s: ShareholderRow[]) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
}) {
  const [form, setForm] = useState<BeneficiaryForm | null>(null)
  const [busy, setBusy] = useState(false)

  if (wizard.trustKind === 'charitable_trust') {
    return (
      <div className="space-y-5">
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Beneficiary model
        </h1>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          A charitable trust doesn&apos;t require individual beneficiaries the way a family trust does — these
          details describe who benefits from the charitable objects instead.
        </p>
        <Field label="Intended beneficiary class" required>
          <textarea className={inputCls} style={inputStyle} rows={2} placeholder="e.g. Residents of Kibera experiencing poverty" value={wizard.charitableBeneficiaryClass ?? ''} onChange={(e) => patch({ charitableBeneficiaryClass: e.target.value })} />
        </Field>
        <Field label="Geographic area">
          <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Nairobi County" value={wizard.charitableGeographicArea ?? ''} onChange={(e) => patch({ charitableGeographicArea: e.target.value })} />
        </Field>
        <Field label="Programme / activity areas">
          <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.charitableProgrammeAreas ?? ''} onChange={(e) => patch({ charitableProgrammeAreas: e.target.value })} />
        </Field>
        <Field label="Restrictions on application of trust property">
          <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.charitablePropertyRestrictions ?? ''} onChange={(e) => patch({ charitablePropertyRestrictions: e.target.value })} />
        </Field>
      </div>
    )
  }

  const save = async () => {
    if (!form) return
    if (!form.name.trim()) { setError(form.isClass ? 'Describe the class of beneficiaries.' : 'Beneficiary name is required.'); return }
    setError('')
    setBusy(true)
    try {
      const result = await api({
        action: 'upsert_shareholder',
        shareholder: { id: form.id, legalName: form.name.trim(), sharesHeld: 1, dateOfBirth: form.dateOfBirth || undefined },
      })
      const updated: ShareholderRow = {
        id: result.id!,
        legal_name: form.name.trim(),
        id_or_reg_number: null,
        kra_pin: null,
        shares_held: 1,
        share_percentage: null,
        address: { dateOfBirth: form.dateOfBirth || undefined },
        corporate_details: { isCorporate: false },
      }
      setBeneficiaries(form.id ? beneficiaries.map((b) => (b.id === form.id ? updated : b)) : [...beneficiaries, updated])
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_shareholder', id })
      setBeneficiaries(beneficiaries.filter((b) => b.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Beneficiaries
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Add named beneficiaries, or a class such as &quot;children of the settlor&quot; or &quot;future
        descendants&quot; — minors and unborn beneficiaries are fine, no contact details are forced.
      </p>

      {beneficiaries.map((b) => (
        <div key={b.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{b.legal_name}</p>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => setForm({ id: b.id, isClass: false, name: b.legal_name, relationship: '', dateOfBirth: (b.address as { dateOfBirth?: string } | null)?.dateOfBirth ?? '', status: 'named' })}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(b.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Named beneficiary, or a class?" required>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: false, label: 'Named person' }, { v: true, label: 'Class of beneficiaries' }].map(({ v, label }) => (
                <button
                  key={String(v)} type="button" onClick={() => setForm((prev) => (prev ? { ...prev, isClass: v } : prev))}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: form.isClass === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: form.isClass === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label={form.isClass ? 'Describe the class' : 'Full name'} required>
            <input
              type="text" className={inputCls} style={inputStyle}
              placeholder={form.isClass ? 'e.g. Children of the settlor' : undefined}
              value={form.name} onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
            />
          </Field>
          {!form.isClass && (
            <>
              <Field label="Relationship to settlor">
                <input type="text" className={inputCls} style={inputStyle} value={form.relationship} onChange={(e) => setForm((prev) => (prev ? { ...prev, relationship: e.target.value } : prev))} />
              </Field>
              <Field label="Date of birth (if known)">
                <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => setForm((prev) => (prev ? { ...prev, dateOfBirth: e.target.value } : prev))} />
              </Field>
            </>
          )}
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add beneficiary'}</PrimaryButton>
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm(emptyBeneficiary())}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add beneficiary
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Trust — Trust Property (repurposes the Beneficial Ownership step
// slot, Trust Formation Workflow spec, sections 15–16). Kept as a
// settings array on the wizard rather than its own table — the
// post-registration Trust Asset Register is a later phase.
// ------------------------------------------------------------------
const TRUST_PROPERTY_CATEGORIES: Array<{ value: NonNullable<WizardData['trustPropertyItems']>[number]['category']; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'land', label: 'Land' },
  { value: 'shares', label: 'Shares' },
  { value: 'investments', label: 'Investments' },
  { value: 'business_interests', label: 'Business interests' },
  { value: 'intellectual_property', label: 'Intellectual property' },
  { value: 'movable_property', label: 'Movable property' },
  { value: 'other', label: 'Other' },
]

function StepTrustProperty({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const items = wizard.trustPropertyItems ?? []
  const [form, setForm] = useState<NonNullable<WizardData['trustPropertyItems']>[number] | null>(null)

  const save = () => {
    if (!form) return
    const next = items.some((i) => i.id === form.id) ? items.map((i) => (i.id === form.id ? form : i)) : [...items, form]
    patch({ trustPropertyItems: next })
    setForm(null)
  }
  const remove = (id: string) => patch({ trustPropertyItems: items.filter((i) => i.id !== id) })

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Trust property
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        What property will initially be settled into the trust? Add each asset separately — you can mark
        whether it&apos;s already been transferred, or is only intended to be transferred later.
      </p>

      {items.map((i) => (
        <div key={i.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{i.description || TRUST_PROPERTY_CATEGORIES.find((c) => c.value === i.category)?.label}</p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              {TRUST_PROPERTY_CATEGORIES.find((c) => c.value === i.category)?.label} · {i.isVested ? 'Vested / transferred' : 'Intended'}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button type="button" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }} onClick={() => setForm(i)}>Edit</button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(i.id)}>Remove</button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Category" required>
            <select className={inputCls} style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
              {TRUST_PROPERTY_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Description" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Approximate value (KES)">
              <input type="text" className={inputCls} style={inputStyle} value={form.approxValue ?? ''} onChange={(e) => setForm({ ...form, approxValue: e.target.value })} />
            </Field>
            <Field label="Date settled / transferred">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateSettled ?? ''} onChange={(e) => setForm({ ...form, dateSettled: e.target.value })} />
            </Field>
          </div>
          <Field label="Ownership before settlement">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Held solely by the settlor" value={form.ownershipBefore ?? ''} onChange={(e) => setForm({ ...form, ownershipBefore: e.target.value })} />
          </Field>
          <Field label="Registration / reference details">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. title number, account number" value={form.registrationReference ?? ''} onChange={(e) => setForm({ ...form, registrationReference: e.target.value })} />
          </Field>
          <Field label="Has this property actually been transferred to the trustees?" required>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: true, label: 'Vested / transferred' }, { v: false, label: 'Intended only' }].map(({ v, label }) => (
                <button
                  key={String(v)} type="button" onClick={() => setForm({ ...form, isVested: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: form.isVested === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: form.isVested === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={save}>{items.some((i) => i.id === form.id) ? 'Update' : 'Add property'}</PrimaryButton>
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm({ id: crypto.randomUUID(), category: 'cash', description: '', isVested: false })}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add trust property
        </button>
      )}
      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        Supporting documents (title deeds, share certificates, bank/investment evidence) can be uploaded on the
        Document Vault step.
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Trust — Protector / Enforcer (repurposes the Company Secretary step
// slot, Trust Formation Workflow spec, section 14). Single optional
// role, not a repeating register, so it's captured as wizard fields
// rather than its own table.
// ------------------------------------------------------------------
function StepTrustProtector({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Protector / Enforcer
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Not every trust needs this role — it&apos;s someone appointed to supervise or monitor aspects of trust
        administration.
      </p>
      <Field label="Will the trust have a Protector or Enforcer?" required>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ hasProtector: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.hasProtector === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.hasProtector === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </Field>

      {wizard.hasProtector === true && (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Full name" required>
            <input type="text" className={inputCls} style={inputStyle} value={wizard.protectorName ?? ''} onChange={(e) => patch({ protectorName: e.target.value })} />
          </Field>
          <Field label="ID / registration information">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.protectorIdInfo ?? ''} onChange={(e) => patch({ protectorIdInfo: e.target.value })} />
          </Field>
          <Field label="Contact details">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.protectorContact ?? ''} onChange={(e) => patch({ protectorContact: e.target.value })} />
          </Field>
          <Field label="Powers">
            <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.protectorPowers ?? ''} onChange={(e) => patch({ protectorPowers: e.target.value })} />
          </Field>
          <Field label="Appointment date">
            <input type="date" className={inputCls} style={inputStyle} value={wizard.protectorAppointmentDate ?? ''} onChange={(e) => patch({ protectorAppointmentDate: e.target.value })} />
          </Field>
          <Field label="Replacement mechanism">
            <textarea className={inputCls} style={inputStyle} rows={2} placeholder="How is a replacement Protector/Enforcer appointed?" value={wizard.protectorReplacementMechanism ?? ''} onChange={(e) => patch({ protectorReplacementMechanism: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Society — Eligibility Assessment (repurposes the Share Structure step
// slot, Society Formation Workflow spec, 2026-08, section 4, SOC-001–
// 004). Advisory — flags likely-wrong entity choices but doesn't force
// the user off this path, same pattern as the trust/partnership/sole-
// proprietorship suitability checks.
// ------------------------------------------------------------------
const SOCIETY_CLASSIFICATIONS = [
  "Residents' / Property Owners' Association", 'Welfare Association', 'Club', 'Alumni Association',
  'Cultural Association', 'Professional / Membership Association', 'Religious / Faith-based Association',
  'Community Association', 'Other',
]

function StepSocietyEligibility({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Eligibility assessment
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        A few quick questions before we collect the full application — a Society isn&apos;t always the right
        legal vehicle.
      </p>

      <Field label="How many persons are forming the organisation?" required>
        <input
          type="number" min={0} className={inputCls} style={inputStyle}
          value={wizard.socFounderCount ?? ''}
          onChange={(e) => patch({ socFounderCount: e.target.value ? parseInt(e.target.value, 10) : undefined })}
        />
        {wizard.socFounderCount != null && wizard.socFounderCount < 10 && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A Society under the Societies Act generally requires an association of at least ten persons. Another
            organisational form may be more suitable — our team can advise.
          </p>
        )}
      </Field>

      <Field label="Is the organisation being formed primarily to carry on business for profit for its members?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ socIsForProfit: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.socIsForProfit === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.socIsForProfit === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.socIsForProfit === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            A Society may not be the appropriate legal structure for a for-profit purpose — a Partnership, LLP,
            or Company may suit you better.
          </p>
        )}
      </Field>

      <Field label="Is the organisation already registered under another legal framework?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ socAlreadyRegisteredElsewhere: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.socAlreadyRegisteredElsewhere === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.socAlreadyRegisteredElsewhere === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {wizard.socAlreadyRegisteredElsewhere === true && (
          <p className="text-ios-caption1 mt-1 rounded-lg p-2" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
            e.g. as a company, cooperative, trade union, school, or other statutory body — this will be flagged
            for manual review.
          </p>
        )}
      </Field>

      <Field label="What best describes the organisation?" required>
        <select className={inputCls} style={inputStyle} value={wizard.socClassification ?? ''} onChange={(e) => patch({ socClassification: e.target.value })}>
          <option value="" disabled>Choose…</option>
          {SOCIETY_CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Society — Membership Structure (repurposes the Shareholders step
// slot, spec section 8, SOC-030–035). Settings only — the founding
// member list itself is a separate step (Initial Members).
// ------------------------------------------------------------------
function StepSocietyMembershipStructure({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Membership structure
      </h1>
      <Field label="Who is eligible to become a member?" required>
        <textarea className={inputCls} style={inputStyle} rows={2} placeholder="e.g. Residents/property owners, former students, members of a profession" value={wizard.socMembershipEligibility ?? ''} onChange={(e) => patch({ socMembershipEligibility: e.target.value })} />
      </Field>
      <Field label="Are there different classes of membership?" required>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ socHasMembershipClasses: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.socHasMembershipClasses === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.socHasMembershipClasses === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </Field>
      {wizard.socHasMembershipClasses === true && (
        <Field label="Membership classes">
          <p className="text-ios-caption1 mb-2" style={{ color: 'var(--system-label-3)' }}>e.g. Ordinary, Associate, Honorary, Corporate, Life</p>
          <StringListEditor values={wizard.socMembershipClasses ?? ['']} onChange={(values) => patch({ socMembershipClasses: values })} placeholder="e.g. Ordinary Member" />
        </Field>
      )}
      <Field label="Admission process">
        <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socAdmissionProcess ?? ''} onChange={(e) => patch({ socAdmissionProcess: e.target.value })} />
      </Field>
      <Field label="Membership fees / subscriptions">
        <input type="text" className={inputCls} style={inputStyle} value={wizard.socMembershipFees ?? ''} onChange={(e) => patch({ socMembershipFees: e.target.value })} />
      </Field>
      <Field label="Voting rights by class">
        <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socVotingRights ?? ''} onChange={(e) => patch({ socVotingRights: e.target.value })} />
      </Field>
      <Field label="Termination / resignation / expulsion rules">
        <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socTerminationRules ?? ''} onChange={(e) => patch({ socTerminationRules: e.target.value })} />
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Society — Initial Members (repurposes the Beneficial Ownership step
// slot, spec sections 9–10). Reuses the shareholders table/actions
// purely for its person-record shape — shares_held is unused (kept at
// 1). Former members should be marked inactive, not deleted (spec
// section 10) — deletion here is only for a founding record entered in
// error before submission, not post-registration member lifecycle
// management (a later phase, same as other entities' post-formation
// lifecycle work).
// ------------------------------------------------------------------
type SocietyMemberForm = {
  id?: string
  fullName: string
  idNumber: string
  nationality: string
  address: string
  email: string
  phone: string
  membershipClass: string
  isFoundingMember: boolean
  dateAdmitted: string
  votingStatus: 'voting' | 'non_voting'
}

function emptySocietyMember(): SocietyMemberForm {
  return {
    fullName: '', idNumber: '', nationality: 'Kenyan', address: '', email: '', phone: '',
    membershipClass: '', isFoundingMember: true, dateAdmitted: new Date().toISOString().slice(0, 10), votingStatus: 'voting',
  }
}

function StepSocietyMembers({ members, setMembers, api, setError }: {
  members: ShareholderRow[]
  setMembers: (m: ShareholderRow[]) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
}) {
  const [form, setForm] = useState<SocietyMemberForm | null>(members.length === 0 ? emptySocietyMember() : null)
  const [busy, setBusy] = useState(false)
  const set = (partial: Partial<SocietyMemberForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))

  const save = async () => {
    if (!form) return
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    setError('')
    setBusy(true)
    try {
      const result = await api({
        action: 'upsert_shareholder',
        shareholder: {
          id: form.id,
          legalName: form.fullName.trim(),
          idNumber: form.idNumber || undefined,
          sharesHeld: 1,
          physicalAddress: form.address || undefined,
          nationality: form.nationality || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          membershipClass: form.membershipClass || undefined,
          isFoundingMember: form.isFoundingMember,
          dateAdmitted: form.dateAdmitted || undefined,
          votingStatus: form.votingStatus,
        },
      })
      const updated: ShareholderRow = {
        id: result.id!,
        legal_name: form.fullName.trim(),
        id_or_reg_number: form.idNumber || null,
        kra_pin: null,
        phone: form.phone || null,
        email: form.email || null,
        shares_held: 1,
        share_percentage: null,
        address: {
          physicalAddress: form.address || undefined, nationality: form.nationality || undefined,
          membershipClass: form.membershipClass || undefined, isFoundingMember: form.isFoundingMember,
          dateAdmitted: form.dateAdmitted || undefined, votingStatus: form.votingStatus,
        },
        corporate_details: { isCorporate: false },
      }
      setMembers(form.id ? members.map((m) => (m.id === form.id ? updated : m)) : [...members, updated])
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      await api({ action: 'delete_shareholder', id })
      setMembers(members.filter((m) => m.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Initial members
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        The founding membership list — this becomes the Member Register once the Society is registered.
      </p>

      {members.map((m) => (
        <div key={m.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{m.legal_name}</p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{m.address?.membershipClass || 'Ordinary member'}</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              className="text-ios-footnote font-medium"
              style={{ color: 'var(--brand-navy)' }}
              onClick={() => setForm({
                id: m.id,
                fullName: m.legal_name,
                idNumber: m.id_or_reg_number ?? '',
                nationality: m.address?.nationality ?? 'Kenyan',
                address: m.address?.physicalAddress ?? '',
                email: m.email ?? '',
                phone: m.phone ?? '',
                membershipClass: m.address?.membershipClass ?? '',
                isFoundingMember: m.address?.isFoundingMember ?? true,
                dateAdmitted: m.address?.dateAdmitted ?? '',
                votingStatus: (m.address?.votingStatus as SocietyMemberForm['votingStatus']) ?? 'voting',
              })}
            >
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(m.id)} disabled={busy}>
              Remove
            </button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Full name" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID / passport">
              <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </Field>
            <Field label="Nationality">
              <input type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <input type="text" className={inputCls} style={inputStyle} value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Membership class">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Ordinary Member" value={form.membershipClass} onChange={(e) => set({ membershipClass: e.target.value })} />
          </Field>
          <Field label="Date admitted">
            <input type="date" className={inputCls} style={inputStyle} value={form.dateAdmitted} onChange={(e) => set({ dateAdmitted: e.target.value })} />
          </Field>
          <Field label="Voting status" required>
            <div className="grid grid-cols-2 gap-2">
              {(['voting', 'non_voting'] as const).map((v) => (
                <button
                  key={v} type="button" onClick={() => set({ votingStatus: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium capitalize"
                  style={{
                    borderColor: form.votingStatus === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: form.votingStatus === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {v.replace('_', '-')}
                </button>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            <input type="checkbox" checked={form.isFoundingMember} onChange={(e) => set({ isFoundingMember: e.target.checked })} />
            Founding member
          </label>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add member'}</PrimaryButton>
            {members.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm(emptySocietyMember())}
          className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Add another member
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Society — Governing Committee (repurposes the Company Secretary step
// slot, spec section 14). Settings only, not a repeating register.
// ------------------------------------------------------------------
function StepSocietyGoverningCommittee({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Governing committee
      </h1>
      <Field label="Does the Society have a Committee, Council, Executive Committee or other governing body?" required>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ socHasGoverningBody: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.socHasGoverningBody === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.socHasGoverningBody === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </Field>

      {wizard.socHasGoverningBody === true && (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Name of body" required>
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Executive Committee" value={wizard.socGoverningBodyName ?? ''} onChange={(e) => patch({ socGoverningBodyName: e.target.value })} />
          </Field>
          <Field label="Positions">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Chairperson, Secretary, Treasurer" value={wizard.socGoverningBodyPositions ?? ''} onChange={(e) => patch({ socGoverningBodyPositions: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of members">
              <input type="text" className={inputCls} style={inputStyle} value={wizard.socGoverningBodySize ?? ''} onChange={(e) => patch({ socGoverningBodySize: e.target.value })} />
            </Field>
            <Field label="Quorum" required>
              <input type="text" className={inputCls} style={inputStyle} value={wizard.socGoverningBodyQuorum ?? ''} onChange={(e) => patch({ socGoverningBodyQuorum: e.target.value })} />
            </Field>
          </div>
          <Field label="Term">
            <input type="text" className={inputCls} style={inputStyle} value={wizard.socGoverningBodyTerm ?? ''} onChange={(e) => patch({ socGoverningBodyTerm: e.target.value })} />
          </Field>
          <Field label="Appointment / election procedure">
            <textarea className={inputCls} style={inputStyle} rows={2} value={wizard.socGoverningBodyProcedure ?? ''} onChange={(e) => patch({ socGoverningBodyProcedure: e.target.value })} />
          </Field>
          <Field label="Decision-making threshold">
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Simple majority" value={wizard.socGoverningBodyDecisionThreshold ?? ''} onChange={(e) => patch({ socGoverningBodyDecisionThreshold: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 8 — Share capital
// ------------------------------------------------------------------
function emptyShareClass(): ShareClass {
  return {
    id: crypto.randomUUID(), name: '', type: 'ordinary', shares: 0, nominalValue: 100,
    votingRights: '', dividendRights: '', redemptionRights: '', liquidationPriority: '',
  }
}

function StepShareCapital({ wizard, patch, shareholders }: {
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  shareholders: ShareholderRow[]
}) {
  const allocated = shareholders.reduce((s, x) => s + x.shares_held, 0)
  const nominal = wizard.nominalValuePerShare ?? 0
  const totalShares = wizard.totalShares ?? 0
  const computedCapital = nominal * totalShares
  const multi = wizard.useMultipleShareClasses ?? false

  // Kenyan law requires 100% issuance — no separate "authorised but
  // unissued" concept anymore (Charles, 2026 call). Nominal value ×
  // total shares *is* the authorised capital; keep authorisedShareCapital
  // in sync since it's read elsewhere (secretary threshold, review, IDP,
  // entities.nominal_capital mirror).
  const setNominal = (v: number) => patch({ nominalValuePerShare: v, authorisedShareCapital: v * totalShares })
  const setTotalShares = (v: number) => patch({ totalShares: v, authorisedShareCapital: nominal * v })
  const classes = wizard.shareClassList ?? []

  const setClass = (id: string, partial: Partial<ShareClass>) =>
    patch({ shareClassList: classes.map((c) => (c.id === id ? { ...c, ...partial } : c)) })
  const addClass = () => patch({ shareClassList: [...classes, emptyShareClass()] })
  const removeClass = (id: string) => patch({ shareClassList: classes.filter((c) => c.id !== id) })

  const classTotalShares = classes.reduce((s, c) => s + (c.shares || 0), 0)
  const classTotalCapital = classes.reduce((s, c) => s + (c.shares || 0) * (c.nominalValue || 0), 0)

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Share capital &amp; structure
      </h1>

      <Field label="Does the company have a single share class or multiple share classes?" required>
        <div className="grid grid-cols-2 gap-2">
          {([[false, 'Single (ordinary shares)'], [true, 'Multiple classes']] as const).map(([v, l]) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ useMultipleShareClasses: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: multi === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: multi === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>

      {!multi ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nominal value per share (KES)" required>
              <input
                type="number" min={1} className={inputCls} style={inputStyle}
                value={nominal || ''}
                onChange={(e) => setNominal(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
            <Field label="Total number of shares" required>
              <input
                type="number" min={1} className={inputCls} style={inputStyle}
                value={totalShares || ''}
                onChange={(e) => setTotalShares(parseInt(e.target.value, 10) || 0)}
              />
            </Field>
          </div>
          <div className="ios-surface rounded-2xl p-4 space-y-1">
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              Authorised share capital: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>KES {computedCapital.toLocaleString()}</span>
            </p>
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
              Nominal value × total shares. Kenyan law requires shares to be fully issued, so the shareholders
              step will ask you to allocate all {totalShares.toLocaleString()} shares between shareholders.
            </p>
            {allocated > 0 && (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                {allocated.toLocaleString()} of {totalShares.toLocaleString()} already allocated to shareholders.
              </p>
            )}
          </div>
          <Field label="Classes of shares" required>
            <div className="grid grid-cols-2 gap-2">
              {([['ordinary', 'Ordinary only'], ['ordinary_preference', 'Ordinary + preference']] as const).map(([v, l]) => (
                <button
                  key={v} type="button" onClick={() => patch({ shareClasses: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: (wizard.shareClasses ?? 'ordinary') === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: (wizard.shareClasses ?? 'ordinary') === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Voting rights" required>
            <div className="grid grid-cols-2 gap-2">
              {([['one_share_one_vote', 'One share, one vote'], ['weighted', 'Weighted voting']] as const).map(([v, l]) => (
                <button
                  key={v} type="button" onClick={() => patch({ votingRights: v })}
                  className="py-2.5 rounded-xl border text-sm font-medium"
                  style={{
                    borderColor: (wizard.votingRights ?? 'one_share_one_vote') === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                    background: (wizard.votingRights ?? 'one_share_one_vote') === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    color: 'var(--system-label)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </>
      ) : (
        <>
          {classes.map((c, i) => (
            <div key={c.id} className="ios-surface rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>Class {i + 1}</p>
                <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => removeClass(c.id)}>Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Class name" required>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Class A" value={c.name} onChange={(e) => setClass(c.id, { name: e.target.value })} />
                </Field>
                <Field label="Type" required>
                  <select className={inputCls} style={inputStyle} value={c.type} onChange={(e) => setClass(c.id, { type: e.target.value as ShareClass['type'] })}>
                    {SHARE_CLASS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number of shares" required>
                  <input type="number" min={0} className={inputCls} style={inputStyle} value={c.shares || ''} onChange={(e) => setClass(c.id, { shares: parseInt(e.target.value, 10) || 0 })} />
                </Field>
                <Field label="Nominal value per share (KES)" required>
                  <input type="number" min={0} className={inputCls} style={inputStyle} value={c.nominalValue || ''} onChange={(e) => setClass(c.id, { nominalValue: parseInt(e.target.value, 10) || 0 })} />
                </Field>
              </div>
              <Field label="Voting rights">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. one vote per share, or none" value={c.votingRights} onChange={(e) => setClass(c.id, { votingRights: e.target.value })} />
              </Field>
              <Field label="Dividend rights">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. pari passu, or fixed 8% cumulative" value={c.dividendRights} onChange={(e) => setClass(c.id, { dividendRights: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Redemption rights">
                  <input type="text" className={inputCls} style={inputStyle} placeholder="If any" value={c.redemptionRights} onChange={(e) => setClass(c.id, { redemptionRights: e.target.value })} />
                </Field>
                <Field label="Priority on liquidation">
                  <input type="text" className={inputCls} style={inputStyle} placeholder="If any" value={c.liquidationPriority} onChange={(e) => setClass(c.id, { liquidationPriority: e.target.value })} />
                </Field>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addClass}
            className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            + Add share class
          </button>

          {classes.length > 0 && (
            <div className="ios-surface rounded-2xl p-4 space-y-1">
              <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                Total issued shares across classes: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>{classTotalShares.toLocaleString()}</span>
              </p>
              <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                Total issued capital: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>KES {classTotalCapital.toLocaleString()}</span>
              </p>
            </div>
          )}

          <Field label="Authorised share capital (KES)" required>
            <input
              type="number" min={classTotalCapital} className={inputCls} style={inputStyle}
              value={wizard.authorisedShareCapital ?? ''}
              onChange={(e) => patch({ authorisedShareCapital: parseInt(e.target.value, 10) || 0 })}
            />
          </Field>

          <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            <input type="checkbox" checked={wizard.votingRights === 'weighted'} onChange={(e) => patch({ votingRights: e.target.checked ? 'weighted' : 'one_share_one_vote' })} />
            The company uses weighted voting
          </label>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 8 — Company secretary
// ------------------------------------------------------------------
function StepSecretary({ entityType, wizard, patch }: {
  entityType: EntityType
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
}) {
  const isPlc = entityType === 'public_limited_company'
  const overThreshold = (wizard.authorisedShareCapital ?? 0) > SECRETARY_CAPITAL_THRESHOLD_KES
  const mandatory = isPlc || overThreshold
  const secretary = wizard.secretary ?? { fullName: '', idNumber: '', kraPin: '', phone: '', email: '', address: '' }
  const setSec = (partial: Partial<typeof secretary>) => patch({ secretary: { ...secretary, ...partial } })

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Company secretary
      </h1>
      {overThreshold && !isPlc && (
        <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(255,149,0,0.10)', color: '#C77700' }}>
          Authorised share capital is above KES {SECRETARY_CAPITAL_THRESHOLD_KES.toLocaleString()}, so a company
          secretary is required.
        </p>
      )}
      <Field label={mandatory ? 'A company secretary is required' : 'Will you appoint a company secretary?'} required>
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)} type="button"
              disabled={mandatory && !v}
              onClick={() => patch({ hasCompanySecretary: v })}
              className="py-2.5 rounded-xl border text-sm font-medium disabled:opacity-40"
              style={{
                borderColor: wizard.hasCompanySecretary === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.hasCompanySecretary === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </Field>

      {wizard.hasCompanySecretary === true && (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Full name" required>
            <input type="text" className={inputCls} style={inputStyle} value={secretary.fullName} onChange={(e) => setSec({ fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID number">
              <input type="text" className={inputCls} style={inputStyle} value={secretary.idNumber} onChange={(e) => setSec({ idNumber: e.target.value })} />
            </Field>
            <Field label="KRA PIN">
              <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={secretary.kraPin} onChange={(e) => setSec({ kraPin: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input type="tel" className={inputCls} style={inputStyle} value={secretary.phone} onChange={(e) => setSec({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={secretary.email} onChange={(e) => setSec({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <input type="text" className={inputCls} style={inputStyle} value={secretary.address} onChange={(e) => setSec({ address: e.target.value })} />
          </Field>
        </div>
      )}

      {wizard.hasCompanySecretary === false && !isPlc && (
        <p className="text-ios-footnote ios-surface rounded-2xl p-4" style={{ color: 'var(--system-label-2)' }}>
          Noted — for a private limited company, a director may perform the secretary’s duties where no
          secretary is appointed.
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 9 — Employees
// ------------------------------------------------------------------
function StepEmployees({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Employee information
      </h1>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Permanent employees">
          <input type="number" min={0} className={inputCls} style={inputStyle} value={wizard.permanentEmployees ?? ''} onChange={(e) => patch({ permanentEmployees: parseInt(e.target.value, 10) || 0 })} />
        </Field>
        <Field label="Casual / temporary">
          <input type="number" min={0} className={inputCls} style={inputStyle} value={wizard.casualEmployees ?? ''} onChange={(e) => patch({ casualEmployees: parseInt(e.target.value, 10) || 0 })} />
        </Field>
      </div>
      <Field label="Will you register employees for NSSF/SHA?" required>
        <div className="grid grid-cols-3 gap-2">
          {([['yes', 'Yes'], ['no', 'No'], ['already_registered', 'Already registered']] as const).map(([v, l]) => (
            <button
              key={v} type="button" onClick={() => patch({ nssfNhifStatus: v })}
              className="py-2.5 rounded-xl border text-xs font-medium"
              style={{
                borderColor: wizard.nssfNhifStatus === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.nssfNhifStatus === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Expected payroll frequency" required>
        <select className={inputCls} style={inputStyle} value={wizard.payrollFrequency ?? ''} onChange={(e) => patch({ payrollFrequency: e.target.value })}>
          <option value="" disabled>Choose…</option>
          {PAYROLL_FREQUENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 10 — Document upload & review (OCR cross-check)
// Labeled sections tell the extractor who each document belongs to, so
// directors/shareholders/address fields are pre-filled before the user
// reaches those steps — they confirm instead of typing.
// ------------------------------------------------------------------
type UploadSection = {
  key: 'director' | 'shareholder' | 'address' | 'other'
  title: string
  hint: string
  documentType: string
  visible: (entityType: EntityType, wizard: WizardData) => boolean
}

const UPLOAD_SECTIONS: UploadSection[] = [
  {
    key: 'director',
    title: 'Director / partner documents — ID or passport',
    hint: 'National IDs or passports — one file per person.',
    documentType: 'director_id_copy',
    visible: (t) => t !== 'sole_proprietorship' && t !== 'trust' && t !== 'society',
  },
  {
    key: 'director',
    title: 'Director / partner documents — KRA PIN',
    hint: 'KRA PIN certificates — one file per person.',
    documentType: 'director_kra_pin_copy',
    visible: (t) => t !== 'sole_proprietorship' && t !== 'trust' && t !== 'society',
  },
  {
    key: 'director',
    title: 'Owner documents — ID or passport',
    hint: 'Your national ID or passport.',
    documentType: 'director_id_copy',
    visible: (t) => t === 'sole_proprietorship',
  },
  {
    key: 'director',
    title: 'Owner documents — KRA PIN',
    hint: 'Your KRA PIN certificate.',
    documentType: 'director_kra_pin_copy',
    visible: (t) => t === 'sole_proprietorship',
  },
  {
    key: 'director',
    title: 'Trustee documents — ID or passport',
    hint: 'National IDs or passports — one file per trustee.',
    documentType: 'director_id_copy',
    visible: (t) => t === 'trust',
  },
  {
    key: 'director',
    title: 'Trustee documents — KRA PIN',
    hint: 'KRA PIN certificates — one file per trustee.',
    documentType: 'director_kra_pin_copy',
    visible: (t) => t === 'trust',
  },
  {
    key: 'shareholder',
    title: 'Shareholder / member documents — ID or passport',
    hint: 'IDs or passports for each shareholder or member.',
    documentType: 'shareholder_id_copy',
    visible: (t) =>
      t === 'limited_company' || t === 'public_limited_company' || t === 'cooperative' || t === 'limited_liability_partnership',
  },
  {
    key: 'shareholder',
    title: 'Shareholder / member documents — KRA PIN',
    hint: 'KRA PIN certificates for each shareholder or member.',
    documentType: 'shareholder_kra_pin_copy',
    visible: (t) =>
      t === 'limited_company' || t === 'public_limited_company' || t === 'cooperative' || t === 'limited_liability_partnership',
  },
  {
    key: 'shareholder',
    title: 'Beneficiary documents — ID or passport (optional)',
    hint: 'IDs for any named beneficiary who can reasonably provide one.',
    documentType: 'shareholder_id_copy',
    visible: (t, w) => t === 'trust' && w.trustKind === 'family_trust',
  },
  {
    key: 'other',
    title: 'Beneficial owner documents — ID or passport (optional)',
    hint: 'IDs for any beneficial owner not already captured as a director or shareholder.',
    documentType: 'beneficial_owner_id_copy',
    visible: (t) => SHAREHOLDER_TYPES.includes(t),
  },
  {
    key: 'other',
    title: 'Beneficial owner documents — KRA PIN (optional)',
    hint: 'KRA PIN certificates for any beneficial owner not already captured as a director or shareholder.',
    documentType: 'beneficial_owner_kra_pin_copy',
    visible: (t) => SHAREHOLDER_TYPES.includes(t),
  },
  {
    key: 'other',
    title: 'Settlor documents — ID or passport',
    hint: 'National IDs or passports — one file per settlor.',
    documentType: 'beneficial_owner_id_copy',
    visible: (t) => t === 'trust',
  },
  {
    key: 'other',
    title: 'Settlor documents — KRA PIN',
    hint: 'KRA PIN certificates — one file per settlor.',
    documentType: 'beneficial_owner_kra_pin_copy',
    visible: (t) => t === 'trust',
  },
  {
    key: 'other',
    title: 'Trust Deed',
    hint: 'Whatever was uploaded or prepared on the previous step lives here too.',
    documentType: 'trust_deed',
    visible: (t) => t === 'trust',
  },
  {
    key: 'other',
    title: 'Trust property documents (optional)',
    hint: 'Title deeds, share certificates, bank/investment evidence, or valuations for property listed on the Trust Property step.',
    documentType: 'trust_property_document',
    visible: (t) => t === 'trust',
  },
  {
    key: 'director',
    title: 'Officer documents — ID or passport',
    hint: 'National IDs or passports — one file per officer.',
    documentType: 'director_id_copy',
    visible: (t) => t === 'society',
  },
  {
    key: 'director',
    title: 'Officer documents — KRA PIN',
    hint: 'KRA PIN certificates — one file per officer.',
    documentType: 'director_kra_pin_copy',
    visible: (t) => t === 'society',
  },
  {
    key: 'shareholder',
    title: 'Member documents — ID or passport (optional)',
    hint: 'IDs or passports for founding members who can reasonably provide one.',
    documentType: 'shareholder_id_copy',
    visible: (t) => t === 'society',
  },
  {
    key: 'other',
    title: 'Constitution',
    hint: 'Whatever was uploaded or prepared on the previous step lives here too.',
    documentType: 'constitution',
    visible: (t) => t === 'society',
  },
  {
    key: 'other',
    title: 'Founding meeting records (optional)',
    hint: 'Notice, agenda, attendance list, founding minutes and resolutions.',
    documentType: 'founding_minutes',
    visible: (t) => t === 'society',
  },
  {
    key: 'other',
    title: 'Property documents (optional)',
    hint: 'Title/reference documents for property listed on the Objects & Registered Office step.',
    documentType: 'society_property_document',
    visible: (t) => t === 'society',
  },
  {
    key: 'address',
    title: 'Proof of registered office (optional)',
    hint: 'Utility bill, bank/mobile money statement, signed lease, landlord letter, or official correspondence showing the address — issued within the last 3 months where applicable. Upload later if you don’t have one yet.',
    documentType: 'proof_of_address',
    visible: () => true,
  },
  // Forms/package stage (LLC-Only Developer Implementation Spec upload
  // timing matrix): these are generated from the data already entered,
  // signed, then uploaded back — required at this stage, unlike the
  // certificate of incorporation which doesn't exist until after approval.
  {
    key: 'other',
    title: 'Signed CR1 (application for registration)',
    hint: 'Download and complete from the BRS eCitizen portal using the details you’ve entered, sign, then upload here.',
    documentType: 'signed_cr1',
    visible: (t) => t !== 'partnership' && t !== 'sole_proprietorship' && t !== 'trust' && t !== 'society',
  },
  {
    key: 'other',
    title: 'Signed CR2 (memorandum of registration)',
    hint: 'For companies limited by shares.',
    documentType: 'signed_cr2',
    visible: (t) => t === 'limited_company' || t === 'public_limited_company',
  },
  {
    key: 'other',
    title: 'Signed CR8 (particulars of directors)',
    hint: 'Lists all directors captured in this application.',
    documentType: 'signed_cr8',
    visible: (t) => t !== 'partnership' && t !== 'sole_proprietorship' && t !== 'trust' && t !== 'society',
  },
  {
    key: 'other',
    title: 'Signed BN2 (business name registration)',
    hint: 'Download and complete from the BRS eCitizen portal using the details you’ve entered, sign, then upload here.',
    documentType: 'signed_bn2',
    visible: (t) => t === 'partnership' || t === 'sole_proprietorship',
  },
  {
    key: 'other',
    title: 'Partnership Agreement',
    hint: 'Whatever was uploaded or prepared on the previous step lives here too.',
    documentType: 'partnership_agreement',
    visible: (t) => t === 'partnership',
  },
  {
    key: 'other',
    title: 'Statement of nominal capital',
    hint: 'Matches the share capital entered in this application.',
    documentType: 'statement_of_nominal_capital',
    visible: (t) => t === 'limited_company' || t === 'public_limited_company',
  },
  {
    key: 'other',
    title: 'Signed BOF1 (beneficial ownership filing)',
    hint: 'Declares the natural persons who ultimately own or control the company.',
    documentType: 'signed_bof1',
    visible: (t) => SHAREHOLDER_TYPES.includes(t),
  },
  {
    key: 'other',
    title: 'Corporate party — certificate of incorporation',
    hint: 'For any shareholder or director that is itself a company. Upload one file per corporate party if there is more than one.',
    documentType: 'corporate_certificate_of_incorporation',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Corporate party — board resolution / power of attorney',
    hint: 'Authorising the named representative to act for the corporate shareholder or director.',
    documentType: 'corporate_authority_document',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Corporate party — tax certificate',
    hint: 'The corporate party’s own KRA PIN or equivalent foreign tax certificate.',
    documentType: 'corporate_tax_certificate',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Corporate party — good standing certificate (foreign only)',
    hint: 'Required only if the corporate shareholder or director is registered outside Kenya.',
    documentType: 'corporate_good_standing',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Corporate party — representative ID',
    hint: 'National ID or passport of the person representing the corporate shareholder or director.',
    documentType: 'corporate_representative_id',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Foreign company constitutional documents (optional)',
    hint: 'For a foreign corporate shareholder or director — their memorandum and articles under their own jurisdiction, since these won’t match the Kenyan standard-model/custom-articles split.',
    documentType: 'foreign_constitutional_documents',
    visible: () => true,
  },
  {
    key: 'other',
    title: 'Other supporting documents',
    hint: 'Partnership deeds, trust deeds, by-laws, draft employment contracts — anything else relevant.',
    documentType: 'other',
    visible: () => true,
  },
]


// ------------------------------------------------------------------
// Step 10 — Constitutional documents & forms (LLC spec screen 9).
// Standard vs custom articles, plus context on the forms generated from
// data already entered — CR1/CR2/CR8 and statement of nominal capital
// aren't asked for as uploads until the next step, once this data exists.
// ------------------------------------------------------------------
function SimpleDocumentUpload({ orgId, entityId, api, setError, documentType, documents, onUploaded, label }: {
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
  documentType: string
  documents: DocumentRow[]
  onUploaded: () => Promise<void>
  label?: string
}) {
  const [busy, setBusy] = useState(false)
  const existing = documents.filter((d) => d.document_type === documentType)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !orgId || !entityId) return
    setError('')
    setBusy(true)
    try {
      const supabase = createClient()
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { setError('File is over 10MB — please compress it.'); continue }
        const safeName = file.name.replace(/[^\w.\-]+/g, '_')
        const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
        if (uploadError) { setError('Upload failed — try again.'); continue }
        await api({ action: 'register_document', document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType } })
      }
      await onUploaded()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {existing.length > 0 && (
        <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
          {existing.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => d.file_path && openStoredDocument(d.file_path, setError)}
              className="block w-full text-left text-ios-footnote truncate underline decoration-dotted"
              style={{ color: 'var(--system-label)' }}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
      <label className="block w-full rounded-xl border-2 border-dashed p-3 text-center cursor-pointer" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={busy}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />
        <span className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
          {busy ? 'Uploading…' : (label ?? (existing.length > 0 ? '+ Add another' : 'Upload files →'))}
        </span>
      </label>
    </div>
  )
}

function StepConstitutional({ entityType, wizard, patch, orgId, entityId, api, setError, documents, onExtracted }: {
  entityType: EntityType
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
  documents: DocumentRow[]
  onExtracted: () => Promise<void>
}) {
  if (entityType === 'partnership') {
    return (
      <div className="space-y-5">
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Partnership Agreement
        </h1>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          BRS doesn&apos;t require a Partnership Agreement to register a business name, but having one is good
          governance practice — it&apos;s where the answers you gave on the previous step (profit sharing,
          authority, decision rules) actually take effect.
        </p>
        <Field label="Do you already have a Partnership Agreement?" required>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: true, label: 'Yes, I have one' }, { v: false, label: 'No, prepare one' }].map(({ v, label }) => (
              <button
                key={String(v)} type="button" onClick={() => patch({ hasPartnershipAgreement: v })}
                className="py-2.5 rounded-xl border text-sm font-medium"
                style={{
                  borderColor: wizard.hasPartnershipAgreement === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: wizard.hasPartnershipAgreement === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                  color: 'var(--system-label)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        {wizard.hasPartnershipAgreement === true && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>Upload your agreement</p>
            <SimpleDocumentUpload
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              documentType="partnership_agreement"
              documents={documents}
              onUploaded={onExtracted}
              label="Upload Partnership Agreement →"
            />
          </div>
        )}
        {wizard.hasPartnershipAgreement === false && (
          <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
            We&apos;ll prepare a draft Partnership Agreement from the partners, contributions, and governance
            answers you&apos;ve already provided — our team will follow up once you submit.
          </p>
        )}
        <div className="rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
          <p className="text-ios-footnote font-medium mb-1" style={{ color: 'var(--system-label)' }}>
            Form we&apos;ll generate for you
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Using the details you&apos;ve entered, we generate BN2 (application for registration of a business
            name). Download, sign, and upload it back on the next step.
          </p>
        </div>
      </div>
    )
  }

  if (entityType === 'trust') {
    return (
      <div className="space-y-5">
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Trust Deed
        </h1>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          The Trust Deed is the constitutive instrument that actually creates the trust — distinct from any
          later incorporation of the trustees.
        </p>
        <Field label="Do you already have a Trust Deed?" required>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: true, label: 'Yes, I have one' }, { v: false, label: 'No, prepare one' }].map(({ v, label }) => (
              <button
                key={String(v)} type="button" onClick={() => patch({ hasTrustDeed: v })}
                className="py-2.5 rounded-xl border text-sm font-medium"
                style={{
                  borderColor: wizard.hasTrustDeed === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: wizard.hasTrustDeed === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                  color: 'var(--system-label)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        {wizard.hasTrustDeed === true && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>Upload your Trust Deed</p>
            <SimpleDocumentUpload
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              documentType="trust_deed"
              documents={documents}
              onUploaded={onExtracted}
              label="Upload Trust Deed →"
            />
          </div>
        )}
        {wizard.hasTrustDeed === false && (
          <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
            We&apos;ll prepare a draft Trust Deed from the settlor, trustee, beneficiary, and governance answers
            you&apos;ve already provided. Given the legal significance of the deed, professional review is
            required before execution — our team will follow up once you submit.
          </p>
        )}
        <Field label="Proposed name for the incorporated trustees (if seeking incorporation)">
          <input
            type="text" className={inputCls} style={inputStyle}
            placeholder="May differ from the trust name itself"
            value={wizard.trusteeCorporateName ?? ''} onChange={(e) => patch({ trusteeCorporateName: e.target.value })}
          />
        </Field>
        <div className="rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
          <p className="text-ios-footnote font-medium mb-1" style={{ color: 'var(--system-label)' }}>
            Trust creation vs. trustee incorporation
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Executing the Trust Deed creates the trust. Incorporating the trustees under the Trustees (Perpetual
            Succession) Act — giving them a body corporate with perpetual succession — is a separate, later step
            our team will guide you through once the trust itself is created.
          </p>
        </div>
      </div>
    )
  }

  if (entityType === 'society') {
    return (
      <div className="space-y-5">
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Constitution
        </h1>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          The Constitution is the Society&apos;s core governance document — name, objects, membership, officers,
          meetings, finances, amendment, and dissolution provisions all live here.
        </p>
        <Field label="Do you already have a Constitution?" required>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: true, label: 'Yes, I have one' }, { v: false, label: 'No, prepare one' }].map(({ v, label }) => (
              <button
                key={String(v)} type="button" onClick={() => patch({ hasConstitution: v })}
                className="py-2.5 rounded-xl border text-sm font-medium"
                style={{
                  borderColor: wizard.hasConstitution === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                  background: wizard.hasConstitution === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                  color: 'var(--system-label)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        {wizard.hasConstitution === true && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
            <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>Upload your Constitution</p>
            <SimpleDocumentUpload
              orgId={orgId}
              entityId={entityId}
              api={api}
              setError={setError}
              documentType="constitution"
              documents={documents}
              onUploaded={onExtracted}
              label="Upload Constitution →"
            />
          </div>
        )}
        {wizard.hasConstitution === false && (
          <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
            We&apos;ll prepare a draft Constitution from the objects, membership, and governance answers
            you&apos;ve already provided — our team will follow up once you submit.
          </p>
        )}
        <div className="rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
          <p className="text-ios-footnote font-medium mb-1" style={{ color: 'var(--system-label)' }}>
            Founding meeting
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Once the Constitution is prepared, a founding meeting approves the Society&apos;s name, objects,
            Constitution, membership, initial officers, and the application for registration. Our team will
            help generate the notice, agenda, and founding minutes once you submit.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Constitutional documents
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        These govern how the company runs internally — rules for directors, shareholders, and decision-making.
      </p>
      <Field label="Which articles of association will the company use?" required>
        <div className="grid grid-cols-2 gap-2">
          {[{ v: 'standard' as const, label: 'Standard model articles' }, { v: 'custom' as const, label: 'Custom articles' }].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => patch({ articlesType: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.articlesType === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.articlesType === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      {wizard.articlesType === 'custom' && (
        <p className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }}>
          Custom articles require legal drafting — our team will follow up once you submit.
        </p>
      )}
      <div className="rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
        <p className="text-ios-footnote font-medium mb-1" style={{ color: 'var(--system-label)' }}>
          Forms we&apos;ll generate for you
        </p>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          Using the company, share, and director details you&apos;ve already entered, we generate CR1 (application
          for registration), CR2 (memorandum of registration), CR8 (particulars of directors), and the statement
          of nominal capital. Download, sign, and upload them back on the next step.
        </p>
      </div>
      <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
        <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>
          Foreign corporate shareholders or directors? (optional)
        </p>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          A foreign company&apos;s constitutional documents won&apos;t follow the standard-model / custom-articles
          split above — they may include both a memorandum and articles under their own jurisdiction&apos;s
          system. Upload theirs here if there is one.
        </p>
        <SimpleDocumentUpload
          orgId={orgId}
          entityId={entityId}
          api={api}
          setError={setError}
          documentType="foreign_constitutional_documents"
          documents={documents}
          onUploaded={onExtracted}
          label="Upload foreign constitutional documents →"
        />
      </div>
    </div>
  )
}

type FileStatus = {
  name: string
  state: 'uploading' | 'extracting' | 'done' | 'ocr_failed' | 'upload_failed'
  summary?: string
  documentId?: string
  sectionKey?: UploadSection['key']
}

function StepDocuments({ entityType, wizard, orgId, entityId, documents, setDocuments, api, setError, onExtracted }: {
  entityType: EntityType
  wizard: WizardData
  orgId: string | null
  entityId: string | null
  documents: DocumentRow[]
  setDocuments: (d: DocumentRow[]) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown>; reason?: string }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
}) {
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({})
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  // Opens the actual file so a person can check contents before trusting
  // the name alone — Charles: two docs can share a filename, need to see
  // which is which.
  const openDocument = async (doc: DocumentRow) => {
    if (!doc.file_path) return
    setPreviewingId(doc.id)
    try {
      await openStoredDocument(doc.file_path, setError)
    } finally {
      setPreviewingId(null)
    }
  }

  // Sections where matching documents already exist collapse to a compact
  // "already on file" list instead of a blank dropzone (Charles, 2026:
  // director/shareholder/proof-of-address docs captured inline during
  // those steps shouldn't be asked for again here as if nothing exists).
  // Expanded on demand via "+ Add another".
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const setStatus = (id: string, s: FileStatus) => setStatuses((prev) => ({ ...prev, [id]: s }))

  const handleFiles = async (section: UploadSection, files: FileList | null) => {
    if (!files || files.length === 0 || !orgId || !entityId) return
    setError('')
    const supabase = createClient()

    let isFirst = true
    for (const file of Array.from(files)) {
      // Space out OCR calls when several documents are selected at once —
      // this step accepts multi-select and firing them back-to-back can
      // burst past Gemini's per-minute rate limit.
      if (!isFirst) await new Promise((r) => setTimeout(r, 1500))
      isFirst = false

      const tempId = crypto.randomUUID()
      if (file.size > 10 * 1024 * 1024) {
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: 'Over 10MB — please compress' })
        continue
      }
      setStatus(tempId, { name: file.name, state: 'uploading' })

      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) {
        console.error('upload error', uploadError)
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: `Upload failed: ${uploadError.message} — try again` })
        continue
      }

      let documentId: string
      try {
        const registered = await api({
          action: 'register_document',
          document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: section.documentType },
        })
        documentId = registered.id!
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'unknown error'
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: `Upload failed: ${reason} — try again` })
        continue
      }

      setDocuments([...documents, { id: documentId, name: file.name, document_type: section.documentType, file_path: path, file_size: file.size }])
      setStatus(tempId, { name: file.name, state: 'extracting', documentId, sectionKey: section.key })

      await runExtraction(tempId, file.name, documentId, section.key)
    }
  }

  // Run OCR extraction — failures fall back to manual entry, never block.
  // Shared by the initial upload and the manual "Retry" button, so a
  // repeat Gemini overload doesn't force a re-upload of the whole file.
  const runExtraction = async (tempId: string, fileName: string, documentId: string, sectionKey: UploadSection['key']) => {
    try {
      const result = await api({ action: 'ocr_extract', documentId, section: sectionKey })
      if (result.ok && result.fields) {
        const f = result.fields as { full_name?: string; kra_pin?: string; address_line1?: string; document_kind?: string }
        const summary = f.full_name ?? f.address_line1 ?? f.kra_pin ?? 'Details extracted'
        setStatus(tempId, { name: fileName, state: 'done', summary: `Extracted: ${summary}` })
      } else {
        const summary =
          result.reason === 'quota_exhausted'
            ? 'Extraction unavailable right now — details can be entered manually'
            : 'Couldn’t read this document — details can be entered manually'
        setStatus(tempId, { name: fileName, state: 'ocr_failed', summary, documentId, sectionKey })
      }
    } catch {
      setStatus(tempId, { name: fileName, state: 'ocr_failed', summary: 'Extraction failed — details can be entered manually', documentId, sectionKey })
    }
    await onExtracted()
  }

  const retryExtraction = async (tempId: string) => {
    const s = statuses[tempId]
    if (!s?.documentId || !s.sectionKey) return
    setStatus(tempId, { ...s, state: 'extracting' })
    await runExtraction(tempId, s.name, s.documentId, s.sectionKey)
  }

  const busy = Object.values(statuses).some((s) => s.state === 'uploading' || s.state === 'extracting')

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Document Vault
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Anything already captured while adding directors, shareholders, or beneficial owners isn&apos;t asked
        for again below — we read documents automatically and cross-check what you entered. A full browsable
        view of every document on file lives on the entity dashboard once this application is submitted.
      </p>

      {UPLOAD_SECTIONS.filter((s) => s.visible(entityType, wizard)).map((section) => {
        const existing = documents.filter((d) => d.document_type === section.documentType)
        const showUploader = existing.length === 0 || expanded[section.title]
        return (
          <div key={section.title} className="ios-surface rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>
                {section.title}
              </p>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                {section.hint}
              </p>
            </div>

            {existing.length > 0 && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: 'var(--system-bg-2)' }}>
                {(() => {
                  // Group by the tagged person so a section with several
                  // people's documents doesn't pool them into one
                  // undifferentiated list (Charles call, 2026-08: "each
                  // person's document should sit in their own space").
                  const byPerson = new Map<string, DocumentRow[]>()
                  for (const d of existing) {
                    const person = d.tags?.[0]?.person ?? '__none__'
                    byPerson.set(person, [...(byPerson.get(person) ?? []), d])
                  }
                  const people = [...byPerson.keys()].filter((k) => k !== '__none__')
                  const unassigned = byPerson.get('__none__') ?? []
                  const DocRow = ({ d }: { d: DocumentRow }) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <button
                        type="button"
                        onClick={() => openDocument(d)}
                        disabled={previewingId === d.id}
                        className="text-left disabled:opacity-50"
                      >
                        <span className="block text-ios-footnote truncate underline decoration-dotted" style={{ color: 'var(--system-label)' }}>
                          {previewingId === d.id ? 'Opening…' : documentTypeLabel(d.document_type ?? undefined)}
                        </span>
                        <span className="block text-ios-caption1 truncate" style={{ color: 'var(--system-label-3)' }}>
                          {d.name}
                        </span>
                      </button>
                    </div>
                  )
                  return (
                    <>
                      {people.map((person) => (
                        <div key={person} className="space-y-1.5">
                          <p className="text-ios-caption1 font-semibold" style={{ color: 'var(--system-label-2)' }}>{person}</p>
                          {byPerson.get(person)!.map((d) => <DocRow key={d.id} d={d} />)}
                        </div>
                      ))}
                      {unassigned.length > 0 && (
                        <div className="space-y-1.5">
                          {people.length > 0 && (
                            <p className="text-ios-caption1 font-semibold" style={{ color: 'var(--system-label-2)' }}>Other</p>
                          )}
                          {unassigned.map((d) => <DocRow key={d.id} d={d} />)}
                        </div>
                      )}
                    </>
                  )
                })()}
                {!expanded[section.title] && (
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [section.title]: true }))}
                    className="text-ios-caption1 font-semibold"
                    style={{ color: 'var(--brand-navy)' }}
                  >
                    + Add another
                  </button>
                )}
              </div>
            )}

            {showUploader && (
              <label
                className="block w-full rounded-xl border-2 border-dashed p-5 text-center cursor-pointer"
                style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => { handleFiles(section, e.target.files); e.target.value = '' }}
                />
                <span className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
                  {busy ? 'Working…' : 'Tap to choose files'}
                </span>
              </label>
            )}
          </div>
        )
      })}

      {Object.entries(statuses).map(([id, s]) => (
        <div key={id} className="ios-surface rounded-2xl px-4 py-3 flex items-center gap-3">
          {(s.state === 'uploading' || s.state === 'extracting') && (
            <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--brand-navy)' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {s.state === 'done' && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {(s.state === 'ocr_failed' || s.state === 'upload_failed') && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <div className="min-w-0">
            <p className="text-ios-footnote font-medium truncate" style={{ color: 'var(--system-label)' }}>{s.name}</p>
            {s.summary && (
              <p className="text-ios-caption1" style={{ color: s.state === 'done' ? '#16a34a' : 'var(--system-label-3)' }}>
                {s.state === 'uploading' ? 'Uploading…' : s.state === 'extracting' ? 'Reading document…' : s.summary}
              </p>
            )}
            {!s.summary && (s.state === 'uploading' || s.state === 'extracting') && (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                {s.state === 'uploading' ? 'Uploading…' : 'Reading document…'}
              </p>
            )}
          </div>
          {s.state === 'ocr_failed' && s.documentId && (
            <button
              type="button"
              onClick={() => retryExtraction(id)}
              className="shrink-0 text-ios-caption1 font-semibold"
              style={{ color: 'var(--brand-navy)' }}
            >
              Retry
            </button>
          )}
        </div>
      ))}

      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        {documents.length > 0
          ? `${documents.length} document${documents.length === 1 ? '' : 's'} on file.`
          : 'No documents uploaded yet — you can continue and add them later.'}
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 11 — Declaration
// ------------------------------------------------------------------
function DeclarationCheck({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 ios-surface rounded-2xl p-4 cursor-pointer">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-ios-footnote leading-relaxed" style={{ color: 'var(--system-label)' }}>{children}</span>
    </label>
  )
}

function StepDeclaration({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Declaration &amp; consent
      </h1>
      <DeclarationCheck checked={!!wizard.declared} onChange={(v) => patch({ declared: v })}>
        I declare that all information provided is true and accurate.
      </DeclarationCheck>
      <DeclarationCheck checked={!!wizard.consented} onChange={(v) => patch({ consented: v })}>
        I consent to LexReg Africa processing my personal data for business registration purposes.
      </DeclarationCheck>
      <DeclarationCheck checked={!!wizard.agreedTerms} onChange={(v) => patch({ agreedTerms: v })}>
        I have read and agree to the{' '}
        <Link href="/legal/privacy" target="_blank" className="underline" style={{ color: 'var(--brand-navy)' }}>Privacy Policy</Link>
        {' '}and{' '}
        <Link href="/legal/terms" target="_blank" className="underline" style={{ color: 'var(--brand-navy)' }}>Terms and Conditions</Link>.
      </DeclarationCheck>

      <Field label="Signature — type your full legal name" required>
        <input
          type="text"
          className={inputCls}
          style={{ ...inputStyle, fontStyle: 'italic' }}
          placeholder="e.g. Jane Wanjiku Kamau"
          value={wizard.signature ?? ''}
          onChange={(e) => patch({ signature: e.target.value, declarationDate: new Date().toISOString() })}
        />
      </Field>

      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        Date of declaration: {today}
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 12 — Review
// ------------------------------------------------------------------
function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--system-fill-3)' }}>
      <span className="text-ios-footnote shrink-0" style={{ color: 'var(--system-label-2)' }}>{label}</span>
      <span className="text-ios-footnote min-w-0 flex-1 break-words text-right font-medium" style={{ color: 'var(--system-label)' }}>{value}</span>
    </div>
  )
}

function StepReview({ entityType, wizard, directors, shareholders, beneficialOwners, documents }: {
  entityType: EntityType
  wizard: WizardData
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  documents: DocumentRow[]
}) {
  const typeLabel = wizard.trustKind === 'family_trust' ? 'Family Trust' : wizard.trustKind === 'charitable_trust' ? 'Charitable Trust' : ENTITY_TYPES.find((t) => t.value === entityType)?.label ?? entityType
  const names = (wizard.proposedNames ?? []).filter((n) => n.trim())
  const isTrust = entityType === 'trust'
  const isSociety = entityType === 'society'

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Review your application
      </h1>

      <div className="ios-surface rounded-2xl p-4">
        <ReviewRow label="Entity type" value={typeLabel} />
        <ReviewRow label="Applicant" value={wizard.applicantFullName ?? '—'} />
        <ReviewRow label={isTrust ? 'Proposed trust names' : isSociety ? 'Proposed society names' : 'Proposed names'} value={names.join(', ') || '—'} />
        <ReviewRow label={isTrust || isSociety ? 'Registered / administrative address' : 'Registered office'} value={[wizard.buildingName, wizard.streetName, wizard.city, wizard.county].filter(Boolean).join(', ') || '—'} />
        {!isTrust && <ReviewRow label={isSociety ? 'Principal activities' : 'Primary activity'} value={wizard.primaryActivity ?? '—'} />}
        {isSociety && <ReviewRow label="Primary object" value={wizard.socPrimaryObject ?? '—'} />}
        {!isTrust && !isSociety && <ReviewRow label="Turnover range" value={wizard.turnoverRange ? `KES ${wizard.turnoverRange}` : '—'} />}
        {isTrust && beneficialOwners.length > 0 && (
          <ReviewRow label="Settlor(s)" value={beneficialOwners.map((s) => s.full_name).join(', ')} />
        )}
        {directors.length > 0 && (
          <ReviewRow
            label={isTrust ? 'Trustees' : isSociety ? 'Officers' : entityType === 'sole_proprietorship' ? 'Proprietor' : 'Directors/partners'}
            value={directors.map((d) => d.full_name).join(', ')}
          />
        )}
        {isTrust && wizard.trustKind === 'family_trust' && shareholders.length > 0 && (
          <ReviewRow label="Beneficiaries" value={shareholders.map((s) => s.legal_name).join(', ')} />
        )}
        {isTrust && wizard.trustKind === 'charitable_trust' && (
          <ReviewRow label="Charitable objects" value={(wizard.trustCharitableObjects ?? []).filter((o) => o.trim()).join(', ') || '—'} />
        )}
        {isTrust && (
          <ReviewRow label="Trust property" value={`${(wizard.trustPropertyItems ?? []).length} item(s)`} />
        )}
        {isTrust && (
          <ReviewRow label="Protector / Enforcer" value={wizard.hasProtector ? (wizard.protectorName || 'Yes') : 'None'} />
        )}
        {isTrust && (
          <ReviewRow label="Trust Deed" value={wizard.hasTrustDeed ? 'Uploaded' : 'To be prepared'} />
        )}
        {isSociety && shareholders.length > 0 && (
          <ReviewRow label="Founding members" value={`${shareholders.length} recorded`} />
        )}
        {isSociety && (
          <ReviewRow label="Governing committee" value={wizard.socHasGoverningBody ? (wizard.socGoverningBodyName || 'Yes') : 'None'} />
        )}
        {isSociety && (
          <ReviewRow label="Constitution" value={wizard.hasConstitution ? 'Uploaded' : 'To be prepared'} />
        )}
        {!isTrust && !isSociety && shareholders.length > 0 && (
          <ReviewRow label="Shareholders" value={shareholders.map((s) => `${s.legal_name} (${s.share_percentage ?? '—'}%)`).join(', ')} />
        )}
        {wizard.authorisedShareCapital != null && (
          <ReviewRow label="Authorised capital" value={`KES ${wizard.authorisedShareCapital.toLocaleString()}`} />
        )}
        {entityType === 'partnership' && (
          <ReviewRow label="Partnership Agreement" value={wizard.hasPartnershipAgreement ? 'Uploaded' : 'To be prepared'} />
        )}
        <ReviewRow label="Documents uploaded" value={String(documents.length)} />
        <ReviewRow label="Signed by" value={wizard.signature ?? '—'} />
      </div>

      <div className="ios-surface rounded-2xl p-4">
        <p className="text-ios-subhead font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
          What happens after you submit
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          <li>We compile your information into a document package for BRS registration.</li>
          <li>You choose: register yourself on eCitizen with our guidance, or have LexReg assist with filing.</li>
          {isTrust ? (
            <li>Executing the Trust Deed creates the trust. Incorporating the trustees under the Trustees (Perpetual Succession) Act is a separate, later step.</li>
          ) : isSociety ? (
            <li>Once the Registrar of Societies issues your Certificate of Registration, upload it back here.</li>
          ) : entityType === 'partnership' || entityType === 'sole_proprietorship' ? (
            <li>Once BRS issues your Certificate of Registration (business name), upload it back here.</li>
          ) : (
            <li>Once BRS issues your certificate of incorporation, upload it back here.</li>
          )}
          <li>Your entity goes live on the dashboard with its compliance calendar set up automatically.</li>
        </ol>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Submitted screen
// ------------------------------------------------------------------
function SubmittedScreen({ onDashboard, orgId, entityId, entityStatus, idpUrl, businessName, applicantName, applicantPhone, api, onActivated, onEdit }: {
  onDashboard: () => void
  orgId: string | null
  entityId: string | null
  entityStatus: string | null
  idpUrl: string | null
  businessName: string | null
  applicantName: string | null
  applicantPhone: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; idpUrl?: string | null }>
  onActivated: () => void
  onEdit: () => void
}) {
  const [localIdpUrl, setLocalIdpUrl] = useState(idpUrl)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateError, setRegenerateError] = useState('')

  const handleRegenerate = async () => {
    setRegenerating(true)
    setRegenerateError('')
    try {
      const result = await api({ action: 'regenerate_idp' })
      setLocalIdpUrl(result.idpUrl ?? null)
      if (!result.idpUrl) setRegenerateError('Still couldn’t generate it — please try again or request help.')
    } catch {
      setRegenerateError('Still couldn’t generate it — please try again or request help.')
    } finally {
      setRegenerating(false)
    }
  }
  const isActive = entityStatus === 'active'
  const [showHelp, setShowHelp] = useState(false)
  const [servicePath, setServicePath] = useState<'self_service' | 'assisted' | 'lawyer_assisted' | null>(null)
  const [savingPath, setSavingPath] = useState(false)

  // Records which route the applicant picked (was previously never
  // captured anywhere, so the IDP's "Service path" field always just
  // said "Not yet selected" — reported live, 2026-08-30). Also
  // regenerates the IDP so that field reflects the choice.
  const handleSelectPath = async (path: 'self_service' | 'assisted' | 'lawyer_assisted') => {
    setServicePath(path)
    setSavingPath(true)
    try {
      await api({ action: 'set_service_path', servicePathChoice: path })
      const result = await api({ action: 'regenerate_idp' })
      if (result.idpUrl) setLocalIdpUrl(result.idpUrl)
    } catch {
      // non-fatal — the choice still drives which action shows below
    } finally {
      setSavingPath(false)
    }
  }

  if (isActive) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(128,0,32,0.10)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-ios-title1 font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
            Your entity is active
          </h1>
          <p className="text-ios-body mb-8" style={{ color: 'var(--system-label-2)' }}>
            Your certificate of incorporation is on file and your entity is live on LexReg Africa.
          </p>
          <button
            type="button"
            onClick={onDashboard}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-navy)' }}
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(128,0,32,0.10)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-ios-title1 font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
            Application submitted
          </h1>
          <p className="text-ios-body" style={{ color: 'var(--system-label-2)' }}>
            Here’s your information document package, and three ways to get registered.
          </p>
        </div>

        <div className="ios-surface rounded-2xl p-4 mb-4">
          <p className="text-ios-subhead font-semibold mb-1" style={{ color: 'var(--system-label)' }}>
            Information document package
          </p>
          <p className="text-ios-footnote mb-3" style={{ color: 'var(--system-label-2)' }}>
            A summary of everything you provided — use it to file yourself, or hand it to your LexReg
            representative.
          </p>
          {localIdpUrl ? (
            <a
              href={localIdpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand-navy)' }}
            >
              Download PDF
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="block w-full text-center py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--brand-navy)' }}
              >
                {regenerating ? 'Generating…' : 'Generate document package'}
              </button>
              {regenerateError && <p className="text-xs text-red-500 mt-2 text-center">{regenerateError}</p>}
            </>
          )}
        </div>

        <div className="ios-surface rounded-2xl p-4 mb-4">
          <p className="text-ios-subhead font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
            Getting registered
          </p>
          <p className="text-ios-footnote mb-3" style={{ color: 'var(--system-label-2)' }}>
            Pick how you&apos;d like to file — you can change this later.
          </p>

          <div className="space-y-2">
            {(
              [
                { key: 'self_service' as const, title: 'Self-service', desc: 'File the package yourself on the BRS eCitizen portal.' },
                { key: 'assisted' as const, title: 'Assisted', desc: 'Request LexReg Africa to handle filing for you.' },
                { key: 'lawyer_assisted' as const, title: 'Lawyer-assisted', desc: 'A LexReg lawyer reviews and files on your behalf.' },
              ]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelectPath(opt.key)}
                className="w-full rounded-xl border p-3 text-left transition-colors"
                style={servicePath === opt.key
                  ? { borderColor: 'var(--brand-navy)', background: 'rgba(128,0,32,0.05)' }
                  : { borderColor: 'var(--system-fill-3)' }}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                    style={servicePath === opt.key ? { borderColor: 'var(--brand-navy)' } : { borderColor: 'var(--system-fill-2, #d1d1d6)' }}
                  >
                    {servicePath === opt.key && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand-navy)' }} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>{opt.title}</p>
                    <p className="text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {servicePath === 'self_service' && (
            savingPath ? (
              <p className="text-ios-footnote mt-3 text-center" style={{ color: 'var(--system-label-3)' }}>Preparing your package…</p>
            ) : localIdpUrl ? (
              <a
                href={localIdpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full rounded-full py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-navy)' }}
              >
                Download PDF
              </a>
            ) : null
          )}

          {servicePath === 'assisted' && (
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              disabled={savingPath}
              className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#25D366' }}
            >
              Request assisted filing on WhatsApp
            </button>
          )}

          {servicePath === 'lawyer_assisted' && (
            <p
              className="text-ios-footnote mt-3 rounded-xl p-3 text-center"
              style={{ background: 'var(--system-bg-2)', color: 'var(--system-label-2)' }}
            >
              Lawyer-assisted filing isn&apos;t live yet — we&apos;ll let you know as soon as it launches. Your
              choice has been recorded.
            </p>
          )}
        </div>

        <CertificateUpload orgId={orgId} entityId={entityId} api={api} onActivated={onActivated} />

        <button
          type="button"
          onClick={onEdit}
          className="w-full py-2.5 rounded-full text-sm font-medium border mt-4"
          style={{ borderColor: 'var(--system-fill-3)', color: 'var(--brand-navy)' }}
        >
          Edit application
        </button>

        <button
          type="button"
          onClick={onDashboard}
          className="w-full py-2.5 rounded-full text-sm font-medium border mt-2"
          style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
        >
          Go to dashboard
        </button>
      </div>

      {showHelp && (
        <HelpRequestSheet
          context={{ source: 'New entity — assisted BRS filing request', businessName, idpUrl: localIdpUrl }}
          defaultName={applicantName}
          defaultPhone={applicantPhone}
          onClose={() => setShowHelp(false)}
          onSent={() => { api({ action: 'request_help' }).catch(() => {}) }}
        />
      )}
    </div>
  )
}

function CertificateUpload({ orgId, entityId, api, onActivated }: {
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; flagged?: boolean; reason?: string }>
  onActivated: () => void
}) {
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [flaggedReason, setFlaggedReason] = useState('')

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !orgId || !entityId) return
    if (file.size > 10 * 1024 * 1024) { setError('File is over 10MB — please compress it.'); return }
    setError('')
    setFlaggedReason('')
    setUploading(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) { setError('Upload failed — try again.'); return }

      const result = await api({
        action: 'upload_certificate',
        filePath: path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        registrationNumber: registrationNumber.trim() || undefined,
      })
      if (result.flagged) {
        setFlaggedReason(result.reason ?? 'The certificate details don’t match your application.')
        return
      }
      onActivated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setUploading(false)
    }
  }

  if (flaggedReason) {
    return (
      <div className="ios-surface rounded-2xl p-4">
        <p className="text-ios-subhead font-semibold mb-1" style={{ color: '#C77700' }}>
          Certificate flagged for review
        </p>
        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-2)' }}>
          {flaggedReason}
        </p>
        <p className="text-ios-footnote mb-3" style={{ color: 'var(--system-label-2)' }}>
          Our team will review it shortly. If you uploaded the wrong file, upload the corrected
          certificate below.
        </p>
        <button
          type="button"
          onClick={() => setFlaggedReason('')}
          className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--brand-navy)' }}
        >
          Upload corrected certificate
        </button>
      </div>
    )
  }

  return (
    <div className="ios-surface rounded-2xl p-4">
      <p className="text-ios-subhead font-semibold mb-1" style={{ color: 'var(--system-label)' }}>
        Already have your certificate?
      </p>
      <p className="text-ios-footnote mb-3" style={{ color: 'var(--system-label-2)' }}>
        Upload your BRS certificate of incorporation to activate your entity right away.
      </p>
      <input
        type="text"
        placeholder="Registration number (optional)"
        value={registrationNumber}
        onChange={(e) => setRegistrationNumber(e.target.value)}
        className="w-full px-4 py-2.5 mb-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30"
        style={{ borderColor: 'var(--system-fill-3)', background: 'var(--system-bg)', color: 'var(--system-label)' }}
      />
      <label
        className="block w-full rounded-xl border-2 border-dashed p-4 text-center cursor-pointer"
        style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}
      >
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => { handleFile(e.target.files); e.target.value = '' }}
        />
        <span className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
          {uploading ? 'Uploading…' : 'Tap to upload certificate'}
        </span>
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
