-- Soft-delete of stale chunks when a document is re-read by OCR.
create policy "document chunks soft delete" on public.document_chunks for update
  using (public.is_super_admin() or public.get_user_role(organisation_id) = 'business_owner');

-- One-off backfill: index every document OCR has already completed.
-- Nested values are kept as JSON text; full-text search still finds the
-- names, numbers and dates inside them. New uploads use the app indexer.
insert into public.document_chunks (organisation_id, entity_id, document_id, chunk_index, content)
select d.organisation_id, d.entity_id, d.id, 0,
       concat_ws(E'\n',
         'Document: ' || d.name,
         'Type: ' || replace(coalesce(d.document_type, ''), '_', ' '),
         (select string_agg(replace(k.key, '_', ' ') || ': ' || trim(both '"' from k.value::text), E'\n')
            from jsonb_each(coalesce(d.ocr_data, '{}'::jsonb)) k
           where k.key not in ('confidence', 'reason') and k.value <> 'null'::jsonb))
from public.documents d
where d.ocr_status = 'complete'
  and d.deleted_at is null
  and jsonb_typeof(d.ocr_data) = 'object'
  and not exists (select 1 from public.document_chunks c where c.document_id = d.id and c.deleted_at is null);
