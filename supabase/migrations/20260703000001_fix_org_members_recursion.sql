-- LexReg Africa — Fix infinite recursion in organisation_members RLS
-- "members see org members" queried organisation_members directly inside
-- its own USING clause. Postgres re-evaluates the same policy for every
-- row scanned by that subquery, which is itself RLS-protected by the
-- same policy — infinite recursion.
--
-- Fix: route the membership check through a security-definer function
-- (same pattern as get_user_role()/is_super_admin() already in use).
-- Security-definer functions run as the function owner, which bypasses
-- RLS on the internal query, breaking the cycle.

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = org_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members see org members" on public.organisation_members;

create policy "members see org members" on public.organisation_members
  for select using (
    is_super_admin() or is_org_member(organisation_id)
  );
