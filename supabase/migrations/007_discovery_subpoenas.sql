-- ============================================================================
-- Evidence OS — Discovery generation completion: subpoena duces tecum builder
-- fields + per-item rows, served tracking on all instruments.
-- Run in Supabase SQL Editor after 006. Idempotent.
-- ============================================================================

-- ─── Subpoenas: builder fields ───────────────────────────────────────────────
alter table public.subpoenas add column if not exists recipient_person_id   uuid references public.people(id) on delete set null;
alter table public.subpoenas add column if not exists custodian_address     text;
alter table public.subpoenas add column if not exists registered_agent      text;
alter table public.subpoenas add column if not exists production_date       date;
alter table public.subpoenas add column if not exists production_place      text;
alter table public.subpoenas add column if not exists witness_fee_estimate  numeric;
alter table public.subpoenas add column if not exists service_fee_estimate  numeric;
alter table public.subpoenas add column if not exists copy_cost_estimate    numeric;
alter table public.subpoenas add column if not exists custodian_cert_text   text;
alter table public.subpoenas add column if not exists generated_document_id uuid references public.generated_documents(id) on delete set null;
alter table public.subpoenas add column if not exists served_date           date;   -- user-reported only
alter table public.subpoenas add column if not exists served_method         text;

-- Per-item document requests (mirrors discovery_request_items).
create table if not exists public.subpoena_items (
  id               uuid primary key default uuid_generate_v4(),
  subpoena_id      uuid not null references public.subpoenas(id) on delete cascade,
  ordinal          integer not null,
  text             text not null,
  date_range_start date,
  date_range_end   date
);

alter table public.subpoena_items enable row level security;
drop policy if exists subpoena_items_owner on public.subpoena_items;
create policy subpoena_items_owner on public.subpoena_items for all
  using (exists (select 1 from public.subpoenas s join public.cases c on c.id = s.case_id
                 where s.id = subpoena_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.subpoenas s join public.cases c on c.id = s.case_id
                 where s.id = subpoena_id and c.owner_id = auth.uid()));

create index if not exists idx_subpoena_items_subpoena on public.subpoena_items(subpoena_id);

-- ─── Served tracking on discovery requests (user-reported) ──────────────────
alter table public.discovery_requests add column if not exists served_date   date;
alter table public.discovery_requests add column if not exists served_method text;
alter table public.discovery_requests add column if not exists generated_document_id uuid references public.generated_documents(id) on delete set null;
