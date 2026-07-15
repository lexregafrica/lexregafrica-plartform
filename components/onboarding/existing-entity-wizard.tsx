'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  EXISTING_TOTAL_STEPS,
  EXISTING_STEP_LABELS,
  type ExistingWizardData,
} from '@/lib/onboarding/existing-entity'
import { ENTITY_TYPES, KENYA_COUNTIES, KRA_PIN_REGEX, type EntityType } from '@/lib/onboarding/new-entity'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'

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

type DirectorRow = { id: string; full_name: string; id_number: string; kra_pin: string | null }
type ShareholderRow = { id: string; legal_name: string; id_or_reg_number: string | null; kra_pin: string | null; shares_held: number }
type DocumentRow = { id: string; name: string; document_type: string | null; ocr_status?: string | null }

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
    title: 'Other documents',
    hint: 'MEMART, permits, or anything else you’d like on file.',
    documentType: 'other',
  },
]

type FileStatus = { name: string; state: 'uploading' | 'extracting' | 'done' | 'ocr_failed' | 'upload_failed'; summary?: string }

export function ExistingEntityWizard() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [step, setStep] = useState(1)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [wizard, setWizard] = useState<ExistingWizardData>({})
  const [directors, setDirectors] = useState<DirectorRow[]>([])
  const [shareholders, setShareholders] = useState<ShareholderRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const api = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/onboarding/existing-entity', {
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/existing-entity')
      if (!res.ok) return
      const data = await res.json()
      setWizard(data.wizard ?? {})
      setDirectors(data.directors ?? [])
      setShareholders(data.shareholders ?? [])
      setDocuments(data.documents ?? [])
    } catch { /* extraction already persisted server-side */ }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/onboarding/existing-entity')
        if (!res.ok) { setLoadState('error'); return }
        const data = await res.json()
        setEntityId(data.entityId)
        setOrgId(data.orgId)
        setWizard(data.wizard ?? {})
        setDirectors(data.directors ?? [])
        setShareholders(data.shareholders ?? [])
        setDocuments(data.documents ?? [])
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
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => patch({ entityType: t.value })}
                    className="w-full text-left rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor: selected ? 'var(--brand-navy)' : 'var(--system-fill-3)',
                      background: selected ? 'var(--system-bg-2)' : 'var(--system-bg)',
                    }}
                  >
                    <span className="text-ios-subhead font-medium block" style={{ color: 'var(--system-label)' }}>
                      {t.label}
                    </span>
                    <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
                      {t.description}
                    </span>
                  </button>
                )
              })}
            </div>
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
            api={api}
            setError={setError}
          />
        )}

        {/* ---------------- Step 5: declaration & activate ---------------- */}
        {step === 5 && (
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
type PersonForm = { id?: string; kind: 'director' | 'shareholder'; name: string; idNumber: string; kraPin: string; shares: string }

function PeopleStep({ directors, shareholders, setDirectors, setShareholders, api, setError }: {
  directors: DirectorRow[]
  shareholders: ShareholderRow[]
  setDirectors: (d: DirectorRow[]) => void
  setShareholders: (s: ShareholderRow[]) => void
  api: (p: Record<string, unknown>) => Promise<{ ok: boolean; id?: string }>
  setError: (e: string) => void
}) {
  const [form, setForm] = useState<PersonForm | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!form) return
    if (!form.name.trim()) { setError('Name is required.'); return }
    setError('')
    setBusy(true)
    try {
      if (form.kind === 'director') {
        const result = await api({
          action: 'upsert_director',
          director: { id: form.id, fullName: form.name.trim(), idNumber: form.idNumber.trim() || undefined, kraPin: form.kraPin.trim().toUpperCase() || undefined },
        })
        const updated: DirectorRow = { id: result.id!, full_name: form.name.trim(), id_number: form.idNumber.trim(), kra_pin: form.kraPin.trim().toUpperCase() || null }
        setDirectors(form.id ? directors.map((d) => (d.id === form.id ? updated : d)) : [...directors, updated])
      } else {
        const shares = parseInt(form.shares, 10) || 0
        const result = await api({
          action: 'upsert_shareholder',
          shareholder: { id: form.id, legalName: form.name.trim(), idNumber: form.idNumber.trim() || undefined, kraPin: form.kraPin.trim().toUpperCase() || undefined, sharesHeld: shares },
        })
        const updated: ShareholderRow = { id: result.id!, legal_name: form.name.trim(), id_or_reg_number: form.idNumber.trim() || null, kra_pin: form.kraPin.trim().toUpperCase() || null, shares_held: shares }
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
          onEdit={() => setForm({ id: d.id, kind: 'director', name: d.full_name, idNumber: d.id_number ?? '', kraPin: d.kra_pin ?? '', shares: '' })}
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
          onEdit={() => setForm({ id: s.id, kind: 'shareholder', name: s.legal_name, idNumber: s.id_or_reg_number ?? '', kraPin: s.kra_pin ?? '', shares: String(s.shares_held || '') })}
          onRemove={() => removeShareholder(s.id)}
        />
      ))}

      {form ? (
        <div className="ios-surface rounded-2xl p-4 space-y-3">
          <Field label="Full name" required>
            <input type="text" className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID number">
              <input type="text" className={inputCls} style={inputStyle} value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            </Field>
            <Field label="KRA PIN">
              <input type="text" className={inputCls} style={inputStyle} placeholder="A123456789B" value={form.kraPin} onChange={(e) => setForm({ ...form, kraPin: e.target.value })} />
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
            onClick={() => setForm({ kind: 'director', name: '', idNumber: '', kraPin: '', shares: '' })}
            className="py-2.5 rounded-xl border border-dashed text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
          >
            + Add director
          </button>
          <button
            type="button"
            onClick={() => setForm({ kind: 'shareholder', name: '', idNumber: '', kraPin: '', shares: '' })}
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
