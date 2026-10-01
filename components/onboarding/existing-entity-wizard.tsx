'use client'

// Existing-entity onboarding — document-led reconstruction of an entity
// that's already registered (Charles's "Existing Registered … Onboarding
// Developer Brief" series, Sep 2026). Registry documents are evidence:
// extracted values stay proposed until the user confirms them, every
// field shows where it came from, conflicts are resolved side by side,
// and missing documents become follow-up tasks rather than blockers.
// The rules live in lib/onboarding/existing-engine.ts (shared by every
// entity type) and lib/onboarding/existing-entity.ts (per-type config).

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  EXISTING_TOTAL_STEPS, EXISTING_REVIEW_STEP, EXISTING_SUPPORTED_TYPES, EXISTING_DOC_PACKS, EXISTING_BASELINES,
  COMPANY_SUBTYPES, PARTNERSHIP_SUBTYPES, PARTNERSHIP_AGREEMENT_FIELDS, LLP_AGREEMENT_FIELDS, CLG_ARTICLES_FIELDS, LIMITED_COMPANY_PACK, rankFor, entityFieldsFor, stepsFor, stepLabel, entityNounFor,
  type GovernanceRuleRecord,
  type EntityFieldSpec,
  type EntityFieldKey, type ExistingWizardData,
} from '@/lib/onboarding/existing-entity'
import {
  distinctCandidates, documentGaps, fieldState, packFor, activationStatus, baselineTasks,
  FIELD_STATE_LABEL, ONBOARDING_STATUS_LABEL,
  type DocSpec, type FieldState, type BaselineAnswer,
} from '@/lib/onboarding/existing-engine'
import {
  ENTITY_TYPES, KENYA_COUNTIES, KRA_PIN_REGEX, NATIONAL_ID_REGEX, EMAIL_REGEX, KENYA_PHONE_REGEX,
  SECRETARY_CAPITAL_THRESHOLD_KES, type AddressData, type EntityType,
} from '@/lib/onboarding/new-entity'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'
import { AddressFields } from '@/components/onboarding/address-fields'
// Shared with the new-entity wizard — same corporate-party form, same
// person-tagged uploads, same autofill guard. Not duplicated, so fixes
// made in one path reach the other.
import {
  CorporateFields, InlineOcrUpload, PhotoUpload, NoAutofillInput, emptyCorporate,
  findPersonDocument, mergePersonExtraction, mergeCorporateExtraction, corporateIdentifier,
  type CorporateParticipant, type DocumentRow as SharedDocumentRow,
} from '@/components/onboarding/new-entity-wizard'

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30'
const inputStyle = {
  borderColor: 'var(--system-fill-3)',
  background: 'var(--system-bg)',
  color: 'var(--system-label)',
} as const

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-ios-footnote font-medium mb-1.5" style={{ color: 'var(--system-label-2)' }}>
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

type Evidence = { documentId: string; documentType: string; documentDate?: string | null }

type DirectorRow = {
  id: string
  full_name: string
  id_number: string
  kra_pin: string | null
  nationality?: string | null
  phone?: string | null
  email?: string | null
  appointment_date?: string | null
  is_foreign?: boolean
  residential_address?: {
    role?: string
    dateOfBirth?: string | null
    occupation?: string
    isCorporate?: boolean
    corporate?: CorporateParticipant
    foreignAddress?: string
    structuredAddress?: AddressData
    evidence?: Evidence[]
    onCurrentRecord?: boolean
    formationOnly?: boolean
    nameMatchOnly?: boolean
    userReviewed?: boolean
    prefilled?: string[]
    interestPercentage?: string
    contributionType?: string
    contributionValue?: string
    isManagingPartner?: boolean
    signingAuthority?: string
    cessationDate?: string
    cessationReason?: string
  } | null
}
type ShareholderRow = {
  id: string
  legal_name: string
  id_or_reg_number: string | null
  kra_pin: string | null
  shares_held: number
  share_percentage?: number | null
  phone?: string | null
  email?: string | null
  address?: {
    isForeign?: boolean; foreignAddress?: string; structuredAddress?: AddressData
    nationality?: string; dateOfBirth?: string; occupation?: string; shareClass?: string
    isMember?: boolean; guaranteeAmount?: string; membershipClass?: string; admissionDate?: string
    cessationDate?: string; cessationReason?: string
  } | null
  corporate_details?: { isCorporate?: boolean; corporate?: Partial<CorporateParticipant>; nominee?: boolean; evidence?: Evidence[]; nameMatchOnly?: boolean; userReviewed?: boolean; prefilled?: string[] } | null
}
type DocumentRow = SharedDocumentRow & {
  ocr_status?: string | null
  document_date?: string | null
  document_kind?: string | null
  confidence?: number | null
  created_at?: string
}
type BeneficialOwnerRow = {
  id: string
  full_name: string
  id_number: string | null
  kra_pin: string | null
  nationality: string
  date_of_birth: string | null
  residential_address: { structuredAddress?: AddressData; evidence?: Evidence[]; asAtFiling?: string | null; text?: string; prefilled?: string[]; userReviewed?: boolean } | null
  phone: string | null
  email: string | null
  occupation: string | null
  nature_of_control: string | null
  date_became_bo: string | null
  share_percentage: number | null
}

type LoadState = 'loading' | 'wizard' | 'activated' | 'error'
type FileStatus = { name: string; documentType: string; state: 'uploading' | 'extracting' | 'done' | 'ocr_failed' | 'upload_failed'; summary?: string; documentId?: string }

type ApiFn = (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string; fields?: Record<string, unknown>; personId?: string; [k: string]: unknown }>

const docTitle = (pack: DocSpec[], type: string | null | undefined) =>
  pack.find((d) => d.documentType === type)?.title ?? (type ? type.replace(/_/g, ' ') : 'Document')

const fmtDate = (d?: string | null) => {
  if (!d) return null
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATE_STYLE: Record<FieldState, { bg: string; fg: string }> = {
  verified: { bg: 'rgba(22,163,74,0.12)', fg: '#15803d' },
  extracted: { bg: 'rgba(37,99,235,0.10)', fg: '#1d4ed8' },
  conflicting: { bg: 'rgba(220,38,38,0.10)', fg: '#b91c1c' },
  user_confirmed: { bg: 'rgba(217,119,6,0.12)', fg: '#92400e' },
  missing: { bg: 'var(--system-fill-3)', fg: 'var(--system-label-3)' },
}

function StateBadge({ state }: { state: FieldState }) {
  const s = STATE_STYLE[state]
  return (
    <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {FIELD_STATE_LABEL[state]}
    </span>
  )
}

const PRIORITY_LABEL: Record<DocSpec['priority'], string> = {
  primary: 'Primary',
  strong: 'Strongly recommended',
  recommended: 'Recommended',
  conditional: 'If applicable',
}

export function ExistingEntityWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Which entity's session to resume — a user can have several.
  const entityParam = searchParams.get('entity')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [step, setStep] = useState(1)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [wizard, setWizard] = useState<ExistingWizardData>({})
  const [directors, setDirectors] = useState<DirectorRow[]>([])
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwnerRow[]>([])
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({})
  // Conflicting fields the user has explicitly chosen a value for
  const [resolved, setResolved] = useState<Set<EntityFieldKey>>(new Set())
  const [activatedStatus, setActivatedStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const api: ApiFn = useCallback(async (payload) => {
    const res = await fetch('/api/onboarding/existing-entity', {
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

  const applyServerState = (data: Record<string, unknown>) => {
    setWizard((data.wizard as ExistingWizardData) ?? {})
    setDirectors((data.directors as DirectorRow[]) ?? [])
    setShareholders((data.shareholders as ShareholderRow[]) ?? [])
    setDocuments((data.documents as DocumentRow[]) ?? [])
    setBeneficialOwners((data.beneficialOwners as BeneficialOwnerRow[]) ?? [])
  }

  const refresh = useCallback(async () => {
    try {
      const idForRefresh = entityId ?? entityParam
      const res = await fetch(`/api/onboarding/existing-entity${idForRefresh ? `?entity=${idForRefresh}` : ''}`)
      if (!res.ok) return
      applyServerState(await res.json())
    } catch { /* extraction already persisted server-side */ }
  }, [entityId, entityParam])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/onboarding/existing-entity${entityParam ? `?entity=${entityParam}` : ''}`)
        if (!res.ok) { setLoadState('error'); return }
        const data = await res.json()
        setEntityId(data.entityId)
        setOrgId(data.orgId)
        applyServerState(data)
        const resumeSteps = stepsFor((data.wizard as ExistingWizardData | undefined)?.entityType)
        const saved = Math.min(Math.max(data.step ?? 1, 1), EXISTING_TOTAL_STEPS)
        setStep(resumeSteps.includes(saved) ? saved : resumeSteps.find((x) => x > saved) ?? EXISTING_REVIEW_STEP)
        if (data.activated) { setActivatedStatus(data.onboardingStatus); setLoadState('activated'); return }

        if (!data.entityId) {
          const init = await fetch('/api/onboarding/existing-entity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'init' }),
          })
          if (init.ok) {
            const { entityId: newId } = await init.json()
            setEntityId(newId)
          }
        }
        setLoadState('wizard')
      } catch {
        setLoadState('error')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (partial: Partial<ExistingWizardData>) => setWizard((prev) => ({ ...prev, ...partial }))
  const setStatus = (id: string, s: FileStatus) => setStatuses((prev) => ({ ...prev, [id]: s }))

  const entityType: EntityType = wizard.entityType ?? 'limited_company'
  const pack = EXISTING_DOC_PACKS[entityType] ?? LIMITED_COMPANY_PACK
  const packCtx = { subtype: wizard.subtype, nominalCapital: Number(String(wizard.nominalCapital ?? '').replace(/[^\d.]/g, '')) || null }
  const rank = rankFor(entityType)
  const stateOf = (key: EntityFieldKey) => fieldState(wizard.fieldEvidence?.[key], String(wizard[key] ?? ''), rank)
  const fields = entityFieldsFor(entityType)
  const steps = stepsFor(entityType)
  const stepIndex = Math.max(steps.indexOf(step), 0)
  const noun = entityNounFor(entityType)
  const isSoleProp = entityType === 'sole_proprietorship'
  const isPartnership = entityType === 'partnership'
  const isLLP = entityType === 'limited_liability_partnership'
  const isCLG = entityType === 'company_limited_by_guarantee'
  const agreementFields = isCLG ? CLG_ARTICLES_FIELDS : isLLP ? LLP_AGREEMENT_FIELDS : PARTNERSHIP_AGREEMENT_FIELDS
  const agreementType = isCLG ? 'articles' : isLLP ? 'llp_agreement' : 'partnership_agreement'

  // ---- registry uploads -------------------------------------------
  const handleFiles = async (spec: DocSpec, files: FileList | null, replacesFilePath?: string) => {
    if (!files || files.length === 0 || !orgId || !entityId) return
    setError('')
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const tempId = crypto.randomUUID()
      if (file.size > 10 * 1024 * 1024) {
        setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'upload_failed', summary: 'Over 10MB — please compress' })
        continue
      }
      setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'uploading' })

      const safeName = file.name.replace(/[^\w.\-]+/g, '_')
      const path = `${orgId}/${entityId}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) {
        setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      let documentId: string
      try {
        const registered = await api({
          action: 'register_document',
          document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: spec.documentType, replacesFilePath },
        })
        documentId = registered.id!
      } catch {
        setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'extracting', documentId })
      try {
        const result = await api({ action: 'ocr_extract', documentId, section: 'registry' }) as Awaited<ReturnType<ApiFn>> & { reason?: string; conflicts?: string[]; documentType?: string; looksLike?: string; identity?: { matched: string[]; kind: string; name: string | null }; otherEntity?: { documentNumber: string; expectedNumber: string } }
        if (result.ok && result.fields) {
          const f = result.fields as { business_name?: string; registration_number?: string; people?: unknown[]; full_name?: string }
          const refiled = result.documentType && result.documentType !== spec.documentType
            ? ` Filed as ${docTitle(pack, result.documentType)}.`
            : result.looksLike ? ` (It reads like: ${docTitle(pack, result.looksLike)} — move it if it’s in the wrong box.)` : ''
          if (result.identity) {
            const kindLabel = result.identity.kind === 'kra_pin_certificate' ? 'KRA PIN certificate' : result.identity.kind === 'passport' ? 'passport' : result.identity.kind === 'national_id' ? 'ID' : 'document'
            setStatus(tempId, {
              name: file.name, documentType: spec.documentType, documentId,
              state: result.identity.matched.length ? 'done' : 'ocr_failed',
              summary: result.identity.matched.length
                ? `${result.identity.name}’s ${kindLabel} — filled into ${result.identity.matched.join(', ')}.`
                : result.identity.name
                  ? `${result.identity.name}’s ${kindLabel} — no matching person yet. It’s saved; upload the CR12/certificate first, or add them on the people screen.`
                  : 'Not an ID, passport or personal KRA PIN certificate — upload it in the right box above.',
            })
            await refresh()
            continue
          }
          if (result.otherEntity) {
            setStatus(tempId, {
              name: file.name, documentType: result.documentType ?? spec.documentType, state: 'ocr_failed',
              summary: `This looks like another company’s document — it shows ${result.otherEntity.documentNumber}, not ${result.otherEntity.expectedNumber}. Nothing from it was used. Remove it if it was uploaded by mistake.`,
            })
            await refresh()
            continue
          }
          const conflictNote = result.conflicts?.length ? ` Differs from another document on: ${result.conflicts.join(', ')} — you’ll choose in the next step.` : ''
          const summary = f.business_name ?? f.registration_number ?? (f.people?.length ? `${f.people.length} people found` : f.full_name) ?? 'details extracted'
          setStatus(tempId, { name: file.name, documentType: result.documentType ?? spec.documentType, state: 'done', summary: `Read: ${summary}.${refiled}${conflictNote}` })
        } else {
          setStatus(tempId, {
            name: file.name,
            documentType: spec.documentType,
            state: 'ocr_failed',
            summary: result.reason === 'quota_exhausted'
              ? 'Saved, but reading is unavailable right now — you can enter details manually'
              : 'Saved, but we couldn’t read it — you can enter details manually',
          })
        }
      } catch {
        setStatus(tempId, { name: file.name, documentType: spec.documentType, state: 'ocr_failed', summary: 'Saved, but extraction failed — you can enter details manually' })
      }

      await refresh()
    }
  }

  const removeDocument = async (id: string) => {
    try {
      await api({ action: 'delete_document', id })
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch { setError('Failed to remove document.') }
  }

  // ---- validation + nav -------------------------------------------
  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!wizard.entityType) return 'Choose your entity type.'
        if (!EXISTING_SUPPORTED_TYPES.includes(wizard.entityType)) return 'This entity type isn’t available yet.'
        if (wizard.entityType === 'limited_company' && !wizard.subtype) return 'Is it a private or public company?'
        if (wizard.entityType === 'partnership' && wizard.partnershipKind !== 'general') return 'Choose the kind of partnership — limited partnerships and LLPs have their own workflows (coming later).'
        return null
      case 3: {
        if (!wizard.legalName?.trim()) return 'Registered name is required.'
        if (!wizard.registrationNumber?.trim()) return 'Registration number is required.'
        if (wizard.kraPin && !KRA_PIN_REGEX.test(wizard.kraPin.toUpperCase())) return 'KRA PIN format: A123456789B.'
        const unresolved = fields.find((f) => stateOf(f.key) === 'conflicting' && !resolved.has(f.key))
        if (unresolved) return `Your documents disagree on “${unresolved.label}” — choose the value that reflects the current position.`
        return null
      }
      case 4:
        if (isLLP) {
          const llpPartners = directors.filter((d) => d.residential_address?.role === 'partner')
          if (llpPartners.length === 0) return 'Add the partners.'
          if (directors.some((d) => d.residential_address?.nameMatchOnly)) return 'Confirm the people marked “matched by name only”.'
          return null
        }
        if (isPartnership) {
          const partners = directors.filter((d) => d.residential_address?.role === 'partner')
          if (partners.length === 0) return 'Add the partners.'
          if (partners.some((d) => d.residential_address?.nameMatchOnly)) return 'Confirm the partners marked “matched by name only”.'
          return null
        }
        if (isSoleProp) {
          const proprietors = directors.filter((d) => d.residential_address?.role === 'proprietor')
          if (proprietors.length === 0) return 'Add the proprietor.'
          if (proprietors.length > 1) return 'A business name registered to one person has one proprietor — for two or more owners, choose Partnership.'
          if (proprietors.some((d) => d.residential_address?.nameMatchOnly)) return 'Confirm the proprietor marked “matched by name only”.'
          return null
        }
        if (directors.filter((d) => (d.residential_address?.role ?? 'director') === 'director').length < 1) return 'Add at least one director.'
        if (directors.some((d) => d.residential_address?.nameMatchOnly)) return 'Confirm the people marked “matched by name only”.'
        return null
      case 5:
        // Partnership: step 5 is the agreement — optional content, gaps
        // are flagged rather than blocking.
        if (isPartnership) return null
        if (beneficialOwners.length === 0 && !wizard.noBeneficialOwners) {
          return 'Add at least one beneficial owner, or confirm none currently apply.'
        }
        return null
      case 6: {
        const questions = (EXISTING_BASELINES[entityType] ?? []).filter((q) => !q.when || q.when(packCtx))
        const unanswered = questions.find((q) => !wizard.baseline?.[q.key])
        if (unanswered) return 'Please answer every question — “Not sure” is fine.'
        return null
      }
      default:
        return null
    }
  }

  const handleContinue = async () => {
    const v = validateStep()
    if (v) { setError(v); return }
    setError('')
    setSaving(true)
    try {
      const next = steps[stepIndex + 1] ?? EXISTING_REVIEW_STEP
      // Continuing past the details step is the user confirming those
      // values — each keeps its own state (verified vs evidence outstanding).
      const confirm = step === 3 ? fields.map((f) => f.key).filter((k) => String(wizard[k] ?? '').trim()) : undefined
      const res = await api({ action: 'save_step', step, wizard, advanceTo: next, confirm })
      if (res.wizard) setWizard(res.wizard as ExistingWizardData)
      setStep(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async () => {
    if (!wizard.declared) { setError('Please certify that the information is accurate.'); return }
    if (!wizard.signature?.trim()) { setError('Type your full legal name as a signature.'); return }
    setError('')
    setSaving(true)
    try {
      const signed = { ...wizard, declarationDate: new Date().toISOString().slice(0, 10) }
      await api({ action: 'save_step', step: EXISTING_REVIEW_STEP, wizard: signed })
      const res = await api({ action: 'activate' })
      setActivatedStatus((res.onboardingStatus as string) ?? null)
      setLoadState('activated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  // ---- render ------------------------------------------------------
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
        <p className="text-ios-body mb-4" style={{ color: 'var(--system-label-2)' }}>We couldn’t load your application.</p>
        <Link href="/onboarding" className="text-ios-subhead font-medium" style={{ color: 'var(--brand-navy)' }}>← Back to path selection</Link>
      </div>
    )
  }

  if (loadState === 'activated') {
    const provisional = activatedStatus === 'provisionally_onboarded'
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(128,0,32,0.10)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#800020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-ios-title1 font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
            {wizard.legalName ?? 'Your entity'} is live
          </h1>
          {activatedStatus && (
            <p className="text-ios-subhead font-semibold mb-2" style={{ color: 'var(--brand-navy)' }}>
              {ONBOARDING_STATUS_LABEL[activatedStatus as keyof typeof ONBOARDING_STATUS_LABEL] ?? activatedStatus}
            </p>
          )}
          <p className="text-ios-body mb-8" style={{ color: 'var(--system-label-2)' }}>
            {provisional
              ? 'Your workspace is active. Some evidence is still outstanding — we’ve added follow-up tasks to your compliance calendar so nothing is lost.'
              : 'Your details are verified against your documents and your compliance calendar is ready.'}
          </p>
          <button
            type="button"
            onClick={() => router.push(entityId ? `/dashboard/${entityId}` : '/dashboard')}
            className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-navy)' }}
          >
            Go to my entity dashboard
          </button>
        </div>
      </div>
    )
  }

  const busy = Object.values(statuses).some((s) => s.state === 'uploading' || s.state === 'extracting')
  const lowConfidence = wizard.minConfidence !== undefined && wizard.minConfidence < 60
  const registryDocs = documents.filter((d) => !d.tags?.length)
  const uploadedTypes = new Set(registryDocs.map((d) => d.document_type).filter((t): t is string => !!t))
  const gaps = documentGaps(pack, packCtx, uploadedTypes, wizard.unavailableDocuments)

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
      <div className="w-full max-w-[520px]">
        <div className="flex items-center gap-1 mb-6">
          {steps.map((sId, i) => (
            <div key={sId} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i <= stepIndex ? 'var(--brand-navy)' : 'var(--system-fill-3)' }} />
          ))}
        </div>

        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-3)' }}>
          Step {stepIndex + 1} of {steps.length} — {stepLabel(entityType, step)}
        </p>

        {/* ---------------- Step 1: entity type ---------------- */}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              What have you already registered?
            </h1>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              This tells us which registry documents to ask for. We’ll rebuild your profile from them — no retyping.
            </p>
            <div className="space-y-2">
              {ENTITY_TYPES.filter((t) => t.value !== 'public_limited_company').map((t) => {
                const selected = wizard.entityType === t.value
                const available = EXISTING_SUPPORTED_TYPES.includes(t.value)
                return (
                  <div key={t.value}>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => available && patch({ entityType: t.value })}
                      className="w-full text-left rounded-xl border p-4 transition-colors disabled:cursor-not-allowed"
                      style={{
                        borderColor: selected ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                        background: selected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                        opacity: available ? 1 : 0.45,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{t.label}</span>
                        {!available && (
                          <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-3)' }}>
                            Coming later
                          </span>
                        )}
                      </span>
                      <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{t.description}</span>
                    </button>
                    {t.guides?.map((g) => (
                      <a key={g.url} href={g.url} target="_blank" rel="noopener noreferrer" className="text-ios-caption1 font-semibold underline mt-1 ml-1 mr-3 inline-block" style={{ color: 'var(--brand-navy)' }}>
                        {g.label} →
                      </a>
                    ))}
                  </div>
                )
              })}
            </div>

            {wizard.entityType === 'limited_company' && (
              <div className="ios-surface rounded-2xl p-4 space-y-2">
                <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Which kind of company?</p>
                {COMPANY_SUBTYPES.map((s) => (
                  <label key={s.value} className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer" style={{ borderColor: wizard.subtype === s.value ? 'var(--brand-navy)' : 'var(--system-fill-3)' }}>
                    <input type="radio" name="subtype" className="mt-1" checked={wizard.subtype === s.value} onChange={() => patch({ subtype: s.value })} />
                    <span>
                      <span className="block text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{s.label}</span>
                      <span className="block text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>{s.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {wizard.entityType === 'partnership' && (
              <div className="ios-surface rounded-2xl p-4 space-y-2">
                <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Which kind of partnership?</p>
                {PARTNERSHIP_SUBTYPES.map((s) => (
                  <label key={s.value} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: wizard.partnershipKind === s.value ? 'var(--brand-navy)' : 'var(--system-fill-3)', opacity: s.available ? 1 : 0.5, cursor: s.available ? 'pointer' : 'not-allowed' }}>
                    <input type="radio" name="partnershipKind" className="mt-1" disabled={!s.available} checked={wizard.partnershipKind === s.value} onChange={() => patch({ partnershipKind: s.value })} />
                    <span>
                      <span className="block text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{s.label}{!s.available && ' — coming later'}</span>
                      <span className="block text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>{s.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {wizard.entityType && EXISTING_SUPPORTED_TYPES.includes(wizard.entityType) && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Registered name (if you know it)">
                  <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={wizard.legalName ?? ''} onChange={(e) => patch({ legalName: e.target.value })} />
                </Field>
                <Field label="Registration number">
                  <NoAutofillInput type="text" className={inputCls} style={inputStyle} placeholder={isSoleProp ? 'BN-XXXXXXX' : 'PVT-XXXXXXX'} value={wizard.registrationNumber ?? ''} onChange={(e) => patch({ registrationNumber: e.target.value.toUpperCase() })} />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* ---------------- Step 2: registry document pack ---------------- */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Upload your registry documents
            </h1>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              We read each one and propose your details — you confirm them next. Nothing is final until you do.
              Missing something? Carry on: we’ll note the gap and add a follow-up task rather than block you.
            </p>

            {packFor(pack, packCtx).map((spec) => {
              const files = registryDocs.filter((d) => d.document_type === spec.documentType)
              const unavailable = wizard.unavailableDocuments?.includes(spec.documentType) ?? false
              // An ID that wasn't matched at upload may have been matched
              // since (the CR12 came later) — its old "no match" note goes
              const matchedLater = (st: FileStatus) => st.state === 'ocr_failed' && !!st.documentId &&
                documents.some((d) => d.id === st.documentId && !!d.tags?.length)
              const live = Object.entries(statuses).filter(([, s]) => s.documentType === spec.documentType && !matchedLater(s))
              return (
                <div key={spec.documentType} className="ios-surface rounded-2xl p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{spec.title}</p>
                      <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold shrink-0" style={{ background: spec.priority === 'primary' ? 'rgba(128,0,32,0.10)' : 'var(--system-fill-3)', color: spec.priority === 'primary' ? '#800020' : 'var(--system-label-3)' }}>
                        {PRIORITY_LABEL[spec.priority]}
                      </span>
                    </div>
                    <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{spec.hint}</p>
                  </div>

                  {files.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--system-bg-2)' }}>
                      <div className="min-w-0">
                        <p className="text-ios-footnote font-medium truncate" style={{ color: 'var(--system-label)' }}>{d.name}</p>
                        <p className="text-ios-caption1" style={{ color: d.ocr_status === 'failed' ? '#92400e' : 'var(--system-label-3)' }}>
                          {d.ocr_status === 'complete' ? `Read${d.document_date ? ` · dated ${fmtDate(d.document_date)}` : ''}` : d.ocr_status === 'failed' ? 'Couldn’t be read — enter details manually' : d.ocr_status === 'processing' ? 'Reading…' : 'Saved'}
                        </p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        {!spec.multiple && (
                          <label className="text-ios-footnote font-medium cursor-pointer" style={{ color: 'var(--brand-navy)' }}>
                            Replace
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={busy}
                              onChange={(e) => { handleFiles(spec, e.target.files, d.file_path ?? undefined); e.target.value = '' }} />
                          </label>
                        )}
                        <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => removeDocument(d.id)}>Remove</button>
                      </div>
                    </div>
                  ))}

                  {spec.documentType === 'identity_documents' && (() => {
                    const filed = documents.filter((d) => /_(id_copy|kra_pin_copy)$/.test(d.document_type ?? '') && d.tags?.length).length
                    return filed > 0 ? (
                      <p className="text-ios-caption1" style={{ color: '#16a34a' }}>{filed} identity document{filed === 1 ? '' : 's'} filed under the right people.</p>
                    ) : null
                  })()}
                  {live.filter(([, s]) => s.state !== 'done').concat(live.filter(([, s]) => s.state === 'done')).map(([id, s]) => (
                    <p key={id} className="text-ios-caption1 break-words [overflow-wrap:anywhere]" style={{ color: s.state === 'done' ? '#16a34a' : s.state === 'uploading' || s.state === 'extracting' ? 'var(--system-label-2)' : '#92400e' }}>
                      {s.name}: {s.state === 'uploading' ? 'Uploading…' : s.state === 'extracting' ? 'Reading document…' : s.summary}
                    </p>
                  ))}

                  {(spec.multiple || files.length === 0) && !unavailable && (
                    <label className="block w-full rounded-xl border-2 border-dashed p-4 text-center cursor-pointer" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)' }}>
                      <input type="file" multiple={spec.multiple} accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={busy}
                        onChange={(e) => { handleFiles(spec, e.target.files); e.target.value = '' }} />
                      <span className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
                        {busy ? 'Working…' : files.length ? 'Add another file' : 'Choose file'}
                      </span>
                    </label>
                  )}

                  {files.length === 0 && spec.missing.impact !== 'conditional' && (
                    <label className="flex items-start gap-2 text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>
                      <input type="checkbox" className="mt-0.5" checked={unavailable}
                        onChange={(e) => patch({ unavailableDocuments: e.target.checked
                          ? [...(wizard.unavailableDocuments ?? []), spec.documentType]
                          : (wizard.unavailableDocuments ?? []).filter((t) => t !== spec.documentType) })} />
                      <span>I don’t have this right now.{unavailable && <> <span style={{ color: '#92400e' }}>{spec.missing.behaviour}</span></>}</span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ---------------- Step 3: entity details with provenance ---------------- */}
        {step === 3 && (
          <EntityDetailsStep
            fields={fields}
            noun={noun}
            wizard={wizard}
            patch={patch}
            pack={pack}
            documents={documents}
            stateOf={stateOf}
            rank={rank}
            resolved={resolved}
            setResolved={setResolved}
            lowConfidence={lowConfidence}
            onHelp={() => setShowHelp(true)}
          />
        )}

        {/* ---------------- Step 4: people ---------------- */}
        {step === 4 && (
          <PeopleStep
            directors={directors}
            shareholders={shareholders}
            documents={documents}
            setDirectors={setDirectors}
            setShareholders={setShareholders}
            refresh={refresh}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
            wizard={wizard}
            pack={pack}
            needsSecretary={!isSoleProp && !isCLG && (wizard.subtype === 'public' || (packCtx.nominalCapital ?? 0) >= SECRETARY_CAPITAL_THRESHOLD_KES)}
            isSoleProp={isSoleProp}
            isPartnership={isPartnership}
            isLLP={isLLP}
            isCLG={isCLG}
          />
        )}

        {/* ---------------- Step 5: beneficial ownership ---------------- */}
        {((step === 5 && isPartnership) || (step === 8 && (isLLP || isCLG))) && (
          <AgreementStep wizard={wizard} patch={patch} documents={documents} directors={directors}
            fields={agreementFields} documentType={agreementType} instrument={isCLG ? 'articles of association' : isLLP ? 'LLP agreement' : 'partnership agreement'}
            statuteNote={isCLG
              ? 'Where the Articles are silent, the Companies Act or legal review may apply. We flag these rather than invent a constitutional rule.'
              : isLLP
              ? 'Where the agreement is silent, the Limited Liability Partnerships Act’s default rules may apply. We flag these for legal review rather than assume them.'
              : 'Where the agreement is silent, the Partnerships Act’s default rules may apply (for example, equal sharing of profits). We flag these for legal review rather than assume them.'} />
        )}
        {step === 5 && !isPartnership && (
          <BeneficialOwnersStep
            shareholders={shareholders}
            beneficialOwners={beneficialOwners}
            setBeneficialOwners={setBeneficialOwners}
            documents={documents}
            pack={pack}
            wizard={wizard}
            patch={patch}
            api={api}
            orgId={orgId}
            entityId={entityId}
            setError={setError}
            isLLP={isLLP}
            isCLG={isCLG}
          />
        )}

        {/* ---------------- Step 6: compliance baseline ---------------- */}
        {step === 6 && (
          <div className="space-y-4">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Is everything still current?
            </h1>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              A certificate proves the {noun} exists — not that its records are up to date. Your answers set your
              compliance baseline and create only the tasks that apply to you.
            </p>
            {(EXISTING_BASELINES[entityType] ?? []).filter((q) => !q.when || q.when(packCtx)).map((q) => (
              <div key={q.key} className="ios-surface rounded-2xl p-4 space-y-2">
                <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{q.question}</p>
                <div className="flex gap-2">
                  {(['yes', 'no', 'unsure'] as BaselineAnswer[]).map((a) => {
                    const on = wizard.baseline?.[q.key] === a
                    return (
                      <button key={a} type="button"
                        onClick={() => patch({ baseline: { ...(wizard.baseline ?? {}), [q.key]: a } })}
                        className="flex-1 py-2 rounded-full text-sm font-medium border"
                        style={{ borderColor: on ? 'var(--brand-navy)' : 'var(--system-fill-3)', color: on ? 'var(--brand-navy)' : 'var(--system-label-2)', background: on ? 'var(--system-bg-2)' : 'transparent' }}>
                        {a === 'yes' ? 'Yes' : a === 'no' ? 'No' : 'Not sure'}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {!isSoleProp && !uploadedTypes.has('annual_return') && (
              <Field label="When was the last annual return filed? (if you know)">
                <input type="date" className={inputCls} style={inputStyle} value={wizard.lastAnnualReturnDate ?? ''} onChange={(e) => patch({ lastAnnualReturnDate: e.target.value })} />
              </Field>
            )}
          </div>
        )}

        {/* ---------------- Step 7: review & activate ---------------- */}
        {step === 7 && (
          <ReviewStep
            fields={fields}
            isSoleProp={isSoleProp}
            isPartnership={isPartnership}
            isLLP={isLLP}
            isCLG={isCLG}
            agreementFields={agreementFields}
            wizard={wizard}
            patch={patch}
            stateOf={stateOf}
            gaps={gaps}
            directors={directors}
            shareholders={shareholders}
            beneficialOwners={beneficialOwners}
            documents={documents}
            taskCount={
              gaps.filter((g) => g.spec.missing.impact === 'high' || g.spec.missing.impact === 'critical').length +
              (directors.some((d) => !d.residential_address?.isCorporate && !d.residential_address?.cessationDate && !directors.some((o) => (o.id_number || o.full_name).trim().toLowerCase() === (d.id_number || d.full_name).trim().toLowerCase() && documents.some((doc) => doc.document_type === 'director_id_copy' && doc.tags?.some((t) => t.personId === o.id)))) ? 1 : 0) +
              baselineTasks(EXISTING_BASELINES[entityType] ?? [], wizard.baseline ?? {}, packCtx).length +
              (isPartnership && directors.filter((d) => d.residential_address?.role === 'partner' && !d.residential_address?.cessationDate).length < 2 ? 1 : 0) +
              ((isPartnership || isLLP) && uploadedTypes.has(agreementType) && agreementFields.some((f) => wizard.governance?.[f.key]?.silent) ? 1 : 0) +
              (isLLP && !directors.some((d) => d.residential_address?.role === 'manager' && !d.residential_address?.cessationDate && !d.residential_address?.isCorporate) ? 1 : 0)
            }
          />
        )}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          {step > 1 && (
            <button type="button" onClick={() => { setError(''); setStep(steps[stepIndex - 1] ?? 1) }}
              className="py-2.5 px-5 rounded-full text-sm font-medium border" style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}>
              Back
            </button>
          )}
          {stepIndex < steps.length - 1 ? (
            <button type="button" onClick={handleContinue} disabled={saving || busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand-navy)' }}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          ) : (
            <button type="button" onClick={handleActivate} disabled={saving}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand-navy)' }}>
              {saving ? 'Activating…' : 'Confirm & activate'}
            </button>
          )}
        </div>

        <p className="text-ios-caption1 mt-3 text-center" style={{ color: 'var(--system-label-3)' }}>
          Your progress is saved automatically at every step.
        </p>
        <Link href="/dashboard" className="mt-4 block text-center text-ios-footnote font-medium" style={{ color: 'var(--system-label-3)' }}>
          Save &amp; exit
        </Link>
        <button type="button" onClick={() => setShowHelp(true)} className="mt-3 block w-full text-center text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}>
          Stuck? Request help from our team
        </button>
      </div>

      {showHelp && (
        <HelpRequestSheet
          context={{ source: `Existing entity onboarding — step ${step} (${stepLabel(entityType, step)})`, businessName: wizard.legalName }}
          onClose={() => setShowHelp(false)}
          onSent={() => { api({ action: 'request_help' }).catch(() => {}) }}
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 3 — entity details. Each field shows its verification state and
// the documents behind it; conflicts are chosen side by side.
// ------------------------------------------------------------------
function EntityDetailsStep({ fields, noun, wizard, patch, pack, documents, stateOf, rank, resolved, setResolved, lowConfidence, onHelp }: {
  fields: EntityFieldSpec[]
  noun: string
  wizard: ExistingWizardData
  patch: (p: Partial<ExistingWizardData>) => void
  pack: DocSpec[]
  documents: DocumentRow[]
  stateOf: (k: EntityFieldKey) => FieldState
  rank: (t: string) => number
  resolved: Set<EntityFieldKey>
  setResolved: (s: Set<EntityFieldKey>) => void
  lowConfidence: boolean
  onHelp: () => void
}) {
  const docById = new Map(documents.map((d) => [d.id, d]))
  const sourceLabel = (documentId: string, documentType: string, documentDate?: string | null) => {
    const d = docById.get(documentId)
    const date = fmtDate(documentDate ?? d?.document_date)
    return `${docTitle(pack, d?.document_type ?? documentType)}${date ? `, ${date}` : ''}`
  }

  const renderInput = (key: EntityFieldKey) => {
    const common = { className: inputCls, style: inputStyle }
    const onChange = (v: string) => { patch({ [key]: v } as Partial<ExistingWizardData>); setResolved(new Set(resolved).add(key)) }
    if (key === 'dateIncorporated') return <input type="date" {...common} value={wizard.dateIncorporated ?? ''} onChange={(e) => onChange(e.target.value)} />
    if (key === 'county') {
      return (
        <select {...common} value={wizard.county ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )
    }
    return (
      <NoAutofillInput type="text" {...common}
        inputMode={key === 'nominalCapital' ? 'decimal' : undefined}
        placeholder={key === 'kraPin' ? 'P051234567X' : undefined}
        value={String(wizard[key] ?? '')}
        onChange={(e) => onChange(key === 'registrationNumber' || key === 'kraPin' ? e.target.value.toUpperCase() : e.target.value)} />
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Confirm your {noun} details
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        Each detail shows where it came from. Correct anything that’s out of date — where your documents disagree,
        choose the value that reflects the position today. The other value is kept as history.
      </p>
      {lowConfidence && (
        <div className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
          <p>Some documents were hard to read — please double-check every field below.</p>
          <button type="button" onClick={onHelp} className="mt-2 font-semibold underline" style={{ color: '#92400e' }}>Or request manual help from our team →</button>
        </div>
      )}

      {fields.map((f) => {
        const state = stateOf(f.key)
        const distinct = distinctCandidates(wizard.fieldEvidence?.[f.key], rank)
        const conflict = distinct.length > 1
        return (
          <div key={f.key} className="ios-surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>{f.label}</p>
              <StateBadge state={state === 'conflicting' && resolved.has(f.key) ? 'extracted' : state} />
            </div>

            {conflict && (
              <div className="space-y-1.5">
                {distinct.map((c) => {
                  const on = resolved.has(f.key) && String(wizard[f.key] ?? '').trim().toLowerCase() === c.value.trim().toLowerCase()
                  return (
                    <label key={c.value} className="flex items-start gap-2 rounded-xl border p-2.5 cursor-pointer" style={{ borderColor: on ? 'var(--brand-navy)' : 'var(--system-fill-3)' }}>
                      <input type="radio" name={`pick-${f.key}`} className="mt-1" checked={on}
                        onChange={() => { patch({ [f.key]: c.value } as Partial<ExistingWizardData>); setResolved(new Set(resolved).add(f.key)) }} />
                      <span className="min-w-0">
                        <span className="block text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>{c.value}</span>
                        <span className="block text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                          {c.sources.map((s) => sourceLabel(s.documentId, s.documentType, s.documentDate)).join(' · ')}
                        </span>
                      </span>
                    </label>
                  )
                })}
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Or type the current value:</p>
              </div>
            )}

            {renderInput(f.key)}

            {!conflict && distinct.length === 1 && (
              String(wizard[f.key] ?? '').trim().toLowerCase() === distinct[0].value.trim().toLowerCase() ? (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                  From {distinct[0].sources.map((s) => sourceLabel(s.documentId, s.documentType, s.documentDate)).join(' · ')}
                </p>
              ) : (
                <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                  Your documents show “{distinct[0].value}” ({distinct[0].sources.map((s) => sourceLabel(s.documentId, s.documentType, s.documentDate)).join(' · ')}).{' '}
                  <button type="button" className="font-semibold underline" style={{ color: 'var(--brand-navy)' }}
                    onClick={() => { patch({ [f.key]: distinct[0].value } as Partial<ExistingWizardData>); setResolved(new Set(resolved).add(f.key)) }}>
                    Use this
                  </button>
                  {' '}— or keep yours if it’s more current (it’ll be marked evidence outstanding).
                </p>
              )
            )}
          </div>
        )
      })}

      <div className="grid grid-cols-2 gap-3">
        <Field label="City / Town">
          <input type="text" className={inputCls} style={inputStyle} value={wizard.city ?? ''} onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <Field label="Postal code">
          <input type="text" className={inputCls} style={inputStyle} value={wizard.postalCode ?? ''} onChange={(e) => patch({ postalCode: e.target.value })} />
        </Field>
      </div>

      {(wizard.shareClasses?.length ?? 0) > 0 && (
        <div className="ios-surface rounded-2xl p-4 space-y-2">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Share capital on file</p>
          {wizard.shareClasses!.map((c, i) => (
            <p key={i} className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              {c.className}: {c.numberOfShares?.toLocaleString() ?? '—'} shares × KES {c.nominalValueEach?.toLocaleString() ?? '—'}
              <span style={{ color: 'var(--system-label-3)' }}> — {sourceLabel(c.documentId, '')}</span>
            </p>
          ))}
          <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
            As at incorporation. Allotments or capital changes since then are captured in the “changes” step.
          </p>
        </div>
      )}

      {(wizard.subscribers?.length ?? 0) > 0 && (
        <div className="ios-surface rounded-2xl p-4 space-y-1">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Founding subscribers ({wizard.entityType === 'company_limited_by_guarantee' ? 'CR3' : 'CR2'})</p>
          {wizard.subscribers!.map((s, i) => (
            <p key={i} className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              {s.name}{s.shares ? ` — ${s.shares.toLocaleString()} shares` : ''}
            </p>
          ))}
          <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
            Kept as formation history. They’re not treated as today’s shareholders unless a current record shows it.
          </p>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 4 — people & roles. Directors, secretary and shareholders, with
// the same person-tagged ID/KRA/photo uploads and autofill guard as the
// new-entity flow. Identity documents are optional here: the person is
// recorded provisionally and flagged "identity unverified".
// ------------------------------------------------------------------
type PersonKind = 'director' | 'secretary' | 'shareholder' | 'proprietor' | 'partner' | 'manager' | 'authorised_person' | 'member'

type PersonForm = {
  id?: string
  kind: PersonKind
  fullName: string
  idNumber: string
  kraPin: string
  dateOfBirth: string
  nationality: string
  phone: string
  email: string
  occupation: string
  appointmentDate: string
  profitShare: string
  contributionType: string
  contributionValue: string
  isManagingPartner: boolean
  signingAuthority: string
  hasLeft: boolean
  cessationDate: string
  cessationReason: string
  guaranteeAmount: string
  membershipClass: string
  shares: string
  shareClass: string
  isNominee: boolean
  isCorporate: boolean
  corporate: CorporateParticipant
  isForeign: boolean
  foreignAddress: string
  address: AddressData
}

const emptyPersonForm = (kind: PersonKind): PersonForm => ({
  kind, fullName: '', idNumber: '', kraPin: '', dateOfBirth: '', nationality: 'Kenyan', phone: '', email: '',
  occupation: '', appointmentDate: '', profitShare: '', contributionType: '', contributionValue: '', isManagingPartner: false,
  signingAuthority: '', hasLeft: false, cessationDate: '', cessationReason: '', guaranteeAmount: '', membershipClass: '', shares: '', shareClass: 'Ordinary', isNominee: false,
  isCorporate: false, corporate: { ...emptyCorporate }, isForeign: false, foreignAddress: '', address: {},
})

function validatePerson(f: PersonForm): string | null {
  if (f.isCorporate) {
    if (!f.corporate.registeredName.trim()) return 'Registered company name is required.'
    return null
  }
  if (!f.fullName.trim()) return 'Full name is required.'
  if (f.idNumber.trim() && !f.isForeign && !NATIONAL_ID_REGEX.test(f.idNumber.trim())) return 'Kenyan national ID must be 7–10 digits.'
  if (f.kraPin.trim() && !KRA_PIN_REGEX.test(f.kraPin.trim().toUpperCase())) return 'KRA PIN format: A123456789B.'
  if (f.phone.trim() && !KENYA_PHONE_REGEX.test(f.phone.trim())) return 'Phone must be +2547XXXXXXXX or 07XXXXXXXX.'
  if (f.email.trim() && !EMAIL_REGEX.test(f.email.trim())) return 'Enter a valid email address.'
  if (f.kind === 'shareholder' && !(parseInt(f.shares, 10) > 0)) return 'Enter the number of shares held.'
  if (f.kind === 'manager' && f.isCorporate) return 'An LLP manager must be a natural person.'
  if ((f.kind === 'partner' || f.kind === 'manager' || f.kind === 'member') && f.hasLeft && !f.cessationDate) return 'Enter the date they left.'
  if (f.kind === 'partner') {
    if (f.profitShare.trim() && !(Number(f.profitShare) >= 0 && Number(f.profitShare) <= 100)) return 'Profit share must be a percentage between 0 and 100.'
    if (f.hasLeft && !f.cessationDate) return 'Enter the date the partner left.'
  }
  // Same address rule as the new-entity flow, once an address is given
  const a = f.address
  const anyAddress = !!(a.buildingName || a.streetName || a.city || a.county || a.postalAddress || a.postalCode)
  if (anyAddress && !f.isForeign) {
    if (!a.city?.trim()) return 'City/Town is required.'
    if (!a.county) return 'Choose a county.'
    if (!a.postalAddress?.trim()) return 'P.O. Box is required.'
    if (!a.postalCode?.trim()) return 'Postal code is required.'
  }
  return null
}

const idDocType = (kind: PersonKind) => (kind === 'shareholder' || kind === 'member' ? 'shareholder_id_copy' : 'director_id_copy')
const kraDocType = (kind: PersonKind) => (kind === 'shareholder' || kind === 'member' ? 'shareholder_kra_pin_copy' : 'director_kra_pin_copy')

function PeopleStep({ directors, shareholders, documents, setDirectors, setShareholders, refresh, api, setError, orgId, entityId, wizard, pack, needsSecretary, isSoleProp, isPartnership, isLLP, isCLG }: {
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  documents: DocumentRow[]
  setDirectors: (d: DirectorRow[]) => void
  setShareholders: (s: ShareholderRow[]) => void
  refresh: () => Promise<void>
  api: ApiFn
  setError: (e: string) => void
  orgId: string | null
  entityId: string | null
  wizard: ExistingWizardData
  pack: DocSpec[]
  needsSecretary: boolean
  isSoleProp: boolean
  isPartnership: boolean
  isLLP: boolean
  isCLG: boolean
}) {
  const [form, setForm] = useState<PersonForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])
  // Stale OCR results must never land in a different open form (see the
  // new-entity wizard's formTokenRef).
  // The ref is what an in-flight upload compares against; the state copy
  // is what render passes down.
  const formTokenRef = useRef<string | null>(null)
  const [formToken, setFormToken] = useState<string | null>(null)
  const newToken = (t: string | null) => { formTokenRef.current = t; setFormToken(t) }

  const set = (p: Partial<PersonForm>) => setForm((prev) => (prev ? { ...prev, ...p } : prev))
  const open = (f: PersonForm) => { newToken(crypto.randomUUID()); setUploadedDocIds([]); setError(''); setForm(f) }

  const handleExtracted = (fields: Record<string, unknown> | undefined, _personId?: string, wasReplace?: boolean, sessionToken?: string) => {
    if (!fields || sessionToken !== formTokenRef.current) return
    setForm((prev) => {
      if (!prev) return prev
      // Company documents (certificate, KRA PIN certificate, CR12) and the
      // representative's ID fill the corporate sub-form, same as new-entity
      if (prev.isCorporate) {
        return { ...prev, corporate: mergeCorporateExtraction(prev.corporate, fields as Parameters<typeof mergeCorporateExtraction>[1], !!wasReplace) }
      }
      return mergePersonExtraction(prev, fields as Parameters<typeof mergePersonExtraction>[1], !!wasReplace)
    })
  }

  const evidenceText = (ev?: Evidence[]) => {
    if (!ev?.length) return null
    return ev.map((e) => `${docTitle(pack, e.documentType)}${e.documentDate ? ` (${fmtDate(e.documentDate)})` : ''}`).join(' · ')
  }

  // An ID on file for the same person in another role counts too
  const hasIdDoc = (personId: string, kind: PersonKind) => {
    const me = directors.find((d) => d.id === personId)
    const key = me ? (me.id_number || me.full_name).trim().toLowerCase() : null
    const ids = new Set([personId, ...directors.filter((d) => key && (d.id_number || d.full_name).trim().toLowerCase() === key).map((d) => d.id)])
    return documents.some((d) => d.document_type === idDocType(kind) && d.tags?.some((t) => !!t.personId && ids.has(t.personId)))
  }

  const save = async () => {
    if (!form) return
    const v = validatePerson(form)
    if (v) { setError(v); return }
    setError('')
    setBusy(true)
    try {
      const displayName = form.isCorporate ? form.corporate.registeredName.trim() : form.fullName.trim()
      const common = {
        id: form.id,
        idNumber: form.isCorporate ? corporateIdentifier(form.corporate) : form.idNumber.trim() || undefined,
        kraPin: (form.isCorporate ? form.corporate.kraPin : form.kraPin).trim().toUpperCase() || undefined,
        nationality: form.isCorporate ? form.corporate.countryOfIncorporation : form.isForeign ? form.nationality : 'Kenyan',
        dateOfBirth: form.isCorporate ? undefined : form.dateOfBirth || undefined,
        phone: (form.isCorporate ? form.corporate.repPhone : form.phone).trim() || undefined,
        email: (form.isCorporate ? form.corporate.repEmail : form.email).trim() || undefined,
        occupation: form.isCorporate ? undefined : form.occupation.trim() || undefined,
        structuredAddress: form.isCorporate ? undefined : form.address,
        isCorporate: form.isCorporate,
        corporate: form.isCorporate ? form.corporate : undefined,
        isForeign: form.isForeign,
        foreignAddress: form.isForeign ? form.foreignAddress.trim() : undefined,
      }
      let id: string
      if (form.kind === 'member') {
        const result = await api({
          action: 'upsert_shareholder',
          shareholder: {
            ...common, legalName: displayName, sharesHeld: 0, isMember: true,
            guaranteeAmount: form.guaranteeAmount.trim() || undefined, membershipClass: form.membershipClass.trim() || undefined,
            admissionDate: form.appointmentDate || undefined,
            cessationDate: form.hasLeft ? form.cessationDate : undefined,
            cessationReason: form.hasLeft ? form.cessationReason.trim() || undefined : undefined,
          },
        })
        id = result.id!
      } else if (form.kind === 'shareholder') {
        const result = await api({
          action: 'upsert_shareholder',
          shareholder: { ...common, legalName: displayName, sharesHeld: parseInt(form.shares, 10) || 0, shareClass: form.shareClass, isNominee: form.isNominee },
        })
        id = result.id!
      } else {
        const result = await api({
          action: 'upsert_director',
          director: {
            ...common, fullName: displayName, role: form.kind, appointmentDate: form.appointmentDate || undefined,
            ...(form.kind === 'partner' ? {
              interestPercentage: form.profitShare.trim() || undefined,
              contributionType: form.contributionType || undefined,
              contributionValue: form.contributionValue.trim() || undefined,
              isManagingPartner: form.isManagingPartner,
              signingAuthority: form.signingAuthority.trim() || undefined,
            } : {}),
            cessationDate: form.hasLeft ? form.cessationDate : undefined,
            cessationReason: form.hasLeft ? form.cessationReason.trim() || undefined : undefined,
          },
        })
        id = result.id!
      }
      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: id, personName: displayName, personRole: form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director' })
      }
      setForm(null)
      newToken(null)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (kind: 'director' | 'shareholder', id: string) => {
    try {
      await api({ action: kind === 'director' ? 'delete_director' : 'delete_shareholder', id })
      if (kind === 'director') setDirectors(directors.filter((d) => d.id !== id))
      else setShareholders(shareholders.filter((s) => s.id !== id))
    } catch { setError('Failed to remove.') }
  }

  const confirmMatch = async (d: DirectorRow) => {
    // "Same person" — saving the row as-is clears the name-only flag.
    const ra = d.residential_address ?? {}
    await api({
      action: 'upsert_director',
      director: {
        id: d.id, fullName: d.full_name, idNumber: d.id_number || undefined, kraPin: d.kra_pin ?? undefined,
        role: (['secretary', 'proprietor', 'partner', 'manager', 'authorised_person'].includes(ra.role ?? '') ? ra.role : 'director') as PersonKind, structuredAddress: ra.structuredAddress,
        interestPercentage: ra.interestPercentage, contributionType: ra.contributionType, contributionValue: ra.contributionValue,
        isManagingPartner: ra.isManagingPartner, signingAuthority: ra.signingAuthority, cessationDate: ra.cessationDate, cessationReason: ra.cessationReason,
        isCorporate: ra.isCorporate, corporate: ra.corporate, dateOfBirth: ra.dateOfBirth ?? undefined,
      },
    }).catch(() => setError('Failed to confirm.'))
    await refresh()
  }

  const directorToForm = (d: DirectorRow): PersonForm => {
    const ra = d.residential_address ?? {}
    return {
      ...emptyPersonForm((['secretary', 'proprietor', 'partner', 'manager', 'authorised_person'].includes(ra.role ?? '') ? ra.role : 'director') as PersonKind),
      profitShare: ra.interestPercentage ?? '', contributionType: ra.contributionType ?? '', contributionValue: ra.contributionValue ?? '',
      isManagingPartner: !!ra.isManagingPartner, signingAuthority: ra.signingAuthority ?? '',
      hasLeft: !!ra.cessationDate, cessationDate: ra.cessationDate ?? '', cessationReason: ra.cessationReason ?? '',
      id: d.id, fullName: d.full_name, idNumber: ra.isCorporate ? '' : d.id_number ?? '', kraPin: d.kra_pin ?? '',
      dateOfBirth: ra.dateOfBirth ?? '', nationality: d.nationality ?? 'Kenyan', phone: d.phone ?? '', email: d.email ?? '',
      occupation: ra.occupation ?? '', appointmentDate: d.appointment_date ?? '',
      isCorporate: ra.isCorporate ?? false, corporate: { ...emptyCorporate, ...(ra.corporate ?? {}) },
      isForeign: d.is_foreign ?? false, foreignAddress: ra.foreignAddress ?? '', address: ra.structuredAddress ?? {},
    }
  }
  const shareholderToForm = (s: ShareholderRow): PersonForm => ({
    ...emptyPersonForm(s.address?.isMember ? 'member' : 'shareholder'),
    guaranteeAmount: s.address?.guaranteeAmount ?? '', membershipClass: s.address?.membershipClass ?? '',
    appointmentDate: s.address?.admissionDate ?? '', hasLeft: !!s.address?.cessationDate,
    cessationDate: s.address?.cessationDate ?? '', cessationReason: s.address?.cessationReason ?? '',
    id: s.id, fullName: s.legal_name, idNumber: s.corporate_details?.isCorporate ? '' : s.id_or_reg_number ?? '', kraPin: s.kra_pin ?? '',
    dateOfBirth: s.address?.dateOfBirth ?? '', nationality: s.address?.nationality ?? 'Kenyan', phone: s.phone ?? '', email: s.email ?? '',
    occupation: s.address?.occupation ?? '', shares: String(s.shares_held || ''), shareClass: s.address?.shareClass ?? 'Ordinary',
    isNominee: !!s.corporate_details?.nominee,
    isCorporate: s.corporate_details?.isCorporate ?? false, corporate: { ...emptyCorporate, ...(s.corporate_details?.corporate ?? {}) },
    isForeign: s.address?.isForeign ?? false, foreignAddress: s.address?.foreignAddress ?? '', address: s.address?.structuredAddress ?? {},
  })

  const Card = ({ title, lines, flags, onEdit, onRemove, extra }: { title: string; lines: string[]; flags: Array<{ text: string; tone: 'warn' | 'info' }>; onEdit: () => void; onRemove: () => void; extra?: React.ReactNode }) => (
    <div className="ios-surface rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{title}</p>
          {lines.filter(Boolean).map((l, i) => (
            <p key={i} className="text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>{l}</p>
          ))}
        </div>
        <div className="flex gap-3 shrink-0">
          <button type="button" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }} onClick={onEdit}>Edit</button>
          <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={onRemove}>Remove</button>
        </div>
      </div>
      {flags.map((f, i) => (
        <p key={i} className="text-ios-caption1 rounded-lg px-2 py-1" style={{ background: f.tone === 'warn' ? 'rgba(217,119,6,0.12)' : 'var(--system-fill-3)', color: f.tone === 'warn' ? '#92400e' : 'var(--system-label-2)' }}>{f.text}</p>
      ))}
      {extra}
    </div>
  )

  const officers = directors.filter((d) => ['director', undefined].includes(d.residential_address?.role))
  const managers = directors.filter((d) => d.residential_address?.role === 'manager' && !d.residential_address?.cessationDate)
  const authorisedPersons = directors.filter((d) => d.residential_address?.role === 'authorised_person')
  const formerManagers = directors.filter((d) => d.residential_address?.role === 'manager' && !!d.residential_address?.cessationDate)
  const sameAs = (a: DirectorRow, b: DirectorRow) =>
    (!!a.id_number && a.id_number === b.id_number) || a.full_name.trim().toLowerCase() === b.full_name.trim().toLowerCase()
  const partners = directors.filter((d) => d.residential_address?.role === 'partner' && !d.residential_address?.cessationDate)
  const formerPartners = directors.filter((d) => d.residential_address?.role === 'partner' && !!d.residential_address?.cessationDate)
  const proprietors = directors.filter((d) => d.residential_address?.role === 'proprietor')
  const secretaries = directors.filter((d) => d.residential_address?.role === 'secretary')

  const directorFlags = (d: DirectorRow) => {
    const ra = d.residential_address ?? {}
    const flags: Array<{ text: string; tone: 'warn' | 'info' }> = []
    if (ra.prefilled?.length && !ra.userReviewed) flags.push({ tone: 'info', text: `Pre-filled from your documents: ${ra.prefilled.join(', ')} — open Edit to check and complete.` })
    if (ra.nameMatchOnly) flags.push({ tone: 'warn', text: 'Matched to an existing person by name only — confirm it’s the same person, or edit.' })
    if (ra.formationOnly && !ra.onCurrentRecord && !ra.userReviewed) flags.push({ tone: 'warn', text: 'Only on formation records — confirm they’re still in office, or remove.' })
    if (!ra.isCorporate && !hasIdDoc(d.id, 'director')) flags.push({ tone: 'info', text: ra.role === 'proprietor' ? 'Identity unverified — upload your ID/passport when you can.' : 'Identity unverified — upload their ID/passport when you can.' })
    return flags
  }

  const kindLabel: Record<PersonKind, string> = { director: 'director', secretary: 'company secretary', shareholder: 'shareholder', proprietor: 'proprietor', partner: 'partner', manager: 'manager', authorised_person: 'authorised person', member: 'member / guarantor' }

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>{isSoleProp ? 'The proprietor' : isPartnership ? 'Partners' : isLLP ? <>Partners &amp; managers</> : isCLG ? <>Directors &amp; members</> : <>People &amp; roles</>}</h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        {isCLG
          ? 'Directors run the company; members guarantee it. A director can also be a member — we keep the two roles separate. Members who have left stay in the history.'
          : isLLP
          ? 'Partners and managers are separate roles — the same person can hold both, and we keep them apart. The LLP needs at least one manager, who must be a natural person. Anyone who has left stays in the history.'
          : isPartnership
          ? 'Each partner’s capital, profit share and authority belong to their relationship with the partnership — we don’t assume equal shares. Partners who have left stay in the history.'
          : isSoleProp
          ? 'A registered business name isn’t a separate legal person — it belongs to you, the proprietor. There are no shareholders or directors. Check the details we read from your certificate, and add your ID and KRA PIN if you have them.'
          : directors.length + shareholders.length > 0
            ? 'Built from your documents. Check each person against today’s position — the same person can hold several roles.'
            : 'Add your directors and shareholders. Uploading an Official Search (CR12) fills this in for you.'}
      </p>

      {proprietors.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[
            [d.id_number && `ID ${d.id_number}`, d.kra_pin && `PIN ${d.kra_pin}`].filter(Boolean).join(' · '),
            evidenceText(d.residential_address?.evidence) ? `Source: ${evidenceText(d.residential_address?.evidence)}` : '',
          ]}
          flags={directorFlags(d)}
          onEdit={() => open(directorToForm(d))}
          onRemove={() => remove('director', d.id)}
          extra={d.residential_address?.nameMatchOnly ? (
            <button type="button" className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }} onClick={() => confirmMatch(d)}>Yes, same person</button>
          ) : undefined}
        />
      ))}
      {partners.map((d) => {
        const ra = d.residential_address ?? {}
        return (
          <Card key={d.id} title={d.full_name}
            lines={[
              [ra.isCorporate ? 'Corporate partner' : d.id_number && `ID ${d.id_number}`, ra.isManagingPartner && 'Managing partner', isLLP && managers.some((m) => sameAs(m, d)) && 'Also a manager'].filter(Boolean).join(' · '),
              [ra.interestPercentage ? `${ra.interestPercentage}% profit share` : 'Profit share not recorded', ra.contributionValue && `Capital: ${ra.contributionValue}`].filter(Boolean).join(' · '),
              ra.signingAuthority ? `Authority: ${ra.signingAuthority}` : '',
              evidenceText(ra.evidence) ? `Source: ${evidenceText(ra.evidence)}` : '',
            ]}
            flags={directorFlags(d)}
            onEdit={() => open(directorToForm(d))}
            onRemove={() => remove('director', d.id)}
            extra={ra.nameMatchOnly || (ra.formationOnly && !ra.userReviewed) ? (
              <button type="button" className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }} onClick={() => confirmMatch(d)}>
                {ra.nameMatchOnly ? 'Yes, same person' : 'Yes, still a partner'}
              </button>
            ) : undefined}
          />
        )
      })}
      {isPartnership && partners.length > 0 && partners.length < 2 && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'rgba(220,38,38,0.10)', color: '#b91c1c' }}>
          Only one current partner. Under the Partnerships Act a partnership breaks up when its partners fall below two — if that’s the position, we’ll open an urgent legal-status review.
        </p>
      )}
      {(isPartnership || isLLP) && partners.length > 1 && partners.every((d) => d.residential_address?.interestPercentage) &&
        Math.abs(partners.reduce((sum, d) => sum + Number(d.residential_address?.interestPercentage ?? 0), 0) - 100) > 0.01 && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
          Profit shares add up to {partners.reduce((sum, d) => sum + Number(d.residential_address?.interestPercentage ?? 0), 0)}%, not 100%. Check against the agreement.
        </p>
      )}
      {isLLP && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Managers</p>}
      {managers.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[
            [d.id_number && `ID ${d.id_number}`, partners.some((p) => sameAs(p, d)) && 'Also a partner'].filter(Boolean).join(' · '),
            evidenceText(d.residential_address?.evidence) ? `Source: ${evidenceText(d.residential_address?.evidence)}` : '',
          ]}
          flags={directorFlags(d)}
          onEdit={() => open(directorToForm(d))}
          onRemove={() => remove('director', d.id)}
          extra={d.residential_address?.nameMatchOnly ? (
            <button type="button" className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }} onClick={() => confirmMatch(d)}>Yes, same person</button>
          ) : undefined}
        />
      ))}
      {isLLP && managers.length === 0 && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'rgba(220,38,38,0.10)', color: '#b91c1c' }}>
          No manager recorded. An LLP must have at least one manager, and the manager must be a natural person — they’re personally responsible for specified statutory compliance. Add them below; otherwise we’ll open an urgent task.
        </p>
      )}
      {authorisedPersons.length > 0 && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Authorised persons</p>}
      {authorisedPersons.map((d) => (
        <Card key={d.id} title={d.full_name} lines={[d.id_number ? `ID ${d.id_number}` : '']} flags={[]}
          onEdit={() => open(directorToForm(d))} onRemove={() => remove('director', d.id)} />
      ))}
      {formerManagers.length > 0 && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Former managers</p>}
      {formerManagers.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[`Left ${fmtDate(d.residential_address?.cessationDate)}${d.residential_address?.cessationReason ? ` — ${d.residential_address.cessationReason}` : ''}`]}
          flags={[]} onEdit={() => open(directorToForm(d))} onRemove={() => remove('director', d.id)} />
      ))}

      {formerPartners.length > 0 && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Former partners</p>}
      {formerPartners.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[`Left ${fmtDate(d.residential_address?.cessationDate)}${d.residential_address?.cessationReason ? ` — ${d.residential_address.cessationReason}` : ''}`]}
          flags={[]}
          onEdit={() => open(directorToForm(d))}
          onRemove={() => remove('director', d.id)} />
      ))}

      {isSoleProp && proprietors.length > 1 && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
          Your documents list more than one owner. A business name owned by two or more people is a partnership — remove anyone listed by mistake, or restart and choose Partnership.
        </p>
      )}

      {officers.length > 0 && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Directors</p>}
      {officers.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[
            [d.id_number && !d.residential_address?.isCorporate && `ID ${d.id_number}`, d.kra_pin && `PIN ${d.kra_pin}`].filter(Boolean).join(' · '),
            shareholders.some((s) => s.legal_name.trim().toLowerCase() === d.full_name.trim().toLowerCase() || (!!d.id_number && s.id_or_reg_number === d.id_number)) ? (isCLG ? 'Also a member' : 'Also a shareholder') : '',
            evidenceText(d.residential_address?.evidence) ? `Source: ${evidenceText(d.residential_address?.evidence)}` : '',
          ]}
          flags={directorFlags(d)}
          onEdit={() => open(directorToForm(d))}
          onRemove={() => remove('director', d.id)}
          extra={d.residential_address?.nameMatchOnly || (d.residential_address?.formationOnly && !d.residential_address?.userReviewed) ? (
            <button type="button" className="text-ios-footnote font-semibold" style={{ color: 'var(--brand-navy)' }} onClick={() => confirmMatch(d)}>
              {d.residential_address?.nameMatchOnly ? 'Yes, same person' : 'Yes, still a director'}
            </button>
          ) : undefined}
        />
      ))}

      {(secretaries.length > 0 || needsSecretary) && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Company secretary</p>}
      {secretaries.map((d) => (
        <Card key={d.id} title={d.full_name}
          lines={[evidenceText(d.residential_address?.evidence) ? `Source: ${evidenceText(d.residential_address?.evidence)}` : '']}
          flags={directorFlags(d)}
          onEdit={() => open(directorToForm(d))}
          onRemove={() => remove('director', d.id)} />
      ))}
      {needsSecretary && secretaries.length === 0 && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
          {wizard.subtype === 'public' ? 'A public company' : 'A company with share capital of KES 5 million or more'} must have a company secretary. Add them below — if none is appointed, we’ll open a task.
        </p>
      )}

      {isCLG && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Members / guarantors</p>}
      {isCLG && shareholders.length === 0 && (
        <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          No members yet — upload the Member Register or latest CR29 annual return, or add them below. A CLG has members who guarantee its debts on winding up, not shareholders.
        </p>
      )}
      {isCLG && shareholders.map((s) => (
        <Card key={s.id} title={s.legal_name}
          lines={[
            [s.address?.membershipClass, s.address?.guaranteeAmount && `Guarantee KES ${s.address.guaranteeAmount}`, s.address?.cessationDate && `Ceased ${fmtDate(s.address.cessationDate)}`].filter(Boolean).join(' · ') || 'Member',
            evidenceText(s.corporate_details?.evidence) ? `Source: ${evidenceText(s.corporate_details?.evidence)}` : '',
          ]}
          flags={[
            ...(s.corporate_details?.prefilled?.length && !s.corporate_details?.userReviewed ? [{ tone: 'info' as const, text: `Pre-filled from your documents: ${s.corporate_details.prefilled.filter((x) => x !== 'shares').join(', ')} — open Edit to check and complete.` }] : []),
            ...(s.address?.cessationDate ? [{ tone: 'info' as const, text: 'Former member — their guarantee can still apply for twelve months after leaving.' }] : []),
          ]}
          onEdit={() => open(shareholderToForm(s))}
          onRemove={() => remove('shareholder', s.id)} />
      ))}
      {!isCLG && shareholders.length > 0 && <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Shareholders</p>}
      {!isCLG && shareholders.map((s) => (
        <Card key={s.id} title={s.legal_name}
          lines={[
            [s.shares_held > 0 && `${s.shares_held.toLocaleString()} ${s.address?.shareClass ?? 'Ordinary'} shares`, s.share_percentage != null && `${s.share_percentage}%`].filter(Boolean).join(' · '),
            evidenceText(s.corporate_details?.evidence) ? `Source: ${evidenceText(s.corporate_details?.evidence)}` : '',
          ]}
          flags={[
            ...(s.corporate_details?.prefilled?.length && !s.corporate_details?.userReviewed ? [{ tone: 'info' as const, text: `Pre-filled from your documents: ${s.corporate_details.prefilled.join(', ')} — open Edit to check and complete.` }] : []),
            ...(s.corporate_details?.nameMatchOnly ? [{ tone: 'warn' as const, text: 'Matched by name only — open and save to confirm.' }] : []),
          ]}
          onEdit={() => open(shareholderToForm(s))}
          onRemove={() => remove('shareholder', s.id)} />
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{form.id ? 'Edit' : 'Add'} {kindLabel[form.kind]}</p>
          {!['secretary', 'proprietor', 'manager', 'authorised_person'].includes(form.kind) && (
            <div className="flex gap-2">
              {[false, true].map((corp) => (
                <button key={String(corp)} type="button" onClick={() => set({ isCorporate: corp })}
                  className="flex-1 py-2 rounded-full text-sm font-medium border"
                  style={{ borderColor: form.isCorporate === corp ? 'var(--brand-navy)' : 'var(--system-fill-3)', color: form.isCorporate === corp ? 'var(--brand-navy)' : 'var(--system-label-2)' }}>
                  {corp ? 'Corporate body' : 'Individual'}
                </button>
              ))}
            </div>
          )}

          {form.isCorporate ? (
            <CorporateFields
              value={form.corporate}
              context={form.kind === 'shareholder' ? 'shareholder' : 'director'}
              onChange={(p) => set({ corporate: { ...form.corporate, ...p } })}
              orgId={orgId} entityId={entityId} api={api} setError={setError}
              onExtracted={handleExtracted}
              sessionToken={formToken ?? undefined}
              personId={form.id}
              documents={documents}
              onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            />
          ) : (
            <>
              <InlineOcrUpload
                section={form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director'}
                documentType={idDocType(form.kind)}
                label={form.id ? 'Upload a replacement ID/passport →' : 'Upload ID/passport to auto-fill →'}
                orgId={orgId} entityId={entityId} api={api} setError={setError}
                onExtracted={handleExtracted}
                sessionToken={formToken ?? undefined}
                personName={form.fullName}
                personRole={form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director'}
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, idDocType(form.kind))}
              />
              <InlineOcrUpload
                section={form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director'}
                documentType={kraDocType(form.kind)}
                label={form.id ? 'Upload a replacement KRA PIN certificate →' : 'Upload KRA PIN certificate to auto-fill →'}
                orgId={orgId} entityId={entityId} api={api} setError={setError}
                onExtracted={handleExtracted}
                sessionToken={formToken ?? undefined}
                personName={form.fullName}
                personRole={form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director'}
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, kraDocType(form.kind))}
              />
              <PhotoUpload
                orgId={orgId} entityId={entityId} api={api} setError={setError}
                onUploaded={() => {}}
                personName={form.fullName}
                personRole={form.kind === 'shareholder' || form.kind === 'member' ? 'shareholder' : 'director'}
                personId={form.id}
                onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
                initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'passport_photo')}
              />
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                No documents to hand? Fill in what you know — the person is recorded now and marked “identity unverified”.
              </p>
              <Field label="Full name" required>
                <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isForeign} onChange={(e) => set({ isForeign: e.target.checked, nationality: e.target.checked ? '' : 'Kenyan' })} />
                This person is not resident in Kenya
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label={form.isForeign ? 'Passport number' : 'National ID number'}>
                  <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
                </Field>
                <Field label="KRA PIN">
                  <NoAutofillInput type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value.toUpperCase() })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of birth">
                  <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
                </Field>
                {form.isForeign ? (
                  <Field label="Nationality">
                    <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
                  </Field>
                ) : (
                  <Field label="Occupation">
                    <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
                  </Field>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <NoAutofillInput type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <NoAutofillInput type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </Field>
              </div>
              {form.isForeign ? (
                <Field label="Residential address (abroad)">
                  <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.foreignAddress} onChange={(e) => set({ foreignAddress: e.target.value })} />
                </Field>
              ) : (
                <>
                  <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Residential address (protected)</p>
                  <AddressFields value={form.address} onChange={(p) => set({ address: { ...form.address, ...p } })}
                    requireCity={false} requireCounty={false} requirePostalCode={false} requirePostalAddress={false} />
                </>
              )}
            </>
          )}

          {form.kind !== 'shareholder' && (
            <Field label={form.kind === 'proprietor' ? 'Date you started the business (if known)' : form.kind === 'partner' ? 'Date admitted as partner (if known)' : form.kind === 'manager' ? 'Date appointed manager (if known)' : form.kind === 'member' ? 'Date admitted as member (if known)' : 'Date appointed (if known)'}>
              <input type="date" className={inputCls} style={inputStyle} value={form.appointmentDate} onChange={(e) => set({ appointmentDate: e.target.value })} />
            </Field>
          )}
          {form.kind === 'partner' && (
            <>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                From the agreement or your records. Leave blank what isn’t documented — we won’t fill in equal shares for you.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Profit / loss share (%)">
                  <input type="number" min={0} max={100} step="0.01" className={inputCls} style={inputStyle} value={form.profitShare} onChange={(e) => set({ profitShare: e.target.value })} />
                </Field>
                <Field label="Capital contribution">
                  <select className={inputCls} style={inputStyle} value={form.contributionType} onChange={(e) => set({ contributionType: e.target.value })}>
                    <option value="">—</option>
                    <option value="cash">Cash</option>
                    <option value="property">Property / assets</option>
                    <option value="skills">Skills / services</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </Field>
              </div>
              <Field label="Contribution value / description">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. KES 500,000" value={form.contributionValue} onChange={(e) => set({ contributionValue: e.target.value })} />
              </Field>
              <Field label="Signing / banking authority">
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Joint signatory, contracts up to KES 1m" value={form.signingAuthority} onChange={(e) => set({ signingAuthority: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isManagingPartner} onChange={(e) => set({ isManagingPartner: e.target.checked })} />
                Managing partner
              </label>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.hasLeft} onChange={(e) => set({ hasLeft: e.target.checked })} />
                This partner has retired, died or otherwise left
              </label>
              {form.hasLeft && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date left" required>
                    <input type="date" className={inputCls} style={inputStyle} value={form.cessationDate} onChange={(e) => set({ cessationDate: e.target.value })} />
                  </Field>
                  <Field label="Reason">
                    <input type="text" className={inputCls} style={inputStyle} placeholder="Retired / died / expelled…" value={form.cessationReason} onChange={(e) => set({ cessationReason: e.target.value })} />
                  </Field>
                </div>
              )}
            </>
          )}
          {form.kind === 'member' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Guarantee amount (KES)">
                  <input type="text" inputMode="decimal" className={inputCls} style={inputStyle} placeholder="e.g. 100" value={form.guaranteeAmount} onChange={(e) => set({ guaranteeAmount: e.target.value })} />
                </Field>
                <Field label="Membership class">
                  <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Ordinary, Founder" value={form.membershipClass} onChange={(e) => set({ membershipClass: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.hasLeft} onChange={(e) => set({ hasLeft: e.target.checked })} />
                This member has ceased to be a member
              </label>
              {form.hasLeft && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date ceased" required>
                    <input type="date" className={inputCls} style={inputStyle} value={form.cessationDate} onChange={(e) => set({ cessationDate: e.target.value })} />
                  </Field>
                  <Field label="Reason">
                    <input type="text" className={inputCls} style={inputStyle} value={form.cessationReason} onChange={(e) => set({ cessationReason: e.target.value })} />
                  </Field>
                </div>
              )}
            </>
          )}
          {form.kind === 'manager' && (
            <>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.hasLeft} onChange={(e) => set({ hasLeft: e.target.checked })} />
                This manager has stepped down
              </label>
              {form.hasLeft && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date left" required>
                    <input type="date" className={inputCls} style={inputStyle} value={form.cessationDate} onChange={(e) => set({ cessationDate: e.target.value })} />
                  </Field>
                  <Field label="Reason">
                    <input type="text" className={inputCls} style={inputStyle} value={form.cessationReason} onChange={(e) => set({ cessationReason: e.target.value })} />
                  </Field>
                </div>
              )}
            </>
          )}
          {form.kind === 'shareholder' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Shares held" required>
                  <input type="number" min={0} className={inputCls} style={inputStyle} value={form.shares} onChange={(e) => set({ shares: e.target.value })} />
                </Field>
                <Field label="Share class">
                  <input type="text" className={inputCls} style={inputStyle} value={form.shareClass} onChange={(e) => set({ shareClass: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isNominee} onChange={(e) => set({ isNominee: e.target.checked })} />
                Holds these shares as a nominee for someone else
              </label>
            </>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand-navy)' }}>
              {busy ? 'Saving…' : form.id ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => { setForm(null); newToken(null) }}
              className="py-2.5 px-5 rounded-full text-sm font-medium border" style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        isCLG ? (
          <div className="grid grid-cols-3 gap-2">
            {(['director', 'secretary', 'member'] as PersonKind[]).map((k) => (
              <button key={k} type="button" onClick={() => open(emptyPersonForm(k))}
                className="py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
                + {k === 'director' ? 'Director' : k === 'secretary' ? 'Secretary' : 'Member'}
              </button>
            ))}
          </div>
        ) : isLLP ? (
          <div className="grid grid-cols-3 gap-2">
            {(['partner', 'manager', 'authorised_person'] as PersonKind[]).map((k) => (
              <button key={k} type="button" onClick={() => open(emptyPersonForm(k))}
                className="py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
                + {k === 'partner' ? 'Partner' : k === 'manager' ? 'Manager' : 'Authorised'}
              </button>
            ))}
          </div>
        ) : isPartnership ? (
          <button type="button" onClick={() => open(emptyPersonForm('partner'))}
            className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
            + Add partner
          </button>
        ) : isSoleProp ? (
          proprietors.length === 0 ? (
            <button type="button" onClick={() => open(emptyPersonForm('proprietor'))}
              className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
              + Add the proprietor
            </button>
          ) : null
        ) : (
        <div className="grid grid-cols-3 gap-2">
          {(['director', 'secretary', 'shareholder'] as PersonKind[]).map((k) => (
            <button key={k} type="button" onClick={() => open(emptyPersonForm(k))}
              className="py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
              + {k === 'secretary' ? 'Secretary' : k === 'director' ? 'Director' : 'Shareholder'}
            </button>
          ))}
        </div>
        )
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 5 — beneficial ownership. BO status comes from BO evidence (a
// BOF-1) or the user's declaration — never automatically from the share
// register (brief §17). Shareholders with 10%+ are offered as prompts.
// ------------------------------------------------------------------
type BeneficialOwnerForm = {
  id?: string
  fullName: string
  idNumber: string
  kraPin: string
  nationality: string
  dateOfBirth: string
  address: AddressData
  phone: string
  email: string
  occupation: string
  natureOfControl: string
  dateBecameBo: string
  sharePercentage: string
}

const emptyBeneficialOwner = (): BeneficialOwnerForm => ({
  fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan', dateOfBirth: '', address: {}, phone: '', email: '',
  occupation: '', natureOfControl: '', dateBecameBo: '', sharePercentage: '',
})

function BeneficialOwnersStep({ shareholders, beneficialOwners, setBeneficialOwners, documents, pack, wizard, patch, api, orgId, entityId, setError, isLLP, isCLG }: {
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  setBeneficialOwners: (b: BeneficialOwnerRow[]) => void
  documents: DocumentRow[]
  pack: DocSpec[]
  wizard: ExistingWizardData
  patch: (p: Partial<ExistingWizardData>) => void
  api: ApiFn
  orgId: string | null
  entityId: string | null
  setError: (e: string) => void
  isLLP?: boolean
  isCLG?: boolean
}) {
  const [form, setForm] = useState<BeneficialOwnerForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadedDocIds, setUploadedDocIds] = useState<string[]>([])
  const formTokenRef = useRef<string | null>(null)
  const [formToken, setFormToken] = useState<string | null>(null)
  const newToken = (t: string | null) => { formTokenRef.current = t; setFormToken(t) }

  const recordedNames = new Set(beneficialOwners.map((b) => b.full_name.trim().toLowerCase()))
  const candidateShareholders = shareholders.filter(
    (s) => (s.share_percentage ?? 0) >= 10 && !s.corporate_details?.isCorporate && !recordedNames.has(s.legal_name.trim().toLowerCase())
  )
  const hasBof = documents.some((d) => (d.document_type === 'bof1' || d.document_type === 'llp_bo') && !d.tags?.length)

  const set = (partial: Partial<BeneficialOwnerForm>) => setForm((prev) => (prev ? { ...prev, ...partial } : prev))
  const open = (f: BeneficialOwnerForm) => { newToken(crypto.randomUUID()); setUploadedDocIds([]); setError(''); patch({ noBeneficialOwners: false }); setForm(f) }

  const handleExtracted = (fields: Record<string, unknown> | undefined, _p?: string, wasReplace?: boolean, sessionToken?: string) => {
    if (!fields || sessionToken !== formTokenRef.current) return
    setForm((prev) => (prev ? mergePersonExtraction(prev, fields as Parameters<typeof mergePersonExtraction>[1], !!wasReplace) : prev))
  }

  const save = async () => {
    if (!form) return
    if (!form.fullName.trim()) { setError('Full name is required.'); return }
    if (!form.natureOfControl.trim()) { setError('Describe the nature of ownership or control.'); return }
    if (form.kraPin.trim() && !KRA_PIN_REGEX.test(form.kraPin.trim().toUpperCase())) { setError('KRA PIN format: A123456789B.'); return }
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
          structuredAddress: form.address,
          phone: form.phone || undefined,
          email: form.email || undefined,
          occupation: form.occupation || undefined,
          natureOfControl: form.natureOfControl.trim(),
          dateBecameBo: form.dateBecameBo || undefined,
          sharePercentage: form.sharePercentage ? parseFloat(form.sharePercentage) : undefined,
        },
      })
      if (uploadedDocIds.length > 0) {
        await api({ action: 'retag_documents', documentIds: uploadedDocIds, personId: result.id, personName: form.fullName.trim(), personRole: 'beneficial_owner' })
      }
      const updated: BeneficialOwnerRow = {
        id: result.id!, full_name: form.fullName.trim(), id_number: form.idNumber.trim() || null, kra_pin: form.kraPin.trim().toUpperCase() || null,
        nationality: form.nationality, date_of_birth: form.dateOfBirth || null, residential_address: { structuredAddress: form.address },
        phone: form.phone || null, email: form.email || null, occupation: form.occupation || null,
        nature_of_control: form.natureOfControl.trim(), date_became_bo: form.dateBecameBo || null,
        share_percentage: form.sharePercentage ? parseFloat(form.sharePercentage) : null,
      }
      setBeneficialOwners(form.id ? beneficialOwners.map((b) => (b.id === form.id ? { ...b, ...updated, residential_address: { ...b.residential_address, ...updated.residential_address } } : b)) : [...beneficialOwners, updated])
      setForm(null)
      newToken(null)
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
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>Beneficial ownership</h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        {isCLG
          ? 'A company limited by guarantee has no shares, so beneficial ownership is about control: holding voting rights, the right to appoint or remove directors, the power to direct how funds or assets are used, or other significant influence. Members and directors aren’t automatically beneficial owners.'
          : isLLP
          ? 'The natural persons who ultimately own or control the LLP, under the LLP beneficial-ownership rules. This is separate from the partner register: a partner isn’t automatically a beneficial owner, and a beneficial owner may not be a partner at all (e.g. behind a corporate partner).'
          : 'The natural persons who ultimately own or control the company — 10%+ of shares or votes, the right to appoint directors, or significant influence. This is recorded separately from the shareholder register: a shareholder isn’t automatically a beneficial owner, and a beneficial owner may not appear on it at all.'}
      </p>
      {!hasBof && (
        <p className="text-ios-caption1 rounded-lg px-3 py-2" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}>
          {isLLP ? 'No BO filing on file' : 'No BOF-1 on file'} — anything you add here is recorded as your declaration, and a task is opened to lodge or upload the filing.
        </p>
      )}

      {candidateShareholders.length > 0 && !form && (
        <div className="ios-surface rounded-2xl p-4 space-y-2">
          <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>
            These individuals hold 10%+ of the shares. Are any of them beneficial owners?
          </p>
          {candidateShareholders.map((s) => (
            <button key={s.id} type="button"
              onClick={() => open({ ...emptyBeneficialOwner(), fullName: s.legal_name, idNumber: s.id_or_reg_number ?? '', kraPin: s.kra_pin ?? '', sharePercentage: s.share_percentage != null ? String(s.share_percentage) : '', natureOfControl: `Holds ${s.share_percentage ?? '—'}% of the shares` })}
              className="w-full rounded-xl border p-3 text-left text-ios-footnote" style={{ borderColor: 'var(--system-fill-3)' }}>
              <span className="font-medium" style={{ color: 'var(--system-label)' }}>{s.legal_name}</span>
              <span style={{ color: 'var(--system-label-2)' }}> — {s.share_percentage}% shares · add as beneficial owner</span>
            </button>
          ))}
        </div>
      )}

      {beneficialOwners.map((b) => (
        <div key={b.id} className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{b.full_name}</p>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{b.nature_of_control || 'Nature of control not yet stated'}</p>
            {b.residential_address?.evidence?.length ? (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                Source: {b.residential_address.evidence.map((e) => `${docTitle(pack, e.documentType)}${e.documentDate ? ` (${fmtDate(e.documentDate)})` : ''}`).join(' · ')}
                {' '}— as at that filing; confirm it’s still current.
              </p>
            ) : (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Declared by you</p>
            )}
            {b.residential_address?.prefilled?.length && !b.residential_address?.userReviewed ? (
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Pre-filled: {b.residential_address.prefilled.join(', ')} — open Edit to check.</p>
            ) : null}
          </div>
          <div className="flex gap-3 shrink-0">
            <button type="button" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }}
              onClick={() => open({
                id: b.id, fullName: b.full_name, idNumber: b.id_number ?? '', kraPin: b.kra_pin ?? '', nationality: b.nationality,
                dateOfBirth: b.date_of_birth ?? '', address: b.residential_address?.structuredAddress ?? {}, phone: b.phone ?? '', email: b.email ?? '',
                occupation: b.occupation ?? '', natureOfControl: b.nature_of_control ?? '', dateBecameBo: b.date_became_bo ?? '',
                sharePercentage: b.share_percentage != null ? String(b.share_percentage) : '',
              })}>
              Edit
            </button>
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(b.id)}>Remove</button>
          </div>
        </div>
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <InlineOcrUpload
            section="other" documentType="beneficial_owner_id_copy"
            label={form.id ? 'Upload a replacement ID/passport →' : 'Upload ID/passport to auto-fill →'}
            orgId={orgId} entityId={entityId} api={api} setError={setError}
            onExtracted={handleExtracted} sessionToken={formToken ?? undefined}
            personName={form.fullName} personRole="beneficial_owner" personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_id_copy')}
          />
          <InlineOcrUpload
            section="other" documentType="beneficial_owner_kra_pin_copy"
            label={form.id ? 'Upload a replacement KRA PIN certificate →' : 'Upload KRA PIN certificate to auto-fill →'}
            orgId={orgId} entityId={entityId} api={api} setError={setError}
            onExtracted={handleExtracted} sessionToken={formToken ?? undefined}
            personName={form.fullName} personRole="beneficial_owner" personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'beneficial_owner_kra_pin_copy')}
          />
          <PhotoUpload
            orgId={orgId} entityId={entityId} api={api} setError={setError} onUploaded={() => {}}
            personName={form.fullName} personRole="beneficial_owner" personId={form.id}
            onDocumentRegistered={(id) => setUploadedDocIds((prev) => [...prev, id])}
            initialUploaded={findPersonDocument(documents, form.id, form.fullName, 'passport_photo')}
          />
          <Field label="Full name" required>
            <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID / passport number">
              <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </Field>
            <Field label="KRA PIN">
              <NoAutofillInput type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => set({ kraPin: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nationality">
              <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.nationality} onChange={(e) => set({ nationality: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateOfBirth} onChange={(e) => set({ dateOfBirth: e.target.value })} />
            </Field>
          </div>
          <Field label="Nature of ownership or control" required>
            <NoAutofillInput type="text" className={inputCls} style={inputStyle} placeholder="e.g. Holds 40% of shares, or right to appoint directors" value={form.natureOfControl} onChange={(e) => set({ natureOfControl: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Percentage held/controlled">
              <input type="number" min={0} max={100} className={inputCls} style={inputStyle} value={form.sharePercentage} onChange={(e) => set({ sharePercentage: e.target.value })} />
            </Field>
            <Field label="Date became beneficial owner">
              <input type="date" className={inputCls} style={inputStyle} value={form.dateBecameBo} onChange={(e) => set({ dateBecameBo: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <NoAutofillInput type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <NoAutofillInput type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Occupation / profession">
            <NoAutofillInput type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
          </Field>
          <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Residential address (protected)</p>
          <AddressFields value={form.address} onChange={(p) => set({ address: { ...form.address, ...p } })}
            requireCity={false} requireCounty={false} requirePostalCode={false} requirePostalAddress={false} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: 'var(--brand-navy)' }}>
              {busy ? 'Saving…' : form.id ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => { setForm(null); newToken(null) }}
              className="py-2.5 px-5 rounded-full text-sm font-medium border" style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => open(emptyBeneficialOwner())}
            className="w-full py-2.5 rounded-xl border border-dashed text-sm font-medium" style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}>
            + Add beneficial owner
          </button>
          {beneficialOwners.length === 0 && (
            <label className="flex items-start gap-3 text-ios-footnote" style={{ color: 'var(--system-label)' }}>
              <input type="checkbox" className="mt-0.5" checked={wizard.noBeneficialOwners ?? false} onChange={(e) => patch({ noBeneficialOwners: e.target.checked })} />
              No individual currently holds 10%+ ownership or control, or exercises significant influence — I confirm
              there is no beneficial owner to declare at this time.
            </label>
          )}
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 7 — review & confirm. Every material field with its state, the
// evidence still outstanding, and the status the entity will activate
// with. Confirming never upgrades unsupported data (brief §11).
// ------------------------------------------------------------------
function ReviewStep({ fields, isSoleProp, isPartnership, isLLP, isCLG, agreementFields, wizard, patch, stateOf, gaps, directors, shareholders, beneficialOwners, documents, taskCount }: {
  fields: EntityFieldSpec[]
  isSoleProp: boolean
  isPartnership: boolean
  isLLP: boolean
  isCLG: boolean
  agreementFields: Array<{ key: string; label: string }>
  wizard: ExistingWizardData
  patch: (p: Partial<ExistingWizardData>) => void
  stateOf: (k: EntityFieldKey) => FieldState
  gaps: ReturnType<typeof documentGaps>
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  documents: DocumentRow[]
  taskCount: number
}) {
  const states = fields.filter((f) => f.material).map((f) => stateOf(f.key))
  const status = activationStatus({ gaps, states, openTasks: taskCount })
  const personKey = (d: DirectorRow) => (d.id_number || d.full_name).trim().toLowerCase()
  const activePeople = directors.filter((d) => !d.residential_address?.isCorporate && !d.residential_address?.cessationDate)
  const verifiedKeys = new Set(activePeople.filter((d) => documents.some((doc) => doc.tags?.some((t) => t.personId === d.id) && doc.document_type === 'director_id_copy')).map(personKey))
  const unverifiedPeople = [...new Map(activePeople.filter((d) => !verifiedKeys.has(personKey(d))).map((d) => [personKey(d), d])).values()]
  const reportedGaps = gaps.filter((g) => g.spec.missing.impact !== 'conditional')

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>Review &amp; activate</h1>

      <div className="ios-surface rounded-2xl p-4">
        <p className="text-ios-caption1 font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--system-label-3)' }}>Will activate as</p>
        <p className="text-ios-title3 font-semibold" style={{ color: 'var(--brand-navy)' }}>{ONBOARDING_STATUS_LABEL[status]}</p>
        <p className="text-ios-caption1 mt-1" style={{ color: 'var(--system-label-2)' }}>
          {status === 'verified_onboarded'
            ? 'Your core details are supported by your documents.'
            : status === 'compliance_review_due'
              ? 'Your details are verified; some compliance tasks are open.'
              : 'Your workspace goes live now — outstanding evidence becomes follow-up tasks.'}
          {taskCount > 0 && ` ${taskCount} follow-up task${taskCount === 1 ? '' : 's'} will be added to your compliance calendar.`}
        </p>
      </div>

      <div className="ios-surface rounded-2xl p-4">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--system-fill-3)' }}>
            <div className="min-w-0">
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{f.label}</p>
              <p className="text-ios-footnote font-medium truncate" style={{ color: 'var(--system-label)' }}>{String(wizard[f.key] ?? '') || '—'}</p>
            </div>
            <StateBadge state={stateOf(f.key)} />
          </div>
        ))}
        <div className="flex justify-between gap-4 py-2">
          <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>People</span>
          <span className="text-ios-footnote font-medium text-right" style={{ color: 'var(--system-label)' }}>
            {isCLG
              ? `${directors.filter((d) => (d.residential_address?.role ?? 'director') === 'director').length} director(s) · ${shareholders.filter((m) => !m.address?.cessationDate).length} member(s) · ${beneficialOwners.length || (wizard.noBeneficialOwners ? 'no' : 0)} beneficial owner(s) · articles: ${agreementFields.filter((f) => wizard.governance?.[f.key] && !wizard.governance[f.key].silent).length} rules recorded, ${agreementFields.filter((f) => wizard.governance?.[f.key]?.silent).length} silent`
              : isLLP
              ? `${directors.filter((d) => d.residential_address?.role === 'partner' && !d.residential_address?.cessationDate).length} partner(s) · ${directors.filter((d) => d.residential_address?.role === 'manager' && !d.residential_address?.cessationDate).length} manager(s) · ${beneficialOwners.length || (wizard.noBeneficialOwners ? 'no' : 0)} beneficial owner(s) · agreement rules: ${agreementFields.filter((f) => wizard.governance?.[f.key] && !wizard.governance[f.key].silent).length} recorded, ${agreementFields.filter((f) => wizard.governance?.[f.key]?.silent).length} silent`
              : isPartnership
              ? `${directors.filter((d) => d.residential_address?.role === 'partner' && !d.residential_address?.cessationDate).length} current partner(s) · ${directors.filter((d) => d.residential_address?.role === 'partner' && d.residential_address?.cessationDate).length} former · agreement rules: ${PARTNERSHIP_AGREEMENT_FIELDS.filter((f) => wizard.governance?.[f.key] && !wizard.governance[f.key].silent).length} recorded, ${PARTNERSHIP_AGREEMENT_FIELDS.filter((f) => wizard.governance?.[f.key]?.silent).length} silent`
              : isSoleProp
              ? `Proprietor: ${directors.find((d) => d.residential_address?.role === 'proprietor')?.full_name ?? '—'}`
              : `${directors.filter((d) => d.residential_address?.role !== 'secretary').length} director(s) · ${shareholders.length} shareholder(s) · ${beneficialOwners.length || (wizard.noBeneficialOwners ? 'no' : 0)} beneficial owner(s)`}
          </span>
        </div>
      </div>

      {(reportedGaps.length > 0 || unverifiedPeople.length > 0) && (
        <div className="ios-surface rounded-2xl p-4 space-y-2">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Evidence outstanding</p>
          {reportedGaps.map((g) => (
            <div key={g.spec.documentType}>
              <p className="text-ios-footnote font-medium" style={{ color: 'var(--system-label)' }}>
                {g.spec.title}
                <span className="text-ios-caption2 ml-2 rounded-full px-2 py-0.5" style={{ background: g.spec.missing.impact === 'high' || g.spec.missing.impact === 'critical' ? 'rgba(220,38,38,0.10)' : 'var(--system-fill-3)', color: g.spec.missing.impact === 'high' || g.spec.missing.impact === 'critical' ? '#b91c1c' : 'var(--system-label-3)' }}>
                  {g.spec.missing.impact} impact
                </span>
              </p>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>{g.spec.missing.behaviour}</p>
            </div>
          ))}
          {unverifiedPeople.length > 0 && (
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>
              Identity unverified (no ID on file): {unverifiedPeople.map((d) => d.full_name).join(', ')}.
            </p>
          )}
        </div>
      )}

      {isCLG && (
        // CLG brief §1, §15 — form vs status
        <div className="ios-surface rounded-2xl p-4 space-y-1.5">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Good to know</p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            A company limited by guarantee has no share capital: its members guarantee a fixed amount towards its debts if
            it’s wound up — including for twelve months after a member leaves.
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Being a CLG doesn’t by itself make the company charitable, a PBO or tax-exempt, and it doesn’t remove company
            accounting, audit and annual-return duties. Those statuses are tracked separately.
          </p>
        </div>
      )}

      {isLLP && (
        // LLP brief §14 — risk prompts without overstating them
        <div className="ios-surface rounded-2xl p-4 space-y-1.5">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Good to know</p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            An LLP is a body corporate, separate from its partners, and partners’ liability is generally limited. That
            protection isn’t absolute — personal liability can still arise, for example for a partner’s own wrongful acts.
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            The manager is personally responsible for specified filings, including the annual return (due within 30 days of
            each registration anniversary) and statements of change (within 14 days).
          </p>
        </div>
      )}

      {isPartnership && (
        // General Partnership brief §5 — agency and liability as prompts
        <div className="ios-surface rounded-2xl p-4 space-y-1.5">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Good to know</p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Each partner acts as an agent of the partnership — the partnership can be bound by what a partner does in the
            ordinary course of its business. Partners with unlimited liability can become personally liable for partnership
            obligations.
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            Keeping the agreement, authority limits and partner records current is the main protection. We’ll remind you
            when something changes.
          </p>
        </div>
      )}

      {isSoleProp && (
        // Sole Proprietorship brief §14 — educational, not alarmist
        <div className="ios-surface rounded-2xl p-4 space-y-1.5">
          <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>Good to know</p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            A registered business name isn’t a separate legal entity. You own and control the business, and you’re
            personally responsible for its debts and obligations.
          </p>
          <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
            If the business grows or takes on more risk, some owners choose a company or LLP. If you’d like advice on
            that at any point, we can review your structure with you — your records here carry over.
          </p>
        </div>
      )}

      <div className="ios-surface rounded-2xl p-4 space-y-3">
        <label className="flex items-start gap-3 text-ios-footnote" style={{ color: 'var(--system-label)' }}>
          <input type="checkbox" className="mt-0.5" checked={wizard.declared ?? false} onChange={(e) => patch({ declared: e.target.checked })} />
          I confirm that, to the best of my knowledge, the details above reflect the {isSoleProp ? 'business’s' : isPartnership ? 'partnership’s' : isLLP ? 'LLP’s' : 'company’s'} current position, and
          that I am authorised to register it on LexReg Africa. I understand that details marked “evidence outstanding”
          are recorded as my confirmation, not as registry-verified.
        </label>
        <Field label="Type your full legal name as a signature" required>
          <input type="text" className={inputCls} style={inputStyle} value={wizard.signature ?? ''} onChange={(e) => patch({ signature: e.target.value })} />
        </Field>
        <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
          Date: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })} (auto-filled)
        </p>
      </div>

      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        {isLLP
          ? 'Activating creates your LLP workspace — profile, partners and managers, agreement rules, beneficial ownership and document vault — seeds your compliance calendar, and files a signed verification report in the vault.'
          : isPartnership
          ? 'Activating creates your partnership workspace — profile, partners and role history, agreement rules, authority and document vault — seeds your compliance calendar, and files a signed verification report in the vault.'
          : isSoleProp
          ? 'Activating creates your business workspace — business profile, proprietor link, licences and document vault — seeds your compliance calendar, and files a signed verification report in the vault.'
          : isCLG
          ? 'Activating creates your company workspace — profile, directors, member/guarantor register, Articles rules, beneficial ownership and document vault — seeds your compliance calendar, and files a signed verification report in the vault.'
          : 'Activating creates your workspace — profile, people and roles, share register, beneficial ownership and document vault — seeds your compliance calendar, and files a signed verification report in the vault.'}
      </p>
    </div>
  )
}

// ------------------------------------------------------------------
// Partnership Agreement — the agreement's operative rules as structured
// governance, read from the uploaded agreement where there is one
// (General Partnership brief §4). Where it's silent we say so and flag
// it for legal review; we never fill in a rule.
// ------------------------------------------------------------------
function AgreementStep({ wizard, patch, documents, directors, fields, documentType, instrument, statuteNote }: {
  wizard: ExistingWizardData
  patch: (p: Partial<ExistingWizardData>) => void
  documents: DocumentRow[]
  directors: DirectorRow[]
  fields: Array<{ key: string; label: string; hint: string }>
  documentType: string
  instrument: string
  statuteNote: string
}) {
  const agreement = documents.find((d) => d.document_type === documentType && !d.tags?.length)
  // "the Articles" / "the agreement" in the copy below
  const short = documentType === 'articles' ? 'the Articles' : 'the agreement'
  const governance = wizard.governance ?? {}
  const setRule = (key: string, p: Partial<GovernanceRuleRecord>) => {
    const prev = governance[key] ?? { summary: '', silent: false, source: 'user' as const }
    patch({ governance: { ...governance, [key]: { ...prev, ...p, source: 'user' } } })
  }
  const read = fields.filter((f) => governance[f.key]?.source === 'document' && !governance[f.key]?.silent).length
  const silent = fields.filter((f) => governance[f.key]?.silent).length
  const partnerNames = directors.filter((d) => d.residential_address?.role === 'partner' && !d.residential_address?.cessationDate).map((d) => d.full_name)

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>{instrument.charAt(0).toUpperCase() + instrument.slice(1)}</h1>
      {agreement ? (
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          We read <span className="font-medium">{agreement.name}</span>{agreement.document_date ? ` (dated ${fmtDate(agreement.document_date)})` : ''} into
          the rules below — {read} matter{read === 1 ? '' : 's'} found{silent ? `, ${silent} ${short} don’t cover` : ''}. The signed
          {documentType === 'articles' ? 'Articles stay' : 'agreement stays'} the controlling document; correct any summary that’s off.
        </p>
      ) : (
        <div className="text-ios-footnote rounded-xl p-3 space-y-1" style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
          <p className="font-semibold">No {instrument} on file</p>
          <p>
            You can still onboard, but profit sharing, authority and what happens when a partner leaves aren’t documented — a
            major governance gap. Upload it in the documents step if you have one, note what you’ve agreed below, or ask us to
            draft or review an agreement.
          </p>
        </div>
      )}

      {fields.map((f) => {
        const r = governance[f.key]
        return (
          <div key={f.key} className="ios-surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>{f.label}</p>
              {r && (
                <span className="text-ios-caption2 rounded-full px-2 py-0.5 font-semibold whitespace-nowrap"
                  style={r.silent ? { background: 'rgba(217,119,6,0.12)', color: '#92400e' } : r.source === 'document' ? { background: 'rgba(22,163,74,0.12)', color: '#15803d' } : { background: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}>
                  {r.silent ? `${documentType === 'articles' ? 'Articles' : 'Agreement'} silent — legal review` : r.source === 'document' ? `From ${documentType === 'articles' ? 'Articles' : 'agreement'}${r.clause ? `, ${/^\d/.test(r.clause) ? `clause ${r.clause}` : r.clause}` : ''}` : 'Entered by you'}
                </span>
              )}
            </div>
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{f.hint}</p>
            {!r?.silent && (
              <textarea rows={2} className={inputCls} style={inputStyle} value={r?.summary ?? ''}
                placeholder={f.key === 'partners' && partnerNames.length ? partnerNames.join(', ') : `What ${short} provide${documentType === 'articles' ? '' : 's'}`}
                onChange={(e) => setRule(f.key, { summary: e.target.value, silent: false })} />
            )}
            <label className="flex items-center gap-2 text-ios-caption1" style={{ color: 'var(--system-label-2)' }}>
              <input type="checkbox" checked={!!r?.silent} onChange={(e) => setRule(f.key, { silent: e.target.checked, summary: e.target.checked ? '' : r?.summary ?? '' })} />
              {documentType === 'articles' ? 'The Articles don’t cover this' : 'The agreement doesn’t cover this'}
            </label>
          </div>
        )
      })}
      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{statuteNote}</p>
    </div>
  )
}
