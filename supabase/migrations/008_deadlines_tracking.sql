-- ============================================================================
-- Evidence OS — Served/received tracking: verified deadlines, discovery
-- responses + deficiency worksheets, inbound filings.
-- Run after 007. Idempotent. A deadline is ALWAYS created requiring verification;
-- nothing in the schema or app computes due dates from hardcoded day counts.
-- ============================================================================

-- ─── Deadlines ──────────────────────────────────────────────────────────────
create table if not exists public.deadlines (
  id                UUID primary key default uuid_generate_v4(),
  case_id           uuid not null references public.cases(id) on delete cascade,
  source_type       text not null,   -- discovery_instrument | inbound_filing | court_order | hearing | manual
  source_id         uuid,
  title             text not null,
  trigger_event     text not null,   -- e.g. "Date served"
  trigger_date      date,
  counting_method_reference_id uuid references public.legal_references(id) on delete set null,
  computed_due_date date,            -- candidate only; never authoritative
  due_date          date,            -- user-confirmed final date (set at verification)
  status            text not null default 'requires_verification', -- requires_verification|verified|completed|superseded
  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

alter table public.deadlines enable row level security;
drop policy if exists deadlines_case_owner on public.deadlines;
create policy deadlines_case_owner on public.deadlines for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create index if not exists idx_deadlines_case on public.deadlines(case_id, status);
create index if not exists idx_deadlines_due  on public.deadlines(due_date) where status = 'verified';

-- ─── Instrument responses (what came back) ──────────────────────────────────
create table if not exists public.instrument_responses (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  instrument_type text not null,     -- discovery_request | subpoena
  instrument_id   uuid not null,
  received_date   date not null,
  evidence_id     uuid references public.evidence(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.instrument_responses enable row level security;
drop policy if exists instrument_responses_case_owner on public.instrument_responses;
create policy instrument_responses_case_owner on public.instrument_responses for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create index if not exists idx_instrument_responses_inst on public.instrument_responses(instrument_type, instrument_id);

-- ─── Deficiency worksheet entries (per numbered item) ───────────────────────
create table if not exists public.deficiency_entries (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  instrument_type text not null,
  instrument_id   uuid not null,
  ordinal         integer not null,
  item_text       text not null,     -- snapshot of the request text
  response_summary text,             -- user-entered summary of their response
  status          text not null default 'no_response', -- responded|partial|objected|no_response
  note            text,
  unique (instrument_type, instrument_id, ordinal)
);

alter table public.deficiency_entries enable row level security;
drop policy if exists deficiency_entries_case_owner on public.deficiency_entries;
create policy deficiency_entries_case_owner on public.deficiency_entries for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create index if not exists idx_deficiency_entries_inst on public.deficiency_entries(instrument_type, instrument_id);

-- ─── Inbound filings ────────────────────────────────────────────────────────
create table if not exists public.inbound_filings (
  id                 uuid primary key default uuid_generate_v4(),
  case_id            uuid not null references public.cases(id) on delete cascade,
  evidence_id        uuid references public.evidence(id) on delete set null,
  filing_type        text,
  filer              text,
  date_served        date,
  hearing_date       date,           -- user-entered; treated as a verified fact, not computed
  hearing_id         uuid references public.hearings(id) on delete set null,
  deadline_id        uuid references public.deadlines(id) on delete set null,
  response_action_id uuid references public.court_actions(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now()
);

alter table public.inbound_filings enable row level security;
drop policy if exists inbound_filings_case_owner on public.inbound_filings;
create policy inbound_filings_case_owner on public.inbound_filings for all
  using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
create index if not exists idx_inbound_filings_case on public.inbound_filings(case_id);
