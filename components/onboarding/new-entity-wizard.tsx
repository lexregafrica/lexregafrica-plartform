'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ENTITY_TYPES,
  PHASE1_ENTITY_TYPES,
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
  STEP_LABELS,
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
  address: { isForeign?: boolean; foreignAddress?: string; physicalAddress?: string; postalAddress?: string; nationality?: string; dateOfBirth?: string; county?: string; occupation?: string; postalCode?: string; postalAddressLine?: string } | null
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
        if (!wizard.primaryActivity?.trim()) return 'Describe the business activity.'
        if (!wizard.entityEmail?.trim()) return 'Company email is required.'
        if (!EMAIL_REGEX.test(wizard.entityEmail)) return 'Enter a valid company email address.'
        if (!wizard.entityPhone?.trim()) return 'Entity phone is required.'
        if (!KENYA_PHONE_REGEX.test(wizard.entityPhone)) return 'Phone must be +2547XXXXXXXX or 07XXXXXXXX.'
        if (!wizard.contactPersonName?.trim()) return 'Contact person is required.'
        if (!wizard.city?.trim()) return 'City/Town is required.'
        if (!wizard.county) return 'Choose a county.'
        if (!wizard.postalCode?.trim()) return 'Postal code is required.'
        if (!wizard.postalAddress?.trim()) return 'Postal address is required.'
        if (!wizard.turnoverRange) return 'Choose an expected turnover range.'
        if (wizard.hasEmployees === undefined) return 'Tell us whether the business will have employees.'
        return null
      case 5: {
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
        return null
      }
      case 8:
        // Spec: BO details required unless the user explicitly confirms
        // no declarable beneficial owner presently exists (10%+ direct/
        // indirect interest or significant control — Charles, LLC spec)
        if (beneficialOwners.length === 0 && !wizard.noBeneficialOwners) {
          return 'Add at least one beneficial owner, or confirm none currently apply.'
        }
        return null
      case 9: {
        const secretaryMandatory = entityType === 'public_limited_company' || (wizard.authorisedShareCapital ?? 0) > SECRETARY_CAPITAL_THRESHOLD_KES
        if (secretaryMandatory && wizard.hasCompanySecretary !== true) {
          return 'A company secretary is required for this entity.'
        }
        if (wizard.hasCompanySecretary === undefined) return 'Choose whether you will appoint a company secretary.'
        if (wizard.hasCompanySecretary && !wizard.secretary?.fullName?.trim()) return 'Enter the secretary’s details.'
        return null
      }
      case 10:
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
          Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step]}
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
        {step === 5 && <StepShareCapital wizard={wizard} patch={patch} shareholders={shareholders} />}
        {step === 6 && (
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
          />
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
          />
        )}
        {step === 8 && (
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
          />
        )}
        {step === 9 && <StepSecretary entityType={entityType} wizard={wizard} patch={patch} />}
        {step === 10 && (
          <StepConstitutional
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
              onClick={() => available && setEntityType(t.value)}
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
        LexReg is currently focused on limited companies. Other entity types are on the roadmap.
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
        Company basics
      </h1>

      <Field label="Company type">
        <input type="text" className={inputCls} style={{ ...inputStyle, opacity: 0.7 }} value={entityLabel} disabled readOnly />
      </Field>

      <Field label="Nature of business / business activity" required>
        <textarea
          className={inputCls}
          style={inputStyle}
          rows={3}
          maxLength={200}
          placeholder="Briefly describe the business activity…"
          value={wizard.primaryActivity ?? ''}
          onChange={(e) => patch({ primaryActivity: e.target.value })}
        />
        <p className="text-ios-caption1 mt-1 text-right" style={{ color: 'var(--system-label-3)' }}>
          {(wizard.primaryActivity ?? '').length}/200
        </p>
      </Field>

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
    </div>
  )
}

// ------------------------------------------------------------------
// Step 7 — Directors / partners / trustees
// ------------------------------------------------------------------
const ROLE_BY_TYPE: Partial<Record<EntityType, string>> = {
  partnership: 'Partner',
  limited_liability_partnership: 'Designated Member',
  trust: 'Trustee',
  company_limited_by_guarantee: 'Trustee',
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

export function InlineOcrUpload({ section, documentType = 'id_copy', label, orgId, entityId, api, onExtracted, setError, initialUploaded, personName, personRole, personId }: {
  section: 'director' | 'shareholder' | 'address' | 'other'
  documentType?: string
  label?: string
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; fields?: Record<string, unknown>; personId?: string }>
  onExtracted: (fields: Record<string, unknown> | undefined, personId?: string) => void
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
}) {
  const [state, setState] = useState<'idle' | 'uploading' | 'extracting'>('idle')
  const [uploaded, setUploaded] = useState<{ name: string; filePath: string } | null>(initialUploaded ?? null)
  const [replacing, setReplacing] = useState(false)
  const [opening, setOpening] = useState(false)

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

      setState('extracting')
      const result = await api({ action: 'ocr_extract', documentId: registered.id, section })
      onExtracted(result.fields, result.personId)
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
          className="text-ios-footnote truncate text-left underline decoration-dotted flex-1 disabled:opacity-50"
          style={{ color: 'var(--system-label)' }}
        >
          {opening ? 'Opening…' : uploaded.name}
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
export function PhotoUpload({ orgId, entityId, api, onUploaded, setError, initialUploaded, personName, personRole, personId }: {
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  onUploaded: (fileName: string) => void
  setError: (e: string) => void
  initialUploaded?: { name: string; filePath: string } | null
  personName?: string
  personRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
  personId?: string
}) {
  const [state, setState] = useState<'idle' | 'uploading'>('idle')
  const [uploaded, setUploaded] = useState<{ name: string; filePath: string } | null>(initialUploaded ?? null)
  const [replacing, setReplacing] = useState(false)
  const [opening, setOpening] = useState(false)

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

      await api({
        action: 'register_document',
        document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: 'passport_photo', personName, personRole, personId },
      })
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
          className="text-ios-caption1 truncate text-left underline decoration-dotted flex-1 disabled:opacity-50"
          style={{ color: 'var(--system-label)' }}
        >
          {opening ? 'Opening…' : uploaded.name}
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

function StepDirectors({ entityType, directors, setDirectors, orgId, entityId, api, setError, onExtracted, documents }: {
  entityType: EntityType
  directors: DirectorRow[]
  setDirectors: (d: DirectorRow[]) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
  documents: DocumentRow[]
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<DirectorForm | null>(directors.length === 0 ? { ...emptyDirector } : null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)

  const set = (partial: Partial<DirectorForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const setCorporate = (partial: Partial<CorporateParticipant>) =>
    setForm((prev) => (prev ? { ...prev, corporate: { ...prev.corporate, ...partial } } : prev))

  const validate = (f: DirectorForm): string | null => {
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
    if (!f.isForeign && !NATIONAL_ID_REGEX.test(f.idNumber)) return 'Kenyan national ID must be 7–8 digits.'
    if (f.isForeign && !f.nationality.trim()) return 'Nationality is required for foreign directors.'
    if (!f.kraPin.trim()) return 'KRA PIN is required.'
    if (!KRA_PIN_REGEX.test(f.kraPin.toUpperCase())) return 'KRA PIN format: A123456789B.'
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
        },
      }
      setDirectors(form.id ? directors.map((d) => (d.id === form.id ? updated : d)) : [...directors, updated])
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
  const handleExtracted = (fields: Record<string, unknown> | undefined, personId?: string) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => {
      if (!prev) return prev
      // Editing an existing person and re-uploading is an explicit
      // "replace this document" action (Charles, corporate-shareholder
      // call) — overwrite rather than gap-fill. Adding a new person still
      // gap-fills only, so it never clobbers something already typed.
      const isReplace = !!prev.id
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
        kraPin: (isReplace ? f.kra_pin : prev.kraPin || f.kra_pin) || prev.kraPin,
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
              onClick={() => { setPhotoUploaded(null); setForm({
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
        <div key={form.id ?? 'new-director'} className="ios-surface rounded-2xl p-4 space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="County">
                  <select className={inputCls} style={inputStyle} value={form.county} onChange={(e) => set({ county: e.target.value, postalCode: '' })}>
                    <option value="">—</option>
                    {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Postal code">
                  <select className={inputCls} style={inputStyle} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} disabled={!form.county}>
                    <option value="">{form.county ? '—' : 'Choose county first'}</option>
                    {KENYA_POSTAL_CODES.filter((p) => p.county === form.county).map((p) => (
                      <option key={p.code} value={p.code}>{p.code} — {p.area}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="P.O. Box">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. 1234" value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
              </Field>
              <Field label="Postal address">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddressLine} onChange={(e) => set({ postalAddressLine: e.target.value })} />
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

          <Field label="Appointment date">
            <input type="date" className={inputCls} style={inputStyle} value={form.appointmentDate} onChange={(e) => set({ appointmentDate: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : `Add ${roleLabel.toLowerCase()}`}</PrimaryButton>
            {directors.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setPhotoUploaded(null); setForm({ ...emptyDirector }) }}
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

function StepShareholders({ entityType, shareholders, setShareholders, directors, setDirectors, totalShares, useMultipleShareClasses, orgId, entityId, api, setError, onExtracted, documents }: {
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
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<ShareholderForm | null>(shareholders.length === 0 ? { ...emptyShareholder } : null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)
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
      if (!KRA_PIN_REGEX.test(form.kraPin.toUpperCase())) { setError('KRA PIN format: A123456789B.'); return }
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

  const handleExtracted = (fields: Record<string, unknown> | undefined, personId?: string) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => {
      if (!prev) return prev
      // Editing + re-uploading is an explicit "replace this document"
      // action — overwrite rather than gap-fill. New-add stays gap-fill.
      const isReplace = !!prev.id
      return {
        ...prev,
        // Adopt the server's matched-or-created row id — otherwise Save
        // always inserted a second row on top of the OCR auto-create
        // (Charles call, 2026-08: reproduced live, duplicate row + shares
        // total not updating).
        id: prev.id ?? personId,
        legalName: (isReplace ? f.full_name : prev.legalName || f.full_name) || prev.legalName,
        idNumber: (isReplace ? f.id_number : prev.idNumber || f.id_number) || prev.idNumber,
        kraPin: (isReplace ? f.kra_pin : prev.kraPin || f.kra_pin) || prev.kraPin,
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
              onClick={() => { setPhotoUploaded(null); setForm({
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
        <div key={form.id ?? 'new-shareholder'} className="ios-surface rounded-2xl p-4 space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <Field label="County">
                  <select className={inputCls} style={inputStyle} value={form.county} onChange={(e) => set({ county: e.target.value, postalCode: '' })}>
                    <option value="">—</option>
                    {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Postal code">
                  <select className={inputCls} style={inputStyle} value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} disabled={!form.county}>
                    <option value="">{form.county ? '—' : 'Choose county first'}</option>
                    {KENYA_POSTAL_CODES.filter((p) => p.county === form.county).map((p) => (
                      <option key={p.code} value={p.code}>{p.code} — {p.area}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="P.O. Box">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. 1234" value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
              </Field>
              <Field label="Postal address">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. P.O. Box 1234-00100, Nairobi" value={form.postalAddressLine} onChange={(e) => set({ postalAddressLine: e.target.value })} />
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
          onClick={() => { setPhotoUploaded(null); setForm({ ...emptyShareholder }) }}
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
}

function emptyBeneficialOwner(): BeneficialOwnerForm {
  return {
    fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan', dateOfBirth: '',
    postalAddress: '', businessAddress: '', residentialAddress: '', phone: '', email: '',
    occupation: '', natureOfControl: '', dateBecameBo: new Date().toISOString().slice(0, 10), sharePercentage: '',
  }
}

function StepBeneficialOwners({ shareholders, beneficialOwners, setBeneficialOwners, wizard, patch, orgId, entityId, api, setError, documents }: {
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
}) {
  const [form, setForm] = useState<BeneficialOwnerForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [photoUploaded, setPhotoUploaded] = useState<string | null>(null)

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
              onClick={() => { setPhotoUploaded(null); setForm({
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
        <div key={form.id ?? 'new-bo'} className="ios-surface rounded-2xl p-4 space-y-3">
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
            <Field label="P.O. Box">
              <input type="text" className={inputCls} style={inputStyle} value={form.postalAddress} onChange={(e) => set({ postalAddress: e.target.value })} />
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
            onClick={() => { patch({ noBeneficialOwners: false }); setForm(emptyBeneficialOwner()); setPhotoUploaded(null) }}
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
  visible: (entityType: EntityType) => boolean
}

const UPLOAD_SECTIONS: UploadSection[] = [
  {
    key: 'director',
    title: 'Director / partner documents — ID or passport',
    hint: 'National IDs or passports — one file per person.',
    documentType: 'director_id_copy',
    visible: (t) => t !== 'sole_proprietorship',
  },
  {
    key: 'director',
    title: 'Director / partner documents — KRA PIN',
    hint: 'KRA PIN certificates — one file per person.',
    documentType: 'director_kra_pin_copy',
    visible: (t) => t !== 'sole_proprietorship',
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
    visible: () => true,
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
    visible: () => true,
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

function StepConstitutional({ wizard, patch, orgId, entityId, api, setError, documents, onExtracted }: {
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
  documents: DocumentRow[]
  onExtracted: () => Promise<void>
}) {
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

function StepDocuments({ entityType, orgId, entityId, documents, setDocuments, api, setError, onExtracted }: {
  entityType: EntityType
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

      {UPLOAD_SECTIONS.filter((s) => s.visible(entityType)).map((section) => {
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
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--system-bg-2)' }}>
                {existing.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <button
                      type="button"
                      onClick={() => openDocument(d)}
                      disabled={previewingId === d.id}
                      className="text-ios-footnote truncate text-left underline decoration-dotted disabled:opacity-50"
                      style={{ color: 'var(--system-label)' }}
                    >
                      {previewingId === d.id ? 'Opening…' : d.name}
                    </button>
                  </div>
                ))}
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
function StepDeclaration({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })

  const Check = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
    <label className="flex items-start gap-3 ios-surface rounded-2xl p-4 cursor-pointer">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-ios-footnote leading-relaxed" style={{ color: 'var(--system-label)' }}>{children}</span>
    </label>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Declaration &amp; consent
      </h1>
      <Check checked={!!wizard.declared} onChange={(v) => patch({ declared: v })}>
        I declare that all information provided is true and accurate.
      </Check>
      <Check checked={!!wizard.consented} onChange={(v) => patch({ consented: v })}>
        I consent to LexReg Africa processing my personal data for business registration purposes.
      </Check>
      <Check checked={!!wizard.agreedTerms} onChange={(v) => patch({ agreedTerms: v })}>
        I have read and agree to the{' '}
        <Link href="/legal/privacy" target="_blank" className="underline" style={{ color: 'var(--brand-navy)' }}>Privacy Policy</Link>
        {' '}and{' '}
        <Link href="/legal/terms" target="_blank" className="underline" style={{ color: 'var(--brand-navy)' }}>Terms and Conditions</Link>.
      </Check>

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
function StepReview({ entityType, wizard, directors, shareholders, documents }: {
  entityType: EntityType
  wizard: WizardData
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  documents: DocumentRow[]
}) {
  const typeLabel = ENTITY_TYPES.find((t) => t.value === entityType)?.label ?? entityType
  const names = (wizard.proposedNames ?? []).filter((n) => n.trim())

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--system-fill-3)' }}>
      <span className="text-ios-footnote shrink-0" style={{ color: 'var(--system-label-2)' }}>{label}</span>
      <span className="text-ios-footnote font-medium text-right" style={{ color: 'var(--system-label)' }}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Review your application
      </h1>

      <div className="ios-surface rounded-2xl p-4">
        <Row label="Entity type" value={typeLabel} />
        <Row label="Applicant" value={wizard.applicantFullName ?? '—'} />
        <Row label="Proposed names" value={names.join(', ') || '—'} />
        <Row label="Registered office" value={[wizard.buildingName, wizard.streetName, wizard.city, wizard.county].filter(Boolean).join(', ') || '—'} />
        <Row label="Primary activity" value={wizard.primaryActivity ?? '—'} />
        <Row label="Turnover range" value={wizard.turnoverRange ? `KES ${wizard.turnoverRange}` : '—'} />
        {directors.length > 0 && <Row label="Directors/partners" value={directors.map((d) => d.full_name).join(', ')} />}
        {shareholders.length > 0 && (
          <Row label="Shareholders" value={shareholders.map((s) => `${s.legal_name} (${s.share_percentage ?? '—'}%)`).join(', ')} />
        )}
        {wizard.authorisedShareCapital != null && (
          <Row label="Authorised capital" value={`KES ${wizard.authorisedShareCapital.toLocaleString()}`} />
        )}
        <Row label="Documents uploaded" value={String(documents.length)} />
        <Row label="Signed by" value={wizard.signature ?? '—'} />
      </div>

      <div className="ios-surface rounded-2xl p-4">
        <p className="text-ios-subhead font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
          What happens after you submit
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          <li>We compile your information into a document package for BRS registration.</li>
          <li>You choose: register yourself on eCitizen with our guidance, or have LexReg assist with filing.</li>
          <li>Once BRS issues your certificate of incorporation, upload it back here.</li>
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
          <ol className="list-decimal pl-5 space-y-1.5 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            <li><strong>Self-service</strong> — file the package yourself on the BRS eCitizen portal.</li>
            <li><strong>Assisted</strong> — request LexReg Africa to handle filing for you.</li>
            <li><strong>Lawyer-assisted</strong> — a LexReg lawyer reviews and files on your behalf.</li>
          </ol>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#25D366' }}
          >
            Request assisted filing on WhatsApp
          </button>
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
