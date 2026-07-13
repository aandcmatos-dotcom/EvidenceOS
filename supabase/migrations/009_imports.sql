-- ============================================================================
-- Evidence OS — Bulk import: batches + file registry + extraction fields.
-- Run after 008. Idempotent. Files reuse the existing evidence-files bucket
-- under a batch-scoped prefix (caseId/imports/batchId/...). No AI, no classifier.
-- ============================================================================

-- ─── Extraction fields on evidence (backfill target) ────────────────────────
alter table public.evidence add column if not exists extracted_text text;
alter table public.evidence add column if not exists text_source    text;  -- text_layer | ocr | none
alter table public.evidence add column if not exists page_count     integer;

-- ─── Import batches ─────────────────────────────────────────────────────────
create table if not exists public.import_batches (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  created_by   uuid references public.profiles(id),
  source_label text,
  status       text not null default 'uploading', -- uploading|processing|ready_for_review|completed|failed
  total_count      integer not null default 0,
  uploaded_count   integer not null default 0,
  extracted_count  integer not null default 0,
  failed_count     integer not null default 0,
  duplicate_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Import files (registry) ────────────────────────────────────────────────
create table if not exists public.import_files (
  id                    uuid primary key default uuid_generate_v4(),
  batch_id              uuid not null references public.import_batches(id) on delete cascade,
  case_id               uuid not null references public.cases(id) on delete cascade,
  storage_path          text,
  original_filename     text not null,
  original_folder_path  text,          -- user's folder structure, preserved as metadata
  mime_type             text,
  size_bytes            bigint,
  sha256                text,
  status                text not null default 'uploaded', -- uploaded|extracting|extracted|needs_ocr|failed|duplicate|promoted
  duplicate_of          uuid references public.import_files(id) on delete set null,
  extracted_text        text,
  text_source           text,          -- text_layer | ocr | none
  page_count            integer,
  eml_headers           jsonb,         -- {from,to,date,subject} for later classification
  truncated             boolean default false,
  error_detail          text,
  promoted_evidence_id  uuid references public.evidence(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── RLS (per-case, matching existing policies) ─────────────────────────────
alter table public.import_batches enable row level security;
alter table public.import_files   enable row level security;

drop policy if exists import_batches_case_owner on public.import_batches;
create policy import_batches_case_owner on public.import_batches for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

drop policy if exists import_files_case_owner on public.import_files;
create policy import_files_case_owner on public.import_files for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_import_files_batch  on public.import_files(batch_id);
create index if not exists idx_import_files_case    on public.import_files(case_id);
create index if not exists idx_import_files_sha     on public.import_files(case_id, sha256);
create index if not exists idx_import_files_status  on public.import_files(batch_id, status);
create index if not exists idx_import_batches_case  on public.import_batches(case_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
drop trigger if exists on_import_batches_update on public.import_batches;
create trigger on_import_batches_update before update on public.import_batches
  for each row execute procedure public.handle_updated_at();
drop trigger if exists on_import_files_update on public.import_files;
create trigger on_import_files_update before update on public.import_files
  for each row execute procedure public.handle_updated_at();
