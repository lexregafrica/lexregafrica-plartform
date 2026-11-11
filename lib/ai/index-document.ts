import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// Turns a document's OCR result into searchable text for LexReg AI.
// OCR stores structured fields, not page text, so the fields are flattened
// to "label: value" lines. Old chunks are soft-deleted, never removed.
// Never throws: indexing must not break an upload.

const CHUNK = 1500

function flatten(value: unknown, path: string, out: string[]) {
  if (value === null || value === undefined || value === '') return
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${path} ${i + 1}`, out))
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'confidence' || k === 'reason') continue
      flatten(v, path ? `${path} › ${k.replace(/_/g, ' ')}` : k.replace(/_/g, ' '), out)
    }
  } else {
    out.push(`${path}: ${String(value)}`)
  }
}

export function documentText(doc: { name: string; document_type: string | null; ocr_data: unknown }) {
  const lines = [`Document: ${doc.name}`, doc.document_type ? `Type: ${doc.document_type.replace(/_/g, ' ')}` : '']
  flatten(doc.ocr_data, '', lines)
  return lines.filter(Boolean).join('\n')
}

function chunks(text: string) {
  const out: string[] = []
  let current = ''
  for (const line of text.split('\n')) {
    if (current && current.length + line.length + 1 > CHUNK) {
      out.push(current)
      current = ''
    }
    current += (current ? '\n' : '') + line
  }
  if (current) out.push(current)
  return out
}

export async function indexDocument(supabase: SupabaseClient, documentId: string) {
  try {
    const { data: doc } = await supabase
      .from('documents')
      .select('id, organisation_id, entity_id, name, document_type, ocr_status, ocr_data')
      .eq('id', documentId)
      .maybeSingle()
    if (!doc || doc.ocr_status !== 'complete') return

    await supabase.from('document_chunks').update({ deleted_at: new Date().toISOString() }).eq('document_id', doc.id).is('deleted_at', null)
    const rows = chunks(documentText(doc)).map((content, i) => ({
      organisation_id: doc.organisation_id,
      entity_id: doc.entity_id,
      document_id: doc.id,
      chunk_index: i,
      content,
    }))
    if (rows.length) await supabase.from('document_chunks').insert(rows)
  } catch {
    // Search is a convenience; the upload itself already succeeded.
  }
}
