-- ============================================================
-- AI base (proposal Phase 1): run log, review gate, entity memory and
-- searchable document text. Every table carries organisation_id, has RLS,
-- and is soft-delete only. Model calls happen server-side with the user's
-- own session, so these policies also bound what an agent can read.
-- ============================================================

-- Every agent run: who, which agent, model, tokens, outcome.
create table public.ai_runs (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  entity_id        uuid references public.entities(id) on delete cascade,
  user_id          uuid not null references auth.users(id),
  agent            text not null,        -- 'ask_filings' | 'lex_audit' | 'copilot'
  model            text not null,
  status           text not null default 'running', -- running | succeeded | failed | blocked
  input_tokens     integer not null default 0,
  output_tokens    integer not null default 0,
  question         text,
  answer           text,
  error            text,
  created_at       timestamptz not null default now(),
  finished_at      timestamptz,
  deleted_at       timestamptz
);
create index ai_runs_org_created on public.ai_runs (organisation_id, created_at desc);

-- Review gate: AI output that reaches a client only after a person signs it.
create table public.ai_drafts (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  entity_id        uuid not null references public.entities(id) on delete cascade,
  run_id           uuid references public.ai_runs(id),
  kind             text not null,        -- 'legal_audit_report' | 'resolution' | ...
  title            text not null,
  content          jsonb not null default '{}',
  status           text not null default 'draft', -- draft | in_review | approved | released | rejected
  reviewer_id      uuid references auth.users(id),
  signed_at        timestamptz,
  released_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index ai_drafts_org_status on public.ai_drafts (organisation_id, status);

-- Confirmed facts per entity, each with its source, for agent memory.
create table public.ai_memories (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  entity_id        uuid not null references public.entities(id) on delete cascade,
  fact             text not null,
  source           text,                 -- e.g. 'document:<id>' | 'register:directors'
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index ai_memories_entity on public.ai_memories (entity_id);

-- Searchable document text (filled from OCR). Postgres full-text search
-- now; an embedding column can be added later without changing callers.
create table public.document_chunks (
  id               uuid primary key default uuid_generate_v4(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  entity_id        uuid references public.entities(id) on delete cascade,
  document_id      uuid not null references public.documents(id) on delete cascade,
  chunk_index      integer not null default 0,
  content          text not null,
  tsv              tsvector generated always as (to_tsvector('english', content)) stored,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index document_chunks_tsv on public.document_chunks using gin (tsv);
create index document_chunks_entity on public.document_chunks (entity_id);

alter table public.ai_runs enable row level security;
alter table public.ai_drafts enable row level security;
alter table public.ai_memories enable row level security;
alter table public.document_chunks enable row level security;

-- Shared rule: super_admin all; owners their organisation; lawyers only
-- entities actively assigned to them.
create or replace function public.can_read_entity_ai(org_id uuid, ent_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_super_admin()
      or public.get_user_role(org_id) = 'business_owner'
      or (ent_id is not null and exists (
            select 1 from public.lawyer_assignments la
            where la.entity_id = ent_id and la.lawyer_user_id = auth.uid() and la.status = 'active'));
$$;
revoke all on function public.can_read_entity_ai(uuid, uuid) from public, anon;
grant execute on function public.can_read_entity_ai(uuid, uuid) to authenticated;

create policy "ai runs readable" on public.ai_runs for select
  using (deleted_at is null and (user_id = auth.uid() or public.is_super_admin() or public.get_user_role(organisation_id) = 'business_owner'));
create policy "ai runs insert own" on public.ai_runs for insert
  with check (user_id = auth.uid() and public.can_read_entity_ai(organisation_id, entity_id));
create policy "ai runs update own" on public.ai_runs for update
  using (user_id = auth.uid());

-- Clients see a draft only once released; reviewers see everything they review.
create policy "ai drafts readable" on public.ai_drafts for select
  using (deleted_at is null and (
    public.is_super_admin()
    or (status = 'released' and public.get_user_role(organisation_id) = 'business_owner')
    or exists (select 1 from public.lawyer_assignments la
               where la.entity_id = ai_drafts.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active')));
create policy "ai drafts managed by reviewers" on public.ai_drafts for all
  using (public.is_super_admin() or exists (select 1 from public.lawyer_assignments la
               where la.entity_id = ai_drafts.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'));

create policy "ai memories readable" on public.ai_memories for select
  using (deleted_at is null and public.can_read_entity_ai(organisation_id, entity_id));
create policy "ai memories write" on public.ai_memories for insert
  with check (created_by = auth.uid() and public.can_read_entity_ai(organisation_id, entity_id));

create policy "document chunks readable" on public.document_chunks for select
  using (deleted_at is null and public.can_read_entity_ai(organisation_id, entity_id));
create policy "document chunks write" on public.document_chunks for insert
  with check (public.is_super_admin() or public.get_user_role(organisation_id) = 'business_owner');

-- Daily AI use per organisation, for the usage cap.
create or replace function public.ai_runs_today(org_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.ai_runs
  where organisation_id = org_id and created_at > now() - interval '24 hours'
    and (public.is_super_admin() or public.get_user_role(org_id) is not null);
$$;
revoke all on function public.ai_runs_today(uuid) from public, anon;
grant execute on function public.ai_runs_today(uuid) to authenticated;
