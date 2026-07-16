import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DraftResumeShell } from '@/components/dashboard/draft-resume-shell'
import { EntityDashboard, type DashboardEntity } from '@/components/dashboard/entity-dashboard'
import { ENTITY_TYPES } from '@/lib/onboarding/new-entity'

const EXTRA_TYPE_LABELS: Record<string, string> = {
  foreign_branch: 'Foreign Branch',
}

function entityTypeLabel(value: string): string {
  return ENTITY_TYPES.find((t) => t.value === value)?.label ?? EXTRA_TYPE_LABELS[value] ?? value
}

function displayName(entity: {
  legal_name: string | null
  trading_name: string | null
  proposed_names: unknown
}): string {
  if (entity.legal_name) return entity.legal_name
  if (entity.trading_name) return entity.trading_name
  const proposed = entity.proposed_names as string[] | null
  const first = proposed?.find((n) => n?.trim())
  return first ?? 'Unnamed entity'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/onboarding')
  const orgId = membership.organisation_id

  const [{ data: org }, { data: entities }] = await Promise.all([
    supabase.from('organisations').select('name').eq('id', orgId).single(),
    supabase
      .from('entities')
      .select('id, legal_name, trading_name, proposed_names, entity_type, status, registration_number, date_incorporated, onboarding_path, onboarding_step')
      .eq('organisation_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  // No entities at all — fall back to the draft-resume / onboarding funnel
  if (!entities || entities.length === 0) {
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('onboarding_path, step, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (progress) {
      const progressData = progress.data as { completed?: boolean; result?: { score?: number } } | null
      return (
        <DraftResumeShell
          path={progress.onboarding_path}
          step={progress.step ?? 1}
          completed={progressData?.completed}
          score={progressData?.result?.score}
        />
      )
    }

    redirect('/onboarding')
  }

  const entityIds = entities.map((e) => e.id)

  const [{ data: docs }, { data: forms }, { data: events }] = await Promise.all([
    supabase
      .from('documents')
      .select('entity_id')
      .in('entity_id', entityIds)
      .is('deleted_at', null),
    supabase
      .from('company_forms')
      .select('entity_id, file_url, generated_at')
      .in('entity_id', entityIds)
      .eq('form_type', 'information_document_package')
      .order('generated_at', { ascending: false }),
    supabase
      .from('compliance_events')
      .select('id, title, due_date, entity_id')
      .in('entity_id', entityIds)
      .eq('status', 'pending')
      .order('due_date')
      .limit(5),
  ])

  const docCounts = new Map<string, number>()
  for (const d of docs ?? []) {
    if (!d.entity_id) continue
    docCounts.set(d.entity_id, (docCounts.get(d.entity_id) ?? 0) + 1)
  }

  // Latest IDP per entity → signed URL (1h expiry)
  const idpPaths = new Map<string, string>()
  for (const f of forms ?? []) {
    if (f.file_url && !idpPaths.has(f.entity_id)) idpPaths.set(f.entity_id, f.file_url)
  }
  const idpUrls = new Map<string, string>()
  await Promise.all(
    [...idpPaths.entries()].map(async ([entityId, path]) => {
      const { data: signed } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
      if (signed?.signedUrl) idpUrls.set(entityId, signed.signedUrl)
    })
  )

  const dashboardEntities: DashboardEntity[] = entities.map((e) => ({
    id: e.id,
    displayName: displayName(e),
    entityTypeLabel: entityTypeLabel(e.entity_type),
    status: e.status,
    registrationNumber: e.registration_number,
    dateIncorporated: e.date_incorporated,
    onboardingPath: e.onboarding_path,
    onboardingStep: e.onboarding_step,
    documentCount: docCounts.get(e.id) ?? 0,
    idpUrl: idpUrls.get(e.id) ?? null,
  }))

  const entityNames = new Map(dashboardEntities.map((e) => [e.id, e.displayName]))
  const deadlines = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    dueDate: e.due_date,
    entityId: e.entity_id,
    entityName: entityNames.get(e.entity_id) ?? '',
  }))

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Account'

  return (
    <EntityDashboard
      userName={userName}
      userEmail={user.email ?? ''}
      organisationName={org?.name ?? 'Your organisation'}
      entities={dashboardEntities}
      deadlines={deadlines}
    />
  )
}
