-- ============================================================
-- Backlly Phase 1: Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- 1. Tables
-- ============================================================

-- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- user_profiles (links to auth.users)
create table user_profiles (
  id uuid primary key references auth.users(id),
  organization_id uuid references organizations(id),
  display_name text not null,
  email text not null,
  role text not null default 'viewer',
  department text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- templates
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_type text not null,
  description text,
  is_published boolean default false,
  organization_id uuid references organizations(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- template_versions
create table template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references templates(id),
  version integer not null,
  body jsonb not null,
  variables jsonb not null,
  layout jsonb,
  valid_from date,
  valid_until date,
  is_draft boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  document_number text unique,
  template_id uuid references templates(id),
  template_version_id uuid references template_versions(id),
  title text not null,
  document_type text not null,
  status text not null default 'draft',
  confidentiality text not null default 'internal',
  body_snapshot jsonb,
  rendered_html text,
  created_by uuid references auth.users(id),
  organization_id uuid references organizations(id),
  issued_at timestamptz,
  issued_by uuid references auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancel_reason text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- document_values
create table document_values (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  variable_key text not null,
  value text,
  value_type text default 'text',
  created_at timestamptz default now()
);

-- approval_records
create table approval_records (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  step_order integer not null,
  approver_id uuid references auth.users(id),
  action text not null,
  comment text,
  acted_at timestamptz,
  created_at timestamptz default now()
);

-- audit_logs
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  executed_at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  user_role text,
  target_type text not null,
  target_id uuid,
  operation text not null,
  before_value jsonb,
  after_value jsonb,
  ip_address inet,
  success boolean not null default true,
  comment text
);

-- workflow_definitions
create table workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  organization_id uuid references organizations(id),
  steps jsonb not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. updated_at Trigger Function
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers to all tables that have the column
create trigger set_updated_at before update on organizations
  for each row execute function update_updated_at_column();

create trigger set_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger set_updated_at before update on templates
  for each row execute function update_updated_at_column();

create trigger set_updated_at before update on documents
  for each row execute function update_updated_at_column();

create trigger set_updated_at before update on workflow_definitions
  for each row execute function update_updated_at_column();

-- ============================================================
-- 3. assign_document_number Function (Advisory Lock)
-- ============================================================

create or replace function assign_document_number(
  p_document_id uuid,
  p_document_type text,
  p_organization_id uuid
)
returns text as $$
declare
  v_prefix text;
  v_year text;
  v_seq integer;
  v_number text;
  v_lock_key bigint;
begin
  -- Build a deterministic lock key from org + document_type
  v_lock_key := abs(hashtext(p_organization_id::text || '::' || p_document_type));

  -- Acquire advisory lock to serialize number generation
  perform pg_advisory_xact_lock(v_lock_key);

  -- Derive prefix from document_type (uppercase, first 3 chars)
  v_prefix := upper(left(p_document_type, 3));
  v_year := to_char(now(), 'YYYY');

  -- Count existing documents of same type/org/year to determine sequence
  select count(*) + 1 into v_seq
  from documents
  where document_type = p_document_type
    and organization_id = p_organization_id
    and document_number is not null
    and document_number like v_prefix || '-' || v_year || '-%';

  -- Format: PREFIX-YYYY-NNNN (zero-padded to 4 digits)
  v_number := v_prefix || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  -- Assign the number to the document
  update documents
  set document_number = v_number
  where id = p_document_id;

  return v_number;
end;
$$ language plpgsql;

-- ============================================================
-- 4. Indexes for Search Performance
-- ============================================================

create index idx_documents_status on documents(status);
create index idx_documents_document_type on documents(document_type);
create index idx_documents_organization_id on documents(organization_id);
create index idx_documents_created_by on documents(created_by);
create index idx_audit_logs_target on audit_logs(target_type, target_id);
create index idx_documents_deleted_at on documents(deleted_at);
create index idx_templates_organization_id on templates(organization_id);
create index idx_template_versions_template_id on template_versions(template_id);
create index idx_document_values_document_id on document_values(document_id);
create index idx_approval_records_document_id on approval_records(document_id);
create index idx_user_profiles_organization_id on user_profiles(organization_id);
create index idx_workflow_definitions_document_type on workflow_definitions(document_type);

-- ============================================================
-- 5. Enable Row Level Security on All Tables
-- ============================================================

alter table organizations enable row level security;
alter table user_profiles enable row level security;
alter table templates enable row level security;
alter table template_versions enable row level security;
alter table documents enable row level security;
alter table document_values enable row level security;
alter table approval_records enable row level security;
alter table audit_logs enable row level security;
alter table workflow_definitions enable row level security;

-- ============================================================
-- 6. RLS Policies
-- ============================================================

-- ---- Helper: get the current user's organization_id ----
create or replace function current_user_organization_id()
returns uuid as $$
  select organization_id
  from user_profiles
  where id = auth.uid();
$$ language sql security definer stable;

-- ---- Helper: get the current user's role ----
create or replace function current_user_role()
returns text as $$
  select role
  from user_profiles
  where id = auth.uid();
$$ language sql security definer stable;

-- -------------------------------------------------------
-- organizations
-- -------------------------------------------------------
create policy "Users can view their own organization"
  on organizations for select
  using (id = current_user_organization_id());

create policy "Admins can update their own organization"
  on organizations for update
  using (id = current_user_organization_id() and current_user_role() = 'admin');

-- -------------------------------------------------------
-- user_profiles
-- -------------------------------------------------------
create policy "Users can view profiles in their organization"
  on user_profiles for select
  using (organization_id = current_user_organization_id());

create policy "Users can update their own profile"
  on user_profiles for update
  using (id = auth.uid());

create policy "Admins can insert profiles in their organization"
  on user_profiles for insert
  with check (organization_id = current_user_organization_id() and current_user_role() = 'admin');

-- -------------------------------------------------------
-- templates
-- -------------------------------------------------------
create policy "Users can view templates in their organization"
  on templates for select
  using (organization_id = current_user_organization_id() and deleted_at is null);

create policy "Editors and admins can insert templates"
  on templates for insert
  with check (
    organization_id = current_user_organization_id()
    and current_user_role() in ('admin', 'editor')
  );

create policy "Editors and admins can update templates"
  on templates for update
  using (
    organization_id = current_user_organization_id()
    and current_user_role() in ('admin', 'editor')
  );

-- -------------------------------------------------------
-- template_versions
-- -------------------------------------------------------
create policy "Users can view template versions for their org templates"
  on template_versions for select
  using (
    exists (
      select 1 from templates t
      where t.id = template_versions.template_id
        and t.organization_id = current_user_organization_id()
        and t.deleted_at is null
    )
  );

create policy "Editors and admins can insert template versions"
  on template_versions for insert
  with check (
    exists (
      select 1 from templates t
      where t.id = template_versions.template_id
        and t.organization_id = current_user_organization_id()
    )
    and current_user_role() in ('admin', 'editor')
  );

-- -------------------------------------------------------
-- documents
-- -------------------------------------------------------
create policy "Users can view documents in their organization"
  on documents for select
  using (
    organization_id = current_user_organization_id()
    and deleted_at is null
  );

create policy "Users can insert documents in their organization"
  on documents for insert
  with check (
    organization_id = current_user_organization_id()
    and created_by = auth.uid()
    and current_user_role() in ('admin', 'editor', 'approver')
  );

create policy "Creator or admin can update documents"
  on documents for update
  using (
    organization_id = current_user_organization_id()
    and (created_by = auth.uid() or current_user_role() = 'admin')
  );

-- -------------------------------------------------------
-- document_values
-- -------------------------------------------------------
create policy "Users can view document values for their org documents"
  on document_values for select
  using (
    exists (
      select 1 from documents d
      where d.id = document_values.document_id
        and d.organization_id = current_user_organization_id()
        and d.deleted_at is null
    )
  );

create policy "Users can insert document values for their documents"
  on document_values for insert
  with check (
    exists (
      select 1 from documents d
      where d.id = document_values.document_id
        and d.created_by = auth.uid()
    )
  );

create policy "Users can update document values for their documents"
  on document_values for update
  using (
    exists (
      select 1 from documents d
      where d.id = document_values.document_id
        and d.created_by = auth.uid()
    )
  );

-- -------------------------------------------------------
-- approval_records
-- -------------------------------------------------------
create policy "Users can view approval records for their org documents"
  on approval_records for select
  using (
    exists (
      select 1 from documents d
      where d.id = approval_records.document_id
        and d.organization_id = current_user_organization_id()
    )
  );

create policy "Approvers can insert approval records"
  on approval_records for insert
  with check (
    approver_id = auth.uid()
    and current_user_role() in ('admin', 'approver')
  );

create policy "Approvers can update their own approval records"
  on approval_records for update
  using (approver_id = auth.uid());

-- -------------------------------------------------------
-- audit_logs (INSERT only - no SELECT/UPDATE/DELETE via RLS)
-- -------------------------------------------------------
create policy "Authenticated users can insert audit logs"
  on audit_logs for insert
  with check (auth.uid() is not null);

-- Admins can read audit logs
create policy "Admins can view audit logs"
  on audit_logs for select
  using (current_user_role() = 'admin');

-- -------------------------------------------------------
-- workflow_definitions
-- -------------------------------------------------------
create policy "Users can view active workflows in their organization"
  on workflow_definitions for select
  using (
    organization_id = current_user_organization_id()
    and is_active = true
  );

create policy "Admins can insert workflow definitions"
  on workflow_definitions for insert
  with check (
    organization_id = current_user_organization_id()
    and current_user_role() = 'admin'
  );

create policy "Admins can update workflow definitions"
  on workflow_definitions for update
  using (
    organization_id = current_user_organization_id()
    and current_user_role() = 'admin'
  );
