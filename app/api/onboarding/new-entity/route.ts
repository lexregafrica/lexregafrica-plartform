import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database, Json } from '@/types/database.types'
import { extractFromDocument, type ExtractedFields } from '@/lib/ocr/gemini'
import { generateIdp } from '@/lib/documents/idp'
import {
  ENTITY_TYPES,
  isStepVisible,
  TOTAL_STEPS,
  type EntityType,
  type WizardData,
} from '@/lib/onboarding/new-entity'

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
  wizard?: WizardData
  submitted?: boolean
}

async function getContext(supabase: SupabaseServer) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, progress: null }

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('id, organisation_id, step, entity_type, data')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'new_entity')
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
  let entityStatus: string | null = null
  let idpUrl: string | null = null

  if (entityId) {
    const [d, s, docs, entityRow, formRow] = await Promise.all([
      supabase.from('directors').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('documents').select('id, name, document_type, file_path, file_size, mime_type, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at'),
      supabase.from('entities').select('status').eq('id', entityId).maybeSingle(),
      supabase.from('company_forms').select('file_url').eq('entity_id', entityId).eq('form_type', 'information_document_package').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    directors = d.data ?? []
    shareholders = s.data ?? []
    documents = docs.data ?? []
    entityStatus = entityRow.data?.status ?? null

    if (formRow.data?.file_url) {
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(formRow.data.file_url, 3600)
      idpUrl = signed?.signedUrl ?? null
    }
  }

  return NextResponse.json({
    step: progress.step,
    entityType: progress.entity_type,
    entityId: entityId ?? null,
    orgId: progress.organisation_id,
    wizard: progressData.wizard ?? {},
    submitted: progressData.submitted ?? false,
    entityStatus,
    idpUrl,
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
  // init — create the draft entity row once the type is chosen
  // ----------------------------------------------------------
  if (action === 'init') {
    const { entityType, wizard } = body as { entityType: EntityType; wizard: WizardData }
    if (!entityType) return NextResponse.json({ error: 'entityType required' }, { status: 400 })

    let entityId = progressData.entityId

    if (!entityId) {
      entityId = crypto.randomUUID()
      const { error: entityError } = await supabase.from('entities').insert({
        id: entityId,
        organisation_id: orgId,
        entity_type: entityType,
        onboarding_path: 'new_entity',
        status: 'draft',
        registration_status: 'draft',
        onboarding_step: 1,
        nature_of_business: wizard?.primaryActivity ?? null,
        onboarding_data: { wizard: (wizard ?? {}) as Json } as Json,
      })
      if (entityError) {
        console.error('entity create error', entityError)
        return NextResponse.json({ error: 'failed to create entity' }, { status: 500 })
      }
    } else {
      // Entity type changed on step 1 of an existing draft
      const { error: updateError } = await supabase
        .from('entities')
        .update({ entity_type: entityType })
        .eq('id', entityId)
      if (updateError) {
        console.error('entity type update error', updateError)
        return NextResponse.json({ error: 'failed to update entity' }, { status: 500 })
      }
    }

    const newData: ProgressData = { ...progressData, entityId, wizard: { ...progressData.wizard, ...wizard } }
    const { error: progressError } = await supabase
      .from('onboarding_progress')
      .update({ entity_type: entityType, step: 2, data: newData as Json })
      .eq('id', progress.id)

    if (progressError) {
      console.error('progress update error', progressError)
      return NextResponse.json({ error: 'failed to save progress' }, { status: 500 })
    }

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.initialised',
      p_resource_type: 'entity',
      p_resource_id: entityId,
      p_metadata: { entity_type: entityType },
    })

    return NextResponse.json({ ok: true, entityId })
  }

  // Everything below requires an initialised entity
  const entityId = progressData.entityId
  if (!entityId) return NextResponse.json({ error: 'entity not initialised — complete step 1 first' }, { status: 400 })

  // ----------------------------------------------------------
  // save_step — persist wizard data for a step + advance
  // ----------------------------------------------------------
  if (action === 'save_step') {
    const { step, wizard, advanceTo } = body as { step: number; wizard: WizardData; advanceTo?: number }
    if (!step || step < 1 || step > TOTAL_STEPS) {
      return NextResponse.json({ error: 'invalid step' }, { status: 400 })
    }

    const mergedWizard = { ...progressData.wizard, ...wizard }
    const newData: ProgressData = { ...progressData, wizard: mergedWizard }
    const nextStep = advanceTo ?? step

    // Mirror key fields onto the entity row as they're collected
    const entityUpdate: Database['public']['Tables']['entities']['Update'] = {
      onboarding_step: nextStep,
      onboarding_data: newData as Json,
    }
    if (wizard.proposedNames) entityUpdate.proposed_names = wizard.proposedNames as Json
    if (wizard.primaryActivity !== undefined) entityUpdate.nature_of_business = wizard.primaryActivity
    if (wizard.addressLine1) {
      entityUpdate.registered_address = {
        line1: mergedWizard.addressLine1,
        line2: mergedWizard.addressLine2 ?? null,
        city: mergedWizard.city,
        county: mergedWizard.county,
        postcode: mergedWizard.postalCode,
        country: mergedWizard.country ?? 'Kenya',
      } as Json
    }
    if (wizard.nominalValuePerShare !== undefined || wizard.authorisedShareCapital !== undefined) {
      entityUpdate.nominal_capital = mergedWizard.authorisedShareCapital ?? null
      entityUpdate.share_class = mergedWizard.shareClasses === 'ordinary_preference' ? 'ordinary+preference' : 'ordinary'
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
  // upsert_director / delete_director
  // ----------------------------------------------------------
  if (action === 'upsert_director') {
    const { director } = body as {
      director: {
        id?: string
        fullName: string
        idNumber: string
        kraPin?: string
        dateOfBirth?: string
        nationality?: string
        phone?: string
        email?: string
        sameAddress?: boolean
        address?: string
        role?: string
        appointmentDate?: string
      }
    }
    if (!director?.fullName || !director?.idNumber) {
      return NextResponse.json({ error: 'fullName and idNumber required' }, { status: 400 })
    }

    const row: Database['public']['Tables']['directors']['Insert'] = {
      id: director.id ?? crypto.randomUUID(),
      entity_id: entityId,
      organisation_id: orgId,
      full_name: director.fullName,
      id_number: director.idNumber,
      kra_pin: director.kraPin ?? null,
      phone: director.phone ?? null,
      email: director.email ?? null,
      nationality: director.nationality ?? 'Kenyan',
      appointment_date: director.appointmentDate ?? null,
      residential_address: {
        sameAsRegisteredOffice: director.sameAddress ?? true,
        line1: director.address ?? null,
        dateOfBirth: director.dateOfBirth ?? null,
        role: director.role ?? 'director',
      } as Json,
    }

    const { error } = await supabase.from('directors').upsert(row)
    if (error) {
      console.error('director upsert error', error)
      return NextResponse.json({ error: 'failed to save director' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: row.id })
  }

  if (action === 'delete_director') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabase.from('directors').delete().eq('id', id).eq('entity_id', entityId)
    if (error) {
      console.error('director delete error', error)
      return NextResponse.json({ error: 'failed to delete director' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // upsert_shareholder / delete_shareholder
  // ----------------------------------------------------------
  if (action === 'upsert_shareholder') {
    const { shareholder } = body as {
      shareholder: {
        id?: string
        legalName: string
        idNumber?: string
        kraPin?: string
        sharesHeld: number
        isNominee?: boolean
      }
    }
    if (!shareholder?.legalName || !shareholder?.sharesHeld) {
      return NextResponse.json({ error: 'legalName and sharesHeld required' }, { status: 400 })
    }

    const row: Database['public']['Tables']['shareholders']['Insert'] = {
      id: shareholder.id ?? crypto.randomUUID(),
      entity_id: entityId,
      organisation_id: orgId,
      legal_name: shareholder.legalName,
      id_or_reg_number: shareholder.idNumber ?? null,
      kra_pin: shareholder.kraPin ?? null,
      shares_held: shareholder.sharesHeld,
      corporate_details: shareholder.isNominee ? ({ nominee: true } as Json) : null,
    }

    const { error } = await supabase.from('shareholders').upsert(row)
    if (error) {
      console.error('shareholder upsert error', error)
      return NextResponse.json({ error: 'failed to save shareholder' }, { status: 500 })
    }

    // Recompute ownership percentages across all shareholders
    const { data: all } = await supabase.from('shareholders').select('id, shares_held').eq('entity_id', entityId)
    if (all && all.length > 0) {
      const total = all.reduce((sum, s) => sum + (s.shares_held ?? 0), 0)
      if (total > 0) {
        await Promise.all(
          all.map((s) =>
            supabase
              .from('shareholders')
              .update({ share_percentage: Math.round(((s.shares_held ?? 0) / total) * 10000) / 100 })
              .eq('id', s.id)
          )
        )
      }
      await supabase.from('entities').update({ total_shares: total }).eq('id', entityId)
    }

    return NextResponse.json({ ok: true, id: row.id })
  }

  if (action === 'delete_shareholder') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabase.from('shareholders').delete().eq('id', id).eq('entity_id', entityId)
    if (error) {
      console.error('shareholder delete error', error)
      return NextResponse.json({ error: 'failed to delete shareholder' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // register_document — record an uploaded file (upload itself goes
  // straight to Supabase Storage from the client)
  // ----------------------------------------------------------
  if (action === 'register_document') {
    const { document } = body as {
      document: { name: string; filePath: string; fileSize?: number; mimeType?: string; documentType?: string }
    }
    if (!document?.name || !document?.filePath) {
      return NextResponse.json({ error: 'name and filePath required' }, { status: 400 })
    }
    // Only allow registering files inside this org's own storage folder
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
        ocr_status: 'pending', // OCR pipeline lands in a later phase — status stays pending
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
    // Soft delete per Kenya DPA retention rules
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', entityId)
    if (error) {
      console.error('document delete error', error)
      return NextResponse.json({ error: 'failed to delete document' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // ocr_extract — run the extraction pipeline on an uploaded document
  // and pre-fill wizard fields / directors / shareholders from it
  // ----------------------------------------------------------
  if (action === 'ocr_extract') {
    const { documentId, section } = body as {
      documentId: string
      section: 'director' | 'shareholder' | 'address' | 'other'
    }
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
      // quota_exhausted surfaces distinctly so the UI can say "try again later"
      // vs. a generic "enter manually" for unreadable documents
      return NextResponse.json({ ok: false, ocrStatus: 'failed', reason: result.reason })
    }

    const fields = result.fields
    await supabase
      .from('documents')
      .update({ ocr_status: 'complete', ocr_data: fields as unknown as Json })
      .eq('id', doc.id)

    // ---- merge extraction into the application -----------------
    const merged = await mergeExtraction(supabase, {
      fields,
      section,
      entityId,
      orgId,
      progressId: progress.id,
      progressData,
    })

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.ocr_extracted',
      p_resource_type: 'document',
      p_resource_id: doc.id,
      p_metadata: { document_kind: fields.document_kind, confidence: fields.confidence, section },
    })

    return NextResponse.json({ ok: true, ocrStatus: 'complete', fields, ...merged })
  }

  // ----------------------------------------------------------
  // submit — finalise the application
  // ----------------------------------------------------------
  if (action === 'submit') {
    const wizard = progressData.wizard ?? {}
    if (!wizard.declared || !wizard.consented || !wizard.agreedTerms) {
      return NextResponse.json({ error: 'declaration incomplete' }, { status: 400 })
    }

    const entityType = progress.entity_type

    // Server-side minimum-director validation (PLC needs 2, partnership needs 2)
    if (isStepVisible(6, entityType, wizard)) {
      const { count } = await supabase
        .from('directors')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      const minimum = entityType === 'public_limited_company' || entityType === 'partnership' ? 2 : 1
      if ((count ?? 0) < minimum) {
        return NextResponse.json({ error: `at least ${minimum} director(s)/partner(s) required` }, { status: 400 })
      }
    }

    if (isStepVisible(7, entityType, wizard)) {
      const { count } = await supabase
        .from('shareholders')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'at least one shareholder/member required' }, { status: 400 })
      }
    }

    const newData: ProgressData = { ...progressData, submitted: true }

    const [{ error: entityError }, { error: progressError }] = await Promise.all([
      supabase
        .from('entities')
        .update({
          status: 'pending_registration',
          registration_status: 'awaiting_signature',
          onboarding_step: TOTAL_STEPS,
          onboarding_data: newData as Json,
          applicant_name: wizard.signature ?? null,
          applicant_email: user.email ?? null,
          applicant_relationship: wizard.applicantRelationship ?? 'promoter',
        })
        .eq('id', entityId),
      supabase
        .from('onboarding_progress')
        .update({ step: TOTAL_STEPS, data: newData as Json })
        .eq('id', progress.id),
    ])

    if (entityError || progressError) {
      console.error('submit error', entityError, progressError)
      return NextResponse.json({ error: 'failed to submit' }, { status: 500 })
    }

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.submitted',
      p_resource_type: 'entity',
      p_resource_id: entityId,
      p_metadata: { entity_type: entityType },
    })

    // Fire-and-forget IDP generation in background — client polls GET for idpUrl
    generateAndStoreIdp(supabase, { entityId, orgId, entityType, wizard }).catch((e) =>
      console.error('background idp generation failed', e)
    )

    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // upload_certificate — BRS issued the certificate; activate the entity
  // ----------------------------------------------------------
  if (action === 'upload_certificate') {
    const { filePath, fileName, fileSize, mimeType, registrationNumber } = body as {
      filePath: string; fileName: string; fileSize?: number; mimeType?: string; registrationNumber?: string
    }
    if (!filePath || !fileName) return NextResponse.json({ error: 'filePath and fileName required' }, { status: 400 })
    if (!filePath.startsWith(`${orgId}/`)) return NextResponse.json({ error: 'invalid file path' }, { status: 400 })

    const { error: docError } = await supabase.from('documents').insert({
      entity_id: entityId,
      organisation_id: orgId,
      name: fileName,
      document_type: 'certificate_of_incorporation',
      category: 'legal',
      file_path: filePath,
      file_size: fileSize ?? null,
      mime_type: mimeType ?? null,
      uploaded_by: user.id,
      metadata: { uploaded_from: 'post_submission_activation' } as Json,
    })
    if (docError) {
      console.error('certificate upload error', docError)
      return NextResponse.json({ error: 'failed to save certificate' }, { status: 500 })
    }

    const entityUpdate: Database['public']['Tables']['entities']['Update'] = {
      status: 'active',
      registration_status: 'certificate_issued',
      date_incorporated: new Date().toISOString().slice(0, 10),
    }
    if (registrationNumber?.trim()) entityUpdate.registration_number = registrationNumber.trim()

    const { error: entityError } = await supabase.from('entities').update(entityUpdate).eq('id', entityId)
    if (entityError) {
      console.error('entity activation error', entityError)
      return NextResponse.json({ error: 'failed to activate entity' }, { status: 500 })
    }

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.certificate_uploaded',
      p_resource_type: 'entity',
      p_resource_id: entityId,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ------------------------------------------------------------------
// Build the IDP PDF from everything collected, store it, and record it
// as a company_forms row. Best-effort — a failure here doesn't block
// the submission itself (the entity is already pending_registration).
// ------------------------------------------------------------------
async function generateAndStoreIdp(
  supabase: SupabaseServer,
  ctx: { entityId: string; orgId: string; entityType: EntityType; wizard: WizardData }
): Promise<string | null> {
  try {
    const [{ data: entity }, { data: directors }, { data: shareholders }, { data: org }] = await Promise.all([
      supabase.from('entities').select('*').eq('id', ctx.entityId).single(),
      supabase.from('directors').select('full_name, id_number, kra_pin').eq('entity_id', ctx.entityId),
      supabase.from('shareholders').select('legal_name, shares_held, share_percentage').eq('entity_id', ctx.entityId),
      supabase.from('organisations').select('name').eq('id', ctx.orgId).single(),
    ])
    if (!entity) return null

    const address = entity.registered_address as { line1?: string; city?: string; county?: string; postcode?: string } | null

    const pdfBytes = await generateIdp({
      entityTypeLabel: ENTITY_TYPES.find((t) => t.value === ctx.entityType)?.label ?? ctx.entityType,
      legalNameOptions: (entity.proposed_names as string[] | null) ?? [],
      natureOfBusiness: entity.nature_of_business,
      registeredAddress: address ? { line1: address.line1 ?? null, city: address.city ?? null, county: address.county ?? null, postcode: address.postcode ?? null } : null,
      nominalCapital: entity.nominal_capital,
      totalShares: entity.total_shares,
      directors: (directors ?? []).map((d) => ({ fullName: d.full_name, idNumber: d.id_number, kraPin: d.kra_pin })),
      shareholders: (shareholders ?? []).map((s) => ({ legalName: s.legal_name, sharesHeld: s.shares_held, sharePercentage: s.share_percentage })),
      applicantName: entity.applicant_name,
      applicantEmail: entity.applicant_email,
      applicantRelationship: entity.applicant_relationship,
      organisationName: org?.name ?? 'Your organisation',
      generatedAt: new Date(),
    })

    const path = `${ctx.orgId}/${ctx.entityId}/idp-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(path, pdfBytes, { contentType: 'application/pdf' })
    if (uploadError) {
      console.error('idp upload error', uploadError)
      return null
    }

    await supabase.from('company_forms').insert({
      entity_id: ctx.entityId,
      organisation_id: ctx.orgId,
      form_type: 'information_document_package',
      status: 'generated',
      file_url: path,
      generated_at: new Date().toISOString(),
    })

    return path
  } catch (e) {
    console.error('idp generation failed', e)
    return null
  }
}

// ------------------------------------------------------------------
// Merge OCR-extracted fields into wizard data + directors/shareholders.
// Only fills gaps — never overwrites something the user already entered
// or a previous extraction already filled.
// ------------------------------------------------------------------
async function mergeExtraction(
  supabase: SupabaseServer,
  ctx: {
    fields: ExtractedFields
    section: 'director' | 'shareholder' | 'address' | 'other'
    entityId: string
    orgId: string
    progressId: string
    progressData: ProgressData
  }
) {
  const { fields, section, entityId, orgId, progressId, progressData } = ctx
  const created: { directors: number; shareholders: number } = { directors: 0, shareholders: 0 }

  // Person documents → directors / shareholders
  if (section === 'director' || section === 'shareholder') {
    const table = section === 'director' ? 'directors' : 'shareholders'

    if (fields.id_number || fields.full_name) {
      if (section === 'director') {
        const { data: existing } = await supabase
          .from('directors')
          .select('id, full_name, id_number, kra_pin')
          .eq('entity_id', entityId)

        const match = (existing ?? []).find(
          (d) =>
            (fields.id_number && d.id_number === fields.id_number) ||
            (fields.full_name && d.full_name.toLowerCase() === fields.full_name.toLowerCase())
        )

        if (match) {
          const update: Database['public']['Tables']['directors']['Update'] = {}
          if (!match.kra_pin && fields.kra_pin) update.kra_pin = fields.kra_pin
          if (Object.keys(update).length > 0) {
            await supabase.from('directors').update(update).eq('id', match.id)
          }
        } else if (fields.full_name && fields.id_number) {
          await supabase.from('directors').insert({
            id: crypto.randomUUID(),
            entity_id: entityId,
            organisation_id: orgId,
            full_name: fields.full_name,
            id_number: fields.id_number,
            kra_pin: fields.kra_pin,
            residential_address: { dateOfBirth: fields.date_of_birth, source: 'ocr' } as Json,
          })
          created.directors += 1
        }
      } else {
        const { data: existing } = await supabase
          .from('shareholders')
          .select('id, legal_name, id_or_reg_number, kra_pin')
          .eq('entity_id', entityId)

        const match = (existing ?? []).find(
          (s) =>
            (fields.id_number && s.id_or_reg_number === fields.id_number) ||
            (fields.full_name && s.legal_name.toLowerCase() === fields.full_name.toLowerCase())
        )

        if (match) {
          const update: Database['public']['Tables']['shareholders']['Update'] = {}
          if (!match.kra_pin && fields.kra_pin) update.kra_pin = fields.kra_pin
          if (Object.keys(update).length > 0) {
            await supabase.from('shareholders').update(update).eq('id', match.id)
          }
        } else if (fields.full_name) {
          await supabase.from('shareholders').insert({
            id: crypto.randomUUID(),
            entity_id: entityId,
            organisation_id: orgId,
            legal_name: fields.full_name,
            id_or_reg_number: fields.id_number,
            kra_pin: fields.kra_pin,
            shares_held: 0, // user sets shares in the shareholders step
            corporate_details: { source: 'ocr' } as Json,
          })
          created.shareholders += 1
        }
      }
    }
    void table
  }

  // Address documents → wizard address fields (gap-fill only)
  const wizard = { ...(progressData.wizard ?? {}) }
  let wizardChanged = false
  if (section === 'address' || fields.document_kind === 'proof_of_address') {
    if (!wizard.addressLine1 && fields.address_line1) { wizard.addressLine1 = fields.address_line1; wizardChanged = true }
    if (!wizard.city && fields.city) { wizard.city = fields.city; wizardChanged = true }
    if (!wizard.county && fields.county) { wizard.county = fields.county; wizardChanged = true }
    if (!wizard.postalCode && fields.postal_code) { wizard.postalCode = fields.postal_code; wizardChanged = true }
  }
  // Business registration docs → first proposed-name slot if still empty
  if (fields.document_kind === 'business_registration' && fields.business_name) {
    const names = wizard.proposedNames ?? []
    if (!names.some((n) => n.trim())) {
      wizard.proposedNames = [fields.business_name, '', '', '', '', '']
      wizardChanged = true
    }
  }

  if (wizardChanged) {
    const newData: ProgressData = { ...progressData, wizard }
    await supabase.from('onboarding_progress').update({ data: newData as Json }).eq('id', progressId)
  }

  return { created, wizardChanged }
}
