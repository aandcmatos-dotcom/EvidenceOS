-- ============================================================================
-- Evidence OS — Phase 4: security, audit logging, retention, consent, redaction
-- Run in Supabase SQL Editor. Idempotent. RLS scoped to the acting user.
-- ============================================================================

-- ─── Consent + retention on profiles ────────────────────────────────────────
alter table public.profiles add column if not exists ai_training_opt_in boolean not null default false;
alter table public.profiles add column if not exists retention_days integer;  -- null = keep indefinitely
alter table public.profiles add column if not exists deletion_requested_at timestamptz;

-- ─── Generic audit log ──────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  case_id     uuid references public.cases(id) on delete set null,
  action      text not null,        -- e.g. 'document.export', 'reference.verify', 'case.delete'
  entity_type text,
  entity_id   uuid,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

-- ─── File access history (storage reads / signed-url issuance) ──────────────
create table if not exists public.file_access_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  case_id     uuid references public.cases(id) on delete set null,
  file_path   text not null,
  access_type text not null default 'view', -- view|download|signed_url
  created_at  timestamptz not null default now()
);

-- ─── Export history ─────────────────────────────────────────────────────────
create table if not exists public.export_history (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  document_id uuid references public.generated_documents(id) on delete set null,
  format      text not null,
  attested    boolean default false,
  redactions_applied integer default 0,
  created_at  timestamptz not null default now()
);

-- ─── AI request logs + source-use logs ──────────────────────────────────────
create table if not exists public.ai_request_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  case_id     uuid references public.cases(id) on delete set null,
  mode        text,
  context     text,
  model       text,
  used_llm    boolean default false, -- false = deterministic fallback
  created_at  timestamptz not null default now()
);

create table if not exists public.source_use_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  request_id    uuid references public.ai_request_logs(id) on delete cascade,
  source_type   text not null,
  source_id     uuid,
  reference_version integer,
  created_at    timestamptz not null default now()
);

-- ─── Redaction records ──────────────────────────────────────────────────────
create table if not exists public.redaction_records (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade,
  document_id uuid references public.generated_documents(id) on delete cascade,
  kind        text not null,       -- ssn|phone|email|...
  approved    boolean default false,
  created_at  timestamptz not null default now()
);

-- ─── RLS: every row belongs to the acting user ──────────────────────────────
alter table public.audit_logs          enable row level security;
alter table public.file_access_history enable row level security;
alter table public.export_history       enable row level security;
alter table public.ai_request_logs      enable row level security;
alter table public.source_use_logs      enable row level security;
alter table public.redaction_records    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['audit_logs','file_access_history','export_history','ai_request_logs','source_use_logs','redaction_records']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_self', t);
    execute format($f$create policy %I on public.%I for all
      using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t||'_self', t);
  end loop;
end $$;

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_audit_logs_user  on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_logs_case  on public.audit_logs(case_id);
create index if not exists idx_file_access_user on public.file_access_history(user_id, created_at desc);
create index if not exists idx_export_history_user on public.export_history(user_id, created_at desc);
create index if not exists idx_ai_request_logs_user on public.ai_request_logs(user_id, created_at desc);
create index if not exists idx_source_use_logs_req on public.source_use_logs(request_id);
create index if not exists idx_redaction_records_doc on public.redaction_records(document_id);
