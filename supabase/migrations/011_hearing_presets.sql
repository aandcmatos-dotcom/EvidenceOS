-- ============================================================================
-- Evidence OS — Hearing-preparation presets.
-- Run after 010. Idempotent.
-- Presets carry WORKFLOW metadata only — no legal factors, elements, or
-- standards. Worksheets are built at runtime from the user's assigned references.
-- Seeded rows are global (case_id null) and user-editable/clonable per case.
-- ============================================================================

-- ─── Hearing-package preset link + per-hearing notes ────────────────────────
alter table public.hearing_packages add column if not exists hearing_type_key text;
alter table public.hearing_packages add column if not exists preset_notes text;

-- ─── Preset catalog ─────────────────────────────────────────────────────────
create table if not exists public.hearing_type_presets (
  id                   uuid primary key default uuid_generate_v4(),
  case_id              uuid references public.cases(id) on delete cascade, -- null = global seed
  key                  text not null,
  label                text not null,
  description          text,
  worksheet_kind       text not null default 'factor', -- factor|provision
  reference_categories text[] default '{}',
  contempt_bank        boolean not null default false,
  created_at           timestamptz not null default now()
);

create unique index if not exists idx_hearing_presets_global_key
  on public.hearing_type_presets(key) where case_id is null;
create index if not exists idx_hearing_presets_case on public.hearing_type_presets(case_id);

alter table public.hearing_type_presets enable row level security;
-- Global seeds are readable by any authenticated user; per-case rows follow case ownership.
drop policy if exists hearing_presets_read on public.hearing_type_presets;
create policy hearing_presets_read on public.hearing_type_presets for select
  using (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
drop policy if exists hearing_presets_write on public.hearing_type_presets;
create policy hearing_presets_write on public.hearing_type_presets for all
  using (case_id is not null and exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (case_id is not null and exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

-- ─── Seed global presets (idempotent by global key) ─────────────────────────
do $$
declare seed record;
begin
  for seed in
    select * from (values
      ('temporary_timesharing', 'Temporary timesharing / parenting',
       'Organize your evidence and the considerations listed in your assigned references for a temporary timesharing or parenting matter.',
       'factor', array['Family Law Statute','Family Law Procedural Rule','State Statute'], false),
      ('contempt_enforcement', 'Contempt / enforcement',
       'Organize the specific order provisions at issue and the events describing possible noncompliance, using your assigned references.',
       'provision', array['Family Law Statute','Family Law Procedural Rule','State Statute','Local Court Rule'], true)
    ) as t(key, label, description, worksheet_kind, reference_categories, contempt_bank)
  loop
    if not exists (select 1 from public.hearing_type_presets p where p.case_id is null and p.key = seed.key) then
      insert into public.hearing_type_presets (case_id, key, label, description, worksheet_kind, reference_categories, contempt_bank)
      values (null, seed.key, seed.label, seed.description, seed.worksheet_kind, seed.reference_categories, seed.contempt_bank);
    end if;
  end loop;
end $$;
