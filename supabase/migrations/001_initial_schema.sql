-- Evidence OS – Initial Schema
-- Run in Supabase SQL Editor or via Supabase CLI: supabase db push

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users / Profiles ────────────────────────────────────────────────────────
-- Auth users live in auth.users (managed by Supabase).
-- This table stores app-level profile data.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  avatar_url    text,
  plan          text not null default 'free', -- 'free' | 'pro'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Cases ───────────────────────────────────────────────────────────────────
create table if not exists public.cases (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  case_number   text,
  court         text,
  judge         text,
  status        text not null default 'active', -- 'active' | 'closed' | 'archived'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── People ──────────────────────────────────────────────────────────────────
create table if not exists public.people (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  name          text not null,
  role          text not null, -- 'Petitioner' | 'Respondent' | 'Witness' | 'Attorney' | 'Judge' | 'Other'
  relationship  text,
  phone         text,
  email         text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─── Evidence ────────────────────────────────────────────────────────────────
create table if not exists public.evidence (
  id              uuid primary key default uuid_generate_v4(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  uploaded_by     uuid not null references public.profiles(id),
  title           text not null,
  category        text not null, -- 'Messages'|'School'|'Medical'|'Police'|'Court Orders'|'Photos'|'Videos'|'Other'
  file_type       text,          -- 'PDF'|'XLSX'|'ZIP'|'JPG'|'PNG'|'MP4'
  file_path       text,          -- Supabase Storage path
  file_size_bytes bigint,
  tags            text[] default '{}',
  exhibit_number  text,
  status          text not null default 'pending', -- 'pending'|'reviewed'|'flagged'
  -- AI-generated fields (user must approve before saving)
  ai_summary          text,
  ai_dates_detected   text[],
  ai_people_detected  text[],
  ai_category_suggest text,
  ai_approved         boolean default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Timeline Events ──────────────────────────────────────────────────────────
create table if not exists public.timeline_events (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  title       text not null,
  description text,
  event_date  date not null,
  category    text not null, -- 'Exchanges'|'School'|'Medical'|'Police'|'Communications'|'Court Orders'|'Financial'|'Other'
  severity    text not null default 'low', -- 'high'|'medium'|'low'
  flagged     boolean default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Exhibits ─────────────────────────────────────────────────────────────────
create table if not exists public.exhibits (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  evidence_id   uuid references public.evidence(id) on delete set null,
  number        text not null,  -- 'Exhibit 1', 'Exhibit A', etc.
  title         text not null,
  description   text,
  status        text not null default 'pending', -- 'pending'|'marked'
  admitted      boolean default false,
  created_at    timestamptz not null default now()
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id),
  title       text not null,
  due_date    date,
  priority    text not null default 'medium', -- 'high'|'medium'|'low'
  status      text not null default 'pending', -- 'pending'|'in-progress'|'done'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Court Orders ─────────────────────────────────────────────────────────────
create table if not exists public.court_orders (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  evidence_id   uuid references public.evidence(id) on delete set null,
  title         text not null,
  issued_date   date,
  judge         text,
  summary       text,
  status        text not null default 'active', -- 'active'|'superseded'|'expired'
  created_at    timestamptz not null default now()
);

-- ─── Hearings ─────────────────────────────────────────────────────────────────
create table if not exists public.hearings (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  hearing_type  text not null,
  hearing_date  timestamptz,
  location      text,
  department    text,
  notes         text,
  created_at    timestamptz not null default now()
);

-- ─── Hearing Packets ──────────────────────────────────────────────────────────
create table if not exists public.hearing_packets (
  id          uuid primary key default uuid_generate_v4(),
  hearing_id  uuid not null references public.hearings(id) on delete cascade,
  case_id     uuid not null references public.cases(id) on delete cascade,
  created_by  uuid not null references public.profiles(id),
  sections    jsonb not null default '{}', -- stores selected event/evidence IDs and export config
  exported_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ─── Join Tables ──────────────────────────────────────────────────────────────
-- Evidence ↔ Timeline Events
create table if not exists public.evidence_timeline_links (
  evidence_id       uuid not null references public.evidence(id) on delete cascade,
  timeline_event_id uuid not null references public.timeline_events(id) on delete cascade,
  primary key (evidence_id, timeline_event_id)
);

-- Evidence ↔ People
create table if not exists public.evidence_people_links (
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  person_id   uuid not null references public.people(id) on delete cascade,
  primary key (evidence_id, person_id)
);

-- Timeline Events ↔ People
create table if not exists public.timeline_people_links (
  timeline_event_id uuid not null references public.timeline_events(id) on delete cascade,
  person_id         uuid not null references public.people(id) on delete cascade,
  primary key (timeline_event_id, person_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.cases             enable row level security;
alter table public.people            enable row level security;
alter table public.evidence          enable row level security;
alter table public.timeline_events   enable row level security;
alter table public.exhibits          enable row level security;
alter table public.tasks             enable row level security;
alter table public.court_orders      enable row level security;
alter table public.hearings          enable row level security;
alter table public.hearing_packets   enable row level security;
alter table public.evidence_timeline_links enable row level security;
alter table public.evidence_people_links   enable row level security;
alter table public.timeline_people_links   enable row level security;

-- Profiles: users can only read/write their own
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id);

-- Cases: owner only
create policy "cases_owner" on public.cases
  for all using (auth.uid() = owner_id);

-- All case-scoped tables: access only if user owns the case
create policy "people_case_owner" on public.people
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "evidence_case_owner" on public.evidence
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "timeline_case_owner" on public.timeline_events
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "exhibits_case_owner" on public.exhibits
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "tasks_case_owner" on public.tasks
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "court_orders_case_owner" on public.court_orders
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "hearings_case_owner" on public.hearings
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

create policy "hearing_packets_case_owner" on public.hearing_packets
  for all using (exists (select 1 from public.cases c where c.id = case_id and c.owner_id = auth.uid()));

-- Join table policies (access if user owns the case of the primary record)
create policy "etl_owner" on public.evidence_timeline_links
  for all using (exists (
    select 1 from public.evidence e
    join public.cases c on c.id = e.case_id
    where e.id = evidence_id and c.owner_id = auth.uid()
  ));

create policy "epl_owner" on public.evidence_people_links
  for all using (exists (
    select 1 from public.evidence e
    join public.cases c on c.id = e.case_id
    where e.id = evidence_id and c.owner_id = auth.uid()
  ));

create policy "tpl_owner" on public.timeline_people_links
  for all using (exists (
    select 1 from public.timeline_events t
    join public.cases c on c.id = t.case_id
    where t.id = timeline_event_id and c.owner_id = auth.uid()
  ));

-- ─── Storage Bucket ───────────────────────────────────────────────────────────
-- Create via Supabase Dashboard → Storage → New Bucket
-- Bucket name: evidence-files
-- Public: false (private)
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/*, application/vnd.ms-excel,
--   application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--   application/zip, video/mp4

-- Storage RLS: only uploader can access their files
-- (Add these policies in the Supabase Dashboard → Storage → Policies)

-- ─── Helper: auto-update updated_at ──────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profiles_update   before update on public.profiles        for each row execute procedure public.handle_updated_at();
create trigger on_cases_update      before update on public.cases           for each row execute procedure public.handle_updated_at();
create trigger on_evidence_update   before update on public.evidence        for each row execute procedure public.handle_updated_at();
create trigger on_timeline_update   before update on public.timeline_events for each row execute procedure public.handle_updated_at();
create trigger on_tasks_update      before update on public.tasks           for each row execute procedure public.handle_updated_at();

-- ─── New User Trigger ────────────────────────────────────────────────────────
-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
