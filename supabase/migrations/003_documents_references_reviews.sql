-- ============================================================================
-- Evidence OS — Phase 2 schema: Documents, References, Reviews, AI, Jurisdiction
-- Run in Supabase SQL Editor. Safe to re-run (idempotent guards throughout).
-- All case-scoped tables use RLS through cases.owner_id = auth.uid().
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ─── Expand cases with jurisdiction / party fields ──────────────────────────
alter table public.cases add column if not exists case_number       text;
alter table public.cases add column if not exists case_type         text;
alter table public.cases add column if not exists state             text;
alter table public.cases add column if not exists county            text;
alter table public.cases add column if not exists circuit_district  text;
alter table public.cases add column if not exists court_name        text;
alter table public.cases add column if not exists division          text;
alter table public.cases add column if not exists judge             text;
alter table public.cases add column if not exists magistrate        text;
alter table public.cases add column if not exists petitioner        text;
alter table public.cases add column if not exists respondent        text;
alter table public.cases add column if not exists user_role         text;
alter table public.cases add column if not exists opposing_party    text;
alter table public.cases add column if not exists opposing_counsel  text;
alter table public.cases add column if not exists date_opened       date;
alter table public.cases add column if not exists jurisdiction      text;

-- ─── Jurisdiction reference tables (normalized, owner-scoped) ────────────────
create table if not exists public.jurisdictions (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid references public.profiles(id) on delete cascade,
  state        text not null,
  county       text,
  circuit_district text,
  created_at   timestamptz not null default now()
);

create table if not exists public.courts (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid references public.profiles(id) on delete cascade,
  jurisdiction_id uuid references public.jurisdictions(id) on delete cascade,
  name           text not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.judicial_divisions (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid references public.profiles(id) on delete cascade,
  court_id   uuid references public.courts(id) on delete cascade,
  name       text not null,
  procedures text,
  created_at timestamptz not null default now()
);

create table if not exists public.judges (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references public.profiles(id) on delete cascade,
  division_id uuid references public.judicial_divisions(id) on delete set null,
  name        text not null,
  role        text default 'judge', -- 'judge' | 'magistrate' | 'hearing_officer'
  procedures  text,
  created_at  timestamptz not null default now()
);

-- ─── Legal references + versions ────────────────────────────────────────────
create table if not exists public.legal_references (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  jurisdiction        text,
  state               text,
  county              text,
  circuit_district    text,
  court               text,
  division            text,
  judge               text,
  category            text not null,
  citation            text,
  source_url          text,
  source_org          text,
  effective_date      date,
  last_verified_date  date,
  superseded_date     date,
  version             integer not null default 1,
  uploaded_by         uuid references public.profiles(id),
  verification_status text not null default 'needs_verification',
  source_tier         text not null default 'official', -- 'official' | 'secondary'
  applicable_case_types text[] default '{}',
  full_text           text,
  summary             text,
  keywords            text[] default '{}',
  notes               text,
  file_path           text,          -- original document in storage
  content_hash        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.legal_reference_versions (
  id             uuid primary key default uuid_generate_v4(),
  reference_id   uuid not null references public.legal_references(id) on delete cascade,
  version        integer not null,
  effective_date date,
  superseded_date date,
  full_text      text,
  content_hash   text,
  created_at     timestamptz not null default now()
);

create table if not exists public.reference_sections (
  id           uuid primary key default uuid_generate_v4(),
  reference_id uuid not null references public.legal_references(id) on delete cascade,
  heading      text,
  text         text,
  ordinal      integer default 0
);

create table if not exists public.reference_case_links (
  reference_id uuid not null references public.legal_references(id) on delete cascade,
  case_id      uuid not null references public.cases(id) on delete cascade,
  primary key (reference_id, case_id)
);

create table if not exists public.source_urls (
  id           uuid primary key default uuid_generate_v4(),
  reference_id uuid references public.legal_references(id) on delete cascade,
  url          text not null,
  label        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.verification_records (
  id           uuid primary key default uuid_generate_v4(),
  reference_id uuid not null references public.legal_references(id) on delete cascade,
  verified_by  uuid references public.profiles(id),
  status       text not null,
  note         text,
  created_at   timestamptz not null default now()
);

-- ─── Templates ──────────────────────────────────────────────────────────────
create table if not exists public.document_templates (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references public.profiles(id) on delete cascade, -- null = built-in
  name        text not null,
  category    text not null,
  description text,
  built_in    boolean default false,
  body        text,               -- template markup with {{variables}}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.template_sections (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  kind        text not null,      -- static|editable|conditional|repeating|signature|caption|certificate...
  heading     text,
  body        text,
  ordinal     integer default 0,
  conditional_on text
);

create table if not exists public.template_variables (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  key         text not null,      -- e.g. case.case_name
  label       text,
  required    boolean default false,
  question    text,               -- prompt shown if value is missing
  var_type    text default 'text'
);

-- ─── Generated documents + provenance ───────────────────────────────────────
create table if not exists public.generated_documents (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  created_by   uuid references public.profiles(id),
  template_id  uuid references public.document_templates(id) on delete set null,
  title        text not null,
  category     text not null,
  status       text not null default 'draft', -- draft|in_review|reviewed|exported
  body         jsonb default '[]',  -- array of statements {id,text,status,sources}
  version      integer not null default 1,
  uses_superseded_reference boolean default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.document_versions (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.generated_documents(id) on delete cascade,
  version      integer not null,
  body         jsonb,
  -- snapshot of sources + reference versions used at generation time
  sources_snapshot jsonb default '[]',
  reference_versions_snapshot jsonb default '[]',
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create table if not exists public.document_sources (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.generated_documents(id) on delete cascade,
  source_type  text not null,     -- evidence|event|communication|order|person|reference|user_answer|document
  source_id    uuid,              -- may be null for user answers
  ref_version  integer,           -- reference version used, when source_type=reference
  excerpt      text,
  created_at   timestamptz not null default now()
);

create table if not exists public.document_exports (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.generated_documents(id) on delete cascade,
  format       text not null,     -- DOCX|PDF|TXT|COPY
  exported_by  uuid references public.profiles(id),
  attested     boolean default false,
  file_path    text,
  created_at   timestamptz not null default now()
);

-- ─── Reviews + findings ─────────────────────────────────────────────────────
create table if not exists public.document_reviews (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  document_id   uuid references public.generated_documents(id) on delete set null,
  document_title text,
  created_by    uuid references public.profiles(id),
  summary       jsonb default '{}',
  sources_checked     text[] default '{}',
  sources_unavailable text[] default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists public.review_findings (
  id            uuid primary key default uuid_generate_v4(),
  review_id     uuid not null references public.document_reviews(id) on delete cascade,
  category      text not null,     -- source_accuracy|citation|court_procedure|evidence_foundation|civil_procedure|writing_quality
  severity      text not null,     -- information|review|important|critical_verification
  section       text,
  highlighted_text text,
  explanation   text,
  reference_section_id uuid references public.reference_sections(id) on delete set null,
  source_relied text,
  rule_excerpt  text,
  effective_date date,
  suggested_correction text,
  decision      text not null default 'open', -- open|accepted|edited|dismissed|attorney_review
  created_at    timestamptz not null default now()
);

-- ─── AI conversations + source links ────────────────────────────────────────
create table if not exists public.ai_conversations (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  created_by  uuid references public.profiles(id),
  context     text,               -- Documents|Timeline|...
  created_at  timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null,  -- user|assistant
  mode            text,
  content         text,
  confidence      text,
  missing_info    text[] default '{}',
  warnings        text[] default '{}',
  strategy_refusal boolean default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.ai_source_links (
  id          uuid primary key default uuid_generate_v4(),
  message_id  uuid not null references public.ai_messages(id) on delete cascade,
  source_type text not null,
  source_id   uuid,
  label       text,
  reviewed    boolean default true  -- false => "records not reviewed"
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.jurisdictions            enable row level security;
alter table public.courts                    enable row level security;
alter table public.judicial_divisions        enable row level security;
alter table public.judges                    enable row level security;
alter table public.legal_references          enable row level security;
alter table public.legal_reference_versions  enable row level security;
alter table public.reference_sections        enable row level security;
alter table public.reference_case_links      enable row level security;
alter table public.source_urls               enable row level security;
alter table public.verification_records      enable row level security;
alter table public.document_templates        enable row level security;
alter table public.template_sections         enable row level security;
alter table public.template_variables        enable row level security;
alter table public.generated_documents       enable row level security;
alter table public.document_versions         enable row level security;
alter table public.document_sources          enable row level security;
alter table public.document_exports          enable row level security;
alter table public.document_reviews          enable row level security;
alter table public.review_findings           enable row level security;
alter table public.ai_conversations          enable row level security;
alter table public.ai_messages               enable row level security;
alter table public.ai_source_links           enable row level security;

-- Owner-scoped tables (owner_id = auth.uid())
do $$
declare t text;
begin
  foreach t in array array['jurisdictions','courts','judicial_divisions','judges','legal_references']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (owner_id = auth.uid()) with check (owner_id = auth.uid())$f$, t||'_owner', t);
  end loop;
end $$;

-- Case-scoped tables (through cases.owner_id)
do $$
declare t text;
begin
  foreach t in array array['generated_documents','document_reviews','ai_conversations']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_case_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))$f$,
      t||'_case_owner', t);
  end loop;
end $$;

-- Child tables scoped through their parent's ownership
drop policy if exists legal_reference_versions_owner on public.legal_reference_versions;
create policy legal_reference_versions_owner on public.legal_reference_versions for all
  using (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()));

drop policy if exists reference_sections_owner on public.reference_sections;
create policy reference_sections_owner on public.reference_sections for all
  using (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()));

drop policy if exists source_urls_owner on public.source_urls;
create policy source_urls_owner on public.source_urls for all
  using (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()));

drop policy if exists verification_records_owner on public.verification_records;
create policy verification_records_owner on public.verification_records for all
  using (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.legal_references r where r.id = reference_id and r.owner_id = auth.uid()));

drop policy if exists reference_case_links_owner on public.reference_case_links;
create policy reference_case_links_owner on public.reference_case_links for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

-- Templates: built-in rows readable by all; user rows owner-scoped
drop policy if exists document_templates_read on public.document_templates;
create policy document_templates_read on public.document_templates for select
  using (built_in = true or owner_id = auth.uid());
drop policy if exists document_templates_write on public.document_templates;
create policy document_templates_write on public.document_templates for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists template_sections_owner on public.template_sections;
create policy template_sections_owner on public.template_sections for all
  using (exists (select 1 from public.document_templates t where t.id = template_id and (t.owner_id = auth.uid() or t.built_in)))
  with check (exists (select 1 from public.document_templates t where t.id = template_id and t.owner_id = auth.uid()));

drop policy if exists template_variables_owner on public.template_variables;
create policy template_variables_owner on public.template_variables for all
  using (exists (select 1 from public.document_templates t where t.id = template_id and (t.owner_id = auth.uid() or t.built_in)))
  with check (exists (select 1 from public.document_templates t where t.id = template_id and t.owner_id = auth.uid()));

-- Document children scoped through generated_documents -> cases
do $$
declare t text;
begin
  foreach t in array array['document_versions','document_sources','document_exports']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.generated_documents d join public.cases c on c.id = d.case_id
                     where d.id = document_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.generated_documents d join public.cases c on c.id = d.case_id
                     where d.id = document_id and c.owner_id = auth.uid()))$f$, t||'_owner', t);
  end loop;
end $$;

drop policy if exists review_findings_owner on public.review_findings;
create policy review_findings_owner on public.review_findings for all
  using (exists (select 1 from public.document_reviews rv join public.cases c on c.id = rv.case_id
                 where rv.id = review_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.document_reviews rv join public.cases c on c.id = rv.case_id
                 where rv.id = review_id and c.owner_id = auth.uid()));

drop policy if exists ai_messages_owner on public.ai_messages;
create policy ai_messages_owner on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations a join public.cases c on c.id = a.case_id
                 where a.id = conversation_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.ai_conversations a join public.cases c on c.id = a.case_id
                 where a.id = conversation_id and c.owner_id = auth.uid()));

drop policy if exists ai_source_links_owner on public.ai_source_links;
create policy ai_source_links_owner on public.ai_source_links for all
  using (exists (select 1 from public.ai_messages m join public.ai_conversations a on a.id = m.conversation_id
                 join public.cases c on c.id = a.case_id where m.id = message_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.ai_messages m join public.ai_conversations a on a.id = m.conversation_id
                 join public.cases c on c.id = a.case_id where m.id = message_id and c.owner_id = auth.uid()));

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_legal_references_owner    on public.legal_references(owner_id);
create index if not exists idx_legal_references_category on public.legal_references(category);
create index if not exists idx_legal_references_status   on public.legal_references(verification_status);
create index if not exists idx_reference_sections_ref    on public.reference_sections(reference_id);
create index if not exists idx_reference_case_links_case on public.reference_case_links(case_id);
create index if not exists idx_generated_documents_case  on public.generated_documents(case_id);
create index if not exists idx_document_sources_doc      on public.document_sources(document_id);
create index if not exists idx_document_versions_doc     on public.document_versions(document_id);
create index if not exists idx_document_reviews_case     on public.document_reviews(case_id);
create index if not exists idx_review_findings_review    on public.review_findings(review_id);
create index if not exists idx_ai_messages_conversation  on public.ai_messages(conversation_id);
create index if not exists idx_ai_conversations_case     on public.ai_conversations(case_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['legal_references','document_templates','generated_documents']
  loop
    execute format('drop trigger if exists on_%s_update on public.%I', t, t);
    execute format('create trigger on_%s_update before update on public.%I for each row execute procedure public.handle_updated_at()', t, t);
  end loop;
end $$;
