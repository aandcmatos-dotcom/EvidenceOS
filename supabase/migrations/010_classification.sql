-- ============================================================================
-- Evidence OS — Import classification + lazy verification.
-- Run after 009. Idempotent.
-- Verification defaults to 'verified' so existing + manually-entered records are
-- NOT retroactively blocked at verify-at-use gates; the import auto-promote path
-- explicitly writes 'unverified'.
-- ============================================================================

-- ─── Verification columns (evidence + communications) ───────────────────────
alter table public.evidence add column if not exists verification_status text not null default 'verified'; -- unverified|verified|disputed
alter table public.evidence add column if not exists verified_by uuid references public.profiles(id);
alter table public.evidence add column if not exists verified_at timestamptz;
alter table public.evidence add column if not exists source_import_file_id uuid;

alter table public.communications add column if not exists verification_status text not null default 'verified';
alter table public.communications add column if not exists verified_by uuid references public.profiles(id);
alter table public.communications add column if not exists verified_at timestamptz;
alter table public.communications add column if not exists source_import_file_id uuid;

-- ─── Classification results (one row per import file, never overwrites edits) ─
create table if not exists public.import_file_classifications (
  id                  uuid primary key default uuid_generate_v4(),
  import_file_id      uuid not null references public.import_files(id) on delete cascade unique,
  case_id             uuid not null references public.cases(id) on delete cascade,
  primary_type        text,   -- court_order|pleading_filing|evidence|communication|discovery|hearing_material|case_note|legal_reference|administrative_record|other
  subtype             text,
  subject_categories  text[] default '{}',
  document_date       date,
  date_confidence     text,   -- high|medium|low
  detected_people     jsonb default '[]',   -- [{name, suggestedRole, matchedPersonId}]
  summary             text,
  detected_case_number text,
  case_number_matches boolean,
  confidence          text not null default 'low', -- high|medium|low
  flags               text[] default '{}',
  routing             text not null default 'review_queue', -- auto_accepted|review_queue|mandatory
  classification_source text not null default 'heuristic', -- ai|heuristic
  -- fields the user has edited — protected from any future reclassification
  user_edited_fields  text[] default '{}',
  resolved            boolean default false,   -- mandatory items: confirmed/rejected
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.import_file_classifications enable row level security;
drop policy if exists import_file_classifications_case_owner on public.import_file_classifications;
create policy import_file_classifications_case_owner on public.import_file_classifications for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create index if not exists idx_classifications_case    on public.import_file_classifications(case_id);
create index if not exists idx_classifications_routing on public.import_file_classifications(case_id, routing, resolved);
create index if not exists idx_evidence_verification   on public.evidence(case_id, verification_status);

drop trigger if exists on_classifications_update on public.import_file_classifications;
create trigger on_classifications_update before update on public.import_file_classifications
  for each row execute procedure public.handle_updated_at();
