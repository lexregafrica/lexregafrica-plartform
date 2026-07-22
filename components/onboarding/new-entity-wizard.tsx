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
  INDUSTRIES,
  EMPLOYEE_SEGMENTS,
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
type CorporateParticipant = {
  registeredName: string
  regNumber: string
  countryOfIncorporation: string
  repName: string
  repEmail: string
  repPhone: string
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
  } | null
}

type ShareholderRow = {
  id: string
  legal_name: string
  id_or_reg_number: string | null
  kra_pin: string | null
  shares_held: number
  share_percentage: number | null
  address: { isForeign?: boolean; foreignAddress?: string } | null
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
        const res = await fetch('/api/onboarding/new-entity')
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
        setStep(Math.min(Math.max(data.step ?? 1, 1), TOTAL_STEPS))
        setLoadState(data.submitted ? 'submitted' : 'wizard')
      } catch {
        setLoadState('error')
      }
    }
    load()
  }, [])

  const patch = useCallback((partial: Partial<WizardData>) => {
    setWizard((prev) => ({ ...prev, ...partial }))
  }, [])

  // Re-pull server state after an OCR extraction so pre-filled directors,
  // shareholders, and wizard fields land in local state without a reload.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/new-entity')
      if (!res.ok) return
      const data = await res.json()
      setWizard(data.wizard ?? {})
      setDirectors(data.directors ?? [])
      setShareholders(data.shareholders ?? [])
      setBeneficialOwners(data.beneficialOwners ?? [])
      setDocuments(data.documents ?? [])
      setEntityStatus(data.entityStatus ?? null)
      setIdpUrl(data.idpUrl ?? null)
    } catch {
      // non-fatal — extraction already persisted server-side
    }
  }, [])

  const api = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/onboarding/new-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Request failed')
    }
    return res.json()
  }, [])

  // ---- per-step validation --------------------------------------
  const validateStep = useCallback((): string | null => {
    switch (step) {
      case 1:
        if (!entityType) return 'Choose an entity type.'
        if (!wizard.primaryActivity?.trim()) return 'Describe what the business does.'
        if (!wizard.industry) return 'Choose an industry.'
        if (!wizard.employeeSegment) return 'Choose your team size.'
        return null
      case 2: {
        const names = (wizard.proposedNames ?? []).map((n) => n.trim()).filter(Boolean)
        if (names.length < 3) return 'Enter at least 3 proposed business names.'
        return null
      }
      case 3:
        if (!wizard.entityEmail?.trim()) return 'Entity email is required.'
        if (!EMAIL_REGEX.test(wizard.entityEmail)) return 'Enter a valid entity email address.'
        if (!wizard.entityPhone?.trim()) return 'Entity phone is required.'
        if (!KENYA_PHONE_REGEX.test(wizard.entityPhone)) return 'Phone must be +2547XXXXXXXX or 07XXXXXXXX.'
        if (!wizard.contactPersonName?.trim()) return 'Contact person is required.'
        if (!wizard.addressLine1?.trim()) return 'Address line 1 is required.'
        if (!wizard.city?.trim()) return 'City/Town is required.'
        if (!wizard.county) return 'Choose a county.'
        if (!wizard.postalCode?.trim()) return 'Postal code is required.'
        return null
      case 4:
        if (!wizard.primaryActivity?.trim()) return 'Describe your primary business activity.'
        if (!wizard.turnoverRange) return 'Choose an expected turnover range.'
        if (wizard.hasEmployees === undefined) return 'Tell us whether the business will have employees.'
        return null
      case 5:
        if (shareholders.length < 1) return 'Add at least one shareholder/member.'
        for (const s of shareholders) {
          if (!s.id_or_reg_number) return `Add an ID/registration number for ${s.legal_name}.`
          if (!s.corporate_details?.isCorporate && !s.kra_pin) return `Add a KRA PIN for ${s.legal_name}.`
        }
        return null
      case 6: {
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
      case 7:
        // Spec: BO details required unless the user explicitly confirms
        // no declarable beneficial owner presently exists (10%+ direct/
        // indirect interest or significant control — Charles, LLC spec)
        if (beneficialOwners.length === 0 && !wizard.noBeneficialOwners) {
          return 'Add at least one beneficial owner, or confirm none currently apply.'
        }
        return null
      case 8: {
        const authorised = wizard.authorisedShareCapital ?? 0
        if (wizard.useMultipleShareClasses) {
          const classes = wizard.shareClassList ?? []
          if (classes.length === 0) return 'Add at least one share class.'
          for (const c of classes) {
            if (!c.name.trim()) return 'Every share class needs a name.'
            if (!c.shares) return `Enter the number of shares for ${c.name || 'this class'}.`
          }
          const classCapital = classes.reduce((s, c) => s + c.shares * c.nominalValue, 0)
          if (authorised < classCapital) {
            return `Authorised capital (KES ${authorised.toLocaleString()}) must be at least the total issued capital across classes (KES ${classCapital.toLocaleString()}).`
          }
          return null
        }
        const issued = shareholders.reduce((s, x) => s + x.shares_held, 0)
        const nominal = wizard.nominalValuePerShare ?? 100
        if (authorised < issued * nominal) {
          return `Authorised capital (KES ${authorised.toLocaleString()}) must be at least issued shares × nominal value (KES ${(issued * nominal).toLocaleString()}).`
        }
        return null
      }
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
        if (wizard.nssfNhifStatus === undefined) return 'Tell us about NSSF/NHIF registration.'
        if (!wizard.payrollFrequency) return 'Choose a payroll frequency.'
        return null
      case 11:
        // v2.0: identity docs are captured per-person as directors/shareholders
        // are added, so nothing is mandatory here. Proof of address is
        // optional per Charles (2026-07-17) — not everyone has a utility
        // bill yet at registration time.
        return null
      case 12:
        if (!wizard.declared || !wizard.consented || !wizard.agreedTerms) return 'All three declarations are required.'
        if (!wizard.signature?.trim()) return 'Type your full name as a signature.'
        if (!wizard.applicantRelationship) return 'Choose your relationship to the business.'
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
        api={api}
        onActivated={() => setEntityStatus('active')}
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
        {step === 2 && <StepNames wizard={wizard} patch={patch} />}
        {step === 3 && (
          <StepAddress
            wizard={wizard}
            patch={patch}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            onExtracted={refresh}
          />
        )}
        {step === 4 && <StepActivities wizard={wizard} patch={patch} />}
        {step === 5 && (
          <StepShareholders
            entityType={entityType}
            shareholders={shareholders}
            setShareholders={setShareholders}
            directors={directors}
            setDirectors={setDirectors}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            onExtracted={refresh}
          />
        )}
        {step === 6 && (
          <StepDirectors
            entityType={entityType}
            directors={directors}
            setDirectors={setDirectors}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            onExtracted={refresh}
          />
        )}
        {step === 7 && (
          <StepBeneficialOwners
            shareholders={shareholders}
            beneficialOwners={beneficialOwners}
            setBeneficialOwners={setBeneficialOwners}
            wizard={wizard}
            patch={patch}
            api={api}
            setError={setError}
          />
        )}
        {step === 8 && <StepShareCapital wizard={wizard} patch={patch} shareholders={shareholders} />}
        {step === 9 && <StepSecretary entityType={entityType} wizard={wizard} patch={patch} />}
        {step === 10 && <StepEmployees wizard={wizard} patch={patch} />}
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
        {step === 12 && <StepDeclaration wizard={wizard} patch={patch} />}
        {step === 13 && (
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

      <Field label="What does the business do?" required>
        <textarea
          className={inputCls}
          style={inputStyle}
          rows={3}
          maxLength={200}
          placeholder="Briefly describe the business activity…"
          value={wizard.primaryActivity ?? ''}
          onChange={(e) => patch({ primaryActivity: e.target.value })}
        />
      </Field>

      <Field label="Industry" required>
        <select
          className={inputCls}
          style={inputStyle}
          value={wizard.industry ?? ''}
          onChange={(e) => patch({ industry: e.target.value })}
        >
          <option value="" disabled>Choose an industry…</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </Field>

      <Field label="How many people work in the business?" required>
        <div className="grid grid-cols-4 gap-2">
          {EMPLOYEE_SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ employeeSegment: s })}
              className="py-2 rounded-xl border text-xs font-medium"
              style={{
                borderColor: wizard.employeeSegment === s ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.employeeSegment === s ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 2 — Proposed names
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
function StepAddress({ wizard, patch, orgId, entityId, api, setError, onExtracted }: {
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
    const f = fields as { address_line1?: string; city?: string; county?: string; postal_code?: string }
    patch({
      addressLine1: wizard.addressLine1 || f.address_line1 || undefined,
      city: wizard.city || f.city || undefined,
      county: wizard.county || f.county || undefined,
      postalCode: wizard.postalCode || f.postal_code || undefined,
    })
    onExtracted()
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
          Entity contact details
        </h1>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entity email" required>
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
        <Field label="Address line 1" required>
          <input type="text" className={inputCls} style={inputStyle} value={wizard.addressLine1 ?? ''} onChange={(e) => patch({ addressLine1: e.target.value })} />
        </Field>
        <Field label="Address line 2">
          <input type="text" className={inputCls} style={inputStyle} value={wizard.addressLine2 ?? ''} onChange={(e) => patch({ addressLine2: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City / Town" required>
            <input type="text" className={inputCls} style={inputStyle} value={wizard.city ?? ''} onChange={(e) => patch({ city: e.target.value })} />
          </Field>
          <Field label="Postal code" required>
            <input type="text" className={inputCls} style={inputStyle} value={wizard.postalCode ?? ''} onChange={(e) => patch({ postalCode: e.target.value })} />
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
        <Field label="Postal address">
          <input type="text" className={inputCls} style={inputStyle} placeholder="P.O. Box, if different from street address" value={wizard.postalAddress ?? ''} onChange={(e) => patch({ postalAddress: e.target.value })} />
        </Field>
        <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          Proof of address is optional — upload above to auto-fill the fields, type them yourself, or add the
          document later from the review step if you don’t have one yet.
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Step 4 — Business activities
// ------------------------------------------------------------------
function StepActivities({ wizard, patch }: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Principal business activities
      </h1>
      <Field label="Primary business activity" required>
        <textarea
          className={inputCls}
          style={inputStyle}
          rows={3}
          maxLength={200}
          value={wizard.primaryActivity ?? ''}
          onChange={(e) => patch({ primaryActivity: e.target.value })}
        />
        <p className="text-ios-caption1 mt-1 text-right" style={{ color: 'var(--system-label-3)' }}>
          {(wizard.primaryActivity ?? '').length}/200
        </p>
      </Field>
      <Field label="Secondary activities (comma-separated)">
        <input type="text" className={inputCls} style={inputStyle} value={wizard.secondaryActivities ?? ''} onChange={(e) => patch({ secondaryActivities: e.target.value })} />
      </Field>
      <Field label="Business sector code (if known)">
        <input type="text" className={inputCls} style={inputStyle} value={wizard.sectorCode ?? ''} onChange={(e) => patch({ sectorCode: e.target.value })} />
      </Field>
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
  )
}

// ------------------------------------------------------------------
// Step 5 — Directors / partners / trustees
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
  phone: string
  email: string
  appointmentDate: string
  isCorporate: boolean
  corporate: CorporateParticipant
  isForeign: boolean
  foreignAddress: string
}

const emptyCorporate: CorporateParticipant = {
  registeredName: '', regNumber: '', countryOfIncorporation: 'Kenya', repName: '', repEmail: '', repPhone: '',
}

const emptyDirector: DirectorForm = {
  fullName: '', idNumber: '', kraPin: '', dateOfBirth: '', nationality: 'Kenyan',
  phone: '', email: '', appointmentDate: new Date().toISOString().slice(0, 10),
  isCorporate: false, corporate: { ...emptyCorporate },
  isForeign: false, foreignAddress: '',
}

// Shared inline OCR uploader — used inside the director/shareholder "add
// new person" forms. Per Charles (2026-07-17): OCR should trigger as soon
// as identity documents are uploaded, not batched at the final doc step.
// Upload + register + extract, then the caller re-syncs from the server
// (mergeExtraction already dedupes/creates the person row) and opens that
// row in edit mode so the rest of the form is just confirmation.
function InlineOcrUpload({ section, documentType = 'id_copy', label, orgId, entityId, api, onExtracted, setError }: {
  section: 'director' | 'shareholder' | 'address'
  documentType?: string
  label?: string
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; fields?: Record<string, unknown> }>
  onExtracted: (fields: Record<string, unknown> | undefined) => void
  setError: (e: string) => void
}) {
  const [state, setState] = useState<'idle' | 'uploading' | 'extracting'>('idle')

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
        document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType },
      }) as { id?: string }

      setState('extracting')
      const result = await api({ action: 'ocr_extract', documentId: registered.id, section })
      onExtracted(result.fields)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed — enter details manually.')
    } finally {
      setState('idle')
    }
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

function CorporateFields({ value, onChange }: { value: CorporateParticipant; onChange: (p: Partial<CorporateParticipant>) => void }) {
  return (
    <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
      <Field label="Registered company name" required>
        <input type="text" className={inputCls} style={inputStyle} value={value.registeredName} onChange={(e) => onChange({ registeredName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Registration number" required>
          <input type="text" className={inputCls} style={inputStyle} value={value.regNumber} onChange={(e) => onChange({ regNumber: e.target.value })} />
        </Field>
        <Field label="Country of incorporation" required>
          <input type="text" className={inputCls} style={inputStyle} value={value.countryOfIncorporation} onChange={(e) => onChange({ countryOfIncorporation: e.target.value })} />
        </Field>
      </div>
      <p className="text-ios-caption1 font-medium" style={{ color: 'var(--system-label-2)' }}>
        Authorised representative (natural person who acts for this company)
      </p>
      <Field label="Representative full name" required>
        <input type="text" className={inputCls} style={inputStyle} value={value.repName} onChange={(e) => onChange({ repName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Representative email" required>
          <input type="email" className={inputCls} style={inputStyle} value={value.repEmail} onChange={(e) => onChange({ repEmail: e.target.value })} />
        </Field>
        <Field label="Representative phone" required>
          <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={value.repPhone} onChange={(e) => onChange({ repPhone: e.target.value })} />
        </Field>
      </div>
      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        Upload the certificate of incorporation, board resolution, and representative ID in the document step.
      </p>
    </div>
  )
}

function StepDirectors({ entityType, directors, setDirectors, orgId, entityId, api, setError, onExtracted }: {
  entityType: EntityType
  directors: DirectorRow[]
  setDirectors: (d: DirectorRow[]) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<DirectorForm | null>(directors.length === 0 ? { ...emptyDirector } : null)
  const [busy, setBusy] = useState(false)

  const set = (partial: Partial<DirectorForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const setCorporate = (partial: Partial<CorporateParticipant>) =>
    setForm((prev) => (prev ? { ...prev, corporate: { ...prev.corporate, ...partial } } : prev))

  const validate = (f: DirectorForm): string | null => {
    if (f.isCorporate) {
      if (!f.corporate.registeredName.trim()) return 'Registered company name is required.'
      if (!f.corporate.regNumber.trim()) return 'Registration number is required.'
      if (!f.corporate.repName.trim()) return 'Representative name is required.'
      if (!f.corporate.repEmail.trim() || !EMAIL_REGEX.test(f.corporate.repEmail)) return 'Enter a valid representative email.'
      if (!f.corporate.repPhone.trim() || !KENYA_PHONE_REGEX.test(f.corporate.repPhone)) return 'Enter a valid representative phone.'
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
  const handleExtracted = (fields: Record<string, unknown> | undefined) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => (prev ? {
      ...prev,
      fullName: prev.fullName || f.full_name || '',
      idNumber: prev.idNumber || f.id_number || '',
      kraPin: prev.kraPin || f.kra_pin || '',
      dateOfBirth: prev.dateOfBirth || f.date_of_birth || '',
    } : prev))
    // The server may also have auto-created a person row from this
    // extraction — refresh so the list reflects reality, then drop any
    // duplicate the auto-create made for a record we're about to save
    // as a fresh entry from the open form.
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
              onClick={() => setForm({
                id: d.id,
                fullName: d.residential_address?.isCorporate ? '' : d.full_name,
                idNumber: d.residential_address?.isCorporate ? '' : d.id_number,
                kraPin: d.kra_pin ?? '',
                dateOfBirth: d.residential_address?.dateOfBirth ?? '',
                nationality: d.residential_address?.isCorporate ? 'Kenyan' : d.nationality,
                phone: d.residential_address?.isCorporate ? '' : (d.phone ?? ''),
                email: d.residential_address?.isCorporate ? '' : (d.email ?? ''),
                appointmentDate: d.appointment_date ?? '',
                isCorporate: !!d.residential_address?.isCorporate,
                corporate: d.residential_address?.corporate ?? { ...emptyCorporate },
                isForeign: !!d.is_foreign,
                foreignAddress: d.residential_address?.foreignAddress ?? '',
              })}
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
            <CorporateFields value={form.corporate} onChange={setCorporate} />
          ) : (
            <>
              {!form.id && (
                <InlineOcrUpload
                  section="director"
                  orgId={orgId}
                  entityId={entityId}
                  api={api}
                  onExtracted={handleExtracted}
                  setError={setError}
                />
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
          onClick={() => setForm({ ...emptyDirector })}
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
  phone: string
  email: string
  sharesHeld: string
  isNominee: boolean
  isCorporate: boolean
  corporate: CorporateParticipant
  alsoDirector: boolean
  isForeign: boolean
  foreignAddress: string
}

const emptyShareholder: ShareholderForm = {
  legalName: '', idNumber: '', kraPin: '', dateOfBirth: '', phone: '', email: '',
  sharesHeld: '', isNominee: false, isCorporate: false, corporate: { ...emptyCorporate }, alsoDirector: false,
  isForeign: false, foreignAddress: '',
}

function StepShareholders({ entityType, shareholders, setShareholders, directors, setDirectors, orgId, entityId, api, setError, onExtracted }: {
  entityType: EntityType
  shareholders: ShareholderRow[]
  setShareholders: (s: ShareholderRow[]) => void
  directors: DirectorRow[]
  setDirectors: (d: DirectorRow[]) => void
  orgId: string | null
  entityId: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown> }>
  setError: (e: string) => void
  onExtracted: () => Promise<void>
}) {
  const roleLabel = ROLE_BY_TYPE[entityType] ?? 'Director'
  const [form, setForm] = useState<ShareholderForm | null>(shareholders.length === 0 ? { ...emptyShareholder } : null)
  const [busy, setBusy] = useState(false)
  const total = shareholders.reduce((s, x) => s + x.shares_held, 0)

  const set = (partial: Partial<ShareholderForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const setCorporate = (partial: Partial<CorporateParticipant>) =>
    setForm((prev) => (prev ? { ...prev, corporate: { ...prev.corporate, ...partial } } : prev))

  const save = async () => {
    if (!form) return
    if (form.isCorporate) {
      if (!form.corporate.registeredName.trim()) { setError('Registered company name is required.'); return }
      if (!form.corporate.regNumber.trim()) { setError('Registration number is required.'); return }
      if (!form.corporate.repName.trim()) { setError('Representative name is required.'); return }
    } else {
      if (!form.legalName.trim()) { setError('Name is required.'); return }
      if (!form.idNumber.trim()) { setError('National ID / registration number is required.'); return }
      if (!form.kraPin.trim()) { setError('KRA PIN is required.'); return }
      if (!KRA_PIN_REGEX.test(form.kraPin.toUpperCase())) { setError('KRA PIN format: A123456789B.'); return }
    }
    const shares = parseInt(form.sharesHeld, 10)
    if (!shares || shares < 1) { setError('Enter the number of shares/units held.'); return }
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
        },
      })
      const updated: ShareholderRow = {
        id: result.id!,
        legal_name: displayName,
        id_or_reg_number: idOrReg || null,
        kra_pin: form.kraPin.trim().toUpperCase() || null,
        shares_held: shares,
        share_percentage: null,
        address: { isForeign: form.isForeign, foreignAddress: form.isForeign ? form.foreignAddress : undefined },
        corporate_details: {
          nominee: form.isNominee || undefined,
          isCorporate: form.isCorporate,
          corporate: form.isCorporate ? form.corporate : undefined,
        },
      }
      const next = form.id ? shareholders.map((s) => (s.id === form.id ? updated : s)) : [...shareholders, updated]
      const newTotal = next.reduce((s, x) => s + x.shares_held, 0)
      setShareholders(next.map((s) => ({ ...s, share_percentage: newTotal > 0 ? Math.round((s.shares_held / newTotal) * 10000) / 100 : null })))

      // "Also a director?" — auto-copy this person's identity into a
      // director profile instead of re-typing it (Charles, 2026-07-17)
      if (form.alsoDirector && !form.isCorporate && !form.id) {
        const dirResult = await api({
          action: 'upsert_director',
          director: {
            fullName: form.legalName.trim(),
            idNumber: form.idNumber.trim(),
            kraPin: form.kraPin.trim().toUpperCase() || undefined,
            dateOfBirth: form.dateOfBirth || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            role: roleLabel.toLowerCase().replace(' ', '_'),
            appointmentDate: new Date().toISOString().slice(0, 10),
          },
        })
        setDirectors([...directors, {
          id: dirResult.id!,
          full_name: form.legalName.trim(),
          id_number: form.idNumber.trim(),
          kra_pin: form.kraPin.trim().toUpperCase() || null,
          phone: form.phone || null,
          email: form.email || null,
          nationality: 'Kenyan',
          appointment_date: new Date().toISOString().slice(0, 10),
          residential_address: { role: roleLabel, dateOfBirth: form.dateOfBirth },
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

  const handleExtracted = (fields: Record<string, unknown> | undefined) => {
    if (!fields) { onExtracted(); return }
    const f = fields as { full_name?: string; id_number?: string; kra_pin?: string; date_of_birth?: string }
    setForm((prev) => (prev ? {
      ...prev,
      legalName: prev.legalName || f.full_name || '',
      idNumber: prev.idNumber || f.id_number || '',
      kraPin: prev.kraPin || f.kra_pin || '',
      dateOfBirth: prev.dateOfBirth || f.date_of_birth || '',
    } : prev))
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
              onClick={() => setForm({
                id: s.id,
                legalName: s.corporate_details?.isCorporate ? '' : s.legal_name,
                idNumber: s.corporate_details?.isCorporate ? '' : (s.id_or_reg_number ?? ''),
                kraPin: s.kra_pin ?? '',
                dateOfBirth: '',
                phone: '',
                email: '',
                sharesHeld: String(s.shares_held),
                isNominee: !!s.corporate_details?.nominee,
                isCorporate: !!s.corporate_details?.isCorporate,
                corporate: s.corporate_details?.corporate ?? { ...emptyCorporate },
                alsoDirector: false,
                isForeign: !!s.address?.isForeign,
                foreignAddress: s.address?.foreignAddress ?? '',
              })}
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
          Total shares issued: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>{total.toLocaleString()}</span>
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
            <CorporateFields value={form.corporate} onChange={setCorporate} />
          ) : (
            <>
              {!form.id && (
                <InlineOcrUpload
                  section="shareholder"
                  orgId={orgId}
                  entityId={entityId}
                  api={api}
                  onExtracted={handleExtracted}
                  setError={setError}
                />
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
                <Field label="Phone">
                  <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
              </div>
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
          </Field>
          <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            <input type="checkbox" checked={form.isNominee} onChange={(e) => set({ isNominee: e.target.checked })} />
            Nominee shareholder
          </label>
          {!form.isCorporate && !form.id && (
            <label className="flex items-center gap-2 text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
              <input type="checkbox" checked={form.alsoDirector} onChange={(e) => set({ alsoDirector: e.target.checked })} />
              This person is also a {roleLabel.toLowerCase()} — copy these details across
            </label>
          )}
          <div className="flex gap-2">
            <PrimaryButton onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Update' : 'Add shareholder'}</PrimaryButton>
            {shareholders.length > 0 && <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setForm({ ...emptyShareholder })}
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

function StepBeneficialOwners({ shareholders, beneficialOwners, setBeneficialOwners, wizard, patch, api, setError }: {
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  setBeneficialOwners: (b: BeneficialOwnerRow[]) => void
  wizard: WizardData
  patch: (p: Partial<WizardData>) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
}) {
  const [form, setForm] = useState<BeneficialOwnerForm | null>(null)
  const [busy, setBusy] = useState(false)

  // Shareholders holding 10%+ who aren't already recorded as a BO —
  // one-tap prefill per the spec's "permit the user to mark that a
  // shareholder is also a beneficial owner" guidance
  const recordedNames = new Set(beneficialOwners.map((b) => b.full_name.toLowerCase()))
  const candidateShareholders = shareholders.filter(
    (s) => (s.share_percentage ?? 0) >= 10 && !recordedNames.has(s.legal_name.toLowerCase())
  )

  const set = (partial: Partial<BeneficialOwnerForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))

  const prefillFrom = (s: ShareholderRow) => {
    patch({ noBeneficialOwners: false })
    setForm({
      ...emptyBeneficialOwner(),
      fullName: s.legal_name,
      idNumber: s.id_or_reg_number ?? '',
      kraPin: s.kra_pin ?? '',
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
              onClick={() => setForm({
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
              })}
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
            onClick={() => { patch({ noBeneficialOwners: false }); setForm(emptyBeneficialOwner()) }}
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
  const issued = shareholders.reduce((s, x) => s + x.shares_held, 0)
  const nominal = wizard.nominalValuePerShare ?? 100
  const issuedCapital = issued * nominal
  const multi = wizard.useMultipleShareClasses ?? false
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
          <Field label="Nominal value per share (KES)" required>
            <input
              type="number" min={1} className={inputCls} style={inputStyle}
              value={nominal}
              onChange={(e) => patch({ nominalValuePerShare: parseInt(e.target.value, 10) || 0 })}
            />
          </Field>
          <div className="ios-surface rounded-2xl p-4 space-y-1">
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              Shares issued (from shareholders): <span className="font-semibold" style={{ color: 'var(--system-label)' }}>{issued.toLocaleString()}</span>
            </p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              Total issued capital: <span className="font-semibold" style={{ color: 'var(--system-label)' }}>KES {issuedCapital.toLocaleString()}</span>
            </p>
          </div>
          <Field label="Authorised share capital (KES)" required>
            <input
              type="number" min={issuedCapital} className={inputCls} style={inputStyle}
              value={wizard.authorisedShareCapital ?? ''}
              onChange={(e) => patch({ authorisedShareCapital: parseInt(e.target.value, 10) || 0 })}
            />
            <p className="text-ios-caption1 mt-1" style={{ color: 'var(--system-label-3)' }}>
              Must be at least KES {issuedCapital.toLocaleString()} (issued shares × nominal value).
            </p>
          </Field>
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
      <Field label="Do you have draft employment contracts?">
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)} type="button" onClick={() => patch({ hasDraftContracts: v })}
              className="py-2.5 rounded-xl border text-sm font-medium"
              style={{
                borderColor: wizard.hasDraftContracts === v ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                background: wizard.hasDraftContracts === v ? 'var(--system-bg-2)' : 'var(--system-bg)',
                color: 'var(--system-label)',
              }}
            >
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
        {wizard.hasDraftContracts && (
          <p className="text-ios-caption1 mt-1.5" style={{ color: 'var(--system-label-3)' }}>
            You can upload them in the document step.
          </p>
        )}
      </Field>
      <Field label="Will you register employees for NSSF/NHIF?" required>
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
    title: 'Director / partner documents',
    hint: 'National IDs or passports, and KRA PIN certificates — one file per document, any order.',
    documentType: 'id_copy',
    visible: (t) => t !== 'sole_proprietorship',
  },
  {
    key: 'director',
    title: 'Owner documents',
    hint: 'Your national ID or passport, and KRA PIN certificate.',
    documentType: 'id_copy',
    visible: (t) => t === 'sole_proprietorship',
  },
  {
    key: 'shareholder',
    title: 'Shareholder / member documents',
    hint: 'IDs and KRA PIN certificates for each shareholder or member.',
    documentType: 'id_copy',
    visible: (t) =>
      t === 'limited_company' || t === 'public_limited_company' || t === 'cooperative' || t === 'limited_liability_partnership',
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
    title: 'Other supporting documents',
    hint: 'Partnership deeds, trust deeds, by-laws, draft employment contracts — anything else relevant.',
    documentType: 'other',
    visible: () => true,
  },
]

type FileStatus = { name: string; state: 'uploading' | 'extracting' | 'done' | 'ocr_failed' | 'upload_failed'; summary?: string }

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

  const setStatus = (id: string, s: FileStatus) => setStatuses((prev) => ({ ...prev, [id]: s }))

  const handleFiles = async (section: UploadSection, files: FileList | null) => {
    if (!files || files.length === 0 || !orgId || !entityId) return
    setError('')
    const supabase = createClient()

    for (const file of Array.from(files)) {
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
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      let documentId: string
      try {
        const registered = await api({
          action: 'register_document',
          document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: section.documentType },
        })
        documentId = registered.id!
      } catch {
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      setDocuments([...documents, { id: documentId, name: file.name, document_type: section.documentType, file_path: path, file_size: file.size }])
      setStatus(tempId, { name: file.name, state: 'extracting' })

      // Run OCR extraction — failures fall back to manual entry, never block
      try {
        const result = await api({ action: 'ocr_extract', documentId, section: section.key })
        if (result.ok && result.fields) {
          const f = result.fields as { full_name?: string; kra_pin?: string; address_line1?: string; document_kind?: string }
          const summary = f.full_name ?? f.address_line1 ?? f.kra_pin ?? 'Details extracted'
          setStatus(tempId, { name: file.name, state: 'done', summary: `Extracted: ${summary}` })
        } else {
          const summary =
            result.reason === 'quota_exhausted'
              ? 'Extraction unavailable right now — details can be entered manually'
              : 'Couldn’t read this document — details can be entered manually'
          setStatus(tempId, { name: file.name, state: 'ocr_failed', summary })
        }
      } catch {
        setStatus(tempId, { name: file.name, state: 'ocr_failed', summary: 'Extraction failed — details can be entered manually' })
      }

      await onExtracted()
    }
  }

  const busy = Object.values(statuses).some((s) => s.state === 'uploading' || s.state === 'extracting')

  return (
    <div className="space-y-5">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Upload your documents
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Upload ID documents, passport photos, and proof of address. We read them automatically and
        cross-check what you entered — anything missing gets filled in for your review.
      </p>

      {UPLOAD_SECTIONS.filter((s) => s.visible(entityType)).map((section) => (
        <div key={section.title} className="ios-surface rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>
              {section.title}
            </p>
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
              {section.hint}
            </p>
          </div>
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
        </div>
      ))}

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

      <Field label="Your relationship to the business" required>
        <select
          className={inputCls} style={inputStyle}
          value={wizard.applicantRelationship ?? ''}
          onChange={(e) => patch({ applicantRelationship: e.target.value as WizardData['applicantRelationship'] })}
        >
          <option value="" disabled>Choose…</option>
          {APPLICANT_RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </Field>

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
        <Row label="Industry" value={wizard.industry ?? '—'} />
        <Row label="Proposed names" value={names.join(', ') || '—'} />
        <Row label="Registered office" value={[wizard.addressLine1, wizard.city, wizard.county].filter(Boolean).join(', ') || '—'} />
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
function SubmittedScreen({ onDashboard, orgId, entityId, entityStatus, idpUrl, businessName, api, onActivated }: {
  onDashboard: () => void
  orgId: string | null
  entityId: string | null
  entityStatus: string | null
  idpUrl: string | null
  businessName: string | null
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; idpUrl?: string | null }>
  onActivated: () => void
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
          onClick={onDashboard}
          className="w-full py-2.5 rounded-full text-sm font-medium border mt-4"
          style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
        >
          Go to dashboard
        </button>
      </div>

      {showHelp && (
        <HelpRequestSheet
          context={{ source: 'New entity — assisted BRS filing request', businessName }}
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
