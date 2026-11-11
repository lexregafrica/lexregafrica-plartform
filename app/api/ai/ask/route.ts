import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { runAgent } from '@/lib/ai/run'
import { entityTools } from '@/lib/ai/tools'

// Ask Your Filings: a question about one entity, answered from that
// entity's own records. The entity must be visible to the caller under
// RLS, and the tools can read nothing else.

const Body = z.object({
  entityId: z.uuid(),
  question: z.string().trim().min(2).max(1000),
  matter: z.string().max(300).optional(),
})

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  const { entityId, question, matter } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, organisation_id, legal_name, trading_name')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!entity) return NextResponse.json({ error: 'entity not found' }, { status: 404 })

  const client = supabase as unknown as SupabaseClient
  const result = await runAgent({
    supabase: client,
    user,
    organisationId: entity.organisation_id,
    entityId,
    agent: 'ask_filings',
    system: `You are LexReg AI, helping with the records of ${entity.legal_name || entity.trading_name || 'this entity'}, a Kenyan business on LexReg. Use the tools to look things up before answering.`,
    prompt: matter ? `Matter: ${matter}\n\nQuestion: ${question}` : question,
    tools: entityTools(client, entityId),
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ answer: result.text, runId: result.runId })
}
