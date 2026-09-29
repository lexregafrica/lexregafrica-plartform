// Onboarding document handling shared by the new-entity and existing-entity
// routes, so fixes made for one path (person tagging, Replace, one current
// document per person per type) can't drift out of the other again.

import { NextResponse } from 'next/server'
import type { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.types'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

export type PersonRole = 'director' | 'shareholder' | 'beneficial_owner' | 'corporate_party' | 'enforcer' | 'entity'

export type RegisterDocumentInput = {
  name: string; filePath: string; fileSize?: number; mimeType?: string; documentType?: string
  // Person the document belongs to (for the document-vault file-tree
  // grouping) — Charles call, 2026-08: tag docs by who/what they're for,
  // not just their type, since there's no per-person FK on this table.
  personName?: string; personRole?: PersonRole
  // The saved row's own id, when there is one — preferred over name
  // matching, which can race with the name itself still landing in form
  // state (Charles call, 2026-08).
  personId?: string
  // Set by the "Replace" control: the stored file this upload supersedes,
  // retired no matter how it was tagged.
  replacesFilePath?: string
  // Entity-level documents with a single current copy (e.g. the
  // certificate of incorporation): a new upload retires the old one.
  singleCurrent?: boolean
}

export async function registerDocument(
  supabase: SupabaseServer,
  ctx: { entityId: string; orgId: string; userId: string },
  document: RegisterDocumentInput | undefined,
) {
  const { entityId, orgId, userId } = ctx
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

  const now = new Date().toISOString()

  // A "Replace" upload retires the old file instead of piling up next to
  // it (Charles call, 2026-08: "every time you add, it keeps adding").
  // Soft delete, so it stays in the history.
  if (document.replacesFilePath) {
    await supabase
      .from('documents')
      .update({ deleted_at: now })
      .eq('entity_id', entityId)
      .eq('file_path', document.replacesFilePath)
      .is('deleted_at', null)
  }
  if (document.documentType && (document.personId || document.personName)) {
    const { data: existing } = await supabase
      .from('documents')
      .select('id, tags')
      .eq('entity_id', entityId)
      .eq('document_type', document.documentType)
      .is('deleted_at', null)
    // Never retire another person's document by a name match — a name can
    // come from browser autofill or be shared by two people (Charles,
    // 2026-09-29: Elisha's upload surfaced under Charles Adede). By id when
    // we have one; by name only among documents not yet tied to anyone.
    const stale = (existing ?? []).filter((d) => {
      const t = (d.tags as Array<{ person?: string; personId?: string }> | null)?.[0]
      if (!t) return false
      if (document.personId) return t.personId === document.personId
      return !t.personId && !!document.personName && t.person?.trim().toLowerCase() === document.personName.trim().toLowerCase()
    })
    if (stale.length > 0) {
      await supabase.from('documents').update({ deleted_at: now }).in('id', stale.map((d) => d.id))
    }
  } else if (document.documentType && document.singleCurrent) {
    await supabase
      .from('documents')
      .update({ deleted_at: now })
      .eq('entity_id', entityId)
      .eq('document_type', document.documentType)
      .is('deleted_at', null)
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
      uploaded_by: userId,
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

// Fix up the person tag on documents uploaded earlier in the same form
// session, once Save has confirmed the row's real id and final name —
// then retire anything older of the same type already tied to that person
// (one current document per person per type; Charles, 2026-09-29).
export async function retagDocuments(
  supabase: SupabaseServer,
  entityId: string,
  input: { documentIds?: string[]; personId?: string; personName?: string; personRole?: PersonRole },
) {
  const { documentIds, personId: targetPersonId, personName, personRole } = input
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

  const { data: retagged } = await supabase.from('documents').select('document_type').eq('entity_id', entityId).in('id', documentIds)
  const types = [...new Set((retagged ?? []).map((d) => d.document_type).filter((t): t is string => !!t))]
  if (types.length > 0) {
    const { data: older } = await supabase
      .from('documents')
      .select('id, tags')
      .eq('entity_id', entityId)
      .in('document_type', types)
      .is('deleted_at', null)
      .not('id', 'in', `(${documentIds.join(',')})`)
    const superseded = (older ?? [])
      .filter((d) => (d.tags as Array<{ personId?: string }> | null)?.[0]?.personId === targetPersonId)
      .map((d) => d.id)
    if (superseded.length > 0) {
      await supabase.from('documents').update({ deleted_at: new Date().toISOString() }).in('id', superseded).eq('entity_id', entityId)
    }
  }
  return NextResponse.json({ ok: true })
}

// Soft-delete every document tagged to a person who is being removed.
export async function retirePersonDocuments(supabase: SupabaseServer, entityId: string, personId: string) {
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
