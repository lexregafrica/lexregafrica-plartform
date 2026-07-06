import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { computeInformalResult } from '@/lib/onboarding/informal'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('data')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'informal_business')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ data: progress?.data ?? {} })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { answers, complete } = body as { answers: Record<string, number>; complete?: boolean }

  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'invalid answers' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: progressRow } = await supabase
    .from('onboarding_progress')
    .select('id, organisation_id')
    .eq('user_id', user.id)
    .eq('onboarding_path', 'informal_business')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!progressRow) {
    return NextResponse.json({ error: 'no onboarding session found' }, { status: 400 })
  }

  const result = complete ? computeInformalResult(answers) : undefined
  const payload = complete ? { answers, completed: true, result } : { answers }

  const { error: updateError } = await supabase
    .from('onboarding_progress')
    .update({ data: payload, step: Object.keys(answers).length })
    .eq('id', progressRow.id)

  if (updateError) {
    console.error('informal progress update error', updateError)
    return NextResponse.json({ error: 'failed to save progress' }, { status: 500 })
  }

  if (complete && progressRow.organisation_id) {
    await supabase.rpc('log_audit', {
      p_organisation_id: progressRow.organisation_id,
      p_action: 'onboarding.informal.completed',
      p_resource_type: 'onboarding_progress',
      p_metadata: { score: result?.score },
    })
  }

  return NextResponse.json({ ok: true, result })
}
