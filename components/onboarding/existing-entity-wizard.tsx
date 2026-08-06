'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  EXISTING_TOTAL_STEPS,
  EXISTING_STEP_LABELS,
  type ExistingWizardData,
} from '@/lib/onboarding/existing-entity'
import { ENTITY_TYPES, PHASE1_ENTITY_TYPES, KENYA_COUNTIES, KRA_PIN_REGEX, type EntityType } from '@/lib/onboarding/new-entity'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'
// Shared with the new-entity wizard — same corporate-party field set and
// inline-OCR/photo upload pattern, not duplicated (Charles, 2026: "map
// using the same sort of flow" once new-entity is figured out).
import {
  CorporateFields, InlineOcrUpload, PhotoUpload, emptyCorporate,
  type CorporateParticipant,
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

type DirectorRow = {
  id: string
  full_name: string
  id_number: string
  kra_pin: string | null
  phone?: string | null
  email?: string | null
  is_foreign?: boolean
  residential_address?: {
    isCorporate?: boolean
    corporate?: CorporateParticipant
    foreignAddress?: string
    physicalAddress?: string
    postalAddress?: string
  } | null
}
type ShareholderRow = {
  id: string
  legal_name: string
  id_or_reg_number: string | null
  kra_pin: string | null
  shares_held: number
  share_percentage?: number | null
  address?: { isForeign?: boolean; foreignAddress?: string; physicalAddress?: string; postalAddress?: string } | null
  corporate_details?: { isCorporate?: boolean; corporate?: CorporateParticipant } | null
}
type DocumentRow = { id: string; name: string; document_type: string | null; ocr_status?: string | null }
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

type LoadState = 'loading' | 'wizard' | 'activated' | 'error'

type UploadSection = { title: string; hint: string; documentType: string }

const UPLOAD_SECTIONS: UploadSection[] = [
  {
    title: 'Certificate of incorporation',
    hint: 'Your BRS-issued certificate — this gives us your legal name and registration number.',
    documentType: 'certificate_of_incorporation',
  },
  {
    title: 'CR12 (company search)',
    hint: 'Lists your directors and shareholders — we extract them automatically.',
    documentType: 'cr12',
  },
  {
    title: 'KRA PIN certificate',
    hint: 'Your company’s KRA PIN certificate.',
    documentType: 'kra_pin',
  },
  {
    title: 'Beneficial ownership filing (BOF1), if you have one',
    hint: 'Declares the natural persons who ultimately own or control the company — upload if already filed.',
    documentType: 'bof1',
  },
  {
    title: 'Other documents',
    hint: 'MEMART, permits, or anything else you’d like on file.',
    documentType: 'other',
  },
]

type FileStatus = { name: string; state: 'uploading' | 'extracting' | 'done' | 'ocr_failed' | 'upload_failed'; summary?: string }

export function ExistingEntityWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Which entity's session to resume — see new-entity-wizard.tsx's
  // entityParam for why this matters (a user can have several sessions).
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Every write must target the same entity's onboarding_progress row —
  // see new-entity-wizard.tsx's api() for why.
  const api = useCallback(async (payload: Record<string, unknown>) => {
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

  const refresh = useCallback(async () => {
    try {
      const idForRefresh = entityId ?? entityParam
      const res = await fetch(`/api/onboarding/existing-entity${idForRefresh ? `?entity=${idForRefresh}` : ''}`)
      if (!res.ok) return
      const data = await res.json()
      setWizard(data.wizard ?? {})
      setDirectors(data.directors ?? [])
      setShareholders(data.shareholders ?? [])
      setDocuments(data.documents ?? [])
      setBeneficialOwners(data.beneficialOwners ?? [])
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
        setWizard(data.wizard ?? {})
        setDirectors(data.directors ?? [])
        setShareholders(data.shareholders ?? [])
        setDocuments(data.documents ?? [])
        setBeneficialOwners(data.beneficialOwners ?? [])
        setStep(Math.min(Math.max(data.step ?? 1, 1), EXISTING_TOTAL_STEPS))
        if (data.activated) { setLoadState('activated'); return }

        // Ensure the draft entity exists so uploads have a home
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

  // ---- uploads ----------------------------------------------------
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
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      let documentId: string
      try {
        const registered = await api({
          action: 'register_document',
          document: { name: file.name, filePath: path, fileSize: file.size, mimeType: file.type, documentType: section.documentType },
        })
        documentId = registered.id
      } catch {
        setStatus(tempId, { name: file.name, state: 'upload_failed', summary: 'Upload failed — try again' })
        continue
      }

      setStatus(tempId, { name: file.name, state: 'extracting' })
      try {
        const result = await api({ action: 'ocr_extract', documentId })
        if (result.ok && result.fields) {
          const f = result.fields as { business_name?: string; full_name?: string; registration_number?: string; people?: unknown[] }
          const summary =
            f.business_name ?? f.registration_number ??
            (f.people?.length ? `${f.people.length} people found` : f.full_name) ?? 'Details extracted'
          setStatus(tempId, { name: file.name, state: 'done', summary: `Extracted: ${summary}` })
        } else {
          setStatus(tempId, {
            name: file.name,
            state: 'ocr_failed',
            summary: result.reason === 'quota_exhausted'
              ? 'Extraction unavailable right now — details can be entered manually'
              : 'Couldn’t read this document — details can be entered manually',
          })
        }
      } catch {
        setStatus(tempId, { name: file.name, state: 'ocr_failed', summary: 'Extraction failed — details can be entered manually' })
      }

      await refresh()
    }
  }

  // ---- validation + nav -------------------------------------------
  const validateStep = (): string | null => {
    switch (step) {
      case 1:
        if (!wizard.entityType) return 'Choose your entity type.'
        return null
      case 3:
        if (!wizard.legalName?.trim()) return 'Legal name is required.'
        if (!wizard.registrationNumber?.trim()) return 'Registration number is required.'
        if (wizard.kraPin && !KRA_PIN_REGEX.test(wizard.kraPin.toUpperCase())) return 'KRA PIN format: A123456789B.'
        return null
      case 4:
        if (directors.length < 1) return 'Add at least one director.'
        return null
      case 5:
        if (beneficialOwners.length === 0 && !wizard.noBeneficialOwners) {
          return 'Add at least one beneficial owner, or confirm none currently apply.'
        }
        return null
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
      const next = Math.min(step + 1, EXISTING_TOTAL_STEPS)
      await api({ action: 'save_step', step, wizard, advanceTo: next })
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
      await api({ action: 'save_step', step: EXISTING_TOTAL_STEPS, wizard: signed })
      await api({ action: 'activate' })
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
        <p className="text-ios-body mb-4" style={{ color: 'var(--system-label-2)' }}>
          We couldn’t load your application.
        </p>
        <Link href="/onboarding" className="text-ios-subhead font-medium" style={{ color: 'var(--brand-navy)' }}>
          ← Back to path selection
        </Link>
      </div>
    )
  }

  if (loadState === 'activated') {
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
          <p className="text-ios-body mb-8" style={{ color: 'var(--system-label-2)' }}>
            Your company details are verified and your documents are in the vault. Your compliance dashboard is
            ready.
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

  return (
    <div className="flex min-h-[100dvh] flex-col items-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: EXISTING_TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i + 1 <= step ? 'var(--brand-navy)' : 'var(--system-fill-3)' }}
            />
          ))}
        </div>

        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-3)' }}>
          Step {step} of {EXISTING_TOTAL_STEPS} — {EXISTING_STEP_LABELS[step]}
        </p>

        {/* ---------------- Step 1: tell us about your business ---------------- */}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Tell us about your business
            </h1>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              What type of entity is registered? This tells us which documents to expect.
            </p>
            <div className="space-y-2">
              {ENTITY_TYPES.map((t) => {
                const selected = wizard.entityType === t.value
                const available = PHASE1_ENTITY_TYPES.includes(t.value)
                return (
                  <button
                    key={t.value}
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
                      <span className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>
                        {t.label}
                      </span>
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
        )}

        {/* ---------------- Step 2: uploads ---------------- */}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Upload your company documents
            </h1>
            <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
              We read them automatically and fill in your company profile — you confirm the details in the next
              step.
            </p>

            {UPLOAD_SECTIONS.map((section) => (
              <div key={section.title} className="ios-surface rounded-2xl p-4 space-y-3">
                <div>
                  <p className="text-ios-subhead font-semibold" style={{ color: 'var(--system-label)' }}>{section.title}</p>
                  <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{section.hint}</p>
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
                  <p className="text-ios-caption1" style={{ color: s.state === 'done' ? '#16a34a' : 'var(--system-label-3)' }}>
                    {s.state === 'uploading' ? 'Uploading…' : s.state === 'extracting' ? 'Reading document…' : s.summary}
                  </p>
                </div>
              </div>
            ))}

            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
              {documents.length > 0
                ? `${documents.length} document${documents.length === 1 ? '' : 's'} on file.`
                : 'At minimum, upload your certificate of incorporation — or continue and enter details manually.'}
            </p>
          </div>
        )}

        {/* ---------------- Step 3: verify company ---------------- */}
        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Confirm your company details
            </h1>
            {lowConfidence && (
              <div className="text-ios-footnote rounded-xl p-3" style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>
                <p>Some documents were hard to read — please double-check every field below.</p>
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="mt-2 font-semibold underline"
                  style={{ color: '#92400e' }}
                >
                  Or request manual help from our team →
                </button>
              </div>
            )}
            <Field label="Legal name" required>
              <input type="text" className={inputCls} style={inputStyle} value={wizard.legalName ?? ''} onChange={(e) => patch({ legalName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration number" required>
                <input type="text" className={inputCls} style={inputStyle} value={wizard.registrationNumber ?? ''} onChange={(e) => patch({ registrationNumber: e.target.value })} />
              </Field>
              <Field label="KRA PIN">
                <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={wizard.kraPin ?? ''} onChange={(e) => patch({ kraPin: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entity type">
                <select className={inputCls} style={inputStyle} value={wizard.entityType ?? 'limited_company'} onChange={(e) => patch({ entityType: e.target.value as EntityType })}>
                  {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Date incorporated">
                <input type="date" className={inputCls} style={inputStyle} value={wizard.dateIncorporated ?? ''} onChange={(e) => patch({ dateIncorporated: e.target.value })} />
              </Field>
            </div>
            <Field label="Registered office address">
              <input type="text" className={inputCls} style={inputStyle} placeholder="Address line 1" value={wizard.addressLine1 ?? ''} onChange={(e) => patch({ addressLine1: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="City">
                <input type="text" className={inputCls} style={inputStyle} value={wizard.city ?? ''} onChange={(e) => patch({ city: e.target.value })} />
              </Field>
              <Field label="County">
                <select className={inputCls} style={inputStyle} value={wizard.county ?? ''} onChange={(e) => patch({ county: e.target.value })}>
                  <option value="">—</option>
                  {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Postal code">
                <input type="text" className={inputCls} style={inputStyle} value={wizard.postalCode ?? ''} onChange={(e) => patch({ postalCode: e.target.value })} />
              </Field>
            </div>
          </div>
        )}

        {/* ---------------- Step 4: people ---------------- */}
        {step === 4 && (
          <PeopleStep
            directors={directors}
            shareholders={shareholders}
            setDirectors={setDirectors}
            setShareholders={setShareholders}
            orgId={orgId}
            entityId={entityId}
            api={api}
            setError={setError}
          />
        )}

        {/* ---------------- Step 5: beneficial ownership ---------------- */}
        {step === 5 && (
          <BeneficialOwnersStep
            shareholders={shareholders}
            beneficialOwners={beneficialOwners}
            setBeneficialOwners={setBeneficialOwners}
            wizard={wizard}
            patch={patch}
            api={api}
            setError={setError}
          />
        )}

        {/* ---------------- Step 6: declaration & activate ---------------- */}
        {step === 6 && (
          <div className="space-y-4">
            <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
              Declaration &amp; activate
            </h1>
            <div className="ios-surface rounded-2xl p-4">
              {[
                ['Legal name', wizard.legalName],
                ['Registration number', wizard.registrationNumber],
                ['KRA PIN', wizard.kraPin],
                ['Entity type', ENTITY_TYPES.find((t) => t.value === (wizard.entityType ?? 'limited_company'))?.label],
                ['Date incorporated', wizard.dateIncorporated],
                ['Registered office', [wizard.addressLine1, wizard.city, wizard.county].filter(Boolean).join(', ')],
                ['Directors', directors.map((d) => d.full_name).join(', ')],
                ['Shareholders', shareholders.map((s) => s.legal_name).join(', ')],
                ['Documents on file', String(documents.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--system-fill-3)' }}>
                  <span className="text-ios-footnote shrink-0" style={{ color: 'var(--system-label-2)' }}>{label}</span>
                  <span className="text-ios-footnote font-medium text-right" style={{ color: 'var(--system-label)' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            {/* Declaration & sign-off per flowchart */}
            <div className="ios-surface rounded-2xl p-4 space-y-3">
              <label className="flex items-start gap-3 text-ios-footnote" style={{ color: 'var(--system-label)' }}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={wizard.declared ?? false}
                  onChange={(e) => patch({ declared: e.target.checked })}
                />
                I certify that the information above is true and accurate, and that I am authorised to
                register this entity on LexReg Africa.
              </label>
              <Field label="Type your full legal name as a signature" required>
                <input
                  type="text"
                  className={inputCls}
                  style={inputStyle}
                  value={wizard.signature ?? ''}
                  onChange={(e) => patch({ signature: e.target.value })}
                />
              </Field>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
                Date: {new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })} (auto-filled)
              </p>
            </div>

            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
              Activating creates your live entity profile, seeds your compliance calendar, and files your
              entity profile document in the vault. You can update any of these details later.
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(''); setStep(step - 1) }}
              className="py-2.5 px-5 rounded-full text-sm font-medium border"
              style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
            >
              Back
            </button>
          )}
          {step < EXISTING_TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving || busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleActivate}
              disabled={saving}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {saving ? 'Activating…' : 'Activate my entity'}
            </button>
          )}
        </div>

        <p className="text-ios-caption1 mt-3 text-center" style={{ color: 'var(--system-label-3)' }}>
          Your progress is saved automatically at every step.
        </p>

        <Link href="/dashboard" className="mt-4 block text-center text-ios-footnote font-medium" style={{ color: 'var(--system-label-3)' }}>
          Save &amp; exit
        </Link>

        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="mt-3 block w-full text-center text-ios-footnote font-medium"
          style={{ color: 'var(--brand-navy)' }}
        >
          Stuck? Request help from our team
        </button>
      </div>

      {showHelp && (
        <HelpRequestSheet
          context={{
            source: `Existing entity onboarding — step ${step} (${EXISTING_STEP_LABELS[step]})`,
            businessName: wizard.legalName,
          }}
          onClose={() => setShowHelp(false)}
          onSent={() => { api({ action: 'request_help' }).catch(() => {}) }}
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Step 3 — directors & shareholders (pre-filled from CR12 extraction)
// ------------------------------------------------------------------
type PersonForm = {
  id?: string
  kind: 'director' | 'shareholder'
  name: string
  idNumber: string
  kraPin: string
  phone: string
  email: string
  physicalAddress: string
  postalAddress: string
  shares: string
  isCorporate: boolean
  corporate: CorporateParticipant
  isForeign: boolean
  foreignAddress: string
}

const emptyPersonForm = (kind: 'director' | 'shareholder'): PersonForm => ({
  kind, name: '', idNumber: '', kraPin: '', phone: '', email: '',
  physicalAddress: '', postalAddress: '', shares: '',
  isCorporate: false, corporate: { ...emptyCorporate }, isForeign: false, foreignAddress: '',
})

function PeopleStep({ directors, shareholders, setDirectors, setShareholders, api, setError, orgId, entityId }: {
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  setDirectors: (d: DirectorRow[]) => void
  setShareholders: (s: ShareholderRow[]) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
  orgId: string | null
  entityId: string | null
}) {
  const [form, setForm] = useState<PersonForm | null>(null)
  const [busy, setBusy] = useState(false)

  const handleExtracted = (f: Record<string, unknown> | undefined) => {
    setForm((prev) => {
      if (!prev || !f) return prev
      const isReplace = !!prev.id
      return {
        ...prev,
        name: (isReplace ? (f.full_name as string) : prev.name || (f.full_name as string)) || prev.name,
        idNumber: (isReplace ? (f.id_number as string) : prev.idNumber || (f.id_number as string)) || prev.idNumber,
        kraPin: (isReplace ? (f.kra_pin as string) : prev.kraPin || (f.kra_pin as string))?.toUpperCase?.() || prev.kraPin,
      }
    })
  }

  const save = async () => {
    if (!form) return
    if (form.isCorporate) {
      if (!form.corporate.registeredName.trim()) { setError('Registered company name is required.'); return }
    } else if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const displayName = form.isCorporate ? form.corporate.registeredName.trim() : form.name.trim()
      const addressPayload = {
        isCorporate: form.isCorporate,
        corporate: form.isCorporate ? form.corporate : undefined,
        isForeign: form.isForeign,
        foreignAddress: form.isForeign ? form.foreignAddress.trim() : undefined,
        physicalAddress: form.physicalAddress.trim() || undefined,
        postalAddress: form.postalAddress.trim() || undefined,
      }
      if (form.kind === 'director') {
        const result = await api({
          action: 'upsert_director',
          director: {
            id: form.id,
            fullName: displayName,
            idNumber: form.idNumber.trim() || undefined,
            kraPin: form.kraPin.trim().toUpperCase() || undefined,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            physicalAddress: form.physicalAddress.trim() || undefined,
            postalAddress: form.postalAddress.trim() || undefined,
            isCorporate: form.isCorporate,
            corporate: form.isCorporate ? form.corporate : undefined,
            isForeign: form.isForeign,
            foreignAddress: form.isForeign ? form.foreignAddress.trim() : undefined,
          },
        })
        const updated: DirectorRow = {
          id: result.id!, full_name: displayName, id_number: form.idNumber.trim(), kra_pin: form.kraPin.trim().toUpperCase() || null,
          phone: form.phone.trim() || null, email: form.email.trim() || null, is_foreign: form.isForeign,
          residential_address: addressPayload,
        }
        setDirectors(form.id ? directors.map((d) => (d.id === form.id ? updated : d)) : [...directors, updated])
      } else {
        const shares = parseInt(form.shares, 10) || 0
        const result = await api({
          action: 'upsert_shareholder',
          shareholder: {
            id: form.id,
            legalName: displayName,
            idNumber: form.idNumber.trim() || undefined,
            kraPin: form.kraPin.trim().toUpperCase() || undefined,
            sharesHeld: shares,
            physicalAddress: form.physicalAddress.trim() || undefined,
            postalAddress: form.postalAddress.trim() || undefined,
            isCorporate: form.isCorporate,
            corporate: form.isCorporate ? form.corporate : undefined,
            isForeign: form.isForeign,
            foreignAddress: form.isForeign ? form.foreignAddress.trim() : undefined,
          },
        })
        const updated: ShareholderRow = {
          id: result.id!, legal_name: displayName, id_or_reg_number: form.idNumber.trim() || null, kra_pin: form.kraPin.trim().toUpperCase() || null,
          shares_held: shares,
          address: { isForeign: form.isForeign, foreignAddress: form.isForeign ? form.foreignAddress.trim() : undefined, physicalAddress: form.physicalAddress.trim() || undefined, postalAddress: form.postalAddress.trim() || undefined },
          corporate_details: { isCorporate: form.isCorporate, corporate: form.isCorporate ? form.corporate : undefined },
        }
        setShareholders(form.id ? shareholders.map((s) => (s.id === form.id ? updated : s)) : [...shareholders, updated])
      }
      setForm(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setBusy(false)
    }
  }

  const removeDirector = async (id: string) => {
    try {
      await api({ action: 'delete_director', id })
      setDirectors(directors.filter((d) => d.id !== id))
    } catch { setError('Failed to remove.') }
  }
  const removeShareholder = async (id: string) => {
    try {
      await api({ action: 'delete_shareholder', id })
      setShareholders(shareholders.filter((s) => s.id !== id))
    } catch { setError('Failed to remove.') }
  }

  const PersonCard = ({ title, subtitle, onEdit, onRemove }: { title: string; subtitle: string; onEdit: () => void; onRemove: () => void }) => (
    <div className="ios-surface rounded-2xl p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-ios-subhead font-medium" style={{ color: 'var(--system-label)' }}>{title}</p>
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>{subtitle}</p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button type="button" className="text-ios-footnote font-medium" style={{ color: 'var(--brand-navy)' }} onClick={onEdit}>Edit</button>
        <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={onRemove}>Remove</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-ios-title2 font-semibold leading-snug" style={{ color: 'var(--system-label)' }}>
        Directors &amp; shareholders
      </h1>
      <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
        {directors.length + shareholders.length > 0
          ? 'Extracted from your documents — check the details and correct anything that’s off.'
          : 'Add your directors and shareholders.'}
      </p>

      {directors.length > 0 && (
        <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Directors</p>
      )}
      {directors.map((d) => (
        <PersonCard
          key={d.id}
          title={d.full_name}
          subtitle={[d.id_number && `ID ${d.id_number}`, d.kra_pin && `PIN ${d.kra_pin}`].filter(Boolean).join(' · ') || 'Details pending'}
          onEdit={() => setForm({
            ...emptyPersonForm('director'),
            id: d.id, name: d.full_name, idNumber: d.id_number ?? '', kraPin: d.kra_pin ?? '',
            phone: d.phone ?? '', email: d.email ?? '',
            physicalAddress: d.residential_address?.physicalAddress ?? '',
            postalAddress: d.residential_address?.postalAddress ?? '',
            isCorporate: d.residential_address?.isCorporate ?? false,
            corporate: d.residential_address?.corporate ?? { ...emptyCorporate },
            isForeign: d.is_foreign ?? false,
            foreignAddress: d.residential_address?.foreignAddress ?? '',
          })}
          onRemove={() => removeDirector(d.id)}
        />
      ))}

      {shareholders.length > 0 && (
        <p className="text-ios-caption1 font-semibold uppercase tracking-wide" style={{ color: 'var(--system-label-3)' }}>Shareholders</p>
      )}
      {shareholders.map((s) => (
        <PersonCard
          key={s.id}
          title={s.legal_name}
          subtitle={[s.shares_held > 0 && `${s.shares_held.toLocaleString()} shares`, s.id_or_reg_number && `ID ${s.id_or_reg_number}`].filter(Boolean).join(' · ') || 'Details pending'}
          onEdit={() => setForm({
            ...emptyPersonForm('shareholder'),
            id: s.id, name: s.legal_name, idNumber: s.id_or_reg_number ?? '', kraPin: s.kra_pin ?? '',
            shares: String(s.shares_held || ''),
            physicalAddress: s.address?.physicalAddress ?? '',
            postalAddress: s.address?.postalAddress ?? '',
            isForeign: s.address?.isForeign ?? false,
            foreignAddress: s.address?.foreignAddress ?? '',
            isCorporate: s.corporate_details?.isCorporate ?? false,
            corporate: s.corporate_details?.corporate ?? { ...emptyCorporate },
          })}
          onRemove={() => removeShareholder(s.id)}
        />
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, isCorporate: false })}
              className="flex-1 py-2 rounded-full text-sm font-medium border"
              style={{ borderColor: !form.isCorporate ? 'var(--brand-navy)' : 'var(--system-fill-3)', color: !form.isCorporate ? 'var(--brand-navy)' : 'var(--system-label-2)' }}>
              Individual
            </button>
            <button type="button" onClick={() => setForm({ ...form, isCorporate: true })}
              className="flex-1 py-2 rounded-full text-sm font-medium border"
              style={{ borderColor: form.isCorporate ? 'var(--brand-navy)' : 'var(--system-fill-3)', color: form.isCorporate ? 'var(--brand-navy)' : 'var(--system-label-2)' }}>
              Corporate body
            </button>
          </div>

          {form.isCorporate ? (
            <CorporateFields value={form.corporate} context={form.kind} onChange={(p) => setForm({ ...form, corporate: { ...form.corporate, ...p } })} />
          ) : (
            <>
              <Field label="Full name" required>
                <input type="text" className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <InlineOcrUpload
                orgId={orgId}
                entityId={entityId}
                section={form.kind}
                api={api}
                label={form.id ? 'Upload a replacement ID/passport or KRA PIN certificate →' : 'Scan ID/passport or KRA PIN certificate →'}
                onExtracted={handleExtracted}
                setError={setError}
              />
              <label className="flex items-center gap-2 text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                <input type="checkbox" checked={form.isForeign} onChange={(e) => setForm({ ...form, isForeign: e.target.checked })} />
                Foreign resident (no Kenyan ID)
              </label>
              {form.isForeign && (
                <Field label="Foreign address">
                  <input type="text" className={inputCls} style={inputStyle} value={form.foreignAddress} onChange={(e) => setForm({ ...form, foreignAddress: e.target.value })} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="National ID number">
                  <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
                </Field>
                <Field label="KRA PIN">
                  <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => setForm({ ...form, kraPin: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input type="text" className={inputCls} style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
              </div>
              <PhotoUpload
                orgId={orgId}
                entityId={entityId}
                api={api}
                onUploaded={() => {}}
                setError={setError}
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Physical address" required={!form.isCorporate}>
              <input type="text" className={inputCls} style={inputStyle} value={form.physicalAddress} onChange={(e) => setForm({ ...form, physicalAddress: e.target.value })} />
            </Field>
            <Field label="Postal address">
              <input type="text" className={inputCls} style={inputStyle} value={form.postalAddress} onChange={(e) => setForm({ ...form, postalAddress: e.target.value })} />
            </Field>
          </div>

          {form.kind === 'shareholder' && (
            <Field label="Shares held">
              <input type="number" min={0} className={inputCls} style={inputStyle} value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
            </Field>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {busy ? 'Saving…' : form.id ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="py-2.5 px-5 rounded-full text-sm font-medium border"
              style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm(emptyPersonForm('director'))}
            className="py-2.5 rounded-xl border border-dashed text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            + Add director
          </button>
          <button
            type="button"
            onClick={() => setForm(emptyPersonForm('shareholder'))}
            className="py-2.5 rounded-xl border border-dashed text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            + Add shareholder
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Beneficial ownership — mirrors the new-entity flow's BO step. Kenyan
// BO obligations apply the same way regardless of which onboarding
// path a company came through, so an already-registered company still
// needs this recorded separately from its shareholder register.
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

const emptyBeneficialOwner = (): BeneficialOwnerForm => ({
  fullName: '', idNumber: '', kraPin: '', nationality: 'Kenyan', dateOfBirth: '',
  postalAddress: '', businessAddress: '', residentialAddress: '', phone: '', email: '',
  occupation: '', natureOfControl: '', dateBecameBo: '', sharePercentage: '',
})

function BeneficialOwnersStep({ shareholders, beneficialOwners, setBeneficialOwners, wizard, patch, api, setError }: {
  shareholders: ShareholderRow[]
  beneficialOwners: BeneficialOwnerRow[]
  setBeneficialOwners: (b: BeneficialOwnerRow[]) => void
  wizard: ExistingWizardData
  patch: (p: Partial<ExistingWizardData>) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
}) {
  const [form, setForm] = useState<BeneficialOwnerForm | null>(null)
  const [busy, setBusy] = useState(false)

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
            <button type="button" className="text-ios-footnote font-medium text-red-500" onClick={() => remove(b.id)}>
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
          <Field label="Nature of ownership or control" required>
            <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. Shareholding of 40%, or right to appoint directors" value={form.natureOfControl} onChange={(e) => set({ natureOfControl: e.target.value })} />
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
              <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Occupation / profession">
            <input type="text" className={inputCls} style={inputStyle} value={form.occupation} onChange={(e) => set({ occupation: e.target.value })} />
          </Field>
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {busy ? 'Saving…' : form.id ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="py-2.5 px-5 rounded-full text-sm font-medium border"
              style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
            >
              Cancel
            </button>
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
            <label className="flex items-start gap-3 text-ios-footnote" style={{ color: 'var(--system-label)' }}>
              <input
                type="checkbox"
                className="mt-0.5"
                checked={wizard.noBeneficialOwners ?? false}
                onChange={(e) => patch({ noBeneficialOwners: e.target.checked })}
              />
              No individual currently holds 10%+ ownership or control, or exercises significant influence — I
              confirm there is no beneficial owner to declare at this time.
            </label>
          )}
        </>
      )}
    </div>
  )
}
