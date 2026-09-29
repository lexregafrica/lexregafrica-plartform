import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database, Json } from '@/types/database.types'
import { extractFromDocument, type ExtractedFields } from '@/lib/ocr/gemini'
import {
  EXISTING_TOTAL_STEPS, EXISTING_DOC_PACKS, EXISTING_BASELINES, entityFieldsFor, ocrKindToDocType, PARTNERSHIP_AGREEMENT_FIELDS, LLP_AGREEMENT_FIELDS, EXISTING_REVIEW_STEP,
  LIMITED_COMPANY_PACK, rankFor,
  type EntityFieldKey, type ExistingWizardData,
} from '@/lib/onboarding/existing-entity'
import {
  addCandidate, activationStatus, baselineTasks, documentGaps, fieldState, matchPerson,
  distinctCandidates, withLiveEvidence, ONBOARDING_STATUS_LABEL,
  type FieldRecord, type FieldSource, type OnboardingStatus,
} from '@/lib/onboarding/existing-engine'
import { ENTITY_TYPES, KENYA_COUNTIES, formatAddress, type AddressData, type EntityType } from '@/lib/onboarding/new-entity'
import { registerDocument, retagDocuments, retirePersonDocuments, type PersonRole, type RegisterDocumentInput } from '@/lib/onboarding/documents-server'
import { generateIdp } from '@/lib/documents/idp'
import { extractGovernanceRules } from '@/lib/ocr/governance'

// OCR extraction retries on 503/429 and falls back to Groq
// (lib/ocr/gemini.ts) — default serverless timeout would kill that mid-retry.
export const maxDuration = 60

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type ProgressRow = {
  id: string
  organisation_id: string | null
  step: number
  entity_type: EntityType
  data: Json
}

type ProgressData = {
  entityId?: string
  wizard?: ExistingWizardData
  activated?: boolean
  onboardingStatus?: OnboardingStatus
}

// Fields only the server writes — provenance must not be overwritten by a
// stale copy the client happens to hold (a Continue racing an OCR merge).
const SERVER_OWNED: Array<keyof ExistingWizardData> = ['fieldEvidence', 'subscribers', 'shareClasses', 'minConfidence']

// See app/api/onboarding/new-entity/route.ts getContext for why
// requestedEntityId matters — a user can have several sessions in flight.
async function getContext(supabase: SupabaseServer, requestedEntityId?: string | null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, progress: null }

  let query = supabase
    .from('onboarding_progress')
    .select('id, organisation_id, step, entity_type, data')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'existing_entity')

  if (requestedEntityId) {
    query = query.filter('data->>entityId', 'eq', requestedEntityId)
  } else {
    query = query.order('created_at', { ascending: false }).limit(1)
  }

  const { data: progress } = await query.maybeSingle()
  return { user, progress: (progress as ProgressRow | null) }
}

export async function GET(request: Request) {
  const requestedEntityId = new URL(request.url).searchParams.get('entity')
  const supabase = await createClient()
  const { user, progress } = await getContext(supabase, requestedEntityId)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!progress) return NextResponse.json({ error: 'no onboarding session' }, { status: 404 })

  const progressData = (progress.data ?? {}) as ProgressData
  const entityId = progressData.entityId

  let directors: unknown[] = []
  let shareholders: unknown[] = []
  let documents: unknown[] = []
  let beneficialOwners: unknown[] = []

  if (entityId) {
    const [d, s, docs, bo] = await Promise.all([
      supabase.from('directors').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('documents').select('id, name, document_type, file_path, file_size, mime_type, ocr_status, ocr_data, tags, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at'),
      supabase.from('beneficial_owners').select('*').eq('entity_id', entityId).order('created_at'),
    ])
    directors = d.data ?? []
    shareholders = s.data ?? []
    // Only what the wizard needs from the OCR blob — the document date and
    // kind for provenance labels, not the full extracted personal data.
    documents = (docs.data ?? []).map(({ ocr_data, ...rest }) => {
      const o = (ocr_data ?? {}) as { document_date?: string | null; document_kind?: string; confidence?: number }
      return { ...rest, document_date: o.document_date ?? null, document_kind: o.document_kind ?? null, confidence: o.confidence ?? null }
    })
    beneficialOwners = bo.data ?? []
  }

  const live = new Set((documents as Array<{ id: string }>).map((d) => d.id))
  const rawWizard = progressData.wizard ?? {}
  const wizard = entityId
    ? {
        ...withLiveEvidence(rawWizard, live, rankFor(rawWizard.entityType)),
        subscribers: rawWizard.subscribers?.filter((x) => live.has(x.documentId)),
        shareClasses: rawWizard.shareClasses?.filter((x) => live.has(x.documentId)),
        governance: liveGovernance(rawWizard.governance, live),
      }
    : rawWizard

  return NextResponse.json({
    step: progress.step,
    entityId: entityId ?? null,
    orgId: progress.organisation_id,
    wizard,
    activated: progressData.activated ?? false,
    onboardingStatus: progressData.onboardingStatus ?? 'draft',
    directors,
    shareholders,
    documents,
    beneficialOwners,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { action, entityId: requestedEntityId } = body as { action: string; entityId?: string }

  const supabase = await createClient()
  const { user, progress } = await getContext(supabase, requestedEntityId)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!progress) return NextResponse.json({ error: 'no onboarding session' }, { status: 400 })
  if (!progress.organisation_id) return NextResponse.json({ error: 'no organisation' }, { status: 400 })

  const orgId = progress.organisation_id
  const progressData = (progress.data ?? {}) as ProgressData

  // ----------------------------------------------------------
  // init — create the draft entity as soon as the wizard opens,
  // so document uploads have somewhere to attach immediately
  // ----------------------------------------------------------
  if (action === 'init') {
    let entityId = progressData.entityId

    if (!entityId) {
      entityId = crypto.randomUUID()
      const { error: entityError } = await supabase.from('entities').insert({
        id: entityId,
        organisation_id: orgId,
        entity_type: 'limited_company', // set from step 1
        onboarding_path: 'existing_entity',
        status: 'draft',
        onboarding_step: 1,
      })
      if (entityError) {
        console.error('entity create error', entityError)
        return NextResponse.json({ error: 'failed to create entity' }, { status: 500 })
      }

      const newData: ProgressData = { ...progressData, entityId, onboardingStatus: 'draft' }
      await supabase.from('onboarding_progress').update({ data: newData as Json }).eq('id', progress.id)

      await supabase.rpc('log_audit', {
        p_organisation_id: orgId,
        p_action: 'onboarding.existing_entity.initialised',
        p_resource_type: 'entity',
        p_resource_id: entityId,
      })
    }

    return NextResponse.json({ ok: true, entityId })
  }

  const entityId = progressData.entityId
  if (!entityId) return NextResponse.json({ error: 'entity not initialised' }, { status: 400 })

  if (progressData.activated && action !== 'request_help') {
    return NextResponse.json({ error: 'this entity is already activated' }, { status: 409 })
  }

  const entityType = progressData.wizard?.entityType ?? 'limited_company'
  const pack = EXISTING_DOC_PACKS[entityType] ?? LIMITED_COMPANY_PACK

  // ----------------------------------------------------------
  // Documents — shared with the new-entity route
  // ----------------------------------------------------------
  if (action === 'register_document') {
    const { document } = body as { document: RegisterDocumentInput }
    // A registry document with one current copy (certificate, Official
    // Search…) retires the previous upload of the same type — kept in
    // history, never shown twice (Charles, 2026-09-29).
    const spec = pack.find((d) => d.documentType === document?.documentType)
    const singleCurrent = !!spec && !spec.multiple && !document?.personId && !document?.personName
    // Registry documents this upload supersedes — whatever they alone
    // contributed (people it created) is withdrawn once they're retired.
    let superseded: string[] = []
    if (singleCurrent || document?.replacesFilePath) {
      const { data: prior } = await supabase.from('documents').select('id, file_path, document_type, tags')
        .eq('entity_id', entityId).is('deleted_at', null)
      superseded = (prior ?? [])
        .filter((d) => !(d.tags as unknown[] | null)?.length)
        .filter((d) => (singleCurrent && d.document_type === document?.documentType) || (!!document?.replacesFilePath && d.file_path === document.replacesFilePath))
        .map((d) => d.id)
    }
    const res = await registerDocument(supabase, { entityId, orgId, userId: user.id }, document ? { ...document, singleCurrent } : document)
    if (res.ok && superseded.length) await withdrawDocumentPeople(supabase, entityId, superseded)
    return res
  }

  if (action === 'retag_documents') {
    return retagDocuments(supabase, entityId, body as { documentIds?: string[]; personId?: string; personName?: string; personRole?: PersonRole })
  }

  if (action === 'delete_document') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    // Soft delete per Kenya DPA retention rules
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete document' }, { status: 500 })
    await withdrawDocumentPeople(supabase, entityId, [id])
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // ocr_extract — person documents (an ID scan inside a person form)
  // only return their fields for the form to fill; registry documents
  // are merged into the entity as *proposed* values with provenance.
  // ----------------------------------------------------------
  if (action === 'ocr_extract') {
    const { documentId, section } = body as { documentId: string; section?: string }
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

    const { data: doc } = await supabase
      .from('documents')
      .select('id, name, file_path, mime_type, document_type, tags')
      .eq('id', documentId)
      .eq('entity_id', entityId)
      .maybeSingle()

    if (!doc?.file_path) return NextResponse.json({ error: 'document not found' }, { status: 404 })

    await supabase.from('documents').update({ ocr_status: 'processing' }).eq('id', doc.id)

    const { data: blob, error: downloadError } = await supabase.storage.from('documents').download(doc.file_path)
    if (downloadError || !blob) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', doc.id)
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: 'download_failed' })
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())

    // A governing instrument is read into structured rules, not fields
    const instrument = doc.document_type ? INSTRUMENTS[doc.document_type] : undefined
    if (instrument && section === 'registry') {
      const g = await extractGovernanceRules(bytes, doc.mime_type ?? 'application/pdf', instrument.name, instrument.fields)
      if (!g.ok) {
        await supabase.from('documents').update({ ocr_status: 'failed', ocr_data: { reason: g.reason } as Json }).eq('id', doc.id)
        return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: g.reason })
      }
      await supabase.from('documents').update({ ocr_status: 'complete', ocr_data: { document_kind: doc.document_type, document_date: g.datedAs, governance: g.rules, parties_named: g.partiesNamed } as unknown as Json }).eq('id', doc.id)
      const { data: freshP } = await supabase.from('onboarding_progress').select('data').eq('id', progress.id).single()
      const pd = (freshP?.data ?? {}) as ProgressData
      const governance = { ...(pd.wizard?.governance ?? {}) }
      for (const [key, rule] of Object.entries(g.rules)) {
        // Never overwrite a rule the user entered or corrected
        if (governance[key]?.source === 'user') continue
        governance[key] = { summary: rule.summary ?? '', clause: rule.clause, silent: rule.silent, source: 'document', documentId: doc.id }
      }
      await supabase.from('onboarding_progress').update({ data: { ...pd, wizard: { ...(pd.wizard ?? {}), governance } } as Json }).eq('id', progress.id)
      const silent = Object.values(g.rules).filter((r) => r.silent).length
      return NextResponse.json({ ok: true, ocrStatus: 'complete', governance: true, silent, partiesNamed: g.partiesNamed, fields: { business_name: `${Object.keys(g.rules).length - silent} rules read` } })
    }

    const result = await extractFromDocument(bytes, doc.mime_type ?? 'application/pdf')

    if (!result.ok) {
      await supabase.from('documents').update({ ocr_status: 'failed', ocr_data: { reason: result.reason } as Json }).eq('id', doc.id)
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: result.reason })
    }

    const fields = result.fields
    // A registry document dropped into the wrong box (or "other") is
    // re-filed under the type it actually is, so gaps and ranks are right.
    // Anything uploaded inside a person or corporate-participant form is
    // tagged to that party — it describes them, never this entity. Only
    // untagged uploads from the registry-document step are merged (a
    // corporate shareholder's own certificate must not become ours).
    const tagged = Array.isArray(doc.tags) && (doc.tags as unknown[]).length > 0
    const personScoped = tagged || section !== 'registry'
    let documentType = doc.document_type ?? 'other'
    const detected = ocrKindToDocType(entityType, fields.document_kind)
    // The user's choice of box wins — OCR classification can be wrong
    // (an LLP certificate read as an LLP 1). Only files dropped into
    // "Other" are re-filed; elsewhere a mismatch is just mentioned.
    let looksLike: string | undefined
    if (!personScoped && detected && detected !== documentType) {
      if (documentType === 'other') documentType = detected
      else looksLike = detected
    }
    await supabase
      .from('documents')
      .update({ ocr_status: 'complete', ocr_data: fields as unknown as Json, document_type: documentType })
      .eq('id', doc.id)

    let merged: { conflicts: string[]; otherEntity?: { documentNumber: string; expectedNumber: string } } = { conflicts: [] }
    if (!personScoped) {
      merged = await mergeRegistryEvidence(supabase, {
        fields,
        source: { documentId: doc.id, documentType, documentName: doc.name, documentDate: fields.document_date, confidence: fields.confidence },
        entityId, orgId, progressId: progress.id, entityType,
      })
    }

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.existing_entity.ocr_extracted',
      p_resource_type: 'document',
      p_resource_id: doc.id,
      p_metadata: { document_kind: fields.document_kind, confidence: fields.confidence, section: section ?? 'registry' },
    })

    return NextResponse.json({ ok: true, ocrStatus: 'complete', fields, documentType, looksLike, ...merged })
  }

  // ----------------------------------------------------------
  // save_step — persist the step, advance. `confirm` marks the listed
  // entity fields as user-confirmed at their current value (the review /
  // conflict choice), which is what the four-state badges read.
  // ----------------------------------------------------------
  if (action === 'save_step') {
    const { step, wizard, advanceTo, confirm } = body as {
      step: number; wizard: ExistingWizardData; advanceTo?: number; confirm?: EntityFieldKey[]
    }
    if (!step || step < 1 || step > EXISTING_TOTAL_STEPS) {
      return NextResponse.json({ error: 'invalid step' }, { status: 400 })
    }

    // Re-read — an OCR merge may have landed since this request's context
    // was loaded, and its evidence must not be lost.
    const { data: fresh } = await supabase.from('onboarding_progress').select('data').eq('id', progress.id).single()
    const freshData = ((fresh?.data ?? progressData) as ProgressData)
    const clientWizard = { ...wizard }
    for (const k of SERVER_OWNED) delete clientWizard[k]
    const mergedWizard: ExistingWizardData = { ...freshData.wizard, ...clientWizard }

    if (confirm?.length) {
      const evidence = { ...(mergedWizard.fieldEvidence ?? {}) }
      const at = new Date().toISOString()
      for (const key of confirm) {
        const value = String(mergedWizard[key] ?? '').trim()
        if (!value) continue
        const rec: FieldRecord = evidence[key] ?? { candidates: [] }
        const from = rec.candidates.find((c) => c.value.trim().toLowerCase() === value.toLowerCase())
        evidence[key] = { ...rec, confirmed: { value, at, fromDocumentId: from?.source.documentId } }
      }
      mergedWizard.fieldEvidence = evidence
    }

    const nextStep = Math.min(advanceTo ?? step, EXISTING_TOTAL_STEPS)
    const newData: ProgressData = {
      ...freshData,
      wizard: mergedWizard,
      onboardingStatus: freshData.onboardingStatus === 'draft' && nextStep >= 3 ? 'extracted' : freshData.onboardingStatus,
    }

    const entityUpdate: Database['public']['Tables']['entities']['Update'] = {
      onboarding_step: nextStep,
      onboarding_data: newData as Json,
    }
    // subtype 'public' maps onto the public_limited_company entity type
    if (mergedWizard.entityType) {
      entityUpdate.entity_type = mergedWizard.entityType === 'limited_company' && mergedWizard.subtype === 'public'
        ? 'public_limited_company'
        : mergedWizard.entityType
    }
    if (mergedWizard.legalName !== undefined) entityUpdate.legal_name = mergedWizard.legalName
    if (mergedWizard.registrationNumber !== undefined) entityUpdate.registration_number = mergedWizard.registrationNumber
    if (mergedWizard.kraPin !== undefined) entityUpdate.kra_pin = mergedWizard.kraPin || null
    if (mergedWizard.dateIncorporated) entityUpdate.date_incorporated = mergedWizard.dateIncorporated
    if (mergedWizard.natureOfBusiness !== undefined) entityUpdate.nature_of_business = mergedWizard.natureOfBusiness || null
    if (mergedWizard.nominalCapital !== undefined) {
      const n = Number(String(mergedWizard.nominalCapital).replace(/[^\d.]/g, ''))
      entityUpdate.nominal_capital = Number.isFinite(n) && n > 0 ? n : null
    }
    if (mergedWizard.addressLine1 !== undefined) {
      entityUpdate.registered_address = {
        line1: mergedWizard.addressLine1,
        city: mergedWizard.city,
        county: mergedWizard.county,
        postcode: mergedWizard.postalCode,
        postalAddress: mergedWizard.postalAddress,
        country: 'Kenya',
      } as Json
    }

    const [{ error: entityError }, { error: progressError }] = await Promise.all([
      supabase.from('entities').update(entityUpdate).eq('id', entityId),
      supabase.from('onboarding_progress').update({ step: nextStep, data: newData as Json }).eq('id', progress.id),
    ])

    if (entityError || progressError) {
      console.error('save_step error', entityError, progressError)
      return NextResponse.json({ error: 'failed to save progress' }, { status: 500 })
    }

    const { data: liveDocs } = await supabase.from('documents').select('id').eq('entity_id', entityId).is('deleted_at', null)
    const live = new Set((liveDocs ?? []).map((d) => d.id))
    return NextResponse.json({
      ok: true,
      wizard: {
        ...withLiveEvidence(mergedWizard, live, rankFor(mergedWizard.entityType)),
        subscribers: mergedWizard.subscribers?.filter((x) => live.has(x.documentId)),
        shareClasses: mergedWizard.shareClasses?.filter((x) => live.has(x.documentId)),
        governance: liveGovernance(mergedWizard.governance, live),
      },
    })
  }

  // ----------------------------------------------------------
  // People — same row shapes as the new-entity route, so the dashboard,
  // registers and IDP read both paths the same way. Identity documents
  // are optional here: an existing company may not have them to hand,
  // and the person simply stays "identity unverified" (brief §10).
  // ----------------------------------------------------------
  if (action === 'upsert_director') {
    const { director } = body as {
      director: {
        id?: string; fullName: string; idNumber?: string; kraPin?: string
        nationality?: string; dateOfBirth?: string; phone?: string; email?: string; occupation?: string
        role?: 'director' | 'secretary' | 'proprietor' | 'partner' | 'manager' | 'authorised_person'
        appointmentDate?: string
        // Partner relationship facts (General Partnership brief §8) — kept
        // on the relationship, not the person's identity record
        interestPercentage?: string
        contributionType?: string
        contributionValue?: string
        isManagingPartner?: boolean
        signingAuthority?: string
        cessationDate?: string
        cessationReason?: string
        structuredAddress?: AddressData
        isCorporate?: boolean; corporate?: Record<string, unknown>
        isForeign?: boolean; foreignAddress?: string
      }
    }
    if (!director?.fullName?.trim()) return NextResponse.json({ error: 'fullName required' }, { status: 400 })

    const id = director.id ?? crypto.randomUUID()
    const { data: existing } = director.id
      ? await supabase.from('directors').select('residential_address').eq('id', id).eq('entity_id', entityId).maybeSingle()
      : { data: null }
    const prev = (existing?.residential_address ?? {}) as Record<string, unknown>

    // Address history: a changed address keeps the old one (brief §17 —
    // an older CR8 address remains in history when a newer one is given).
    const prevAddress = prev.structuredAddress as AddressData | undefined
    const history = Array.isArray(prev.addressHistory) ? [...(prev.addressHistory as unknown[])] : []
    if (prevAddress && director.structuredAddress && formatAddress(prevAddress) !== formatAddress(director.structuredAddress)) {
      history.push({ address: prevAddress, replacedAt: new Date().toISOString() })
    }

    const row: Database['public']['Tables']['directors']['Insert'] = {
      id,
      entity_id: entityId,
      organisation_id: orgId,
      full_name: director.fullName.trim(),
      id_number: director.idNumber ?? '',
      kra_pin: director.kraPin ?? null,
      nationality: director.nationality ?? 'Kenyan',
      phone: director.phone ?? null,
      email: director.email ?? null,
      appointment_date: director.appointmentDate ?? null,
      is_foreign: director.isForeign ?? false,
      residential_address: {
        ...prev,
        role: director.role ?? 'director',
        dateOfBirth: director.dateOfBirth ?? null,
        occupation: director.occupation ?? undefined,
        isCorporate: director.isCorporate ?? false,
        corporate: director.isCorporate ? director.corporate : undefined,
        foreignAddress: director.isForeign ? director.foreignAddress : undefined,
        structuredAddress: director.structuredAddress ?? prev.structuredAddress,
        addressHistory: history.length ? history : undefined,
        ...(director.role === 'partner' ? {
          interestPercentage: director.interestPercentage || undefined,
          contributionType: director.contributionType || undefined,
          contributionValue: director.contributionValue || undefined,
          isManagingPartner: director.isManagingPartner || undefined,
          signingAuthority: director.signingAuthority || undefined,
        } : {}),
        // Cessation keeps the relationship as history instead of deleting it
        cessationDate: director.cessationDate || undefined,
        cessationReason: director.cessationDate ? director.cessationReason || undefined : undefined,
        // The user has now reviewed this person — a name-only OCR match
        // no longer needs confirming.
        nameMatchOnly: undefined,
        userReviewed: true,
      } as Json,
    }
    const { error } = await supabase.from('directors').upsert(row)
    if (error) {
      console.error('director upsert error', error)
      return NextResponse.json({ error: 'failed to save director' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_director') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await retirePersonDocuments(supabase, entityId, id)
    const { error } = await supabase.from('directors').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete director' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'upsert_shareholder') {
    const { shareholder } = body as {
      shareholder: {
        id?: string; legalName: string; idNumber?: string; kraPin?: string; sharesHeld?: number; shareClass?: string
        nationality?: string; dateOfBirth?: string; phone?: string; email?: string; occupation?: string
        isNominee?: boolean
        structuredAddress?: AddressData
        isCorporate?: boolean; corporate?: Record<string, unknown>
        isForeign?: boolean; foreignAddress?: string
      }
    }
    if (!shareholder?.legalName?.trim()) return NextResponse.json({ error: 'legalName required' }, { status: 400 })

    const id = shareholder.id ?? crypto.randomUUID()
    const { data: existing } = shareholder.id
      ? await supabase.from('shareholders').select('address, corporate_details').eq('id', id).eq('entity_id', entityId).maybeSingle()
      : { data: null }
    const prevAddress = (existing?.address ?? {}) as Record<string, unknown>
    const prevCorporate = (existing?.corporate_details ?? {}) as Record<string, unknown>

    const row: Database['public']['Tables']['shareholders']['Insert'] = {
      id,
      entity_id: entityId,
      organisation_id: orgId,
      legal_name: shareholder.legalName.trim(),
      id_or_reg_number: shareholder.idNumber ?? null,
      kra_pin: shareholder.kraPin ?? null,
      shares_held: shareholder.sharesHeld ?? 0,
      phone: shareholder.phone ?? null,
      email: shareholder.email ?? null,
      address: {
        ...prevAddress,
        isForeign: shareholder.isForeign ?? false,
        foreignAddress: shareholder.isForeign ? shareholder.foreignAddress : undefined,
        structuredAddress: shareholder.structuredAddress ?? prevAddress.structuredAddress,
        nationality: shareholder.nationality ?? undefined,
        dateOfBirth: shareholder.dateOfBirth ?? undefined,
        occupation: shareholder.occupation ?? undefined,
        shareClass: shareholder.shareClass || 'Ordinary',
      } as Json,
      corporate_details: {
        ...prevCorporate,
        nominee: shareholder.isNominee || undefined,
        isCorporate: shareholder.isCorporate ?? false,
        corporate: shareholder.isCorporate ? shareholder.corporate : undefined,
        nameMatchOnly: undefined,
        userReviewed: true,
      } as Json,
    }
    const { error } = await supabase.from('shareholders').upsert(row)
    if (error) {
      console.error('shareholder upsert error', error)
      return NextResponse.json({ error: 'failed to save shareholder' }, { status: 500 })
    }
    await recomputeShareholding(supabase, entityId)
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_shareholder') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await retirePersonDocuments(supabase, entityId, id)
    const { error } = await supabase.from('shareholders').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete shareholder' }, { status: 500 })
    // Unlike the new-entity path, removing a shareholder here never
    // removes a beneficial owner: BO status comes from BO evidence, not
    // the share register (brief §17).
    await recomputeShareholding(supabase, entityId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'upsert_beneficial_owner') {
    const { beneficialOwner } = body as {
      beneficialOwner: {
        id?: string; fullName: string; idNumber?: string; kraPin?: string; nationality?: string; dateOfBirth?: string
        structuredAddress?: AddressData; phone?: string; email?: string; occupation?: string
        natureOfControl?: string; dateBecameBo?: string; sharePercentage?: number
      }
    }
    if (!beneficialOwner?.fullName?.trim()) return NextResponse.json({ error: 'fullName required' }, { status: 400 })

    const id = beneficialOwner.id ?? crypto.randomUUID()
    const { data: existing } = beneficialOwner.id
      ? await supabase.from('beneficial_owners').select('residential_address').eq('id', id).eq('entity_id', entityId).maybeSingle()
      : { data: null }
    const prev = (existing?.residential_address ?? {}) as Record<string, unknown>

    const row: Database['public']['Tables']['beneficial_owners']['Insert'] = {
      id,
      entity_id: entityId,
      organisation_id: orgId,
      full_name: beneficialOwner.fullName.trim(),
      id_number: beneficialOwner.idNumber ?? null,
      kra_pin: beneficialOwner.kraPin ?? null,
      nationality: beneficialOwner.nationality ?? 'Kenyan',
      date_of_birth: beneficialOwner.dateOfBirth ?? null,
      postal_address: null,
      business_address: null,
      residential_address: { ...prev, structuredAddress: beneficialOwner.structuredAddress ?? prev.structuredAddress, userReviewed: true } as Json,
      phone: beneficialOwner.phone ?? null,
      email: beneficialOwner.email ?? null,
      occupation: beneficialOwner.occupation ?? null,
      nature_of_control: beneficialOwner.natureOfControl ?? null,
      date_became_bo: beneficialOwner.dateBecameBo ?? null,
      share_percentage: beneficialOwner.sharePercentage ?? null,
    }
    const { error } = await supabase.from('beneficial_owners').upsert(row)
    if (error) {
      console.error('beneficial owner upsert error', error)
      return NextResponse.json({ error: 'failed to save beneficial owner' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id })
  }

  if (action === 'delete_beneficial_owner') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await retirePersonDocuments(supabase, entityId, id)
    const { error } = await supabase.from('beneficial_owners').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete beneficial owner' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // activate — the user confirms the reconstructed entity as a whole.
  // Field states are preserved (confirmation never makes unsupported
  // data "registry verified"); gaps and baseline answers become tasks.
  // ----------------------------------------------------------
  if (action === 'activate') {
    const wizard = progressData.wizard ?? {}
    if (!wizard.legalName?.trim()) return NextResponse.json({ error: 'registered name required' }, { status: 400 })
    if (!wizard.registrationNumber?.trim()) return NextResponse.json({ error: 'registration number required' }, { status: 400 })
    if (!wizard.declared || !wizard.signature?.trim()) {
      return NextResponse.json({ error: 'declaration and signature required' }, { status: 400 })
    }

    const [{ data: docs }, { data: directorRows }] = await Promise.all([
      supabase.from('documents').select('document_type, tags').eq('entity_id', entityId).is('deleted_at', null),
      supabase.from('directors').select('id, full_name, id_number, residential_address').eq('entity_id', entityId),
    ])
    if (entityType === 'sole_proprietorship') {
      const proprietors = (directorRows ?? []).filter((d) => (d.residential_address as { role?: string } | null)?.role === 'proprietor')
      if (proprietors.length !== 1) return NextResponse.json({ error: 'a business name registered to one proprietor needs exactly one proprietor' }, { status: 400 })
    } else if (entityType === 'limited_liability_partnership') {
      const partners = (directorRows ?? []).filter((d) => (d.residential_address as { role?: string } | null)?.role === 'partner')
      if (partners.length < 1) return NextResponse.json({ error: 'add the partners' }, { status: 400 })
    } else if (entityType === 'partnership') {
      const partners = (directorRows ?? []).filter((d) => (d.residential_address as { role?: string } | null)?.role === 'partner')
      if (partners.length < 1) return NextResponse.json({ error: 'add the partners' }, { status: 400 })
    } else if ((directorRows ?? []).length < 1) {
      return NextResponse.json({ error: 'add at least one director' }, { status: 400 })
    }
    // One person can hold several roles (partner + manager): an ID on file
    // for any of their rows verifies the person, and they're listed once.
    const hasId = (id: string) => (docs ?? []).some((doc) => doc.document_type === 'director_id_copy' && (doc.tags as Array<{ personId?: string }> | null)?.some((t) => t.personId === id))
    const personKey = (d: { id_number: string | null; full_name: string }) => (d.id_number || d.full_name).trim().toLowerCase()
    const activePeople = (directorRows ?? [])
      .filter((d) => !(d.residential_address as { isCorporate?: boolean } | null)?.isCorporate)
      .filter((d) => !(d.residential_address as { cessationDate?: string } | null)?.cessationDate)
    const verifiedKeys = new Set(activePeople.filter((d) => hasId(d.id)).map(personKey))
    const unverifiedPeople = [...new Map(activePeople.filter((d) => !verifiedKeys.has(personKey(d))).map((d) => [personKey(d), d.full_name])).values()]

    const { data: liveDocs } = await supabase.from('documents').select('id').eq('entity_id', entityId).is('deleted_at', null)
    const liveWizard = withLiveEvidence(wizard, new Set((liveDocs ?? []).map((d) => d.id)), rankFor(entityType))

    // Everything shown on the review screen counts as confirmed now.
    const at = new Date().toISOString()
    const evidence = { ...(liveWizard.fieldEvidence ?? {}) }
    for (const f of entityFieldsFor(entityType)) {
      const value = String(wizard[f.key] ?? '').trim()
      if (!value || evidence[f.key]?.confirmed?.value === value) continue
      const rec: FieldRecord = evidence[f.key] ?? { candidates: [] }
      const from = rec.candidates.find((c) => c.value.trim().toLowerCase() === value.toLowerCase())
      evidence[f.key] = { ...rec, confirmed: { value, at, fromDocumentId: from?.source.documentId } }
    }
    const finalWizard: ExistingWizardData = { ...wizard, fieldEvidence: evidence }

    const ctx = { subtype: wizard.subtype, nominalCapital: Number(wizard.nominalCapital) || null }
    const uploaded = new Set((docs ?? []).filter((d) => !(d.tags as unknown[] | null)?.length).map((d) => d.document_type).filter((t): t is string => !!t))
    const gaps = documentGaps(pack, ctx, uploaded, wizard.unavailableDocuments)
    const rank = rankFor(entityType)
    const states = entityFieldsFor(entityType).filter((f) => f.material).map((f) => fieldState(evidence[f.key], String(finalWizard[f.key] ?? ''), rank))

    const tasks = buildActivationTasks({ gaps, baseline: EXISTING_BASELINES[entityType] ?? [], wizard: finalWizard, ctx, unverifiedPeople })
    if (entityType === 'limited_liability_partnership') {
      const managers = (directorRows ?? []).filter((d) => {
        const ra = (d.residential_address ?? {}) as { role?: string; cessationDate?: string; isCorporate?: boolean }
        return ra.role === 'manager' && !ra.cessationDate && !ra.isCorporate
      })
      // LLP Act: at least one manager, who must be a natural person
      if (managers.length < 1) {
        tasks.unshift({ title: 'Urgent: appoint / record the LLP manager', description: 'An LLP must have at least one manager, and the manager must be a natural person. The manager carries personal responsibility for specified statutory compliance.', category: 'legal_review', dueInDays: 7 })
      }
    }
    const instrumentType = instrumentFor(entityType)
    if (instrumentType && uploaded.has(instrumentType)) {
      const liveGov = liveGovernance(finalWizard.governance, new Set((liveDocs ?? []).map((d) => d.id))) ?? {}
      const silent = INSTRUMENTS[instrumentType].fields.filter((f) => liveGov[f.key]?.silent)
      if (silent.length > 0) {
        tasks.push({ title: 'Legal review: matters the agreement doesn’t cover', description: `The agreement is silent on: ${silent.map((f) => f.label.toLowerCase()).join(', ')}. Statutory default rules may apply — we’ll review with you rather than assume a rule.`, category: 'legal_review', dueInDays: 30 })
      }
    }
    if (entityType === 'partnership') {
      const current = (directorRows ?? []).filter((d) => {
        const ra = (d.residential_address ?? {}) as { role?: string; cessationDate?: string }
        return ra.role === 'partner' && !ra.cessationDate
      })
      // Partnerships Act: falling below two partners is a break-up event
      if (current.length < 2) {
        tasks.unshift({ title: 'Urgent: legal-status review — fewer than two partners', description: `Only ${current.length} current partner${current.length === 1 ? '' : 's'} recorded. Under the Partnerships Act a partnership breaks up when its partners fall below two. We’ll review the business’s legal status with you.`, category: 'legal_review', dueInDays: 7 })
      }
    }
    const status = activationStatus({ gaps, states, openTasks: tasks.length })

    const newData: ProgressData = { ...progressData, wizard: finalWizard, activated: true, onboardingStatus: status }

    const [{ error: entityError }, { error: progressError }] = await Promise.all([
      supabase
        .from('entities')
        .update({
          status: 'active',
          onboarding_step: EXISTING_REVIEW_STEP,
          onboarding_data: newData as Json,
          applicant_name: wizard.signature.trim(),
          applicant_email: user.email ?? null,
        })
        .eq('id', entityId),
      supabase.from('onboarding_progress').update({ step: EXISTING_REVIEW_STEP, data: newData as Json }).eq('id', progress.id),
    ])

    if (entityError || progressError) {
      console.error('activate error', entityError, progressError)
      return NextResponse.json({ error: 'failed to activate' }, { status: 500 })
    }

    await seedComplianceCalendar(supabase, { entityId, orgId, entityType, dateIncorporated: wizard.dateIncorporated ?? null, tasks, baseline: finalWizard.baseline ?? {} })
    await generateAndStoreProfile(supabase, { entityId, orgId, wizard: finalWizard, status, gaps: gaps.map((g) => g.spec.title) })

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.existing_entity.activated',
      p_resource_type: 'entity',
      p_resource_id: entityId,
      p_metadata: { onboarding_status: status, open_tasks: tasks.length, document_gaps: gaps.length },
    })

    return NextResponse.json({ ok: true, onboardingStatus: status, tasks: tasks.length })
  }

  if (action === 'request_help') {
    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.existing_entity.help_requested',
      p_resource_type: 'entity',
      p_resource_id: progressData.entityId ?? undefined,
      p_metadata: { channel: 'whatsapp' },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ------------------------------------------------------------------
// Tasks opened on activation: document gaps, unresolved identity
// verification and the compliance-baseline answers (brief §10, §13).
// ------------------------------------------------------------------
type ActivationTask = { title: string; description: string; category: string; dueInDays: number }

function buildActivationTasks(opts: {
  gaps: ReturnType<typeof documentGaps>
  baseline: NonNullable<(typeof EXISTING_BASELINES)[EntityType]>
  wizard: ExistingWizardData
  ctx: { subtype?: string; nominalCapital?: number | null }
  unverifiedPeople: string[]
}): ActivationTask[] {
  const tasks: ActivationTask[] = []
  for (const g of opts.gaps) {
    // Only high-impact gaps become tasks; medium ones (historical
    // formation records) are flagged on the report without cluttering the
    // calendar.
    if (g.spec.missing.impact !== 'high' && g.spec.missing.impact !== 'critical') continue
    tasks.push({
      title: `Provide ${g.spec.title}`,
      description: `${g.declaredUnavailable ? 'You told us this isn’t available. ' : ''}${g.spec.missing.behaviour}`,
      category: g.spec.treatment === 'beneficial_ownership' ? 'bo_update' : 'records',
      dueInDays: g.spec.missing.impact === 'high' || g.spec.missing.impact === 'critical' ? 14 : 30,
    })
  }
  if (opts.unverifiedPeople.length > 0) {
    tasks.push({
      title: `Upload ID/passport for ${opts.unverifiedPeople.length} ${opts.unverifiedPeople.length === 1 ? 'person' : 'people'}`,
      description: `Recorded provisionally without identity evidence: ${opts.unverifiedPeople.join(', ')}.`,
      category: 'records',
      dueInDays: 30,
    })
  }
  tasks.push(...baselineTasks(opts.baseline, opts.wizard.baseline ?? {}, opts.ctx))
  return tasks
}

// ------------------------------------------------------------------
// Seed the compliance calendar + onboarding follow-up tasks.
// Idempotent-ish: skips if events already exist.
// ------------------------------------------------------------------
async function seedComplianceCalendar(
  supabase: SupabaseServer,
  ctx: { entityId: string; orgId: string; entityType: EntityType; dateIncorporated: string | null; tasks: ActivationTask[]; baseline: Record<string, string> }
) {
  try {
    const { count } = await supabase
      .from('compliance_events')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', ctx.entityId)
    if ((count ?? 0) > 0) return

    const today = new Date()
    const year = today.getFullYear()
    const iso = (d: Date) => d.toISOString().slice(0, 10)
    const inDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d }

    let annualReturn: Date
    if (ctx.dateIncorporated) {
      const inc = new Date(ctx.dateIncorporated)
      annualReturn = new Date(year, inc.getMonth(), inc.getDate())
      if (annualReturn <= today) annualReturn.setFullYear(year + 1)
    } else {
      annualReturn = new Date(year + 1, today.getMonth(), today.getDate())
    }
    const kraReturn = new Date(year, 5, 30)
    if (kraReturn <= today) kraReturn.setFullYear(year + 1)
    const permitRenewal = new Date(year, 0, 31)
    if (permitRenewal <= today) permitRenewal.setFullYear(year + 1)

    const base = { entity_id: ctx.entityId, organisation_id: ctx.orgId }
    // Recurring obligations only where they apply: a business name files
    // no BRS annual return, and its income is taxed on the proprietor's
    // own return; a permit is tracked only if the business needs one.
    // LLP annual return: within 30 days after each registration anniversary
    const llpReturn = new Date(annualReturn)
    llpReturn.setDate(llpReturn.getDate() + 30)
    const recurring = ctx.entityType === 'limited_liability_partnership'
      ? [
          { ...base, title: 'File the LLP annual return', description: 'Due within 30 days after the registration anniversary. It includes the solvency/insolvency declaration and the particulars of the manager, partners and authorised person. Accounting records must be kept for at least seven years.', category: 'annual_return', due_date: iso(llpReturn) },
          { ...base, title: 'File income tax return with KRA', description: 'Confirm with your tax adviser which return applies to the LLP and its partners; due by 30 June.', category: 'tax', due_date: iso(kraReturn) },
        ]
      : ctx.entityType === 'partnership'
      ? [
          { ...base, title: 'File the partnership income tax return (IT2P)', description: 'The partnership files a return by 30 June; each partner then declares their share of profit on their own return.', category: 'tax', due_date: iso(kraReturn) },
          ...(ctx.baseline.county_permit === 'yes'
            ? [{ ...base, title: 'Renew county single business permit', description: 'Single business permits are renewed with your county government at the start of each year.', category: 'license', due_date: iso(permitRenewal) }]
            : []),
        ]
      : ctx.entityType === 'sole_proprietorship'
      ? [
          { ...base, title: 'File your personal income tax return (business income)', description: 'A sole proprietor’s business profit is declared on their own KRA income tax return, due by 30 June.', category: 'tax', due_date: iso(kraReturn) },
          ...(ctx.baseline.county_permit === 'yes'
            ? [{ ...base, title: 'Renew county single business permit', description: 'Single business permits are renewed with your county government at the start of each year.', category: 'license', due_date: iso(permitRenewal) }]
            : []),
        ]
      : [
          { ...base, title: 'File annual return with BRS', description: 'Companies must file an annual return with the Business Registration Service each year.', category: 'annual_return', due_date: iso(annualReturn) },
          { ...base, title: 'File income tax return with KRA', description: 'Corporate income tax return due by 30 June following the end of the accounting period.', category: 'tax', due_date: iso(kraReturn) },
          { ...base, title: 'Renew county single business permit', description: 'Single business permits are renewed with your county government at the start of each year.', category: 'license', due_date: iso(permitRenewal) },
        ]
    const { error } = await supabase.from('compliance_events').insert([
      ...recurring,
      ...ctx.tasks.map((t) => ({ ...base, title: t.title, description: t.description, category: t.category, due_date: iso(inDays(t.dueInDays)) })),
    ])
    if (error) console.error('compliance seed error', error)
  } catch (e) {
    console.error('compliance seed failed', e)
  }
}

// ------------------------------------------------------------------
// Onboarding verification report — the signed entity profile PDF, built
// on the IDP template, filed in the vault on activation. Best-effort.
// ------------------------------------------------------------------
async function generateAndStoreProfile(
  supabase: SupabaseServer,
  ctx: { entityId: string; orgId: string; wizard: ExistingWizardData; status: OnboardingStatus; gaps: string[] }
) {
  try {
    const [{ data: entity }, { data: directors }, { data: shareholders }, { data: bos }, { data: org }] = await Promise.all([
      supabase.from('entities').select('*').eq('id', ctx.entityId).single(),
      supabase.from('directors').select('full_name, id_number, kra_pin, nationality, email, phone, residential_address').eq('entity_id', ctx.entityId),
      supabase.from('shareholders').select('legal_name, id_or_reg_number, kra_pin, shares_held, share_percentage, address, corporate_details').eq('entity_id', ctx.entityId),
      supabase.from('beneficial_owners').select('*').eq('entity_id', ctx.entityId),
      supabase.from('organisations').select('name').eq('id', ctx.orgId).single(),
    ])
    if (!entity) return

    const address = entity.registered_address as { line1?: string; city?: string; county?: string; postcode?: string } | null
    const rank = rankFor(ctx.wizard.entityType)
    const exceptions = [
      `Onboarding status: ${ONBOARDING_STATUS_LABEL[ctx.status]}`,
      ...entityFieldsFor(ctx.wizard.entityType).filter((f) => f.material).flatMap((f) => {
        const s = fieldState(ctx.wizard.fieldEvidence?.[f.key], String(ctx.wizard[f.key] ?? ''), rank)
        return s === 'verified' ? [] : [`${f.label}: ${s === 'user_confirmed' ? 'confirmed by applicant — documentary evidence outstanding' : s === 'missing' ? 'not provided' : 'conflicting sources'}`]
      }),
      ...ctx.gaps.map((g) => `Not on file: ${g}`),
    ]

    const pdfBytes = await generateIdp({
      organisationName: org?.name ?? 'Your organisation',
      generatedAt: new Date(),
      matterReference: ctx.entityId.slice(0, 8).toUpperCase(),
      servicePath: 'Self-service (already registered)',
      onboardingType: ctx.wizard.entityType === 'sole_proprietorship' ? 'Existing business name onboarding — verification report' : 'Existing entity onboarding — verification report',

      entityTypeLabel: ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label ?? entity.entity_type,
      legalNameOptions: [entity.legal_name ?? ''].filter(Boolean),
      natureOfBusiness: entity.nature_of_business,
      registeredAddress: address ? { line1: address.line1 ?? null, city: address.city ?? null, county: address.county ?? null, postcode: address.postcode ?? null } : null,
      postalAddress: ctx.wizard.postalAddress ?? null,
      companyEmail: entity.email,
      companyPhone: entity.phone,

      applicantName: ctx.wizard.signature ?? null,
      applicantRelationship: null,
      applicantEmail: entity.applicant_email,
      applicantPhone: null,

      totalShares: entity.total_shares,
      authorisedCapital: entity.nominal_capital,
      nominalValuePerShare: ctx.wizard.shareClasses?.[0]?.nominalValueEach ?? null,
      useMultipleShareClasses: (ctx.wizard.shareClasses?.length ?? 0) > 1,
      shareClassCount: Math.max(ctx.wizard.shareClasses?.length ?? 1, 1),
      votingRights: null,

      directors: (directors ?? []).map((d) => {
        const ra = (d.residential_address ?? {}) as { role?: string; structuredAddress?: AddressData }
        return {
          fullName: d.full_name, role: ra.role === 'secretary' ? 'Company Secretary' : ra.role === 'proprietor' ? 'Proprietor' : ra.role === 'partner' ? 'Partner' : ra.role === 'manager' ? 'Manager' : ra.role === 'authorised_person' ? 'Authorised person' : 'Director', nationality: d.nationality,
          idNumber: d.id_number || null, kraPin: d.kra_pin, email: d.email, phone: d.phone,
          address: ra.structuredAddress ? formatAddress(ra.structuredAddress) : null,
          isAlsoShareholder: false, isAlsoBeneficialOwner: false,
        }
      }),
      secretaryName: (directors ?? []).find((d) => (d.residential_address as { role?: string } | null)?.role === 'secretary')?.full_name ?? null,

      shareholders: (shareholders ?? []).map((s) => ({
        legalName: s.legal_name,
        type: (s.corporate_details as { isCorporate?: boolean } | null)?.isCorporate ? 'Company' as const : 'Individual' as const,
        nationalityOrJurisdiction: null,
        idOrRegNumber: s.id_or_reg_number, kraPinOrTaxId: s.kra_pin, shareClass: (s.address as { shareClass?: string } | null)?.shareClass ?? 'Ordinary', sharesHeld: s.shares_held,
        sharePercentage: s.share_percentage, isNominee: !!(s.corporate_details as { nominee?: boolean } | null)?.nominee,
      })),
      corporateParties: [],

      beneficialOwners: (bos ?? []).map((b) => {
        const ra = (b.residential_address ?? {}) as { structuredAddress?: AddressData }
        return {
          fullName: b.full_name, nationality: b.nationality, idNumber: b.id_number, kraPin: b.kra_pin,
          address: ra.structuredAddress ? formatAddress(ra.structuredAddress) : null,
          phone: b.phone, email: b.email, natureOfControl: b.nature_of_control ?? '',
          sharePercentage: b.share_percentage, dateBecameBo: b.date_became_bo,
        }
      }),
      noBeneficialOwnersDeclared: !!ctx.wizard.noBeneficialOwners,

      articlesType: null,

      forms: [],
      documentGroups: [],
      exceptions,

      declared: !!ctx.wizard.declared,
      signature: ctx.wizard.signature ?? null,
      declarationDate: ctx.wizard.declarationDate ?? null,
    })

    const path = `${ctx.orgId}/${ctx.entityId}/entity-profile-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, pdfBytes, { contentType: 'application/pdf' })
    if (uploadError) {
      console.error('profile upload error', uploadError)
      return
    }

    await supabase.from('company_forms').insert({
      entity_id: ctx.entityId,
      organisation_id: ctx.orgId,
      form_type: 'entity_profile',
      status: 'generated',
      file_url: path,
      generated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('entity profile generation failed', e)
  }
}

// Governing instruments read into structured rules, by document type
const INSTRUMENTS: Record<string, { name: string; fields: typeof PARTNERSHIP_AGREEMENT_FIELDS }> = {
  partnership_agreement: { name: 'partnership agreement', fields: PARTNERSHIP_AGREEMENT_FIELDS },
  llp_agreement: { name: 'limited liability partnership (LLP) agreement', fields: LLP_AGREEMENT_FIELDS },
}
const instrumentFor = (entityType: EntityType) =>
  entityType === 'partnership' ? 'partnership_agreement' : entityType === 'limited_liability_partnership' ? 'llp_agreement' : null

// Rules read from an agreement that has since been removed/replaced stop
// counting; the user's own entries stay.
function liveGovernance(g: ExistingWizardData['governance'], live: Set<string>) {
  if (!g) return g
  return Object.fromEntries(Object.entries(g).filter(([, r]) => r.source === 'user' || !r.documentId || live.has(r.documentId)))
}

// People a removed registry document created are withdrawn with it —
// unless the user has since reviewed/edited them, or another live document
// also lists them (then only that evidence link is dropped).
async function withdrawDocumentPeople(supabase: SupabaseServer, entityId: string, documentIds: string[]) {
  const gone = new Set(documentIds)
  const tables = [
    { table: 'directors' as const, col: 'residential_address' as const },
    { table: 'shareholders' as const, col: 'corporate_details' as const },
    { table: 'beneficial_owners' as const, col: 'residential_address' as const },
  ]
  for (const { table, col } of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: rows } = await db.from(table).select(`id, ${col}`).eq('entity_id', entityId)
    for (const row of (rows ?? []) as Array<{ id: string } & Record<string, unknown>>) {
      const meta = (row[col] ?? {}) as { evidence?: Array<{ documentId?: string }>; userReviewed?: boolean; source?: string }
      if (!meta.evidence?.some((e) => e.documentId && gone.has(e.documentId))) continue
      const remaining = meta.evidence.filter((e) => !e.documentId || !gone.has(e.documentId))
      if (remaining.length === 0 && !meta.userReviewed && meta.source === 'ocr') {
        await retirePersonDocuments(supabase, entityId, row.id)
        await db.from(table).delete().eq('id', row.id).eq('entity_id', entityId)
      } else {
        await db.from(table).update({ [col]: { ...meta, evidence: remaining } as Json }).eq('id', row.id)
      }
    }
  }
  await recomputeShareholding(supabase, entityId)
}

async function recomputeShareholding(supabase: SupabaseServer, entityId: string) {
  const { data: all } = await supabase.from('shareholders').select('id, shares_held').eq('entity_id', entityId)
  const total = (all ?? []).reduce((sum, s) => sum + (s.shares_held ?? 0), 0)
  for (const s of all ?? []) {
    const pct = total > 0 ? Math.round(((s.shares_held ?? 0) / total) * 10000) / 100 : null
    await supabase.from('shareholders').update({ share_percentage: pct }).eq('id', s.id)
  }
  await supabase.from('entities').update({ total_shares: total || null }).eq('id', entityId)
}

// ------------------------------------------------------------------
// Merge a registry document into the entity as proposed evidence.
// Values are recorded against the field with their source; the field is
// only pre-filled when it is still empty. People are matched by strong
// identifiers; a name-only match is flagged for the user to confirm.
// ------------------------------------------------------------------
const COMPANY_DOC_KINDS = new Set(['certificate_of_incorporation', 'cr12', 'cr1', 'cr2', 'cr8', 'bof1', 'statement_of_nominal_capital', 'business_registration', 'cr13', 'bn2', 'llp1', 'llp9', 'kra_pin_certificate', 'other'])

async function mergeRegistryEvidence(
  supabase: SupabaseServer,
  ctx: { fields: ExtractedFields; source: FieldSource; entityId: string; orgId: string; progressId: string; entityType: EntityType },
): Promise<{ conflicts: string[]; otherEntity?: { documentNumber: string; expectedNumber: string } }> {
  const { fields, source, entityId, orgId, progressId } = ctx
  if (!COMPANY_DOC_KINDS.has(fields.document_kind)) return { conflicts: [] }
  // A KRA PIN certificate only speaks for the company when it names one
  const isPersonKra = fields.document_kind === 'kra_pin_certificate' && !fields.business_name
  if (isPersonKra) return { conflicts: [] }

  // A registration number read into the name field (seen on BOF-1 scans)
  // is not a name.
  const regLike = /^(PVT|CPR|CLG|PLC|OS|BN|LLP|C)[-.\s]?[A-Z0-9]{4,}$/i
  if (fields.business_name && (regLike.test(fields.business_name.trim()) || fields.business_name.trim().toUpperCase() === (fields.registration_number ?? '').trim().toUpperCase())) {
    fields.business_name = null
  }

  const { data: fresh } = await supabase.from('onboarding_progress').select('data').eq('id', progressId).single()
  const progressData = (fresh?.data ?? {}) as ProgressData
  const wizard: ExistingWizardData = { ...(progressData.wizard ?? {}) }
  const rank = rankFor(ctx.entityType)
  const { data: liveDocs } = await supabase.from('documents').select('id').eq('entity_id', entityId).is('deleted_at', null)
  Object.assign(wizard, withLiveEvidence(wizard, new Set((liveDocs ?? []).map((d) => d.id)), rank))
  const evidence = { ...(wizard.fieldEvidence ?? {}) }
  const conflicts: string[] = []

  // Registration number is the matching key across the pack (brief §2).
  // A document for a different number is most likely another company's
  // — its people and particulars are not merged; only its number is
  // recorded, so the mismatch shows on the details step.
  const expected = (wizard.registrationNumber ?? '').replace(/\s/g, '').toUpperCase()
  const docNumber = (fields.registration_number ?? '').replace(/\s/g, '').toUpperCase()
  if (expected && docNumber && expected !== docNumber) {
    evidence.registrationNumber = addCandidate(evidence.registrationNumber, docNumber, source)
    wizard.fieldEvidence = evidence
    await supabase.from('onboarding_progress').update({ data: { ...progressData, wizard } as Json }).eq('id', progressId)
    return { conflicts: ['Registration number'], otherEntity: { documentNumber: docNumber, expectedNumber: expected } }
  }

  const ocrValue = (key: EntityFieldKey): string | null => {
    const spec = entityFieldsFor(ctx.entityType).find((f) => f.key === key)!
    const raw = (fields as unknown as Record<string, unknown>)[spec.ocr]
    if (raw === null || raw === undefined || raw === '') return null
    if (key === 'registrationNumber' || key === 'kraPin') return String(raw).toUpperCase()
    // Registry documents print counties in capitals; match the list entry
    if (key === 'county') {
      const c = String(raw).replace(/\s*county\s*$/i, '').trim().toLowerCase()
      return KENYA_COUNTIES.find((k) => k.toLowerCase() === c) ?? null
    }
    return String(raw)
  }

  // A business-name certificate's issue date is its registration date
  if (!fields.date_of_incorporation && fields.document_date && source.documentType === 'certificate_of_registration') {
    fields.date_of_incorporation = fields.document_date
  }

  for (const f of entityFieldsFor(ctx.entityType)) {
    // The company KRA PIN only comes from the company's own PIN certificate
    if (f.key === 'kraPin' && fields.document_kind !== 'kra_pin_certificate') continue
    const value = ocrValue(f.key)
    if (!value) continue
    const before = distinctCandidates(evidence[f.key], rank).length
    evidence[f.key] = addCandidate(evidence[f.key], value, source)
    const distinct = distinctCandidates(evidence[f.key], rank)
    if (distinct.length > 1 && before !== distinct.length) conflicts.push(f.label)
    // Pre-fill only an empty field, with the strongest-ranked source —
    // or refresh a pre-fill the user hasn't touched when a stronger
    // source arrives.
    const current = String(wizard[f.key] ?? '').trim()
    const rec = evidence[f.key]!
    if (!current || (rec.autoFilledFrom && !rec.confirmed && current === (rec.candidates.find((c) => c.source.documentId === rec.autoFilledFrom)?.value ?? current))) {
      wizard[f.key] = distinct[0].value
      evidence[f.key] = { ...rec, autoFilledFrom: distinct[0].sources[0].documentId }
    }
  }
  if (!wizard.city && (fields.city ?? fields.locality)) wizard.city = (fields.city ?? fields.locality) ?? undefined
  if (!wizard.postalCode && fields.postal_code) wizard.postalCode = fields.postal_code

  if (fields.share_classes?.length && (source.documentType === 'statement_of_nominal_capital' || source.documentType === 'cr2')) {
    const others = (wizard.shareClasses ?? []).filter((c) => c.documentId !== source.documentId)
    wizard.shareClasses = [
      ...others,
      ...fields.share_classes.map((c) => ({ className: c.class_name ?? 'Ordinary', numberOfShares: c.number_of_shares, nominalValueEach: c.nominal_value_each, documentId: source.documentId })),
    ]
  }

  if (wizard.minConfidence === undefined || fields.confidence < wizard.minConfidence) wizard.minConfidence = fields.confidence

  // ---- people ----------------------------------------------------
  const people = fields.people ?? []
  if (source.documentType === 'cr2') {
    // Founding subscribers are formation history, not current shareholders
    const others = (wizard.subscribers ?? []).filter((s) => s.documentId !== source.documentId)
    wizard.subscribers = [
      ...others,
      ...people.filter((p) => p.full_name).map((p) => ({ name: p.full_name, idNumber: p.id_number, shares: p.shares_held, documentId: source.documentId })),
    ]
  } else if (source.documentType === 'cr12' || source.documentType === 'change_filing' || source.documentType === 'cr8' || source.documentType === 'cr1') {
    const current = source.documentType === 'cr12' || source.documentType === 'change_filing'
    await mergePeople(supabase, { people, source, entityId, orgId, current })
  } else if (ctx.entityType === 'limited_liability_partnership' && ['certificate_of_registration', 'official_search_llp', 'llp1', 'llp9', 'llp_annual_return'].includes(source.documentType)) {
    // LLP records list partners and managers — separate roles, even when
    // one person holds both (LLP brief §5)
    await mergePeople(supabase, {
      people: people.map((p) => ({ ...p, role: p.role === 'manager' ? 'manager' as const : 'partner' as const })),
      source, entityId, orgId,
      current: source.documentType !== 'llp1',
    })
  } else if ((ctx.entityType === 'sole_proprietorship' || ctx.entityType === 'partnership') && ['certificate_of_registration', 'official_search_bn', 'bn2', 'bn_change', 'partner_change'].includes(source.documentType)) {
    // Business-name records name the proprietor — sometimes as a people
    // list, sometimes as the document's single named person.
    const named = people.length ? people : fields.full_name ? [{ full_name: fields.full_name, id_number: fields.id_number, kra_pin: fields.kra_pin, role: 'proprietor' as const, shares_held: null }] : []
    const role = ctx.entityType === 'partnership' ? 'partner' as const : 'proprietor' as const
    await mergePeople(supabase, {
      people: named.map((p) => ({ ...p, role })),
      source, entityId, orgId,
      current: source.documentType !== 'bn2',
    })
  }

  if ((source.documentType === 'bof1' || source.documentType === 'llp_bo') && fields.full_name) {
    await mergeBeneficialOwner(supabase, { fields, source, entityId, orgId })
  }

  wizard.fieldEvidence = evidence
  await supabase.from('onboarding_progress').update({ data: { ...progressData, wizard } as Json }).eq('id', progressId)
  return { conflicts }
}

async function mergePeople(
  supabase: SupabaseServer,
  ctx: { people: NonNullable<ExtractedFields['people']>; source: FieldSource; entityId: string; orgId: string; current: boolean },
) {
  const { people, source, entityId, orgId, current } = ctx
  const [{ data: directors }, { data: shareholders }] = await Promise.all([
    supabase.from('directors').select('id, full_name, id_number, kra_pin, residential_address').eq('entity_id', entityId),
    supabase.from('shareholders').select('id, legal_name, id_or_reg_number, kra_pin, shares_held, corporate_details').eq('entity_id', entityId),
  ])
  const evidenceRef = { documentId: source.documentId, documentType: source.documentType, documentDate: source.documentDate ?? null }

  for (const p of people) {
    if (!p.full_name) continue
    const person = { name: p.full_name, idNumber: p.id_number, kraPin: p.kra_pin }

    const officerRole = p.role === 'manager' ? 'manager' : p.role === 'partner' ? 'partner' : p.role === 'proprietor' ? 'proprietor' : p.role === 'secretary' ? 'secretary' : (p.role === 'director' || p.role === 'both' || p.role === 'unknown') ? 'director' : null
    if (officerRole) {
      // Matched within the same role: a partner who is also the manager
      // keeps two relationships, not one merged row.
      const roleOf = (d: { residential_address: unknown }) => ((d.residential_address ?? {}) as { role?: string }).role ?? 'director'
      const matches = (directors ?? []).filter((d) => roleOf(d) === officerRole).map((d) => ({ d, m: matchPerson(person, { name: d.full_name, idNumber: d.id_number, kraPin: d.kra_pin }) }))
      const hit = matches.find((x) => x.m === 'same') ?? matches.find((x) => x.m === 'possible')
      if (hit) {
        const ra = (hit.d.residential_address ?? {}) as Record<string, unknown>
        const evidence = Array.isArray(ra.evidence) ? [...(ra.evidence as unknown[])] : []
        if (!evidence.some((e) => (e as { documentId?: string }).documentId === source.documentId)) evidence.push(evidenceRef)
        await supabase.from('directors').update({
          id_number: hit.d.id_number || p.id_number || '',
          kra_pin: hit.d.kra_pin ?? p.kra_pin,
          residential_address: {
            ...ra,
            evidence,
            onCurrentRecord: current || ra.onCurrentRecord,
            // Same name, no shared identifier: never silently merged — the
            // card asks the user to confirm it's the same person.
            nameMatchOnly: hit.m === 'possible' && !ra.userReviewed ? true : ra.nameMatchOnly,
          } as Json,
        }).eq('id', hit.d.id)
      } else {
        const id = crypto.randomUUID()
        const row = {
          id, entity_id: entityId, organisation_id: orgId, full_name: p.full_name, id_number: p.id_number ?? '', kra_pin: p.kra_pin,
          residential_address: { source: 'ocr', role: officerRole, evidence: [evidenceRef], onCurrentRecord: current, formationOnly: !current } as Json,
        }
        await supabase.from('directors').insert(row)
        directors?.push({ id, full_name: p.full_name, id_number: p.id_number ?? '', kra_pin: p.kra_pin, residential_address: row.residential_address })
      }
    }

    // Only a current record (Official Search / change filing) creates
    // shareholders — formation documents never make someone a current
    // shareholder (brief §17).
    if (current && (p.role === 'shareholder' || p.role === 'both')) {
      const matches = (shareholders ?? []).map((s) => ({ s, m: matchPerson(person, { name: s.legal_name, idNumber: s.id_or_reg_number, kraPin: s.kra_pin }) }))
      const hit = matches.find((x) => x.m === 'same') ?? matches.find((x) => x.m === 'possible')
      if (hit) {
        const cd = (hit.s.corporate_details ?? {}) as Record<string, unknown>
        const evidence = Array.isArray(cd.evidence) ? [...(cd.evidence as unknown[])] : []
        if (!evidence.some((e) => (e as { documentId?: string }).documentId === source.documentId)) evidence.push(evidenceRef)
        await supabase.from('shareholders').update({
          id_or_reg_number: hit.s.id_or_reg_number ?? p.id_number,
          kra_pin: hit.s.kra_pin ?? p.kra_pin,
          shares_held: p.shares_held ?? hit.s.shares_held,
          corporate_details: { ...cd, evidence, nameMatchOnly: hit.m === 'possible' && !cd.userReviewed ? true : cd.nameMatchOnly } as Json,
        }).eq('id', hit.s.id)
      } else {
        const id = crypto.randomUUID()
        await supabase.from('shareholders').insert({
          id, entity_id: entityId, organisation_id: orgId, legal_name: p.full_name, id_or_reg_number: p.id_number, kra_pin: p.kra_pin,
          shares_held: p.shares_held ?? 0,
          corporate_details: { source: 'ocr', evidence: [evidenceRef] } as Json,
        })
        shareholders?.push({ id, legal_name: p.full_name, id_or_reg_number: p.id_number, kra_pin: p.kra_pin, shares_held: p.shares_held ?? 0, corporate_details: null })
      }
    }
  }
  await recomputeShareholding(supabase, entityId)
}

async function mergeBeneficialOwner(
  supabase: SupabaseServer,
  ctx: { fields: ExtractedFields; source: FieldSource; entityId: string; orgId: string },
) {
  const { fields, source, entityId, orgId } = ctx
  const { data: bos } = await supabase.from('beneficial_owners').select('id, full_name, id_number, kra_pin, residential_address').eq('entity_id', entityId)
  const person = { name: fields.full_name, idNumber: fields.id_number, kraPin: fields.kra_pin }
  const hit = (bos ?? []).find((b) => matchPerson(person, { name: b.full_name, idNumber: b.id_number, kraPin: b.kra_pin }) !== 'different')
  const control = [
    fields.bo_percent_shares_direct != null && `${fields.bo_percent_shares_direct}% shares (direct)`,
    fields.bo_percent_shares_indirect != null && `${fields.bo_percent_shares_indirect}% shares (indirect)`,
    fields.bo_percent_voting_rights != null && `${fields.bo_percent_voting_rights}% voting rights`,
    fields.bo_has_right_to_appoint_director && 'right to appoint/remove a director',
    fields.bo_has_significant_influence && 'significant influence or control',
  ].filter(Boolean).join('; ')
  const evidenceRef = { documentId: source.documentId, documentType: source.documentType, documentDate: source.documentDate ?? null }
  if (hit) {
    const ra = (hit.residential_address ?? {}) as Record<string, unknown>
    await supabase.from('beneficial_owners').update({
      id_number: hit.id_number ?? fields.id_number,
      kra_pin: hit.kra_pin ?? fields.kra_pin,
      residential_address: { ...ra, evidence: [...((ra.evidence as unknown[]) ?? []), evidenceRef] } as Json,
    }).eq('id', hit.id)
    return
  }
  await supabase.from('beneficial_owners').insert({
    id: crypto.randomUUID(),
    entity_id: entityId,
    organisation_id: orgId,
    full_name: fields.full_name!,
    id_number: fields.id_number,
    kra_pin: fields.kra_pin,
    nationality: 'Kenyan',
    date_of_birth: fields.date_of_birth,
    occupation: fields.occupation,
    nature_of_control: control || null,
    share_percentage: fields.bo_percent_shares_direct ?? null,
    date_became_bo: null,
    residential_address: { source: 'ocr', evidence: [evidenceRef], asAtFiling: source.documentDate ?? null } as Json,
  })
}
