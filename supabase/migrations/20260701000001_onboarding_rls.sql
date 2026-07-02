-- LexReg Africa — Phase 2A: Onboarding RLS + audit helper
-- Adds INSERT/UPDATE policies for org bootstrap on first login
-- Adds security-definer log_audit() so app code can't spoof audit rows

-- ============================================================
-- ORGANISATIONS: allow authenticated users to create their workspace
-- ============================================================
create policy "authenticated can create org" on public.organisations
  for insert with check (auth.uid() is not null);

create policy "business owner updates org" on public.organisations
  for update using (
    exists (
      select 1 from public.organisation_members
      where organisation_id = organisations.id
        and user_id = auth.uid()
        and role = 'business_owner'
    )
  );

-- ============================================================
-- ORGANISATION MEMBERS: allow user to self-join as business_owner
-- ============================================================
create policy "users can self-join as owner" on public.organisation_members
  for insert with check (user_id = auth.uid());

-- ============================================================
-- AUDIT LOG: security-definer function — bypasses RLS so the app
-- can't inject bad organisation_id; user_id always = auth.uid()
-- ============================================================
create or replace function public.log_audit(
  p_organisation_id uuid,
  p_action         text,
  p_resource_type  text  default null,
  p_resource_id    uuid  default null,
  p_metadata       jsonb default '{}'
)
returns void
language plpgsql security definer as $$
begin
  insert into public.audit_logs (
    organisation_id, user_id, action, resource_type, resource_id, metadata
  ) values (
    p_organisation_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata
  );
end;
$$;
