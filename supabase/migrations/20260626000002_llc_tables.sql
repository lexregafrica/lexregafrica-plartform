-- LexReg Africa — Phase 1B: LLC Tables
-- Private Company Limited by Shares pilot schema
-- New: documents, compliance, onboarding, directors, shareholders, BOs, forms, notifications

-- ============================================================
-- NEW ENUMS
-- ============================================================
create type public.document_category as enum (
  'legal', 'governance', 'financial', 'compliance', 'operational', 'other'
);

create type public.compliance_status as enum (
  'pending', 'complete', 'overdue'
);

create type public.shareholder_type as enum (
  'individual', 'company'
);

create type public.applicant_relationship as enum (
  'promoter', 'director', 'shareholder', 'advocate', 'authorised_agent'
);

-- ============================================================
-- EXTEND ENTITIES TABLE (add LLC-specific fields)
-- ============================================================
alter table public.entities
  add column if not exists proposed_names           jsonb default '[]',
  add column if not exists nature_of_business       text,
  add column if not exists postal_address           jsonb,
  add column if not exists nominal_capital          numeric(12,2),
  add column if not exists total_shares             integer,
  add column if not exists share_class              text default 'ordinary',
  add column if not exists has_custom_articles      boolean default false,
  add column if not exists articles_url             text,
  add column if not exists registration_status      text, -- draft | awaiting_signature | awaiting_payment | submitted_brs | query_registrar | approved | certificate_issued | onboarding_complete
  add column if not exists applicant_name           text,
  add column if not exists applicant_email          text,
  add column if not exists applicant_mobile         text,
  add column if not exists applicant_relationship   public.applicant_relationship;

-- ============================================================
-- 1. DOCUMENTS
-- Document Vault — per-entity file storage with OCR tracking
-- ============================================================
create table public.documents (
  id              uuid primary key default uuid_generate_v4(),
  entity_id       uuid references public.entities(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name            text not null,
  document_type   text,                                -- 'certificate_of_incorporation' | 'cr12' | 'kra_pin' | 'cr1' | 'cr2' | 'cr8' | 'passport_photo' | 'id_copy' | 'memart' | etc.
  category        public.document_category default 'other',
  file_path       text,                                -- Supabase storage path
  file_size       bigint,
  mime_type       text,
  version         integer not null default 1,
  ocr_status      text,                                -- 'pending' | 'processing' | 'complete' | 'failed'
  ocr_data        jsonb default '{}',                  -- extracted fields from OCR
  tags            jsonb default '[]',
  metadata        jsonb default '{}',                  -- { uploaded_from: 'onboarding' | 'vault', is_signed: bool, etc. }
  uploaded_by     uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ============================================================
-- 2. COMPLIANCE EVENTS
-- Compliance Calendar — per-entity deadlines, reminders, status
-- ============================================================
create table public.compliance_events (
  id              uuid primary key default uuid_generate_v4(),
  entity_id       uuid not null references public.entities(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date not null,
  status          public.compliance_status not null default 'pending',
  category        text,                                -- 'annual_return' | 'bo_update' | 'register_maintenance' | 'tax' | 'license' | 'custom'
  assigned_to     uuid references auth.users(id),
  completed_at    timestamptz,
  completed_by    uuid references auth.users(id),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 3. ONBOARDING PROGRESS
-- Save-as-draft for multi-step onboarding wizard
-- ============================================================
create table public.onboarding_progress (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  onboarding_path public.onboarding_path not null,
  entity_type     public.entity_type not null default 'limited_company',
  step            integer not null default 0,
  data            jsonb not null default '{}',        -- partial form data
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 4. DIRECTORS
-- Per-entity director/trustee register
-- ============================================================
create table public.directors (
  id                  uuid primary key default uuid_generate_v4(),
  entity_id           uuid not null references public.entities(id) on delete cascade,
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  full_name           text not null,
  id_type             text not null default 'national_id', -- 'national_id' | 'passport' | 'alien_id'
  id_number           text not null,
  kra_pin             text,
  phone               text,
  email               text,
  residential_address jsonb,                             -- { line1, line2, city, county, country }
  nationality         text not null default 'Kenyan',
  is_foreign          boolean not null default false,
  passport_photo_url  text,
  is_shareholder      boolean default false,
  is_beneficial_owner boolean default false,
  appointment_date    date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 5. SHAREHOLDERS
-- Cap table / shareholder register per entity
-- ============================================================
create table public.shareholders (
  id                  uuid primary key default uuid_generate_v4(),
  entity_id           uuid not null references public.entities(id) on delete cascade,
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  shareholder_type    public.shareholder_type not null default 'individual',
  legal_name          text not null,                     -- individual name or company name
  id_or_reg_number    text,                              -- national ID/passport or company reg number
  kra_pin             text,
  address             jsonb,
  email               text,
  phone               text,
  shares_held         integer not null default 0,
  share_percentage    numeric(5,2),
  is_corporate        boolean not null default false,
  corporate_details   jsonb,                             -- { jurisdiction, reg_number, contact_person } when is_corporate
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 6. BENEFICIAL OWNERS
-- Separate BO register (per Kenya law — distinct from shareholder register)
-- ============================================================
create table public.beneficial_owners (
  id                  uuid primary key default uuid_generate_v4(),
  entity_id           uuid not null references public.entities(id) on delete cascade,
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  full_name           text not null,
  id_number           text,
  id_type             text default 'national_id',
  kra_pin             text,
  nationality         text not null default 'Kenyan',
  date_of_birth       date,
  postal_address      jsonb,
  business_address    jsonb,
  residential_address jsonb,
  phone               text,
  email               text,
  occupation          text,
  nature_of_control   text,                              -- e.g. 'direct_shareholding', 'indirect_control', 'significant_influence'
  date_became_bo      date,
  share_percentage    numeric(5,2),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- 7. COMPANY FORMS
-- CR1, CR2, CR8, statement of nominal capital, etc.
-- ============================================================
create table public.company_forms (
  id              uuid primary key default uuid_generate_v4(),
  entity_id       uuid not null references public.entities(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  form_type       text not null,                          -- 'cr1' | 'cr2' | 'cr8' | 'statement_of_nominal_capital' | 'memart' | 'other'
  status          text not null default 'generated',      -- 'generated' | 'signed' | 'uploaded' | 'submitted'
  file_url        text,                                   -- path to signed/uploaded PDF
  generated_at    timestamptz,
  signed_at       timestamptz,
  uploaded_at     timestamptz,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 8. NOTIFICATIONS
-- In-app + push notification queue
-- ============================================================
create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  type            text not null,                           -- 'deadline_reminder' | 'invite' | 'audit_complete' | 'status_change'
  title           text not null,
  body            text,
  link            text,
  read            boolean not null default false,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.documents enable row level security;
alter table public.compliance_events enable row level security;
alter table public.onboarding_progress enable row level security;
alter table public.directors enable row level security;
alter table public.shareholders enable row level security;
alter table public.beneficial_owners enable row level security;
alter table public.company_forms enable row level security;
alter table public.notifications enable row level security;

-- ============================================================
-- RLS POLICIES
-- Pattern: business_owner sees own org; lawyer sees assigned; super_admin sees all
-- ============================================================

-- DOCUMENTS
create policy "org members see documents" on public.documents
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    ) or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = documents.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "org members manage documents" on public.documents
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- COMPLIANCE EVENTS
create policy "org members see compliance" on public.compliance_events
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    ) or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = compliance_events.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "org members manage compliance" on public.compliance_events
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- ONBOARDING PROGRESS (user-scoped)
create policy "own onboarding progress" on public.onboarding_progress
  for all using (user_id = auth.uid() or is_super_admin());

-- DIRECTORS
create policy "org members see directors" on public.directors
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    ) or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = directors.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "org members manage directors" on public.directors
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- SHAREHOLDERS
create policy "org members see shareholders" on public.shareholders
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    ) or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = shareholders.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "org members manage shareholders" on public.shareholders
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- BENEFICIAL OWNERS
create policy "org members see beneficial owners" on public.beneficial_owners
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    ) or
    exists (
      select 1 from public.lawyer_assignments la
      where la.entity_id = beneficial_owners.entity_id and la.lawyer_user_id = auth.uid() and la.status = 'active'
    )
  );

create policy "org members manage beneficial owners" on public.beneficial_owners
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- COMPANY FORMS
create policy "org members see forms" on public.company_forms
  for select using (
    is_super_admin() or
    organisation_id in (
      select organisation_id from public.organisation_members
      where user_id = auth.uid()
    )
  );

create policy "org members manage forms" on public.company_forms
  for all using (
    is_super_admin() or
    get_user_role(organisation_id) = 'business_owner'
  );

-- NOTIFICATIONS (user-scoped)
create policy "own notifications" on public.notifications
  for all using (user_id = auth.uid() or is_super_admin());

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
create trigger documents_updated_at before update on public.documents
  for each row execute function public.handle_updated_at();

create trigger compliance_events_updated_at before update on public.compliance_events
  for each row execute function public.handle_updated_at();

create trigger onboarding_progress_updated_at before update on public.onboarding_progress
  for each row execute function public.handle_updated_at();

create trigger directors_updated_at before update on public.directors
  for each row execute function public.handle_updated_at();

create trigger shareholders_updated_at before update on public.shareholders
  for each row execute function public.handle_updated_at();

create trigger beneficial_owners_updated_at before update on public.beneficial_owners
  for each row execute function public.handle_updated_at();

create trigger company_forms_updated_at before update on public.company_forms
  for each row execute function public.handle_updated_at();
