import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityWorkspace } from '@/components/dashboard/entity-workspace'
import { ENTITY_TYPES, missingRequiredDocuments, formatAddress, type AddressData, type EntityType } from '@/lib/onboarding/new-entity'

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
    .select('id, organisation_id, legal_name, trading_name, proposed_names, entity_type, status, registration_status, registration_number, kra_pin, date_incorporated, nature_of_business, registered_address')
    .eq('id', entityId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!entity) notFound()

  // super_admin is a platform-wide role, not scoped to any one org's
  // membership row — a super_admin whose own row lives in a different
  // org would wrongly fail an org-scoped check here.
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  const canManageStatus = isSuperAdmin === true

  const [{ data: events }, { data: docs }, { data: directors }, { data: shareholders }, { data: forms }, { data: bos }] =
    await Promise.all([
      supabase
        .from('compliance_events')
        .select('id, title, description, category, due_date, status')
        .eq('entity_id', entityId)
        .order('due_date'),
      supabase
        .from('documents')
        .select('id, name, document_type, file_path, file_size, tags, created_at')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('directors').select('id, full_name, id_number, kra_pin, email, phone, nationality, appointment_date, is_foreign, residential_address').eq('entity_id', entityId).order('created_at'),
      supabase.from('shareholders').select('id, legal_name, id_or_reg_number, kra_pin, email, phone, shares_held, share_percentage, address, corporate_details').eq('entity_id', entityId).order('created_at'),
      supabase
        .from('company_forms')
        .select('form_type, file_url, generated_at')
        .eq('entity_id', entityId)
        .order('generated_at', { ascending: false }),
      supabase.from('beneficial_owners').select('id, full_name, id_number, kra_pin, email, phone, nationality, date_of_birth, occupation, nature_of_control, share_percentage, date_became_bo, residential_address').eq('entity_id', entityId).order('created_at'),
    ])

  // Signed download URLs (1h) for documents + latest generated form
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      let url: string | null = null
      if (d.file_path) {
        const { data: signed } = await supabase.storage.from('documents').createSignedUrl(d.file_path, 3600)
        url = signed?.signedUrl ?? null
      }
      return { id: d.id, name: d.name, documentType: d.document_type, fileSize: d.file_size, createdAt: d.created_at, url, tags: d.tags as Array<{ person?: string; personId?: string; role?: string }> | null }
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

  // Same gate and same checklist as the dashboard list used to show
  // this from — only once a certificate is on file, since some of these
  // documents can't exist before then.
  const presentDocTypes = new Set((docs ?? []).map((d) => d.document_type).filter((t): t is string => !!t))
  const missingDocs =
    entity.status === 'pending_registration' || entity.status === 'active'
      ? missingRequiredDocuments(entity.entity_type as EntityType, presentDocTypes)
      : []

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
        missingDocs,
      }}
      canManageStatus={canManageStatus}
      events={(events ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        dueDate: e.due_date,
        status: e.status,
      }))}
      documents={docsWithUrls}
      directors={(directors ?? []).map((d) => {
        const ra = (d.residential_address ?? {}) as {
          role?: string; isCorporate?: boolean; corporate?: { registeredName?: string; regNumber?: string }
          structuredAddress?: AddressData; foreignAddress?: string; dateOfBirth?: string | null; occupation?: string
          interestPercentage?: string; contributionValue?: string; isManagingPartner?: boolean; signingAuthority?: string
          cessationDate?: string; cessationReason?: string; evidence?: Array<{ documentType?: string; documentDate?: string | null }>
        }
        return {
          id: d.id, name: d.full_name, kraPin: d.kra_pin, email: d.email, phone: d.phone,
          idNumber: d.id_number || null, nationality: d.nationality, role: ra.role ?? 'director',
          isCorporate: !!ra.isCorporate, appointmentDate: d.appointment_date, dateOfBirth: ra.dateOfBirth ?? null, occupation: ra.occupation ?? null,
          address: ra.structuredAddress ? formatAddress(ra.structuredAddress) || null : ra.foreignAddress ?? null,
          profitShare: ra.interestPercentage ?? null, contribution: ra.contributionValue ?? null, isManagingPartner: !!ra.isManagingPartner,
          signingAuthority: ra.signingAuthority ?? null, cessationDate: ra.cessationDate ?? null, cessationReason: ra.cessationReason ?? null,
          sources: (ra.evidence ?? []).map((e) => ({ documentType: e.documentType ?? null, documentDate: e.documentDate ?? null })),
        }
      })}
      shareholders={(shareholders ?? []).map((s) => {
        const ad = (s.address ?? {}) as { structuredAddress?: AddressData; foreignAddress?: string; nationality?: string; shareClass?: string; dateOfBirth?: string }
        const cd = (s.corporate_details ?? {}) as { isCorporate?: boolean; nominee?: boolean; evidence?: Array<{ documentType?: string; documentDate?: string | null }> }
        return {
          id: s.id, name: s.legal_name, shares: s.shares_held, percentage: s.share_percentage,
          idNumber: s.id_or_reg_number, kraPin: s.kra_pin, email: s.email, phone: s.phone,
          isCorporate: !!cd.isCorporate, isNominee: !!cd.nominee, shareClass: ad.shareClass ?? null, nationality: ad.nationality ?? null,
          dateOfBirth: ad.dateOfBirth ?? null,
          address: ad.structuredAddress ? formatAddress(ad.structuredAddress) || null : ad.foreignAddress ?? null,
          sources: (cd.evidence ?? []).map((e) => ({ documentType: e.documentType ?? null, documentDate: e.documentDate ?? null })),
        }
      })}
      beneficialOwners={(bos ?? []).map((b) => {
        const ra = (b.residential_address ?? {}) as { structuredAddress?: AddressData; evidence?: Array<{ documentType?: string; documentDate?: string | null }> }
        return {
          id: b.id, name: b.full_name, idNumber: b.id_number, kraPin: b.kra_pin, email: b.email, phone: b.phone,
          nationality: b.nationality, dateOfBirth: b.date_of_birth, occupation: b.occupation,
          natureOfControl: b.nature_of_control, percentage: b.share_percentage, since: b.date_became_bo,
          address: ra.structuredAddress ? formatAddress(ra.structuredAddress) || null : null,
          sources: (ra.evidence ?? []).map((e) => ({ documentType: e.documentType ?? null, documentDate: e.documentDate ?? null })),
        }
      })}
    />
  )
}
