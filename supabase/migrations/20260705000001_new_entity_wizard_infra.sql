-- LexReg Africa — Phase 2B: New Entity questionnaire infra
-- Adds 'trust' entity type + a private storage bucket for entity
-- formation documents (ID scans, passport photos, proof of address,
-- employment contracts).

-- NGO/Non-Profit maps to the existing 'company_limited_by_guarantee'
-- value (the actual Kenyan legal form NGOs register under), so only
-- 'trust' is genuinely missing from the enum.
alter type public.entity_type add value if not exists 'trust';

-- ============================================================
-- STORAGE: documents bucket
-- Path convention: documents/{organisation_id}/{entity_id}/{filename}
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "org members manage own documents" on storage.objects;

create policy "org members manage own documents" on storage.objects
  for all using (
    bucket_id = 'documents' and
    is_org_member((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'documents' and
    is_org_member((storage.foldername(name))[1]::uuid)
  );
