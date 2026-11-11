import 'server-only'
import { tool } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

// Read-only tools an agent can call. Each set is bound to ONE entity in a
// closure (the model cannot ask for another), and every query runs on the
// caller's own Supabase session, so RLS still decides what is visible.
// Results are returned as data; the system prompt tells the model never to
// follow instructions found inside them.

export function entityTools(supabase: SupabaseClient, entityId: string) {
  return {
    read_entity_record: tool({
      description: 'The entity record: name, type, status, registration number, KRA PIN, incorporation date, address, and its directors, shareholders and beneficial owners.',
      inputSchema: z.object({}),
      execute: async () => {
        const [{ data: entity }, { data: directors }, { data: shareholders }, { data: bos }] = await Promise.all([
          supabase.from('entities').select('legal_name, trading_name, entity_type, status, registration_number, kra_pin, date_incorporated, nature_of_business, registered_address').eq('id', entityId).maybeSingle(),
          supabase.from('directors').select('full_name, kra_pin, nationality, appointment_date').eq('entity_id', entityId),
          supabase.from('shareholders').select('legal_name, kra_pin, shares_held, share_percentage').eq('entity_id', entityId),
          supabase.from('beneficial_owners').select('full_name, kra_pin, nature_of_control, share_percentage').eq('entity_id', entityId),
        ])
        if (!entity) return { error: 'Entity not found or not visible to this user.' }
        return { source: 'register', entity, directors: directors ?? [], shareholders: shareholders ?? [], beneficial_owners: bos ?? [] }
      },
    }),

    list_documents: tool({
      description: 'Documents on file in the vault for this entity: name, type and upload date.',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase.from('documents').select('id, name, document_type, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at', { ascending: false }).limit(100)
        return { source: 'vault', documents: data ?? [] }
      },
    }),

    search_documents: tool({
      description: 'Full-text search inside the text of this entity\'s documents. Use specific words, e.g. a KRA PIN or a person\'s name.',
      inputSchema: z.object({ query: z.string().min(2).max(200) }),
      execute: async ({ query }) => {
        const { data } = await supabase
          .from('document_chunks')
          .select('document_id, content')
          .eq('entity_id', entityId)
          .is('deleted_at', null)
          .textSearch('tsv', query, { type: 'websearch', config: 'english' })
          .limit(5)
        return { source: 'document text', matches: (data ?? []).map((m) => ({ document_id: m.document_id, excerpt: String(m.content).slice(0, 1200) })) }
      },
    }),

    list_deadlines: tool({
      description: 'Compliance deadlines for this entity with their due dates and status.',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase.from('compliance_events').select('title, category, due_date, status, completed_at').eq('entity_id', entityId).order('due_date')
        return { source: 'compliance calendar', deadlines: data ?? [] }
      },
    }),

    recall_facts: tool({
      description: 'Facts previously confirmed about this entity, each with its source.',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase.from('ai_memories').select('fact, source, created_at').eq('entity_id', entityId).is('deleted_at', null).order('created_at', { ascending: false }).limit(50)
        return { source: 'memory', facts: data ?? [] }
      },
    }),
  }
}
