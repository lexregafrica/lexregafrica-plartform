-- LexReg Africa — Fix "members see own org" SELECT policy typo + restore
-- the INSERT policy after debugging (it was temporarily overwritten with
-- `with check (true)` while diagnosing the RETURNING/RLS issue below).
--
-- Bug: "members see own org" compared organisation_members.organisation_id
-- to organisation_members.id (same table, wrong column) instead of
-- organisations.id (the table actually being protected). This meant the
-- policy only ever passed for super_admin — regular members could never
-- see their own organisation row.
--
-- This also explains "new row violates row-level security policy for
-- table organisations" when creating a new org: INSERT ... RETURNING
-- requires the new row to satisfy the table's SELECT policy too, and
-- since the SELECT policy was broken, every org-creation RETURNING failed
-- even with a fully permissive INSERT check. The app was fixed
-- separately to stop relying on RETURNING (org id is now generated
-- application-side before insert), so this fix is about correctness for
-- any code path that still reads organisations normally (dashboard,
-- future org-switcher UI, etc).

drop policy if exists "authenticated can create org" on public.organisations;

create policy "authenticated can create org" on public.organisations
  for insert with check (auth.uid() is not null);

drop policy if exists "members see own org" on public.organisations;

create policy "members see own org" on public.organisations
  for select using (
    is_super_admin() or is_org_member(id)
  );
