import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityWorkspace } from '@/components/dashboard/entity-workspace'
import { ENTITY_TYPES } from '@/lib/onboarding/new-entity'

export default async function EntityWorkspacePage({
  params,
}: {
  params: Promise<{ entityId: string }>
}) {
  const { entityId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS scopes all queries to the user's organisation — a foreign or
  // unknown id simply returns no row
  const { data: entity } = await supabase
    .from('entities')
    .select('id, legal_name, trading_name, proposed_names, entity_type, status, registration_status, registration_number, kra_pin, date_incorporated, nature_of_business, registered_address')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!entity) notFound()

  const [{ data: events }, { data: docs }, { data: directors }, { data: shareholders }, { data: forms }] =
    await Promise.all([
      supabase
        .from('compliance_events')
        .select('id, title, description, category, due_date, status')
        .eq('entity_id', entityId)
        .order('due_date'),
      supabase
        .from('documents')
        .select('id, name, document_type, file_path, file_size, created_at')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('directors').select('id, full_name, kra_pin, email, phone').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('id, legal_name, shares_held, share_percentage').eq('entity_id', entityId).order('created_at'),
      supabase
        .from('company_forms')
        .select('form_type, file_url, generated_at')
        .eq('entity_id', entityId)
        .order('generated_at', { ascending: false }),
    ])

  // Signed download URLs (1h) for documents + latest generated form
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      let url: string | null = null
      if (d.file_path) {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 3600)
        url = signed?.signedUrl ?? null
      }
      return { id: d.id, name: d.name, documentType: d.document_type, fileSize: d.file_size, createdAt: d.created_at, url }
    })
  )

  let profileUrl: string | null = null
  const latestForm = (forms ?? []).find((f) => f.file_url)
  if (latestForm?.file_url) {
    const { data: signed } = await supabase.storage.from('documents').createSignedUrl(latestForm.file_url, 3600)
    profileUrl = signed?.signedUrl ?? null
  }

  const proposed = (entity.proposed_names as string[] | null)?.find((n) => n?.trim())
  const address = entity.registered_address as { line1?: string; city?: string; county?: string; postcode?: string } | null

  return (
    <EntityWorkspace
      entity={{
        id: entity.id,
        name: entity.legal_name ?? entity.trading_name ?? proposed ?? 'Unnamed entity',
        typeLabel: ENTITY_TYPES.find((t) => t.value === entity.entity_type)?.label ?? entity.entity_type,
        status: entity.status,
        registrationStatus: entity.registration_status,
        registrationNumber: entity.registration_number,
        kraPin: entity.kra_pin,
        dateIncorporated: entity.date_incorporated,
        natureOfBusiness: entity.nature_of_business,
        address: address ? [address.line1, address.city, address.county, address.postcode].filter(Boolean).join(', ') : null,
        profileUrl,
      }}
      events={(events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        dueDate: e.due_date,
        status: e.status,
      }))}
      documents={docsWithUrls}
      directors={(directors ?? []).map((d) => ({ id: d.id, name: d.full_name, kraPin: d.kra_pin, email: d.email, phone: d.phone }))}
      shareholders={(shareholders ?? []).map((s) => ({ id: s.id, name: s.legal_name, shares: s.shares_held, percentage: s.share_percentage }))}
    />
  )
}
