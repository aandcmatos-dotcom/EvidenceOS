-- ============================================================================
-- Evidence OS — Phase 2 (Court Action Workspace): actions, facts, citations,
-- packages, style profiles, jurisdiction packs, discovery, questions, exhibits.
-- Run in Supabase SQL Editor. Idempotent. RLS scoped through cases.owner_id.
-- Table list intentionally trimmed vs. the spec — see docs/COURT_ACTION_PLAN.md §6.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ─── Action core ────────────────────────────────────────────────────────────
create table if not exists public.court_actions (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  created_by   uuid references public.profiles(id),
  title        text not null,
  task_type    text not null,          -- temporary_relief|hearing_prep|enforcement|...
  status       text not null default 'not_started',
  step         integer not null default 1,
  free_text    text,                   -- "anything not covered above"
  posture      jsonb default '{}',     -- case-posture answers {questionId: yes|no|unknown}
  filing_status  jsonb default '{}',   -- user-reported only, never automatic
  service_status jsonb default '{}',   -- user-reported only, never automatic
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.court_action_answers (
  id           uuid primary key default uuid_generate_v4(),
  action_id    uuid not null references public.court_actions(id) on delete cascade,
  question_key text not null,
  answer       text,
  answered_at  timestamptz not null default now(),
  unique (action_id, question_key)
);

create table if not exists public.court_action_sources (
  action_id    uuid not null references public.court_actions(id) on delete cascade,
  source_type  text not null,
  source_id    uuid not null,
  primary key (action_id, source_type, source_id)
);

-- Facts approved ONCE per action, reused by every package document (plan §1.2).
create table if not exists public.fact_candidates (
  id           uuid primary key default uuid_generate_v4(),
  action_id    uuid not null references public.court_actions(id) on delete cascade,
  text         text not null,
  source_type  text,
  source_id    uuid,
  source_label text,
  source_date  date,
  support      text not null default 'needs_verification',
  conflict_note text,
  decision     text not null default 'pending',  -- pending|approved|edited|rejected
  edited_text  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.citation_suggestions (
  id           uuid primary key default uuid_generate_v4(),
  action_id    uuid not null references public.court_actions(id) on delete cascade,
  reference_id uuid references public.legal_references(id) on delete set null,
  title        text not null,
  citation     text,
  why_related  text,
  limitations  text,
  excerpt      text,
  decision     text not null default 'pending',  -- pending|approved|rejected|saved_for_later
  created_at   timestamptz not null default now()
);

-- ─── Packages ───────────────────────────────────────────────────────────────
create table if not exists public.court_action_packages (
  id          uuid primary key default uuid_generate_v4(),
  action_id   uuid not null references public.court_actions(id) on delete cascade,
  name        text not null default 'Package',
  created_at  timestamptz not null default now()
);

create table if not exists public.package_components (
  id                    uuid primary key default uuid_generate_v4(),
  package_id            uuid not null references public.court_action_packages(id) on delete cascade,
  name                  text not null,
  description           text,
  template_recommended  boolean default false,
  selected              boolean default true,
  status                text not null default 'not_started',
  generated_document_id uuid references public.generated_documents(id) on delete set null,
  ordinal               integer default 0
);

create table if not exists public.package_consistency_findings (
  id          uuid primary key default uuid_generate_v4(),
  package_id  uuid not null references public.court_action_packages(id) on delete cascade,
  field       text not null,
  values_json jsonb not null default '[]',   -- [{document, value}]
  note        text,
  resolved    boolean default false,
  created_at  timestamptz not null default now()
);

-- ─── Document definitions (seed data) + official forms ─────────────────────
create table if not exists public.document_definitions (
  id                 uuid primary key default uuid_generate_v4(),
  name               text not null unique,
  category           text not null,
  plain_definition   text,
  common_purpose     text,
  typical_stage      text,
  prerequisites      text[] default '{}',
  common_attachments text[] default '{}',
  related_documents  text[] default '{}',
  does_not_guarantee text,
  questions_before   text[] default '{}',
  official_source    text,
  source_excerpt     text,
  effective_date     date,
  verification_status text default 'none',
  has_template       boolean default false,
  keywords           text[] default '{}',
  jurisdictions      text[] default '{}'     -- empty = general
);

create table if not exists public.official_forms (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid references public.profiles(id) on delete cascade,
  jurisdiction text,
  name         text not null,
  source_url   text,
  file_path    text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ─── Case style / final-document components ─────────────────────────────────
create table if not exists public.case_style_profiles (
  id               uuid primary key default uuid_generate_v4(),
  case_id          uuid not null references public.cases(id) on delete cascade unique,
  font             text not null default 'Arial',
  font_size        integer not null default 12,
  line_spacing     text not null default 'double',
  margins_inches   numeric not null default 1.0,
  heading_style    text default 'centered-uppercase',
  page_number_position text default 'bottom-center',
  footer_text      text,
  line_numbering   boolean default false,
  pleading_paper   boolean default false,
  -- when an official source overrides a default, record it — never silent
  override_source  text,
  override_excerpt text,
  override_effective_date date,
  updated_at       timestamptz not null default now()
);

create table if not exists public.court_captions (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  label       text not null default 'Default caption',
  caption_text text not null,
  is_default  boolean default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.signature_profiles (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  kind        text not null default 'typed_s_name',  -- blank_line|typed_s_name|typed_plain|image|attorney|joint|notary|custom
  display_name text,
  image_path  text,                                  -- restricted storage path
  block_text  text,
  is_default  boolean default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.service_profiles (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  label       text not null default 'Default service list',
  recipients  jsonb not null default '[]',           -- [{name,email,address,method}]
  default_method text default 'email',
  is_default  boolean default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.document_component_settings (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.generated_documents(id) on delete cascade,
  component_key text not null,   -- signature|certificate_of_service|verification|notary|conferral|... (closed enum in code)
  enabled      boolean default false,
  source_reference_id uuid references public.legal_references(id) on delete set null,
  unique (document_id, component_key)
);

-- ─── Jurisdiction reference packs (pointer layer over legal_references) ─────
create table if not exists public.jurisdiction_reference_packs (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references public.profiles(id) on delete cascade,
  name        text not null,
  state       text,
  county      text,
  circuit_district text,
  court       text,
  division    text,
  judge       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.reference_pack_items (
  pack_id      uuid not null references public.jurisdiction_reference_packs(id) on delete cascade,
  reference_id uuid not null references public.legal_references(id) on delete cascade,
  primary key (pack_id, reference_id)
);

-- ─── Procedural checklists ──────────────────────────────────────────────────
create table if not exists public.procedural_checklists (
  id          uuid primary key default uuid_generate_v4(),
  action_id   uuid not null references public.court_actions(id) on delete cascade,
  name        text not null default 'Checklist',
  created_at  timestamptz not null default now()
);

create table if not exists public.procedural_checklist_items (
  id           uuid primary key default uuid_generate_v4(),
  checklist_id uuid not null references public.procedural_checklists(id) on delete cascade,
  phase        text not null,   -- before_drafting|before_filing|service|evidence|hearing|after_hearing
  text         text not null,
  origin       text not null default 'general_practice',
  source_label text,
  done         boolean default false,
  ordinal      integer default 0
);

-- ─── Discovery & subpoenas ──────────────────────────────────────────────────
create table if not exists public.discovery_requests (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  action_id   uuid references public.court_actions(id) on delete set null,
  kind        text not null,    -- production|interrogatories|admissions
  title       text not null,
  recipient   text,
  date_range_start date,
  date_range_end   date,
  definitions text,
  instructions text,
  status      text not null default 'draft',
  created_at  timestamptz not null default now()
);

create table if not exists public.discovery_request_items (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid not null references public.discovery_requests(id) on delete cascade,
  ordinal     integer not null,
  text        text not null,
  source_fact_id uuid references public.fact_candidates(id) on delete set null
);

create table if not exists public.subpoenas (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  action_id   uuid references public.court_actions(id) on delete set null,
  kind        text not null,    -- records|testimony|deposition|duces_tecum
  recipient   text not null,
  description text,
  status      text not null default 'draft',
  -- snapshot of jurisdiction procedure at generation time (plan §6)
  instructions_snapshot jsonb default '{}',
  created_at  timestamptz not null default now()
);

-- ─── Questions ──────────────────────────────────────────────────────────────
create table if not exists public.question_sets (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  action_id     uuid references public.court_actions(id) on delete set null,
  witness_person_id uuid references public.people(id) on delete set null,
  witness_name  text,
  question_type text not null,   -- direct|cross|redirect|rebuttal|deposition|interview|custodian|expert
  goals         text,
  created_at    timestamptz not null default now()
);

create table if not exists public.questions (
  id           uuid primary key default uuid_generate_v4(),
  set_id       uuid not null references public.question_sets(id) on delete cascade,
  group_label  text not null default 'Background',   -- collapsed question_groups (plan §6)
  text         text not null,
  source_fact_id uuid references public.fact_candidates(id) on delete set null,
  source_label text,
  requires_foundation boolean default false,
  ordinal      integer default 0
);

-- ─── Hearing packages & exhibit packets ─────────────────────────────────────
create table if not exists public.hearing_packages (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  action_id   uuid references public.court_actions(id) on delete set null,
  hearing_id  uuid references public.hearings(id) on delete set null,
  name        text not null,
  hearing_type text,
  hearing_date date,
  time_allowed text,
  created_at  timestamptz not null default now()
);

create table if not exists public.exhibit_packets (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  action_id    uuid references public.court_actions(id) on delete set null,
  name         text not null default 'Exhibit Packet',
  bates_prefix text,
  created_at   timestamptz not null default now()
);

create table if not exists public.exhibit_coversheets (
  id             uuid primary key default uuid_generate_v4(),
  packet_id      uuid not null references public.exhibit_packets(id) on delete cascade,
  evidence_id    uuid references public.evidence(id) on delete set null,
  exhibit_number text not null,
  description    text,
  ordinal        integer default 0
);

-- ─── Review confirmations (generalized) ─────────────────────────────────────
create table if not exists public.user_review_confirmations (
  id               uuid primary key default uuid_generate_v4(),
  entity_type      text not null,   -- court_action|generated_document|package
  entity_id        uuid not null,
  confirmation_key text not null,
  confirmed_by     uuid references public.profiles(id),
  confirmed_at     timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.court_actions                enable row level security;
alter table public.court_action_answers         enable row level security;
alter table public.court_action_sources         enable row level security;
alter table public.fact_candidates              enable row level security;
alter table public.citation_suggestions         enable row level security;
alter table public.court_action_packages        enable row level security;
alter table public.package_components           enable row level security;
alter table public.package_consistency_findings enable row level security;
alter table public.document_definitions         enable row level security;
alter table public.official_forms               enable row level security;
alter table public.case_style_profiles          enable row level security;
alter table public.court_captions               enable row level security;
alter table public.signature_profiles           enable row level security;
alter table public.service_profiles             enable row level security;
alter table public.document_component_settings  enable row level security;
alter table public.jurisdiction_reference_packs enable row level security;
alter table public.reference_pack_items         enable row level security;
alter table public.procedural_checklists        enable row level security;
alter table public.procedural_checklist_items   enable row level security;
alter table public.discovery_requests           enable row level security;
alter table public.discovery_request_items      enable row level security;
alter table public.subpoenas                    enable row level security;
alter table public.question_sets                enable row level security;
alter table public.questions                    enable row level security;
alter table public.hearing_packages             enable row level security;
alter table public.exhibit_packets              enable row level security;
alter table public.exhibit_coversheets          enable row level security;
alter table public.user_review_confirmations    enable row level security;

-- Case-scoped tables (direct case_id)
do $$
declare t text;
begin
  foreach t in array array['court_actions','case_style_profiles','court_captions',
                           'signature_profiles','service_profiles','discovery_requests','subpoenas',
                           'question_sets','hearing_packages','exhibit_packets']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_case_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))$f$,
      t||'_case_owner', t);
  end loop;
end $$;

-- Action-child tables (through court_actions -> cases)
do $$
declare t text;
begin
  foreach t in array array['court_action_answers','court_action_sources','fact_candidates',
                           'citation_suggestions','procedural_checklists','court_action_packages']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.court_actions a join public.cases c on c.id = a.case_id
                     where a.id = action_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.court_actions a join public.cases c on c.id = a.case_id
                     where a.id = action_id and c.owner_id = auth.uid()))$f$, t||'_owner', t);
  end loop;
end $$;

-- Package children (through court_action_packages -> court_actions -> cases)
do $$
declare t text;
begin
  foreach t in array array['package_components','package_consistency_findings']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.court_action_packages p
                     join public.court_actions a on a.id = p.action_id
                     join public.cases c on c.id = a.case_id
                     where p.id = package_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.court_action_packages p
                     join public.court_actions a on a.id = p.action_id
                     join public.cases c on c.id = a.case_id
                     where p.id = package_id and c.owner_id = auth.uid()))$f$, t||'_owner', t);
  end loop;
end $$;

-- Other child tables
drop policy if exists procedural_checklist_items_owner on public.procedural_checklist_items;
create policy procedural_checklist_items_owner on public.procedural_checklist_items for all
  using (exists (select 1 from public.procedural_checklists pc
                 join public.court_actions a on a.id = pc.action_id
                 join public.cases c on c.id = a.case_id
                 where pc.id = checklist_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.procedural_checklists pc
                 join public.court_actions a on a.id = pc.action_id
                 join public.cases c on c.id = a.case_id
                 where pc.id = checklist_id and c.owner_id = auth.uid()));

drop policy if exists discovery_request_items_owner on public.discovery_request_items;
create policy discovery_request_items_owner on public.discovery_request_items for all
  using (exists (select 1 from public.discovery_requests r join public.cases c on c.id = r.case_id
                 where r.id = request_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.discovery_requests r join public.cases c on c.id = r.case_id
                 where r.id = request_id and c.owner_id = auth.uid()));

drop policy if exists questions_owner on public.questions;
create policy questions_owner on public.questions for all
  using (exists (select 1 from public.question_sets s join public.cases c on c.id = s.case_id
                 where s.id = set_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.question_sets s join public.cases c on c.id = s.case_id
                 where s.id = set_id and c.owner_id = auth.uid()));

drop policy if exists exhibit_coversheets_owner on public.exhibit_coversheets;
create policy exhibit_coversheets_owner on public.exhibit_coversheets for all
  using (exists (select 1 from public.exhibit_packets p join public.cases c on c.id = p.case_id
                 where p.id = packet_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.exhibit_packets p join public.cases c on c.id = p.case_id
                 where p.id = packet_id and c.owner_id = auth.uid()));

drop policy if exists document_component_settings_owner on public.document_component_settings;
create policy document_component_settings_owner on public.document_component_settings for all
  using (exists (select 1 from public.generated_documents d join public.cases c on c.id = d.case_id
                 where d.id = document_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.generated_documents d join public.cases c on c.id = d.case_id
                 where d.id = document_id and c.owner_id = auth.uid()));

-- Owner-scoped tables
do $$
declare t text;
begin
  foreach t in array array['official_forms','jurisdiction_reference_packs']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format($f$create policy %I on public.%I for all
      using (owner_id = auth.uid()) with check (owner_id = auth.uid())$f$, t||'_owner', t);
  end loop;
end $$;

drop policy if exists reference_pack_items_owner on public.reference_pack_items;
create policy reference_pack_items_owner on public.reference_pack_items for all
  using (exists (select 1 from public.jurisdiction_reference_packs p where p.id = pack_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.jurisdiction_reference_packs p where p.id = pack_id and p.owner_id = auth.uid()));

-- document_definitions: global read (seed catalog), no user writes via anon
drop policy if exists document_definitions_read on public.document_definitions;
create policy document_definitions_read on public.document_definitions for select using (true);

drop policy if exists user_review_confirmations_self on public.user_review_confirmations;
create policy user_review_confirmations_self on public.user_review_confirmations for all
  using (confirmed_by = auth.uid()) with check (confirmed_by = auth.uid());

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_court_actions_case        on public.court_actions(case_id);
create index if not exists idx_court_action_answers_act  on public.court_action_answers(action_id);
create index if not exists idx_fact_candidates_action    on public.fact_candidates(action_id);
create index if not exists idx_citation_suggestions_act  on public.citation_suggestions(action_id);
create index if not exists idx_package_components_pkg    on public.package_components(package_id);
create index if not exists idx_discovery_items_request   on public.discovery_request_items(request_id);
create index if not exists idx_questions_set             on public.questions(set_id);
create index if not exists idx_exhibit_coversheets_pkt   on public.exhibit_coversheets(packet_id);
create index if not exists idx_checklist_items_checklist on public.procedural_checklist_items(checklist_id);
create index if not exists idx_reference_pack_items_pack on public.reference_pack_items(pack_id);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
drop trigger if exists on_court_actions_update on public.court_actions;
create trigger on_court_actions_update before update on public.court_actions
  for each row execute procedure public.handle_updated_at();
