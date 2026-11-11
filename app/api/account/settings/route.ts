import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Owner dashboard Settings: display name and notification / assistant /
// appearance preferences. Preferences live in the user's own auth
// metadata (no new table); the name also goes to profiles. The sign-in
// email is not changed here — that needs a verified email-change flow.

const Settings = z.object({
  name: z.string().trim().min(1).max(120),
  notify: z.object({ requests: z.boolean(), mentions: z.boolean(), merged: z.boolean(), digest: z.boolean() }),
  style: z.enum(['concise', 'balanced', 'detailed']),
  includeDiff: z.boolean(),
  accent: z.enum(['burgundy', 'gold', 'navy', 'blue']),
})

export async function POST(request: Request) {
  const parsed = Settings.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid settings' }, { status: 400 })
  const { name, ...preferences } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { error: authError } = await supabase.auth.updateUser({ data: { full_name: name, preferences } })
  if (authError) return NextResponse.json({ error: 'could not save' }, { status: 500 })

  // RLS "own profile" scopes this to the caller's row
  await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership) await supabase.rpc('log_audit', {
    p_organisation_id: membership.organisation_id,
    p_action: 'account.settings_updated',
    p_resource_type: 'user',
    p_resource_id: user.id,
    p_metadata: { fields: ['name', 'notifications', 'assistant', 'appearance'] },
  })

  return NextResponse.json({ ok: true })
}
