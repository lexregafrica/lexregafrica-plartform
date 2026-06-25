-- LexReg Africa — Base Schema v1.0
-- Covers: organisations, profiles, roles, entities
-- All tables have organisation_id for multi-tenancy + RLS

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type public.user_role as enum (
  'super_admin',    -- Charles: sees all orgs, assigns lawyers, manages platform
  'business_owner', -- Primary user: manages their entity/entities
  'lawyer'          -- External: scoped to assigned entity + service only
);

create type public.entity_type as enum (
  'limited_company',        -- Ltd Co
  'public_limited_company', -- PLC
  'limited_liability_partnership', -- LLP
  'sole_proprietorship',
  'partnership',
  'company_limited_by_guarantee',
  'foreign_branch',
  'cooperative'
);

create type public.entity_status as enum (
  'draft',               -- onboarding in progress
  'pending_registration',-- formation submitted, awaiting BRS certificate
  'active',              -- fully registered and verified
  'suspended',
  'dissolved'
);

create type public.onboarding_path as enum (
  'existing_entity',   -- Path 1: already registered
  'new_entity',        -- Path 2: forming a new entity
  'informal_business'  -- Path 3: readiness assessment
);

-- ============================================================
-- ORGANISATIONS
-- Each "organisation" is one LexReg account (a business owner's workspace)
-- One business owner can have multiple entities under one organisation
-- ============================================================
create table public.organisations (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text unique not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz -- soft delete (30-day retention per Kenya DPA)
);

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with app-level data
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- ORGANISATION MEMBERS
-- Links users to organisations with a role
-- ============================================================
create table public.organisation_members (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.user_role not null default 'business_owner',
  invited_by      uuid references auth.users(id),
  joined_at       timestamptz not null default now(),
  unique(organisation_id, user_id)
);

-- ============================================================
-- ENTITIES
-- A registered (or being-registered) business entity
-- ============================================================
create table public.entities (
  id                  uuid primary key default uuid_generate_v4(),
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  entity_type         public.entity_type not null,
  status              public.entity_status not null default 'draft',
  onboarding_path     public.onboarding_path not null,

  -- Core identity
  legal_name          text,
  trading_name        text,
  registration_number text,
  kra_pin             text,
  date_incorporated   date,

  -- Contact
  registered_address  jsonb, -- { line1, line2, city, county, postcode }
  phone               text,
  email               text,

  -- Onboarding state (save-as-draft)
  onboarding_step     int not null default 0,
  onboarding_data     jsonb default '{}', -- stores partial form data between steps

  -- Metadata
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz -- soft delete
);

-- ============================================================
-- LAWYER ASSIGNMENTS
-- Tracks which lawyer is assigned to which entity for which service
-- ============================================================
create table public.lawyer_assignments (
  id              uuid primary key default uuid_generate_v4(),
  entity_id       uuid not null references public.entities(id) on delete cascade,
  lawyer_user_id  uuid not null references auth.users(id),
  assigned_by     uuid not null references auth.users(id), -- always super_admin
  service_type    text not null, -- 'legal_audit' | 'corporate_services'
  status          text not null default 'active', -- active | completed | cancelled
  notes           text,
  assigned_at     timestamptz not null default now(),
  completed_at    timestamptz
);

-- ============================================================
-- AUDIT LOG
-- Every significant action logged (who, what, when) — Kenya DPA requirement
-- ============================================================
create table public.audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  organisation_id uuid references public.organisations(id),
  user_id         uuid references auth.users(id),
  action          text not null,    -- e.g. 'entity.created', 'document.uploaded'
  resource_type   text,             -- e.g. 'entity', 'document'
  resource_id     uuid,
  metadata        jsonb default '{}',
  ip_address      inet,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.organisation_members enable row level security;
alter table public.entities enable row level security;
alter table public.lawyer_assignments enable row level security;
alter table public.audit_logs enable row level security;

-- HELPER: get current user's role in an organisation
create or replace function public.get_user_role(org_id uuid)
returns public.user_role
language sql stable security definer
as $$
  select role from public.organisation_members
  where organisation_id = org_id and user_id = auth.uid()
  limit 1;
$$;

-- HELPER: check if current user is super_admin anywhere
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.organisation_members
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- Organisations: member can see their own org; super_admin sees all
create policy "members see own org" on public.organisations
  for select using (
    is_super_admin() or
    exists (
      select 1 from public.organisation_members
      where organisation_id = id and user_id = auth.uid()
    )
  );

-- Profiles: users see and edit their own profile
create policy "own profile" on public.profiles
  for all using (id = auth.uid());

-- Organisation members: members see their org's members; super_admin sees all
create policy "members see org members" on public.organisation_members
  for select using (
    is_super_admin() or
    exists (
      select 1 from public.organisation_members m2
      where m2.organisation_id = organisation_id and m2.user_id = auth.uid()
    )
  );

-- Entities: business_owner sees own org's entities; lawyer sees assigned entities only
create policy "business owner sees own entities" on public.entities
  for select using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner' or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "business owner manages own entities" on public.entities
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- Lawyer assignments: super_admin manages; lawyers see their own assignments
create policy "super_admin manages assignments" on public.lawyer_assignments
  for all using (is_super_admin());

create policy "lawyer sees own assignment" on public.lawyer_assignments
  for select using (lawyer_user_id = auth.uid());

-- Audit logs: super_admin sees all; users see own org logs
create policy "audit log access" on public.audit_logs
  for select using (
    is_super_admin() or
    (organisation_id is not null and get_user_role(organisation_id) = 'business_owner')
  );

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_updated_at before update on public.organisations
  for each row execute function public.handle_updated_at();

create trigger entities_updated_at before update on public.entities
  for each row execute function public.handle_updated_at();

-- TRIGGER: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
