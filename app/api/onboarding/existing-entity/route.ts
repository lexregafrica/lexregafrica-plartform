import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database, Json } from '@/types/database.types'
import { extractFromDocument, type ExtractedFields } from '@/lib/ocr/gemini'
import { EXISTING_TOTAL_STEPS, type ExistingWizardData } from '@/lib/onboarding/existing-entity'
import type { EntityType } from '@/lib/onboarding/new-entity'

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
}

async function getContext(supabase: SupabaseServer) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, progress: null }

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('id, organisation_id, step, entity_type, data')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'existing_entity')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { user, progress: (progress as ProgressRow | null) }
}

export async function GET() {
  const supabase = await createClient()
  const { user, progress } = await getContext(supabase)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (!progress) return NextResponse.json({ error: 'no onboarding session' }, { status: 404 })

  const progressData = (progress.data ?? {}) as ProgressData
  const entityId = progressData.entityId

  let directors: unknown[] = []
  let shareholders: unknown[] = []
  let documents: unknown[] = []

  if (entityId) {
    const [d, s, docs] = await Promise.all([
      supabase.from('directors').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('documents').select('id, name, document_type, file_path, file_size, mime_type, ocr_status, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at'),
    ])
    directors = d.data ?? []
    shareholders = s.data ?? []
    documents = docs.data ?? []
  }

  return NextResponse.json({
    step: progress.step,
    entityId: entityId ?? null,
    orgId: progress.organisation_id,
    wizard: progressData.wizard ?? {},
    activated: progressData.activated ?? false,
    directors,
    shareholders,
    documents,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { action } = body as { action: string }

  const supabase = await createClient()
  const { user, progress } = await getContext(supabase)
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
        entity_type: 'limited_company', // adjusted on the verify step
        onboarding_path: 'existing_entity',
        status: 'draft',
        onboarding_step: 1,
      })
      if (entityError) {
        console.error('entity create error', entityError)
        return NextResponse.json({ error: 'failed to create entity' }, { status: 500 })
      }

      const newData: ProgressData = { ...progressData, entityId }
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

  // ----------------------------------------------------------
  // register_document — same contract as the new-entity route
  // ----------------------------------------------------------
  if (action === 'register_document') {
    const { document } = body as {
      document: { name: string; filePath: string; fileSize?: number; mimeType?: string; documentType?: string }
    }
    if (!document?.name || !document?.filePath) {
      return NextResponse.json({ error: 'name and filePath required' }, { status: 400 })
    }
    if (!document.filePath.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: 'invalid file path' }, { status: 400 })
    }

    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        entity_id: entityId,
        organisation_id: orgId,
        name: document.name,
        document_type: document.documentType ?? 'other',
        category: 'legal',
        file_path: document.filePath,
        file_size: document.fileSize ?? null,
        mime_type: document.mimeType ?? null,
        ocr_status: 'pending',
        uploaded_by: user.id,
        metadata: { uploaded_from: 'onboarding' } as Json,
      })
      .select('id')
      .single()

    if (error) {
      console.error('document register error', error)
      return NextResponse.json({ error: 'failed to register document' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: doc?.id })
  }

  if (action === 'delete_document') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete document' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // ocr_extract — run extraction and pre-fill company fields,
  // directors, and shareholders (CR12 lists both)
  // ----------------------------------------------------------
  if (action === 'ocr_extract') {
    const { documentId } = body as { documentId: string }
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

    const { data: doc } = await supabase
      .from('documents')
      .select('id, file_path, mime_type')
      .eq('id', documentId)
      .eq('entity_id', entityId)
      .maybeSingle()

    if (!doc?.file_path) return NextResponse.json({ error: 'document not found' }, { status: 404 })

    await supabase.from('documents').update({ ocr_status: 'processing' }).eq('id', doc.id)

    const { data: blob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path)

    if (downloadError || !blob) {
      await supabase.from('documents').update({ ocr_status: 'failed' }).eq('id', doc.id)
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: 'download_failed' })
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const result = await extractFromDocument(bytes, doc.mime_type ?? 'application/pdf')

    if (!result.ok) {
      await supabase
        .from('documents')
        .update({ ocr_status: 'failed', ocr_data: { reason: result.reason } as Json })
        .eq('id', doc.id)
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: result.reason })
    }

    const fields = result.fields
    await supabase
      .from('documents')
      .update({ ocr_status: 'complete', ocr_data: fields as unknown as Json })
      .eq('id', doc.id)

    await mergeCompanyExtraction(supabase, { fields, entityId, orgId, progressId: progress.id, progressData })

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.existing_entity.ocr_extracted',
      p_resource_type: 'document',
      p_resource_id: doc.id,
      p_metadata: { document_kind: fields.document_kind, confidence: fields.confidence },
    })

    return NextResponse.json({ ok: true, ocrStatus: 'complete', fields })
  }

  // ----------------------------------------------------------
  // save_step — persist verify-step fields + advance
  // ----------------------------------------------------------
  if (action === 'save_step') {
    const { step, wizard, advanceTo } = body as { step: number; wizard: ExistingWizardData; advanceTo?: number }
    if (!step || step < 1 || step > EXISTING_TOTAL_STEPS) {
      return NextResponse.json({ error: 'invalid step' }, { status: 400 })
    }

    const mergedWizard = { ...progressData.wizard, ...wizard }
    const newData: ProgressData = { ...progressData, wizard: mergedWizard }
    const nextStep = Math.min(advanceTo ?? step, EXISTING_TOTAL_STEPS)

    const entityUpdate: Database['public']['Tables']['entities']['Update'] = {
      onboarding_step: nextStep,
      onboarding_data: newData as Json,
    }
    if (mergedWizard.entityType) entityUpdate.entity_type = mergedWizard.entityType
    if (mergedWizard.legalName !== undefined) entityUpdate.legal_name = mergedWizard.legalName
    if (mergedWizard.registrationNumber !== undefined) entityUpdate.registration_number = mergedWizard.registrationNumber
    if (mergedWizard.kraPin !== undefined) entityUpdate.kra_pin = mergedWizard.kraPin
    if (mergedWizard.dateIncorporated) entityUpdate.date_incorporated = mergedWizard.dateIncorporated
    if (mergedWizard.addressLine1 !== undefined) {
      entityUpdate.registered_address = {
        line1: mergedWizard.addressLine1,
        city: mergedWizard.city,
        county: mergedWizard.county,
        postcode: mergedWizard.postalCode,
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

    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // upsert/delete director + shareholder (verify-people step)
  // ----------------------------------------------------------
  if (action === 'upsert_director') {
    const { director } = body as {
      director: { id?: string; fullName: string; idNumber?: string; kraPin?: string }
    }
    if (!director?.fullName) return NextResponse.json({ error: 'fullName required' }, { status: 400 })

    const row: Database['public']['Tables']['directors']['Insert'] = {
      id: director.id ?? crypto.randomUUID(),
      entity_id: entityId,
      organisation_id: orgId,
      full_name: director.fullName,
      id_number: director.idNumber ?? '',
      kra_pin: director.kraPin ?? null,
    }
    const { error } = await supabase.from('directors').upsert(row)
    if (error) return NextResponse.json({ error: 'failed to save director' }, { status: 500 })
    return NextResponse.json({ ok: true, id: row.id })
  }

  if (action === 'delete_director') {
    const { id } = body as { id: string }
    const { error } = await supabase.from('directors').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete director' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'upsert_shareholder') {
    const { shareholder } = body as {
      shareholder: { id?: string; legalName: string; idNumber?: string; kraPin?: string; sharesHeld?: number }
    }
    if (!shareholder?.legalName) return NextResponse.json({ error: 'legalName required' }, { status: 400 })

    const row: Database['public']['Tables']['shareholders']['Insert'] = {
      id: shareholder.id ?? crypto.randomUUID(),
      entity_id: entityId,
      organisation_id: orgId,
      legal_name: shareholder.legalName,
      id_or_reg_number: shareholder.idNumber ?? null,
      kra_pin: shareholder.kraPin ?? null,
      shares_held: shareholder.sharesHeld ?? 0,
    }
    const { error } = await supabase.from('shareholders').upsert(row)
    if (error) return NextResponse.json({ error: 'failed to save shareholder' }, { status: 500 })
    return NextResponse.json({ ok: true, id: row.id })
  }

  if (action === 'delete_shareholder') {
    const { id } = body as { id: string }
    const { error } = await supabase.from('shareholders').delete().eq('id', id).eq('entity_id', entityId)
    if (error) return NextResponse.json({ error: 'failed to delete shareholder' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // activate — verified details confirmed, entity goes live
  // ----------------------------------------------------------
  if (action === 'activate') {
    const wizard = progressData.wizard ?? {}
    if (!wizard.legalName?.trim()) return NextResponse.json({ error: 'legal name required' }, { status: 400 })
    if (!wizard.registrationNumber?.trim()) return NextResponse.json({ error: 'registration number required' }, { status: 400 })

    const newData: ProgressData = { ...progressData, activated: true }

    const [{ error: entityError }, { error: progressError }] = await Promise.all([
      supabase
        .from('entities')
        .update({
          status: 'active',
          onboarding_step: EXISTING_TOTAL_STEPS,
          onboarding_data: newData as Json,
        })
        .eq('id', entityId),
      supabase
        .from('onboarding_progress')
        .update({ step: EXISTING_TOTAL_STEPS, data: newData as Json })
        .eq('id', progress.id),
    ])

    if (entityError || progressError) {
      console.error('activate error', entityError, progressError)
      return NextResponse.json({ error: 'failed to activate' }, { status: 500 })
    }

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.existing_entity.activated',
      p_resource_type: 'entity',
      p_resource_id: entityId,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ------------------------------------------------------------------
// Merge company-document extraction. Gap-fill only.
// ------------------------------------------------------------------
async function mergeCompanyExtraction(
  supabase: SupabaseServer,
  ctx: {
    fields: ExtractedFields
    entityId: string
    orgId: string
    progressId: string
    progressData: ProgressData
  }
) {
  const { fields, entityId, orgId, progressId, progressData } = ctx
  const wizard = { ...(progressData.wizard ?? {}) }
  let changed = false

  if (!wizard.legalName && fields.business_name) { wizard.legalName = fields.business_name; changed = true }
  if (!wizard.registrationNumber && fields.registration_number) { wizard.registrationNumber = fields.registration_number; changed = true }
  if (!wizard.kraPin && fields.kra_pin) { wizard.kraPin = fields.kra_pin; changed = true }
  if (!wizard.dateIncorporated && fields.date_of_incorporation) { wizard.dateIncorporated = fields.date_of_incorporation; changed = true }
  if (!wizard.addressLine1 && fields.address_line1) { wizard.addressLine1 = fields.address_line1; changed = true }
  if (!wizard.city && fields.city) { wizard.city = fields.city; changed = true }
  if (!wizard.county && fields.county) { wizard.county = fields.county; changed = true }
  if (!wizard.postalCode && fields.postal_code) { wizard.postalCode = fields.postal_code; changed = true }

  // Track the weakest extraction so the verify step can flag low confidence (<60)
  if (wizard.minConfidence === undefined || fields.confidence < wizard.minConfidence) {
    wizard.minConfidence = fields.confidence
    changed = true
  }

  // CR12 people list → directors + shareholders
  if (fields.people && fields.people.length > 0) {
    const [{ data: existingDirectors }, { data: existingShareholders }] = await Promise.all([
      supabase.from('directors').select('id, full_name, id_number').eq('entity_id', entityId),
      supabase.from('shareholders').select('id, legal_name, id_or_reg_number').eq('entity_id', entityId),
    ])

    for (const person of fields.people) {
      if (!person.full_name) continue
      const nameLower = person.full_name.toLowerCase()

      if (person.role === 'director' || person.role === 'both' || person.role === 'unknown') {
        const exists = (existingDirectors ?? []).some(
          (d) => d.full_name.toLowerCase() === nameLower || (person.id_number && d.id_number === person.id_number)
        )
        if (!exists) {
          await supabase.from('directors').insert({
            id: crypto.randomUUID(),
            entity_id: entityId,
            organisation_id: orgId,
            full_name: person.full_name,
            id_number: person.id_number ?? '',
            kra_pin: person.kra_pin,
            residential_address: { source: 'ocr' } as Json,
          })
        }
      }

      if (person.role === 'shareholder' || person.role === 'both') {
        const exists = (existingShareholders ?? []).some(
          (s) => s.legal_name.toLowerCase() === nameLower || (person.id_number && s.id_or_reg_number === person.id_number)
        )
        if (!exists) {
          await supabase.from('shareholders').insert({
            id: crypto.randomUUID(),
            entity_id: entityId,
            organisation_id: orgId,
            legal_name: person.full_name,
            id_or_reg_number: person.id_number,
            kra_pin: person.kra_pin,
            shares_held: person.shares_held ?? 0,
            corporate_details: { source: 'ocr' } as Json,
          })
        }
      }
    }
  }

  if (changed) {
    const newData: ProgressData = { ...progressData, wizard }
    await supabase.from('onboarding_progress').update({ data: newData as Json }).eq('id', progressId)
  }
}
