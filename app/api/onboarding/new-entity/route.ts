import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database, Json } from '@/types/database.types'
import { extractFromDocument, type ExtractedFields } from '@/lib/ocr/gemini'
import { generateIdp } from '@/lib/documents/idp'
import {
  ENTITY_TYPES,
  APPLICANT_RELATIONSHIPS,
  SHAREHOLDER_TYPES,
  isStepVisible,
  TOTAL_STEPS,
  type EntityType,
  type WizardData,
} from '@/lib/onboarding/new-entity'

// OCR extraction retries up to twice on 503/429 with growing backoff
// (lib/ocr/gemini.ts) — default serverless timeout would kill that mid-retry.
export const maxDuration = 30

const SERVICE_PATH_LABELS = {
  self_service: 'Self-service (files on BRS eCitizen themselves)',
  assisted: 'Assisted (LexReg Africa handles filing)',
  lawyer_assisted: 'Lawyer-assisted (LexReg lawyer reviews and files)',
} as const

const TRUST_PROPERTY_CATEGORY_LABELS: Record<string, string> = {
  cash: 'Cash', land: 'Land', shares: 'Shares', investments: 'Investments',
  business_interests: 'Business interests', intellectual_property: 'Intellectual property',
  movable_property: 'Movable property', other: 'Other',
}

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

// A user can have several new-entity drafts/submissions in flight at
// once (dashboard shows "Continue setup" / "Upload certificate" per
// entity), so there can be more than one onboarding_progress row for
// this path. When entityId is known — passed by the client once it's
// resuming a specific entity — filter to that entity's own row instead
// of just grabbing the most recent one, which would silently resume the
// wrong entity's session.
async function getContext(supabase: SupabaseServer, requestedEntityId?: string | null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, progress: null }

  let query = supabase
    .from('onboarding_progress')
    .select('id, organisation_id, step, entity_type, data')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'new_entity')

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
  let beneficialOwners: unknown[] = []
  let documents: unknown[] = []
  let entityStatus: string | null = null
  let idpUrl: string | null = null

  if (entityId) {
    const [d, s, bo, docs, entityRow, formRow] = await Promise.all([
      supabase.from('directors').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('beneficial_owners').select('*').eq('entity_id', entityId).order('created_at'),
      supabase.from('documents').select('id, name, document_type, file_path, file_size, mime_type, tags, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at'),
      supabase.from('entities').select('status').eq('id', entityId).maybeSingle(),
      supabase.from('company_forms').select('file_url').eq('entity_id', entityId).eq('form_type', 'information_document_package').order('generated_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    directors = d.data ?? []
    shareholders = s.data ?? []
    beneficialOwners = bo.data ?? []
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
    beneficialOwners,
    documents,
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
    if (wizard.entityEmail !== undefined) entityUpdate.email = wizard.entityEmail
    if (wizard.entityPhone !== undefined) entityUpdate.phone = wizard.entityPhone
    if (wizard.postalAddress !== undefined) entityUpdate.postal_address = { address: wizard.postalAddress } as Json
    if (wizard.streetName || wizard.buildingName || wizard.city) {
      entityUpdate.registered_address = {
        buildingName: mergedWizard.buildingName ?? null,
        streetName: mergedWizard.streetName ?? null,
        floorNumber: mergedWizard.floorNumber ?? null,
        doorNumber: mergedWizard.doorNumber ?? null,
        city: mergedWizard.city,
        county: mergedWizard.county,
        postcode: mergedWizard.postalCode,
        country: mergedWizard.country ?? 'Kenya',
      } as Json
    }
    if (wizard.nominalValuePerShare !== undefined || wizard.authorisedShareCapital !== undefined || wizard.totalShares !== undefined || wizard.shareClassList !== undefined) {
      entityUpdate.nominal_capital = mergedWizard.authorisedShareCapital ?? null
      entityUpdate.total_shares = mergedWizard.totalShares ?? null
      entityUpdate.share_class = mergedWizard.useMultipleShareClasses
        ? (mergedWizard.shareClassList ?? []).map((c) => c.name).filter(Boolean).join(', ') || 'multiple classes'
        : mergedWizard.shareClasses === 'ordinary_preference' ? 'ordinary+preference' : 'ordinary'
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
        isCorporate?: boolean
        corporate?: {
          registeredName: string
          regNumber: string
          countryOfIncorporation: string
          repName: string
          repEmail: string
          repPhone: string
        }
        isForeign?: boolean
        foreignAddress?: string
        physicalAddress?: string
        postalAddress?: string
        county?: string
        postalCode?: string
        postalAddressLine?: string
        occupation?: string
        // Partnership only — General Partnership Formation Workflow
        // spec, 2026-08, GP-060/061.
        interestPercentage?: string
        contributionType?: string
        contributionValue?: string
        // Society only — Society Formation Workflow spec, 2026-08, SOC-040–051.
        position?: string
        isRegistrationSignatory?: boolean
        termOfOffice?: string
        termExpiryDate?: string
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
      is_foreign: director.isForeign ?? false,
      residential_address: {
        sameAsRegisteredOffice: director.sameAddress ?? true,
        line1: director.address ?? null,
        dateOfBirth: director.dateOfBirth ?? null,
        role: director.role ?? 'director',
        foreignAddress: director.isForeign ? director.foreignAddress : undefined,
        isCorporate: director.isCorporate ?? false,
        corporate: director.isCorporate ? director.corporate : undefined,
        physicalAddress: director.physicalAddress ?? undefined,
        postalAddress: director.postalAddress ?? undefined,
        county: director.county ?? undefined,
        postalCode: director.postalCode ?? undefined,
        postalAddressLine: director.postalAddressLine ?? undefined,
        occupation: director.occupation ?? undefined,
        interestPercentage: director.interestPercentage ?? undefined,
        contributionType: director.contributionType ?? undefined,
        contributionValue: director.contributionValue ?? undefined,
        position: director.position ?? undefined,
        isRegistrationSignatory: director.isRegistrationSignatory ?? undefined,
        termOfOffice: director.termOfOffice ?? undefined,
        termExpiryDate: director.termExpiryDate ?? undefined,
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
    await retirePersonDocuments(supabase, entityId, id)
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
        isCorporate?: boolean
        corporate?: {
          registeredName: string
          regNumber: string
          countryOfIncorporation: string
          repName: string
          repEmail: string
          repPhone: string
        }
        isForeign?: boolean
        foreignAddress?: string
        physicalAddress?: string
        postalAddress?: string
        nationality?: string
        dateOfBirth?: string
        phone?: string
        email?: string
        county?: string
        postalCode?: string
        postalAddressLine?: string
        occupation?: string
        // Society only — Society Formation Workflow spec, 2026-08, section 9.
        membershipClass?: string
        isFoundingMember?: boolean
        dateAdmitted?: string
        votingStatus?: string
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
      phone: shareholder.phone ?? null,
      email: shareholder.email ?? null,
      address: {
        isForeign: shareholder.isForeign ?? false,
        foreignAddress: shareholder.isForeign ? shareholder.foreignAddress : undefined,
        physicalAddress: shareholder.physicalAddress ?? undefined,
        postalAddress: shareholder.postalAddress ?? undefined,
        nationality: shareholder.nationality ?? undefined,
        dateOfBirth: shareholder.dateOfBirth ?? undefined,
        county: shareholder.county ?? undefined,
        postalCode: shareholder.postalCode ?? undefined,
        occupation: shareholder.occupation ?? undefined,
        postalAddressLine: shareholder.postalAddressLine ?? undefined,
        membershipClass: shareholder.membershipClass ?? undefined,
        isFoundingMember: shareholder.isFoundingMember ?? undefined,
        dateAdmitted: shareholder.dateAdmitted ?? undefined,
        votingStatus: shareholder.votingStatus ?? undefined,
      } as Json,
      corporate_details: {
        nominee: shareholder.isNominee || undefined,
        isCorporate: shareholder.isCorporate ?? false,
        corporate: shareholder.isCorporate ? shareholder.corporate : undefined,
      } as Json,
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
    await retirePersonDocuments(supabase, entityId, id)
    const { error } = await supabase.from('shareholders').delete().eq('id', id).eq('entity_id', entityId)
    if (error) {
      console.error('shareholder delete error', error)
      return NextResponse.json({ error: 'failed to delete shareholder' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // upsert_beneficial_owner / delete_beneficial_owner
  // ----------------------------------------------------------
  if (action === 'upsert_beneficial_owner') {
    const { beneficialOwner } = body as {
      beneficialOwner: {
        id?: string
        fullName: string
        idNumber?: string
        kraPin?: string
        nationality?: string
        dateOfBirth?: string
        postalAddress?: string
        businessAddress?: string
        residentialAddress?: string
        phone?: string
        email?: string
        occupation?: string
        natureOfControl?: string
        dateBecameBo?: string
        sharePercentage?: number
      }
    }
    if (!beneficialOwner?.fullName) {
      return NextResponse.json({ error: 'fullName required' }, { status: 400 })
    }

    const row: Database['public']['Tables']['beneficial_owners']['Insert'] = {
      id: beneficialOwner.id ?? crypto.randomUUID(),
      entity_id: entityId,
      organisation_id: orgId,
      full_name: beneficialOwner.fullName,
      id_number: beneficialOwner.idNumber ?? null,
      kra_pin: beneficialOwner.kraPin ?? null,
      nationality: beneficialOwner.nationality ?? 'Kenyan',
      date_of_birth: beneficialOwner.dateOfBirth ?? null,
      postal_address: beneficialOwner.postalAddress ? ({ text: beneficialOwner.postalAddress } as Json) : null,
      business_address: beneficialOwner.businessAddress ? ({ text: beneficialOwner.businessAddress } as Json) : null,
      residential_address: beneficialOwner.residentialAddress ? ({ text: beneficialOwner.residentialAddress } as Json) : null,
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
    return NextResponse.json({ ok: true, id: row.id })
  }

  if (action === 'delete_beneficial_owner') {
    const { id } = body as { id: string }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await retirePersonDocuments(supabase, entityId, id)
    const { error } = await supabase.from('beneficial_owners').delete().eq('id', id).eq('entity_id', entityId)
    if (error) {
      console.error('beneficial owner delete error', error)
      return NextResponse.json({ error: 'failed to delete beneficial owner' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // register_document — record an uploaded file (upload itself goes
  // straight to Supabase Storage from the client)
  // ----------------------------------------------------------
  if (action === 'register_document') {
    const { document } = body as {
      document: {
        name: string; filePath: string; fileSize?: number; mimeType?: string; documentType?: string
        // Person the document belongs to (for the document-vault file-tree
        // grouping) and a category label — Charles call, 2026-08: tag docs
        // by who/what they're for, not just their type, since there's no
        // per-person FK on this table.
        personName?: string; personRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
        // The saved row's own id, when there is one — preferred over
        // name matching, which can race with the name itself still
        // landing in form state (Charles call, 2026-08: a photo
        // uploaded right after an ID scan got tagged with a stale/empty
        // name and was unfindable on reopen).
        personId?: string
      }
    }
    if (!document?.name || !document?.filePath) {
      return NextResponse.json({ error: 'name and filePath required' }, { status: 400 })
    }
    // Only allow registering files inside this org's own storage folder
    if (!document.filePath.startsWith(`${orgId}/`)) {
      return NextResponse.json({ error: 'invalid file path' }, { status: 400 })
    }

    const tags: Json[] = []
    if (document.personName || document.personId) {
      tags.push({ person: document.personName, personId: document.personId, role: document.personRole ?? 'other' } as Json)
    }

    // A "Replace" upload should retire the old file, not pile up next to
    // it — every re-upload for the same person + document type used to
    // insert a fresh row and leave the previous one sitting in the vault
    // forever (Charles call, 2026-08: "every time you add, it keeps
    // adding, adding, adding" — reproduced live, the vault had 4+ copies
    // of the same statement of nominal capital). Only applies when we
    // know who/what this document is for — the general multi-file vault
    // buckets (proof of address, "other supporting documents") are meant
    // to hold more than one file and stay untouched.
    if (document.documentType && (document.personId || document.personName)) {
      const { data: existing } = await supabase
        .from('documents')
        .select('id, tags')
        .eq('entity_id', entityId)
        .eq('document_type', document.documentType)
        .is('deleted_at', null)
      const stale = (existing ?? []).filter((d) => {
        const t = (d.tags as Array<{ person?: string; personId?: string }> | null)?.[0]
        if (!t) return false
        if (document.personId && t.personId) return t.personId === document.personId
        return !!document.personName && t.person?.toLowerCase() === document.personName.toLowerCase()
      })
      if (stale.length > 0) {
        await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).in('id', stale.map((d) => d.id))
      }
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
        tags: tags as unknown as Json,
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

  // ----------------------------------------------------------
  // retag_documents — fix up the person tag on documents uploaded
  // earlier in the same form session, once Save has confirmed the
  // row's real id and final name. Uploads made before a brand-new
  // person has a saved id (or after their name was edited post-upload)
  // otherwise tag with no/wrong personId and can never be matched again
  // on reopen (Charles call, 2026-08: reproduced live — uploaded
  // documents showed no link back on the edit screen).
  // ----------------------------------------------------------
  if (action === 'retag_documents') {
    const { documentIds, personId: targetPersonId, personName, personRole } = body as {
      documentIds?: string[]
      personId?: string
      personName?: string
      personRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
    }
    if (!documentIds?.length || !targetPersonId) return NextResponse.json({ ok: true })

    const { error } = await supabase
      .from('documents')
      .update({ tags: [{ person: personName, personId: targetPersonId, role: personRole ?? 'other' }] as unknown as Json })
      .eq('entity_id', entityId)
      .in('id', documentIds)

    if (error) {
      console.error('document retag error', error)
      return NextResponse.json({ error: 'failed to retag documents' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // clone_person_documents — "also a director" copies a shareholder's
  // identity fields straight into a new director row, but their ID/KRA
  // PIN documents live under shareholder-specific document_type values
  // (shareholder_id_copy, shareholder_kra_pin_copy) tagged with the
  // shareholder's own id. The director row never had any document
  // pointing at it, so its edit screen showed the fields filled in but
  // "Upload ID/passport" / "Upload KRA PIN" as empty even though the
  // files genuinely exist (reported live, 2026-08-30). Point new document
  // rows at the SAME stored file under the director-flavoured type,
  // tagged to the director's own id — no re-upload needed.
  if (action === 'clone_person_documents') {
    const { sourcePersonId, targetPersonId, targetName, targetRole, typeMap } = body as {
      sourcePersonId?: string
      targetPersonId?: string
      targetName?: string
      targetRole?: 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'entity'
      typeMap?: Record<string, string>
    }
    if (!sourcePersonId || !targetPersonId || !typeMap) return NextResponse.json({ ok: true })

    const { data: docs } = await supabase
      .from('documents')
      .select('id, name, document_type, file_path, file_size, mime_type, tags')
      .eq('entity_id', entityId)
      .is('deleted_at', null)

    const sourceDocs = (docs ?? []).filter(
      (d) =>
        d.document_type &&
        typeMap[d.document_type] &&
        (d.tags as Array<{ personId?: string }> | null)?.some((t) => t.personId === sourcePersonId)
    )
    // Idempotent — don't re-clone a type the target already has (e.g. the
    // "also a director" checkbox toggled on and off, or Save clicked twice).
    const targetHasType = new Set(
      (docs ?? [])
        .filter((d) => (d.tags as Array<{ personId?: string }> | null)?.some((t) => t.personId === targetPersonId))
        .map((d) => d.document_type)
    )

    const inserts = sourceDocs
      .filter((d) => !targetHasType.has(typeMap[d.document_type!]))
      .map((d) => ({
        id: crypto.randomUUID(),
        entity_id: entityId,
        organisation_id: orgId,
        name: d.name,
        document_type: typeMap[d.document_type!],
        file_path: d.file_path,
        file_size: d.file_size,
        mime_type: d.mime_type,
        tags: [{ person: targetName, personId: targetPersonId, role: targetRole ?? 'other' }] as unknown as Json,
      }))

    if (inserts.length > 0) {
      const { error } = await supabase.from('documents').insert(inserts)
      if (error) {
        console.error('document clone error', error)
        return NextResponse.json({ error: 'failed to clone documents' }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true })
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
    const { documentId, section, personId } = body as {
      documentId: string
      section: 'director' | 'shareholder' | 'address' | 'other'
      // The client already knows exactly who this upload is for once a
      // person row exists (e.g. a second document — KRA PIN right after
      // the ID scan). Passing it lets mergeExtraction update that exact
      // row directly instead of re-guessing via name/id_number matching,
      // which a KRA PIN certificate can easily fail (it carries no
      // national ID number to match on, and OCR name formatting can
      // differ enough from the ID scan's reading to miss a name match
      // too) — silently leaving kra_pin blank on the saved row even
      // though the document itself uploaded and tagged fine (reported
      // live, 2026-08-30).
      personId?: string
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
      personId,
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
    // Step numbers matched to isStepVisible's actual meanings — 7 is
    // Directors/Partners, 6 is Shareholders, 8 is Beneficial Ownership.
    // (Previously checked 6/5/7, which happened to be harmless only
    // because limited_company has all three visible=true regardless —
    // masked the bug rather than fixing it. Real for other entity types,
    // e.g. sole_proprietorship, where these checks would silently no-op.)
    if (isStepVisible(7, entityType, wizard)) {
      const { count } = await supabase
        .from('directors')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      const minimum = entityType === 'public_limited_company' || entityType === 'partnership' ? 2 : 1
      if ((count ?? 0) < minimum) {
        return NextResponse.json({ error: `at least ${minimum} director(s)/partner(s) required` }, { status: 400 })
      }
      // SP-001: exactly one proprietor.
      if (entityType === 'sole_proprietorship' && (count ?? 0) > 1) {
        return NextResponse.json({ error: 'a sole proprietorship can only have one proprietor' }, { status: 400 })
      }
      // SOC section 13: at least three registration signatories.
      if (entityType === 'society') {
        const { data: officers } = await supabase.from('directors').select('residential_address').eq('entity_id', entityId)
        const signatories = (officers ?? []).filter((o) => (o.residential_address as { isRegistrationSignatory?: boolean } | null)?.isRegistrationSignatory).length
        if (signatories < 3) {
          return NextResponse.json({ error: `at least 3 officers must be marked as registration signatories (currently ${signatories})` }, { status: 400 })
        }
      }
    }

    // Step 6 slot means genuinely different things per entity type — only
    // SHAREHOLDER_TYPES and family trusts actually populate the
    // shareholders table AT this step. Partnership's step 6 is Governance
    // settings (partners themselves live in directors, checked above) and
    // Society's step 6 is Membership Structure settings (the founding
    // member list is step 8, checked below) — checking shareholders.count
    // here for either would incorrectly block every partnership/society
    // submission, since neither ever puts a row in that table at step 6.
    if (SHAREHOLDER_TYPES.includes(entityType) || (entityType === 'trust' && wizard.trustKind !== 'charitable_trust')) {
      const { count } = await supabase
        .from('shareholders')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: entityType === 'trust' ? 'at least one beneficiary or class of beneficiaries required' : 'at least one shareholder/member required' }, { status: 400 })
      }
    }
    if (entityType === 'society') {
      const { count } = await supabase
        .from('shareholders')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'at least one founding member required' }, { status: 400 })
      }
    }

    // Beneficial ownership: required unless the user explicitly confirmed
    // none currently apply (LLC-Only Developer Implementation Spec).
    // Trust and Society don't use this register at all — reuse the same
    // table for settlors (trust) or skip it entirely (society, spec
    // section 40: no beneficial ownership register in the company sense).
    if (isStepVisible(8, entityType, wizard) && entityType !== 'trust' && entityType !== 'society') {
      const { count } = await supabase
        .from('beneficial_owners')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      if ((count ?? 0) < 1 && !wizard.noBeneficialOwners) {
        return NextResponse.json({ error: 'beneficial ownership details required, or confirm none currently apply' }, { status: 400 })
      }
    }
    if (entityType === 'society' && wizard.hasConstitution === undefined) {
      return NextResponse.json({ error: 'confirm whether a Constitution already exists' }, { status: 400 })
    }
    if (entityType === 'trust') {
      const { count } = await supabase
        .from('beneficial_owners')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
      if ((count ?? 0) < 1) {
        return NextResponse.json({ error: 'at least one settlor required' }, { status: 400 })
      }
      if (wizard.hasTrustDeed === undefined) {
        return NextResponse.json({ error: 'confirm whether a Trust Deed already exists' }, { status: 400 })
      }
      if (wizard.hasProtector === undefined) {
        return NextResponse.json({ error: 'confirm whether the trust will have a Protector or Enforcer' }, { status: 400 })
      }
    }

    if (entityType === 'partnership') {
      const { data: partners } = await supabase
        .from('directors')
        .select('residential_address')
        .eq('entity_id', entityId)
      const totalInterest = (partners ?? []).reduce(
        (sum, p) => sum + (parseFloat((p.residential_address as { interestPercentage?: string } | null)?.interestPercentage ?? '0') || 0), 0
      )
      if (Math.round(totalInterest * 100) / 100 !== 100) {
        return NextResponse.json({ error: `partner interests must total 100% (currently ${totalInterest}%)` }, { status: 400 })
      }
      if (wizard.hasPartnershipAgreement === undefined) {
        return NextResponse.json({ error: 'confirm whether a Partnership Agreement already exists' }, { status: 400 })
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
          // Applicant & Contact (step 2) is the source of truth for who's
          // filing — falls back to the declaration signature/account
          // email only if step 2 was somehow skipped.
          applicant_name: wizard.applicantFullName ?? wizard.signature ?? null,
          applicant_email: wizard.applicantEmail ?? user.email ?? null,
          applicant_mobile: wizard.applicantPhone ?? null,
          applicant_relationship: wizard.applicantRelationship ?? 'promoter',
          has_custom_articles: wizard.articlesType === 'custom',
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

    // generateIdp is pure pdf-lib — no network calls, sub-second — so this
    // is awaited rather than fire-and-forget. A dangling un-awaited promise
    // here would get killed when the serverless function returns, which is
    // why generation used to silently never complete.
    const idpPath = await generateAndStoreIdp(supabase, { entityId, orgId, entityType, wizard })
    let idpUrl: string | null = null
    if (idpPath) {
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(idpPath, 3600)
      idpUrl = signed?.signedUrl ?? null
    }

    return NextResponse.json({ ok: true, idpUrl })
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

    // ---- flowchart: "Certificate details match entity record?" ----
    // OCR the certificate and compare against what we know. A clear
    // mismatch flags the entity for review instead of activating it.
    // An unreadable certificate does NOT block activation — that's a
    // manual-review concern, not a user error.
    const mismatch = await checkCertificateMismatch(supabase, {
      filePath,
      mimeType: mimeType ?? 'application/pdf',
      entityId,
      typedRegistrationNumber: registrationNumber?.trim() || null,
    })

    if (mismatch) {
      const { error: flagError } = await supabase
        .from('entities')
        .update({ registration_status: 'flagged_for_review' })
        .eq('id', entityId)
      if (flagError) console.error('flag for review error', flagError)

      await supabase.rpc('log_audit', {
        p_organisation_id: orgId,
        p_action: 'onboarding.new_entity.certificate_mismatch',
        p_resource_type: 'entity',
        p_resource_id: entityId,
        p_metadata: { reason: mismatch } as Json,
      })

      return NextResponse.json({ ok: true, flagged: true, reason: mismatch })
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

    // LLC compliance calendar: activation creates the entity workspace —
    // seed the same reminders the existing-entity path gets on activation
    await seedComplianceCalendar(supabase, { entityId, orgId, dateIncorporated: entityUpdate.date_incorporated ?? null })

    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.certificate_uploaded',
      p_resource_type: 'entity',
      p_resource_id: entityId,
    })

    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // request_help — user asked for assisted service via WhatsApp;
  // record it so Charles has a trail beyond the chat thread
  // ----------------------------------------------------------
  if (action === 'request_help') {
    await supabase.rpc('log_audit', {
      p_organisation_id: orgId,
      p_action: 'onboarding.new_entity.help_requested',
      p_resource_type: 'entity',
      p_resource_id: entityId,
      p_metadata: { channel: 'whatsapp' },
    })
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // set_service_path — "Getting registered" screen on the post-submit
  // confirmation page (self-service / assisted / lawyer-assisted). Only
  // patches the wizard blob, unlike save_step — this runs after
  // submission, so it must not touch onboarding_step or re-mirror wizard
  // fields onto the entity row.
  // ----------------------------------------------------------
  if (action === 'set_service_path') {
    const { servicePathChoice } = body as { servicePathChoice?: 'self_service' | 'assisted' | 'lawyer_assisted' }
    if (!servicePathChoice) return NextResponse.json({ error: 'servicePathChoice required' }, { status: 400 })
    const newData: ProgressData = { ...progressData, wizard: { ...progressData.wizard, servicePathChoice } }
    const { error } = await supabase.from('onboarding_progress').update({ data: newData as Json }).eq('id', progress.id)
    if (error) {
      console.error('set_service_path error', error)
      return NextResponse.json({ error: 'failed to save service path' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ----------------------------------------------------------
  // regenerate_idp — retry path if generation failed at submit time
  // (e.g. transient storage error). Awaited, same as submit.
  // ----------------------------------------------------------
  if (action === 'regenerate_idp') {
    const wizard = progressData.wizard ?? {}
    const idpPath = await generateAndStoreIdp(supabase, { entityId, orgId, entityType: progress.entity_type, wizard })
    if (!idpPath) return NextResponse.json({ error: 'failed to generate document package' }, { status: 500 })
    const { data: signed } = await supabase.storage.from('documents').createSignedUrl(idpPath, 3600)
    return NextResponse.json({ ok: true, idpUrl: signed?.signedUrl ?? null })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}

// ------------------------------------------------------------------
// Seed the compliance calendar on activation. Same reminders as the
// existing-entity path, plus a beneficial-ownership register update
// reminder per the LLC-Only Developer Implementation Spec compliance
// list. Best-effort, skipped if events already exist for this entity.
// ------------------------------------------------------------------
async function seedComplianceCalendar(
  supabase: SupabaseServer,
  ctx: { entityId: string; orgId: string; dateIncorporated: string | null }
) {
  try {
    const { count } = await supabase
      .from('compliance_events')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', ctx.entityId)
    if ((count ?? 0) > 0) return

    const today = new Date()
    const year = today.getFullYear()

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

    // BO register review: 6 months after incorporation, then annually
    const boReview = new Date(year, today.getMonth() + 6, today.getDate())

    const iso = (d: Date) => d.toISOString().slice(0, 10)

    const { error } = await supabase.from('compliance_events').insert([
      {
        entity_id: ctx.entityId,
        organisation_id: ctx.orgId,
        title: 'File annual return with BRS',
        description: 'Companies must file an annual return with the Business Registration Service each year.',
        category: 'statutory',
        due_date: iso(annualReturn),
      },
      {
        entity_id: ctx.entityId,
        organisation_id: ctx.orgId,
        title: 'File income tax return with KRA',
        description: 'Corporate income tax return due by 30 June following the end of the accounting period.',
        category: 'tax',
        due_date: iso(kraReturn),
      },
      {
        entity_id: ctx.entityId,
        organisation_id: ctx.orgId,
        title: 'Renew county single business permit',
        description: 'Single business permits are renewed with your county government at the start of each year.',
        category: 'county',
        due_date: iso(permitRenewal),
      },
      {
        entity_id: ctx.entityId,
        organisation_id: ctx.orgId,
        title: 'Review beneficial ownership register',
        description: 'Confirm beneficial ownership details are current and lodge any changes with BRS.',
        category: 'statutory',
        due_date: iso(boReview),
      },
    ])
    if (error) console.error('compliance seed error', error)
  } catch (e) {
    console.error('compliance seed failed', e)
  }
}

// ------------------------------------------------------------------
// OCR the uploaded certificate and compare against the entity record.
// Returns a human-readable mismatch reason, or null when the details
// match — or when the certificate can't be read (never block on OCR).
// ------------------------------------------------------------------
function normalise(s: string): string {
  return s.toLowerCase().replace(/\b(ltd|limited|llp|plc|company|co)\b\.?/g, '').replace(/[^a-z0-9]/g, '')
}

async function checkCertificateMismatch(
  supabase: SupabaseServer,
  ctx: { filePath: string; mimeType: string; entityId: string; typedRegistrationNumber: string | null }
): Promise<string | null> {
  try {
    const { data: blob } = await supabase.storage.from('documents').download(ctx.filePath)
    if (!blob) return null

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const result = await extractFromDocument(bytes, ctx.mimeType)
    if (!result.ok || result.fields.confidence < 60) return null

    const fields = result.fields

    // Registration number: compare against what the user typed
    if (fields.registration_number && ctx.typedRegistrationNumber) {
      const a = fields.registration_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const b = ctx.typedRegistrationNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      if (a !== b) {
        return `Certificate shows registration number ${fields.registration_number}, but ${ctx.typedRegistrationNumber} was entered.`
      }
    }

    // Business name: must loosely match one of the proposed names
    if (fields.business_name) {
      const { data: entity } = await supabase
        .from('entities')
        .select('proposed_names, legal_name')
        .eq('id', ctx.entityId)
        .maybeSingle()

      const candidates = [
        ...(((entity?.proposed_names as string[] | null) ?? []).filter(Boolean)),
        entity?.legal_name ?? '',
      ].filter(Boolean)

      if (candidates.length > 0) {
        const certName = normalise(fields.business_name)
        const matches = candidates.some((c) => {
          const n = normalise(c)
          return n === certName || n.includes(certName) || certName.includes(n)
        })
        if (!matches) {
          return `Certificate is for “${fields.business_name}”, which doesn't match any of the proposed business names.`
        }
      }
    }

    return null
  } catch (e) {
    console.error('certificate match check failed', e)
    return null // never block activation on a check failure
  }
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
    const [{ data: entity }, { data: directors }, { data: shareholders }, { data: beneficialOwners }, { data: documents }, { data: org }] = await Promise.all([
      supabase.from('entities').select('*').eq('id', ctx.entityId).single(),
      supabase.from('directors').select('*').eq('entity_id', ctx.entityId),
      supabase.from('shareholders').select('*').eq('entity_id', ctx.entityId),
      supabase.from('beneficial_owners').select('*').eq('entity_id', ctx.entityId),
      supabase.from('documents').select('name, document_type').eq('entity_id', ctx.entityId).is('deleted_at', null),
      supabase.from('organisations').select('name').eq('id', ctx.orgId).single(),
    ])
    if (!entity) return null

    const w = ctx.wizard
    // registered_address is stored as {buildingName, streetName, city,
    // county, postcode, country} (see save_step) — there has never been a
    // line1 key. Deriving it here means the exceptions check below and
    // the IDP's own address line actually reflect what was entered,
    // instead of always reading undefined and (a) dropping building/
    // street from the printed address and (b) flagging "Registered
    // office address is missing" on every application regardless of
    // entity type, even when fully filled in (caught via live Trust
    // formation test, 2026-08 — pre-existing, not introduced by the
    // trust/society work).
    const rawAddress = entity.registered_address as { buildingName?: string; streetName?: string; city?: string; county?: string; postcode?: string } | null
    const address = rawAddress ? {
      line1: [rawAddress.buildingName, rawAddress.streetName].filter(Boolean).join(', ') || undefined,
      city: rawAddress.city, county: rawAddress.county, postcode: rawAddress.postcode,
    } : null
    const docTypes = new Set((documents ?? []).map((d) => d.document_type).filter(Boolean))
    const hasDoc = (t: string) => docTypes.has(t)
    const shareholderNamesLower = new Set((shareholders ?? []).map((s) => s.legal_name.toLowerCase()))
    const boNamesLower = new Set((beneficialOwners ?? []).map((b) => b.full_name.toLowerCase()))

    // ---- directors table -----------------------------------------
    const idpDirectors = (directors ?? []).map((d) => {
      const ra = d.residential_address as { isCorporate?: boolean; physicalAddress?: string; foreignAddress?: string; position?: string } | null
      return {
        fullName: d.full_name,
        role: ctx.entityType === 'partnership' ? (ra?.isCorporate ? 'Corporate partner' : 'Partner')
          : ctx.entityType === 'sole_proprietorship' ? 'Proprietor'
          : ctx.entityType === 'trust' ? (ra?.isCorporate ? 'Corporate trustee' : 'Trustee')
          : ctx.entityType === 'society' ? (ra?.position || 'Officer')
          : (ra?.isCorporate ? 'Corporate director' : 'Director'),
        nationality: d.nationality,
        idNumber: d.id_number,
        kraPin: d.kra_pin,
        email: d.email,
        phone: d.phone,
        address: ra?.physicalAddress ?? ra?.foreignAddress ?? null,
        isAlsoShareholder: shareholderNamesLower.has(d.full_name.toLowerCase()),
        isAlsoBeneficialOwner: boNamesLower.has(d.full_name.toLowerCase()),
      }
    })

    // ---- shareholders / cap table ----------------------------------
    const idpShareholders = (shareholders ?? []).map((s) => {
      const cd = s.corporate_details as { isCorporate?: boolean } | null
      return {
        legalName: s.legal_name,
        type: (cd?.isCorporate ? 'Company' : 'Individual') as 'Individual' | 'Company',
        nationalityOrJurisdiction: null,
        idOrRegNumber: s.id_or_reg_number,
        kraPinOrTaxId: s.kra_pin,
        shareClass: w.useMultipleShareClasses ? 'Multiple' : 'Ordinary',
        sharesHeld: s.shares_held,
        sharePercentage: s.share_percentage,
        isNominee: !!cd && !!(cd as { nominee?: boolean }).nominee,
      }
    })

    // ---- corporate party annex — any director or shareholder marked
    // corporate, deduplicated by registered name -------------------
    const corporateParties: NonNullable<Parameters<typeof generateIdp>[0]['corporateParties']> = []
    const seenCorporate = new Set<string>()
    for (const d of directors ?? []) {
      const ra = d.residential_address as { isCorporate?: boolean; corporate?: Record<string, string> } | null
      if (!ra?.isCorporate || !ra.corporate) continue
      const c = ra.corporate
      if (seenCorporate.has(c.registeredName)) continue
      seenCorporate.add(c.registeredName)
      corporateParties.push({
        registeredName: c.registeredName, jurisdiction: c.countryOfIncorporation ?? null,
        regNumber: c.regNumber ?? null, kraPinOrTaxId: (c.isForeign ? c.foreignTaxId : c.kraPin) ?? null,
        registeredOfficeAddress: c.registeredOfficeAddress ?? null, email: c.corporateEmail ?? null, phone: c.corporatePhone ?? null,
        role: 'Director', repName: c.repName ?? null, repTitle: c.repTitle ?? null, repEmail: c.repEmail ?? null,
        repPhone: c.repPhone ?? null, authorityBasis: c.basisOfAuthorityToAct ?? null,
      })
    }
    for (const s of shareholders ?? []) {
      const cd = s.corporate_details as { isCorporate?: boolean; corporate?: Record<string, string> } | null
      if (!cd?.isCorporate || !cd.corporate) continue
      const c = cd.corporate
      if (seenCorporate.has(c.registeredName)) {
        const existing = corporateParties.find((p) => p.registeredName === c.registeredName)
        if (existing) existing.role = 'Shareholder & Director'
        continue
      }
      seenCorporate.add(c.registeredName)
      corporateParties.push({
        registeredName: c.registeredName, jurisdiction: c.countryOfIncorporation ?? null,
        regNumber: c.regNumber ?? null, kraPinOrTaxId: (c.isForeign ? c.foreignTaxId : c.kraPin) ?? null,
        registeredOfficeAddress: c.registeredOfficeAddress ?? null, email: c.corporateEmail ?? null, phone: c.corporatePhone ?? null,
        role: 'Shareholder', repName: c.repName ?? null, repTitle: c.repTitle ?? null, repEmail: c.repEmail ?? null,
        repPhone: c.repPhone ?? null, authorityBasis: null,
      })
    }

    // ---- beneficial ownership ---------------------------------------
    const idpBeneficialOwners = (beneficialOwners ?? []).map((b) => ({
      fullName: b.full_name, nationality: b.nationality, idNumber: b.id_number, kraPin: b.kra_pin,
      address: (b.residential_address as { text?: string } | null)?.text ?? null,
      phone: b.phone, email: b.email, natureOfControl: b.nature_of_control ?? '—',
      sharePercentage: b.share_percentage, dateBecameBo: b.date_became_bo,
    }))

    // ---- forms & filing preview --------------------------------------
    // Neither Trust nor Society has a fixed BRS form code (both specs
    // flag the live filing sequence as needing verification before
    // automation) — the constitutive document itself is the checklist
    // item instead.
    const formDefs = (ctx.entityType === 'partnership' || ctx.entityType === 'sole_proprietorship')
      ? [{ type: 'signed_bn2', label: 'BN2 — Application for registration of a business name' }]
      : ctx.entityType === 'trust'
      ? [{ type: 'trust_deed', label: 'Trust Deed' }]
      : ctx.entityType === 'society'
      ? [{ type: 'constitution', label: 'Constitution' }]
      : [
          { type: 'signed_cr1', label: 'CR1 — Application for registration' },
          { type: 'signed_cr2', label: 'CR2 — Memorandum of registration' },
          { type: 'signed_cr8', label: 'CR8 — Particulars of directors' },
          { type: 'statement_of_nominal_capital', label: 'Statement of nominal capital' },
          { type: 'signed_bof1', label: 'BOF1 — Beneficial ownership filing' },
        ]
    const forms = formDefs.map((f) => ({ label: f.label, generated: hasDoc(f.type), signed: hasDoc(f.type), uploaded: hasDoc(f.type) }))

    // ---- uploaded documents checklist --------------------------------
    const documentGroups = [
      { label: 'Identity documents', types: ['director_id_copy', 'shareholder_id_copy', 'beneficial_owner_id_copy'] },
      { label: 'KRA PIN certificates', types: ['director_kra_pin_copy', 'shareholder_kra_pin_copy', 'beneficial_owner_kra_pin_copy'] },
      { label: 'Passport photos', types: ['passport_photo'] },
      { label: 'Proof of registered office', types: ['proof_of_address'] },
      { label: 'Corporate certificates & resolutions', types: ['corporate_certificate_of_incorporation', 'corporate_authority_document', 'corporate_tax_certificate', 'corporate_good_standing', 'corporate_representative_id', 'foreign_constitutional_documents'] },
      { label: 'Registration forms', types: formDefs.map((f) => f.type) },
    ].map((g) => ({
      label: g.label,
      items: g.types.map((t) => ({ name: t.replaceAll('_', ' '), provided: hasDoc(t) })),
    }))

    // ---- review exceptions ---------------------------------------------
    const exceptions: string[] = []
    // City is the actually-required address field (building/street are
    // optional on the form) — checking line1 here would flag a fully
    // valid address as "missing" whenever those two optional fields were
    // left blank.
    if (!address?.city) exceptions.push('Registered office address is missing.')
    if ((directors ?? []).length === 0) {
      exceptions.push(
        ctx.entityType === 'partnership' ? 'No partners captured.'
        : ctx.entityType === 'sole_proprietorship' ? 'No proprietor captured.'
        : 'No directors captured.'
      )
    }
    if (ctx.entityType === 'partnership') {
      const totalInterest = (directors ?? []).reduce((s, d) => s + (parseFloat((d.residential_address as { interestPercentage?: string } | null)?.interestPercentage ?? '0') || 0), 0)
      if (Math.round(totalInterest * 100) / 100 !== 100) exceptions.push(`Partner interests total ${totalInterest.toLocaleString()}%, not 100%.`)
      if (w.hasPartnershipAgreement === undefined) exceptions.push('Partnership Agreement status not yet confirmed.')
    } else if (ctx.entityType === 'sole_proprietorship') {
      if ((directors ?? []).length > 1) exceptions.push('More than one proprietor is on record — a sole proprietorship should have exactly one.')
    } else if (ctx.entityType === 'trust') {
      if ((beneficialOwners ?? []).length === 0) exceptions.push('No settlor captured.')
      if (w.trustKind !== 'charitable_trust' && (shareholders ?? []).length === 0) exceptions.push('No beneficiaries captured.')
      if (w.trustKind === 'charitable_trust' && !(w.trustCharitableObjects ?? []).some((o) => o.trim())) exceptions.push('No charitable objects listed.')
      if (w.hasTrustDeed === undefined) exceptions.push('Trust Deed status not yet confirmed.')
      if (w.hasProtector === undefined) exceptions.push('Protector/Enforcer status not yet confirmed.')
    } else if (ctx.entityType === 'society') {
      if ((directors ?? []).length === 0) exceptions.push('No officers captured.')
      const signatories = (directors ?? []).filter((d) => (d.residential_address as { isRegistrationSignatory?: boolean } | null)?.isRegistrationSignatory).length
      if (signatories < 3) exceptions.push(`Only ${signatories} registration signatory officer(s) — at least 3 required.`)
      if ((shareholders ?? []).length === 0) exceptions.push('No founding members captured.')
      if (w.socFounderCount != null && w.socFounderCount < 10) exceptions.push('Fewer than 10 founders recorded — Societies generally require at least 10.')
      if (w.hasConstitution === undefined) exceptions.push('Constitution status not yet confirmed.')
    } else {
      if ((shareholders ?? []).length === 0) exceptions.push('No shareholders captured.')
      if (!w.useMultipleShareClasses && w.totalShares) {
        const allocated = (shareholders ?? []).reduce((s, x) => s + x.shares_held, 0)
        if (allocated !== w.totalShares) exceptions.push(`Only ${allocated.toLocaleString()} of ${w.totalShares.toLocaleString()} shares allocated — must be fully issued.`)
      }
      if ((beneficialOwners ?? []).length === 0 && !w.noBeneficialOwners) exceptions.push('Beneficial ownership not yet confirmed.')
    }
    for (const f of forms) if (!f.uploaded) exceptions.push(`${f.label} not yet uploaded.`)
    if (corporateParties.length > 0 && !hasDoc('corporate_authority_document')) {
      exceptions.push('Corporate party authority document (board resolution / power of attorney) not yet uploaded.')
    }

    const pdfBytes = await generateIdp({
      organisationName: org?.name ?? 'Your organisation',
      generatedAt: new Date(),
      matterReference: ctx.entityId.slice(0, 8).toUpperCase(),
      servicePath: SERVICE_PATH_LABELS[w.servicePathChoice as keyof typeof SERVICE_PATH_LABELS] ?? 'Not yet selected',
      onboardingType:
        ctx.entityType === 'trust' ? 'New trust creation'
        : ctx.entityType === 'society' ? 'New society registration'
        : ctx.entityType === 'partnership' || ctx.entityType === 'sole_proprietorship' ? 'New business name registration'
        : 'New company registration',

      entityTypeLabel: ENTITY_TYPES.find((t) => t.value === ctx.entityType)?.label ?? ctx.entityType,
      legalNameOptions: (entity.proposed_names as string[] | null) ?? [],
      natureOfBusiness: entity.nature_of_business,
      registeredAddress: address ? { line1: address.line1 ?? null, city: address.city ?? null, county: address.county ?? null, postcode: address.postcode ?? null } : null,
      postalAddress: (entity.postal_address as { address?: string } | null)?.address ?? null,
      companyEmail: entity.email,
      companyPhone: entity.phone,

      applicantName: entity.applicant_name,
      applicantRelationship: entity.applicant_relationship ? APPLICANT_RELATIONSHIPS.find((r) => r.value === entity.applicant_relationship)?.label ?? entity.applicant_relationship : null,
      applicantEmail: entity.applicant_email,
      applicantPhone: entity.applicant_mobile,

      totalShares: entity.total_shares,
      authorisedCapital: entity.nominal_capital,
      nominalValuePerShare: w.nominalValuePerShare ?? null,
      useMultipleShareClasses: !!w.useMultipleShareClasses,
      shareClassCount: w.useMultipleShareClasses ? (w.shareClassList ?? []).length : 1,
      votingRights: w.votingRights === 'weighted' ? 'Weighted voting' : w.votingRights === 'one_share_one_vote' ? 'One share, one vote' : null,

      directors: idpDirectors,
      secretaryName: w.hasCompanySecretary ? (w.secretary?.fullName ?? null) : null,

      shareholders: idpShareholders,
      corporateParties,

      beneficialOwners: idpBeneficialOwners,
      noBeneficialOwnersDeclared: !!w.noBeneficialOwners,

      articlesType: w.articlesType ?? null,

      forms,
      documentGroups,
      exceptions,

      declared: !!w.declared,
      signature: w.signature ?? null,
      declarationDate: w.declarationDate ?? null,

      isTrust: ctx.entityType === 'trust',
      trustProperty: (w.trustPropertyItems ?? []).map((p) => ({
        description: p.description, category: TRUST_PROPERTY_CATEGORY_LABELS[p.category] ?? p.category,
        approxValue: p.approxValue ?? null, isVested: p.isVested,
      })),
      protector: w.hasProtector ? { name: w.protectorName ?? '—', powers: w.protectorPowers ?? null } : null,
      hasTrustDeed: w.hasTrustDeed ?? null,

      isSociety: ctx.entityType === 'society',
      societyGoverningBody: w.socHasGoverningBody ? { name: w.socGoverningBodyName ?? '—', quorum: w.socGoverningBodyQuorum ?? null } : null,
      societyProperty: (w.socPropertyItems ?? []).map((p) => ({ description: p.description, location: p.location })),
      hasConstitution: w.hasConstitution ?? null,

      isPartnership: ctx.entityType === 'partnership',
      isSoleProprietorship: ctx.entityType === 'sole_proprietorship',
      hasPartnershipAgreement: w.hasPartnershipAgreement ?? null,

      certificateNextStepNote:
        ctx.entityType === 'trust'
          ? 'Once the Trust Deed is executed, the trust is created. If you’re incorporating the trustees, upload the Certificate of Incorporation of Trustees once the Registrar issues it, to activate your entity.'
          : ctx.entityType === 'society'
          ? 'Once the Registrar of Societies issues your Certificate of Registration, upload it back on your dashboard to activate your entity.'
          : ctx.entityType === 'partnership' || ctx.entityType === 'sole_proprietorship'
          ? 'Once BRS issues your Certificate of Registration (business name), upload it back on your dashboard to activate your entity.'
          : 'Once BRS issues your certificate of incorporation, upload it back on your dashboard — along with the company KRA PIN certificate and, later, CR12 or beneficial ownership filing evidence — to activate your entity.',
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

// Removing a director/shareholder/beneficial owner leaves their tagged
// documents (ID, KRA PIN, photo, etc.) behind untouched — they kept
// counting toward the vault total and "missing documents" checklist for
// a person who no longer exists, and re-adding the same person later
// would sit alongside them as duplicates instead of replacing them.
// Soft-delete on removal so both problems go away at the source.
async function retirePersonDocuments(supabase: SupabaseServer, entityId: string, personId: string) {
  const { data: docs } = await supabase
    .from('documents')
    .select('id, tags')
    .eq('entity_id', entityId)
    .is('deleted_at', null)
  const tagged = (docs ?? []).filter((d) =>
    (d.tags as Array<{ personId?: string }> | null)?.some((t) => t.personId === personId)
  )
  if (tagged.length > 0) {
    await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).in('id', tagged.map((d) => d.id))
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
    // The row this upload is definitely for, when the client already
    // knows it (see the comment on ocr_extract's personId param) — used
    // to update that exact row instead of re-guessing by name/id_number.
    personId?: string
  }
) {
  const { fields, section, entityId, orgId, progressId, progressData, personId: knownPersonId } = ctx
  const created: { directors: number; shareholders: number } = { directors: 0, shareholders: 0 }
  // The matched-or-created row's id, handed back to the client so it can
  // adopt it into the open form — without this, saving the form after an
  // OCR auto-create inserts a second, duplicate row instead of updating
  // the one OCR just made (Charles call, 2026-08: reproduced live —
  // "created yet another Charles Adede").
  let personId: string | undefined

  // Person documents → directors / shareholders
  if (section === 'director' || section === 'shareholder') {
    const table = section === 'director' ? 'directors' : 'shareholders'

    if (fields.id_number || fields.full_name) {
      if (section === 'director') {
        const { data: existing } = await supabase
          .from('directors')
          .select('id, full_name, id_number, kra_pin')
          .eq('entity_id', entityId)

        const match = knownPersonId
          ? (existing ?? []).find((d) => d.id === knownPersonId)
          : (existing ?? []).find(
              (d) =>
                (fields.id_number && d.id_number === fields.id_number) ||
                (fields.full_name && d.full_name.toLowerCase() === fields.full_name.toLowerCase())
            )

        if (match) {
          personId = match.id
          const update: Database['public']['Tables']['directors']['Update'] = {}
          if (!match.kra_pin && fields.kra_pin) update.kra_pin = fields.kra_pin
          if (Object.keys(update).length > 0) {
            await supabase.from('directors').update(update).eq('id', match.id)
          }
        } else if (fields.full_name && fields.id_number) {
          const newId = crypto.randomUUID()
          await supabase.from('directors').insert({
            id: newId,
            entity_id: entityId,
            organisation_id: orgId,
            full_name: fields.full_name,
            id_number: fields.id_number,
            kra_pin: fields.kra_pin,
            residential_address: { dateOfBirth: fields.date_of_birth, source: 'ocr' } as Json,
          })
          personId = newId
          created.directors += 1
        }
      } else {
        const { data: existing } = await supabase
          .from('shareholders')
          .select('id, legal_name, id_or_reg_number, kra_pin')
          .eq('entity_id', entityId)

        const match = knownPersonId
          ? (existing ?? []).find((s) => s.id === knownPersonId)
          : (existing ?? []).find(
              (s) =>
                (fields.id_number && s.id_or_reg_number === fields.id_number) ||
                (fields.full_name && s.legal_name.toLowerCase() === fields.full_name.toLowerCase())
            )

        if (match) {
          personId = match.id
          const update: Database['public']['Tables']['shareholders']['Update'] = {}
          if (!match.kra_pin && fields.kra_pin) update.kra_pin = fields.kra_pin
          if (Object.keys(update).length > 0) {
            await supabase.from('shareholders').update(update).eq('id', match.id)
          }
        } else if (fields.full_name && fields.id_number) {
          // Require both name AND ID number (matches director creation
          // below) — a shareholder row with no ID number can never pass
          // step validation and had no clear fix path for the user.
          const newId = crypto.randomUUID()
          await supabase.from('shareholders').insert({
            id: newId,
            entity_id: entityId,
            organisation_id: orgId,
            legal_name: fields.full_name,
            id_or_reg_number: fields.id_number,
            kra_pin: fields.kra_pin,
            shares_held: 0, // user sets shares in the shareholders step
            corporate_details: { source: 'ocr' } as Json,
          })
          personId = newId
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
    // No dedicated district/locality UI fields yet — fall back into city
    // so the value isn't silently lost ahead of the wizard-reorder phase.
    const cityValue = fields.city ?? fields.locality ?? fields.district
    if (!wizard.city && cityValue) { wizard.city = cityValue; wizardChanged = true }
    if (!wizard.county && fields.county) { wizard.county = fields.county; wizardChanged = true }
    if (!wizard.postalCode && fields.postal_code) { wizard.postalCode = fields.postal_code; wizardChanged = true }
  }
  // Phone shown on any document → entity phone (gap-fill only)
  if (!wizard.entityPhone && fields.phone) { wizard.entityPhone = fields.phone; wizardChanged = true }
  // Business registration docs → first proposed-name slot if still empty
  if (fields.document_kind === 'business_registration' && fields.business_name) {
    const names = wizard.proposedNames ?? []
    if (!names.some((n) => n.trim())) {
      wizard.proposedNames = [fields.business_name, '', '', '', '', '']
      wizardChanged = true
    }
  }
  // Share capital docs (CR2 / Statement of Nominal Capital) → step 8 fields
  if (
    (fields.document_kind === 'cr2' || fields.document_kind === 'statement_of_nominal_capital') &&
    !wizard.authorisedShareCapital &&
    fields.nominal_share_capital
  ) {
    wizard.authorisedShareCapital = fields.nominal_share_capital
    wizardChanged = true
  }
  if (
    (fields.document_kind === 'cr2' || fields.document_kind === 'statement_of_nominal_capital') &&
    !wizard.nominalValuePerShare &&
    fields.share_classes?.[0]?.nominal_value_each
  ) {
    wizard.nominalValuePerShare = fields.share_classes[0].nominal_value_each
    wizardChanged = true
  }
  if (
    (fields.document_kind === 'cr2' || fields.document_kind === 'statement_of_nominal_capital') &&
    !wizard.totalShares &&
    fields.share_classes?.[0]?.number_of_shares
  ) {
    wizard.totalShares = fields.share_classes[0].number_of_shares
    wizardChanged = true
  }

  if (wizardChanged) {
    const newData: ProgressData = { ...progressData, wizard }
    await supabase.from('onboarding_progress').update({ data: newData as Json }).eq('id', progressId)
  }

  return { created, wizardChanged, personId }
}
