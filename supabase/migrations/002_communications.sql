-- Communications log table
-- Run in Supabase SQL Editor

create table if not exists public.communications (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  comm_type     text not null default 'text', -- 'text'|'email'|'call'|'app'|'other'
  from_party    text not null,
  to_party      text not null,
  occurred_at   timestamptz not null default now(),
  summary       text,
  responded     boolean default false,
  message_count integer default 1,
  created_at    timestamptz not null default now()
);

alter table public.communications enable row level security;

create policy "communications_case_owner" on public.communications
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));
