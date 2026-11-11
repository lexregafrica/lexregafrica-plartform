-- ============================================================
-- Owner view of lawyer assignments on their own entities.
--
-- lawyer_assignments is readable only by super_admin and the assigned
-- lawyer. The owner dashboard ("Matters") needs to show that a lawyer is
-- working on an entity, and who. Rather than widening the table and the
-- profiles policies, this narrow function returns only what the owner
-- needs: service, status, dates and the lawyer's display name — never the
-- lawyer's email, user id or notes.
-- ============================================================
create or replace function public.owner_entity_lawyers()
returns table (
  assignment_id uuid,
  entity_id     uuid,
  service_type  text,
  status        text,
  assigned_at   timestamptz,
  completed_at  timestamptz,
  lawyer_name   text
)
language sql stable security definer
set search_path = public
as $$
  select
    la.id,
    la.entity_id,
    la.service_type,
    la.status,
    la.assigned_at,
    la.completed_at,
    coalesce(nullif(p.full_name, ''), nullif(u.raw_user_meta_data->>'full_name', ''), 'Assigned lawyer')
  from public.lawyer_assignments la
  join public.entities e on e.id = la.entity_id and e.deleted_at is null
  left join public.profiles p on p.id = la.lawyer_user_id
  left join auth.users u on u.id = la.lawyer_user_id
  where la.status <> 'cancelled'
    and (public.is_super_admin() or public.get_user_role(e.organisation_id) = 'business_owner');
$$;

revoke all on function public.owner_entity_lawyers() from public, anon;
grant execute on function public.owner_entity_lawyers() to authenticated;
