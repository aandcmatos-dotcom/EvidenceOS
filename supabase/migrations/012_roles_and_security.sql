-- ============================================================================
-- Evidence OS — Party/Helper roles, case-membership RLS, reference-pack
-- attestation, first-login acknowledgment. Run after 011. Idempotent.
--
-- SECURITY MODEL CHANGE: every case-scoped table previously checked
-- `cases.owner_id = auth.uid()` directly. This migration introduces
-- `public.is_case_member()` / `public.case_role()` — owner ("party") OR an
-- accepted case_members row ("helper") — and re-points every one of those
-- policies at it, so helpers get the same read/write reach the app already
-- grants the owner EXCEPT the four approval surfaces gated below, which stay
-- party-only regardless of RLS via BEFORE triggers (RLS can't see "which
-- column changed", so column-level intent is enforced there instead).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── case_members ────────────────────────────────────────────────────────────
create table if not exists public.case_members (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'helper', -- party|helper
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  unique (case_id, user_id)
);
create index if not exists idx_case_members_case on public.case_members(case_id);
create index if not exists idx_case_members_user on public.case_members(user_id);

-- Backfill: every existing case owner is recorded as its party.
insert into public.case_members (case_id, user_id, role)
select c.id, c.owner_id, 'party' from public.cases c
on conflict (case_id, user_id) do nothing;

-- Every NEW case auto-registers its owner as party (backfill above only covers
-- cases that existed before this migration ran).
create or replace function public.add_case_owner_as_party() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.case_members (case_id, user_id, role) values (new.id, new.owner_id, 'party')
  on conflict (case_id, user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_case_owner_as_party on public.cases;
create trigger trg_case_owner_as_party after insert on public.cases
  for each row execute procedure public.add_case_owner_as_party();

-- ─── case_invites (party invites a helper by email) ─────────────────────────
create table if not exists public.case_invites (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  email        text not null,
  role         text not null default 'helper',
  token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by   uuid not null references public.profiles(id),
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '14 days')
);
create index if not exists idx_case_invites_case on public.case_invites(case_id);
create index if not exists idx_case_invites_token on public.case_invites(token);

-- ─── Membership helper functions (SECURITY DEFINER — bypass RLS for the
-- membership lookup itself, since case_members is protected by its own RLS
-- that would otherwise recurse). ────────────────────────────────────────────
create or replace function public.case_role(p_case_id uuid) returns text
language sql security definer stable set search_path = public as $$
  select role from public.case_members where case_id = p_case_id and user_id = auth.uid() limit 1;
$$;

create or replace function public.is_case_member(p_case_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.case_members where case_id = p_case_id and user_id = auth.uid());
$$;

create or replace function public.is_case_party(p_case_id uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.case_members where case_id = p_case_id and user_id = auth.uid() and role = 'party');
$$;

-- ─── case_members / case_invites RLS ─────────────────────────────────────────
alter table public.case_members enable row level security;
drop policy if exists case_members_read on public.case_members;
create policy case_members_read on public.case_members for select
  using (public.is_case_member(case_id));
drop policy if exists case_members_party_write on public.case_members;
create policy case_members_party_write on public.case_members for all
  using (public.is_case_party(case_id)) with check (public.is_case_party(case_id));

alter table public.case_invites enable row level security;
drop policy if exists case_invites_party on public.case_invites;
create policy case_invites_party on public.case_invites for all
  using (public.is_case_party(case_id)) with check (public.is_case_party(case_id));

-- Accepting an invite needs to insert a case_members row for a user who, by
-- definition, isn't a party yet — RLS's is_case_party write-gate on
-- case_members would otherwise block the invited user from accepting their
-- own invite. This function validates the invite (token, email match,
-- expiry, not already used) and performs the insert with elevated privilege,
-- so no broader RLS hole is needed for case_members writes.
create or replace function public.accept_case_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invite public.case_invites;
  v_email text;
  v_case uuid;
begin
  select * into v_invite from public.case_invites where token = p_token;
  if v_invite is null then raise exception 'This invite link is invalid.'; end if;
  if v_invite.accepted_at is not null then raise exception 'This invite has already been used.'; end if;
  if v_invite.expires_at < now() then raise exception 'This invite has expired.'; end if;

  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invite.email) then
    raise exception 'This invite was sent to a different email address.';
  end if;

  insert into public.case_members (case_id, user_id, role, invited_by)
  values (v_invite.case_id, auth.uid(), v_invite.role, v_invite.invited_by)
  on conflict (case_id, user_id) do nothing;

  update public.case_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;

  v_case := v_invite.case_id;
  return v_case;
end;
$$;

-- ─── cases: split read (any member) from write (party only) ────────────────
drop policy if exists cases_owner on public.cases;
drop policy if exists cases_read on public.cases;
drop policy if exists cases_party_write on public.cases;
drop policy if exists cases_party_update on public.cases;
drop policy if exists cases_party_delete on public.cases;
create policy cases_read on public.cases for select using (public.is_case_member(id));
create policy cases_party_write on public.cases for insert with check (owner_id = auth.uid());
create policy cases_party_update on public.cases for update
  using (public.is_case_party(id)) with check (public.is_case_party(id));
create policy cases_party_delete on public.cases for delete using (owner_id = auth.uid());

-- ─── Re-point every direct case_id-scoped table at case membership ──────────
do $$
declare t text;
begin
  foreach t in array array[
    'people','evidence','timeline_events','exhibits','tasks','court_orders','hearings',
    'hearing_packets','communications','reference_case_links','court_actions',
    'case_style_profiles','court_captions','signature_profiles','service_profiles',
    'discovery_requests','subpoenas','question_sets','hearing_packages','exhibit_packets',
    'deadlines','instrument_responses','deficiency_entries','inbound_filings',
    'import_batches','import_files','import_file_classifications','generated_documents',
    'document_reviews','ai_conversations'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t||'_case_owner', t);
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format('drop policy if exists %I on public.%I', t||'_member', t);
    execute format($f$create policy %I on public.%I for all
      using (public.is_case_member(case_id)) with check (public.is_case_member(case_id))$f$,
      t||'_member', t);
  end loop;
end $$;

-- Link tables scoped through a case-scoped parent (unchanged join shape, new predicate).
drop policy if exists etl_owner on public.evidence_timeline_links;
drop policy if exists etl_member on public.evidence_timeline_links;
create policy etl_member on public.evidence_timeline_links for all
  using (exists (select 1 from public.evidence e where e.id = evidence_id and public.is_case_member(e.case_id)))
  with check (exists (select 1 from public.evidence e where e.id = evidence_id and public.is_case_member(e.case_id)));

drop policy if exists epl_owner on public.evidence_people_links;
drop policy if exists epl_member on public.evidence_people_links;
create policy epl_member on public.evidence_people_links for all
  using (exists (select 1 from public.evidence e where e.id = evidence_id and public.is_case_member(e.case_id)))
  with check (exists (select 1 from public.evidence e where e.id = evidence_id and public.is_case_member(e.case_id)));

drop policy if exists tpl_owner on public.timeline_people_links;
drop policy if exists tpl_member on public.timeline_people_links;
create policy tpl_member on public.timeline_people_links for all
  using (exists (select 1 from public.timeline_events t where t.id = timeline_event_id and public.is_case_member(t.case_id)))
  with check (exists (select 1 from public.timeline_events t where t.id = timeline_event_id and public.is_case_member(t.case_id)));

drop policy if exists review_findings_owner on public.review_findings;
drop policy if exists review_findings_member on public.review_findings;
create policy review_findings_member on public.review_findings for all
  using (exists (select 1 from public.document_reviews rv where rv.id = review_id and public.is_case_member(rv.case_id)))
  with check (exists (select 1 from public.document_reviews rv where rv.id = review_id and public.is_case_member(rv.case_id)));

drop policy if exists ai_messages_owner on public.ai_messages;
drop policy if exists ai_messages_member on public.ai_messages;
create policy ai_messages_member on public.ai_messages for all
  using (exists (select 1 from public.ai_conversations a where a.id = conversation_id and public.is_case_member(a.case_id)))
  with check (exists (select 1 from public.ai_conversations a where a.id = conversation_id and public.is_case_member(a.case_id)));

drop policy if exists ai_source_links_owner on public.ai_source_links;
drop policy if exists ai_source_links_member on public.ai_source_links;
create policy ai_source_links_member on public.ai_source_links for all
  using (exists (select 1 from public.ai_messages m join public.ai_conversations a on a.id = m.conversation_id
                 where m.id = message_id and public.is_case_member(a.case_id)))
  with check (exists (select 1 from public.ai_messages m join public.ai_conversations a on a.id = m.conversation_id
                 where m.id = message_id and public.is_case_member(a.case_id)));

do $$
declare t text;
begin
  foreach t in array array['document_versions','document_sources','document_exports']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format('drop policy if exists %I on public.%I', t||'_member', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.generated_documents d where d.id = document_id and public.is_case_member(d.case_id)))
      with check (exists (select 1 from public.generated_documents d where d.id = document_id and public.is_case_member(d.case_id)))$f$,
      t||'_member', t);
  end loop;
end $$;

-- Action-child tables (through court_actions -> cases).
do $$
declare t text;
begin
  foreach t in array array['court_action_answers','court_action_sources','fact_candidates',
                           'citation_suggestions','procedural_checklists','court_action_packages']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format('drop policy if exists %I on public.%I', t||'_member', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.court_actions a where a.id = action_id and public.is_case_member(a.case_id)))
      with check (exists (select 1 from public.court_actions a where a.id = action_id and public.is_case_member(a.case_id)))$f$,
      t||'_member', t);
  end loop;
end $$;

drop policy if exists procedural_checklist_items_owner on public.procedural_checklist_items;
drop policy if exists procedural_checklist_items_member on public.procedural_checklist_items;
create policy procedural_checklist_items_member on public.procedural_checklist_items for all
  using (exists (select 1 from public.procedural_checklists pc join public.court_actions a on a.id = pc.action_id
                 where pc.id = checklist_id and public.is_case_member(a.case_id)))
  with check (exists (select 1 from public.procedural_checklists pc join public.court_actions a on a.id = pc.action_id
                 where pc.id = checklist_id and public.is_case_member(a.case_id)));

drop policy if exists discovery_request_items_owner on public.discovery_request_items;
drop policy if exists discovery_request_items_member on public.discovery_request_items;
create policy discovery_request_items_member on public.discovery_request_items for all
  using (exists (select 1 from public.discovery_requests r where r.id = request_id and public.is_case_member(r.case_id)))
  with check (exists (select 1 from public.discovery_requests r where r.id = request_id and public.is_case_member(r.case_id)));

drop policy if exists questions_owner on public.questions;
drop policy if exists questions_member on public.questions;
create policy questions_member on public.questions for all
  using (exists (select 1 from public.question_sets s where s.id = set_id and public.is_case_member(s.case_id)))
  with check (exists (select 1 from public.question_sets s where s.id = set_id and public.is_case_member(s.case_id)));

drop policy if exists exhibit_coversheets_owner on public.exhibit_coversheets;
drop policy if exists exhibit_coversheets_member on public.exhibit_coversheets;
create policy exhibit_coversheets_member on public.exhibit_coversheets for all
  using (exists (select 1 from public.exhibit_packets p where p.id = packet_id and public.is_case_member(p.case_id)))
  with check (exists (select 1 from public.exhibit_packets p where p.id = packet_id and public.is_case_member(p.case_id)));

drop policy if exists document_component_settings_owner on public.document_component_settings;
drop policy if exists document_component_settings_member on public.document_component_settings;
create policy document_component_settings_member on public.document_component_settings for all
  using (exists (select 1 from public.generated_documents d where d.id = document_id and public.is_case_member(d.case_id)))
  with check (exists (select 1 from public.generated_documents d where d.id = document_id and public.is_case_member(d.case_id)));

do $$
declare t text;
begin
  foreach t in array array['package_components','package_consistency_findings']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_owner', t);
    execute format('drop policy if exists %I on public.%I', t||'_member', t);
    execute format($f$create policy %I on public.%I for all
      using (exists (select 1 from public.court_action_packages p join public.court_actions a on a.id = p.action_id
                     where p.id = package_id and public.is_case_member(a.case_id)))
      with check (exists (select 1 from public.court_action_packages p join public.court_actions a on a.id = p.action_id
                     where p.id = package_id and public.is_case_member(a.case_id)))$f$, t||'_member', t);
  end loop;
end $$;

drop policy if exists subpoena_items_owner on public.subpoena_items;
drop policy if exists subpoena_items_member on public.subpoena_items;
create policy subpoena_items_member on public.subpoena_items for all
  using (exists (select 1 from public.subpoenas s where s.id = subpoena_id and public.is_case_member(s.case_id)))
  with check (exists (select 1 from public.subpoenas s where s.id = subpoena_id and public.is_case_member(s.case_id)));

-- import_file_classifications used `case_id` directly — already covered by the
-- direct-case_id loop above, no separate policy needed here.

-- hearing_type_presets: read stays global-or-member; write stays party-only
-- (presets are workflow config, not day-to-day helper work).
drop policy if exists hearing_presets_read on public.hearing_type_presets;
create policy hearing_presets_read on public.hearing_type_presets for select
  using (case_id is null or public.is_case_member(case_id));
drop policy if exists hearing_presets_write on public.hearing_type_presets;
create policy hearing_presets_write on public.hearing_type_presets for all
  using (case_id is not null and public.is_case_party(case_id))
  with check (case_id is not null and public.is_case_party(case_id));

-- legal_references: owner keeps full read/write; other case members gain READ
-- ONLY where the reference is assigned to a case they belong to (their own
-- verification attestation lives in case_reference_attestations, below —
-- never the shared legal_references row itself).
drop policy if exists legal_references_case_read on public.legal_references;
create policy legal_references_case_read on public.legal_references for select
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.reference_case_links l where l.reference_id = id and public.is_case_member(l.case_id))
  );

-- ─── Restricted-approval enforcement (RLS-blind columns → triggers) ─────────
-- (a) user_review_confirmations: table stays party-only end to end.
drop policy if exists user_review_confirmations_self on public.user_review_confirmations;
create policy user_review_confirmations_self on public.user_review_confirmations for all
  using (confirmed_by = auth.uid() and (
    entity_type <> 'court_action' or exists (
      select 1 from public.court_actions a where a.id = entity_id and public.is_case_party(a.case_id))
  ))
  with check (confirmed_by = auth.uid());

-- (b) deadlines: only a party may move status into 'verified' or set verified_by/verified_at.
create or replace function public.enforce_deadline_verification_party() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified' and (old.status is distinct from 'verified') then
    if not public.is_case_party(new.case_id) then
      raise exception 'Only the case party may verify a deadline.';
    end if;
    new.verified_by := auth.uid();
    new.verified_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_deadline_verification_party on public.deadlines;
create trigger trg_deadline_verification_party before update on public.deadlines
  for each row execute procedure public.enforce_deadline_verification_party();

-- (c) fact_candidates / citation_suggestions: a helper may set decision to
-- 'edited' but only a party may move it to a final 'approved'/'rejected' state.
create or replace function public.enforce_fact_decision_party() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_case uuid;
begin
  if new.decision in ('approved','rejected') and (old.decision is distinct from new.decision) then
    select a.case_id into v_case from public.court_actions a where a.id = new.action_id;
    if not public.is_case_party(v_case) then
      raise exception 'Only the case party may approve or reject this item.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_fact_candidates_party on public.fact_candidates;
create trigger trg_fact_candidates_party before update on public.fact_candidates
  for each row execute procedure public.enforce_fact_decision_party();
drop trigger if exists trg_citation_suggestions_party on public.citation_suggestions;
create trigger trg_citation_suggestions_party before update on public.citation_suggestions
  for each row execute procedure public.enforce_fact_decision_party();

-- (d) generated_documents: only a party may move status to 'reviewed' or
-- 'exported' (finalize/export). A helper may still draft and move to 'in_review'.
create or replace function public.enforce_document_finalize_party() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('reviewed','exported') and (old.status is distinct from new.status) then
    if not public.is_case_party(new.case_id) then
      raise exception 'Only the case party may finalize or export this document.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_generated_documents_party on public.generated_documents;
create trigger trg_generated_documents_party before update on public.generated_documents
  for each row execute procedure public.enforce_document_finalize_party();
drop trigger if exists trg_document_exports_party on public.document_exports;
create or replace function public.enforce_document_export_party() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_case uuid;
begin
  select case_id into v_case from public.generated_documents where id = new.document_id;
  if not public.is_case_party(v_case) then
    raise exception 'Only the case party may export this document.';
  end if;
  return new;
end;
$$;
create trigger trg_document_exports_party before insert on public.document_exports
  for each row execute procedure public.enforce_document_export_party();

-- ─── Reference-pack attestation (Task B): "apply pack" links references but
-- NEVER copies another user's verification attestation. Each (case, reference,
-- user) gets its own row, defaulting to needs_verification. ────────────────
create table if not exists public.case_reference_attestations (
  id           uuid primary key default uuid_generate_v4(),
  case_id      uuid not null references public.cases(id) on delete cascade,
  reference_id uuid not null references public.legal_references(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'needs_verification', -- needs_verification|verified|possibly_outdated
  verified_date date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (case_id, reference_id, user_id)
);
create index if not exists idx_case_ref_attest_case on public.case_reference_attestations(case_id);

alter table public.case_reference_attestations enable row level security;
drop policy if exists case_reference_attestations_self on public.case_reference_attestations;
create policy case_reference_attestations_self on public.case_reference_attestations for all
  using (user_id = auth.uid() and public.is_case_member(case_id))
  with check (user_id = auth.uid() and public.is_case_member(case_id));

drop trigger if exists on_case_reference_attestations_update on public.case_reference_attestations;
create trigger on_case_reference_attestations_update before update on public.case_reference_attestations
  for each row execute procedure public.handle_updated_at();

-- jurisdiction_reference_packs: readable by any authenticated user (packs are
-- shareable jurisdiction templates), writable only by their creator.
drop policy if exists jurisdiction_reference_packs_owner on public.jurisdiction_reference_packs;
drop policy if exists jurisdiction_reference_packs_read on public.jurisdiction_reference_packs;
create policy jurisdiction_reference_packs_read on public.jurisdiction_reference_packs for select using (true);
drop policy if exists jurisdiction_reference_packs_write on public.jurisdiction_reference_packs;
create policy jurisdiction_reference_packs_write on public.jurisdiction_reference_packs for insert with check (owner_id = auth.uid());
drop policy if exists jurisdiction_reference_packs_update on public.jurisdiction_reference_packs;
create policy jurisdiction_reference_packs_update on public.jurisdiction_reference_packs for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists jurisdiction_reference_packs_delete on public.jurisdiction_reference_packs;
create policy jurisdiction_reference_packs_delete on public.jurisdiction_reference_packs for delete using (owner_id = auth.uid());

drop policy if exists reference_pack_items_owner on public.reference_pack_items;
drop policy if exists reference_pack_items_read on public.reference_pack_items;
create policy reference_pack_items_read on public.reference_pack_items for select using (true);
drop policy if exists reference_pack_items_write on public.reference_pack_items;
create policy reference_pack_items_write on public.reference_pack_items for all
  using (exists (select 1 from public.jurisdiction_reference_packs p where p.id = pack_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.jurisdiction_reference_packs p where p.id = pack_id and p.owner_id = auth.uid()));

-- ─── First-login acknowledgment ──────────────────────────────────────────────
alter table public.profiles add column if not exists disclaimer_ack_at timestamptz;

-- ─── Storage: evidence-files bucket, case-scoped (not uploader-scoped) ──────
-- Every object path is "<caseId>/...": e.g. lib/db/evidence.ts writes
-- `${caseId}/${timestamp}-${uuid}.${ext}`; the import pipeline writes
-- `${caseId}/imports/${batchId}/...`. The bucket must previously have been
-- created via the Supabase dashboard (private, not public) — this only sets
-- object-level policy. Replaces any uploader-only policy configured earlier
-- through the dashboard (that model breaks the moment a helper is added: a
-- helper's upload would be unreadable to the party, and vice versa).
drop policy if exists "evidence_files_case_select" on storage.objects;
create policy "evidence_files_case_select" on storage.objects for select to authenticated
  using (bucket_id = 'evidence-files' and public.is_case_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "evidence_files_case_insert" on storage.objects;
create policy "evidence_files_case_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-files' and public.is_case_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "evidence_files_case_update" on storage.objects;
create policy "evidence_files_case_update" on storage.objects for update to authenticated
  using (bucket_id = 'evidence-files' and public.is_case_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'evidence-files' and public.is_case_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "evidence_files_case_delete" on storage.objects;
create policy "evidence_files_case_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence-files' and public.is_case_member(((storage.foldername(name))[1])::uuid));
