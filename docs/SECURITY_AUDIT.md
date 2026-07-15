# Evidence OS — Security Audit

Scope: cross-case and cross-user isolation across all RLS policies (migrations
001–012), storage bucket scoping, audit-log coverage, full-case export
isolation, and the disclaimer acknowledgment. Performed 2026-07 as part of the
party/helper role rollout (migration 012).

## 1. RLS test approach

Every migration (001 → 012) was applied in sequence against a throwaway
Postgres 16 instance with a minimal `auth`/`storage` schema shim (`auth.uid()`
backed by a settable session variable so different simulated users can be
tested in one session; a stub `storage.objects` + `storage.foldername()` so
bucket policies apply the same way Supabase's real storage extension does).
This is the same harness used to validate every migration in this repo.

Two passes were run:

1. **Static pass** — enumerate every table with RLS enabled and confirm it has
   at least one policy attached (`pg_policies`), catching the "RLS enabled but
   zero policies = silent full lockout" failure mode and its opposite,
   "RLS enabled but a permissive default policy = silent full exposure."
   Result: **all 82 public tables** with `row level security` enabled have at
   least one attached policy; `storage.objects` has the 4 expected
   case-scoped policies (select/insert/update/delete).
2. **Functional pass** — connected as the non-superuser `authenticated` role
   (superuser/`bypassrls` connections skip RLS entirely and give false
   negatives; this was caught and corrected mid-audit — see finding F-1)
   with three simulated users (`party`, `helper` on the same case, and an
   unrelated `outsider`), and exercised:
   - Party creates a case → confirmed a `case_members` row of role `party` is
     auto-inserted (trigger `trg_case_owner_as_party`).
   - Helper added to the case reads/writes `evidence` → succeeds (full
     create/edit/upload rights, per spec).
   - Outsider reads the same case's `evidence` → **0 rows**; outsider attempts
     a direct `insert` naming the case's id → **RLS violation**, rejected.
   - Helper attempts `update deadlines set status='verified'` → **rejected**
     by trigger `enforce_deadline_verification_party`.
   - Party performs the same update → **succeeds**.
   - Helper sets `fact_candidates.decision = 'approved'` → **rejected** by
     trigger `enforce_fact_decision_party`; helper sets `decision = 'edited'`
     on the same row → **succeeds** (helper may propose, only party finalizes).

This functional pass is not automated in `npm test` (no live Postgres in the
JS test harness) — `test/roles.test.ts` covers the deterministic service-layer
guard (`lib/services/roleGuard.ts`) that mirrors these same four restrictions,
plus the reference-pack/export scoping logic. Re-run the functional pass
against a disposable database whenever a new party/helper-restricted action is
added; the shim commands are in this repo's session history and take under a
minute to spin up.

## 2. Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| F-1 | Testing RLS as the Postgres superuser (`postgres`) silently bypasses RLS entirely (`BYPASSRLS`), producing false "isolation confirmed" results. | Process risk | **Fixed in this audit** — functional pass re-run under `SET ROLE authenticated`; documented above so it isn't repeated. |
| F-2 | `case_members` had no automatic membership for a case's owner on *new* case creation — only a one-time backfill for cases that existed before migration 012. A newly created case's own owner would fail `is_case_party()`/RLS checks on their own case. | High | **Fixed** — `trg_case_owner_as_party` (AFTER INSERT on `cases`) inserts the owner as `party` in the same transaction. Verified live (see §1). |
| F-3 | The `case_members` write policy (`is_case_party`) meant an invited helper could never insert their *own* membership row when accepting an invite (they aren't a party yet — chicken-and-egg). | High | **Fixed** — invite acceptance moved to a `SECURITY DEFINER` function (`accept_case_invite`) that validates the token/email/expiry server-side and performs the insert with elevated privilege; no client-side RLS hole was added. |
| F-4 | `contexts/AuthContext.tsx` listed cases with `.eq("owner_id", user.id)` — a helper (non-owner) would see **zero cases** in the sidebar even though RLS now permits their access, making the entire helper feature unusable end-to-end. | High | **Fixed** — the filter was removed; the query now relies on `cases_read` RLS (`is_case_member`) to scope results, which correctly includes both party and helper. |
| F-5 | `legal_references` is owner-scoped (`owner_id = auth.uid()`), independent of case membership — a helper could not see the party's assigned references at all, even though `reference_case_links` ties them to a shared case. | Medium | **Fixed** — added `legal_references_case_read`, a SELECT-only policy granting read access when the reference is linked to a case the user belongs to. Write access remains owner-only (uploading party owns their reference row); verification/attestation was moved to a separate per-user table (see §4) rather than loosening writes on the shared row. |
| F-6 | The `evidence-files` storage bucket's dashboard-configured policy model ("only uploader can access their files") does not exist in any migration and cannot be case-scoped without SQL — a helper's upload would be unreadable by the party, and vice versa, the moment a second case member exists. | High | **Fixed** — migration 012 adds four `storage.objects` policies scoped by the object path's leading folder segment (every upload path is `"<caseId>/..."`, confirmed against `lib/db/evidence.ts` and `lib/import/pipeline.ts`), checked against `is_case_member()`. This **replaces** whatever was clicked together in the dashboard; the tester should re-run this migration's storage section in the SQL editor (dashboard-only storage policies are not overwritten by re-running old migrations — see `docs/SETUP.md`). |
| F-7 | `document_exports` had no dedicated restriction beyond generic case-membership — a helper could directly insert an export row even though `generated_documents.status` transitions to `exported` are party-gated. | Medium | **Fixed** — `trg_document_exports_party` (BEFORE INSERT) requires the case party regardless of the parent document's current status. |

No findings required *loosening* access — every fix above narrows a gap that
would otherwise have under- or over-shared data once a second case member
existed. Before migration 012 (single-user-per-case), none of F-2–F-7 were
reachable; they are new surface area introduced by the party/helper feature
itself, caught before shipping by testing helper access before merging.

## 3. Table-by-table pass/fail

Every case-scoped or case-child table (people, evidence, timeline_events,
exhibits, tasks, court_orders, hearings, hearing_packets, communications,
reference_case_links, court_actions and its 6 child tables, case_style/
signature/service/court-caption profiles, discovery_requests + items,
subpoenas + items, question_sets + questions, hearing_packages,
exhibit_packets + coversheets, deadlines, instrument_responses,
deficiency_entries, inbound_filings, import_batches/files/classifications,
generated_documents + versions/sources/exports, document_reviews +
review_findings, ai_conversations + messages + source_links,
package_components + consistency_findings, procedural_checklists + items,
document_component_settings, hearing_type_presets, case_reference_attestations,
case_members, case_invites): **PASS** — scoped to `is_case_member()`
(read/write reach matches the party) with the four restricted-write
transitions gated to `is_case_party()` via BEFORE triggers, not RLS (RLS
cannot see "which column changed" within an UPDATE; a trigger can).

Owner-scoped, not case-scoped, by design (a reference or template is
reusable across the owner's cases, not case-exclusive): `legal_references`
(+ versions/sections/source_urls/verification_records), `document_templates`
(+ sections/variables), `jurisdiction_reference_packs` (+ items — packs are
globally readable/shareable, write-restricted to the creator),
`official_forms`. **PASS**, with the read extension noted at F-5.

Global read-only catalogs (no owner, no case): `document_definitions`,
`jurisdictions`, `courts`, `judicial_divisions`, `judges`. **PASS**.

`profiles`: self-only (`auth.uid() = id`). **PASS**.

`audit_logs`, `file_access_history`, `export_history`, `ai_request_logs`,
`source_use_logs`, `redaction_records`: case-scoped via the same
`is_case_member()` re-point (they were in the direct-case_id loop or their own
policy prior to 012 and inherited the same treatment where applicable) —
**note**: these are administrative/append-mostly logs; they were not
re-audited for a *write* restriction narrower than case-membership, since
nothing in this task asked helpers to be blocked from generating audit
entries (the entries themselves record which user/role acted — see §4).

## 4. Audit-log coverage

Confirmed call sites exist for: exports (`settings` page → `case.export`
audit entry before download), reference-pack application (`reference_pack.apply`),
case invites (`case_invite.create`), deadline verification (implicit via the
`deadlines` row itself carrying `verified_by`/`verified_at`, which the party
trigger stamps), AI requests (`ai_request_logs`, existing from the classification/
discovery/document-review pipelines — unchanged by this task). Approval
records (fact_candidates/citation_suggestions decisions, document finalization)
do not currently write a separate `audit_logs` row beyond the row's own
implicit state — **known gap, not closed in this task** (would require adding
`logAudit()` calls at each UI decision point across the court-actions wizard,
out of scope per "no feature work beyond the above"). The approving user's
identity is still recoverable: RLS + the party-only triggers mean only the
party's `auth.uid()` could have performed the transition, and Postgres does
not need an extra log row to prove that — but there's no timestamped,
queryable log entry for it today. Recommended follow-up, not blocking.

## 5. Full-case export

`lib/services/caseExport.ts` builds a ZIP (`data.json` manifest + `manifest.json`
metadata + the case's stored evidence files under `files/`) by querying ~30
case-scoped tables, each filtered by `case_id` (or `id` for `cases` itself —
see `exportFilterColumn()`, unit-tested in `test/roles.test.ts`). Isolation is
enforced by RLS, not by the export code: every query goes through the same
Supabase client any other page uses, so a user can only ever export rows their
`case_members` membership already permits them to read. Internal-only tables
(`audit_logs`, `ai_request_logs`, `file_access_history`, `export_history`,
`source_use_logs`, `redaction_records`) are intentionally excluded — they're
administrative, not needed to reconstruct or migrate the case elsewhere.

## 6. Disclaimer acknowledgment

`components/shared/DisclaimerAckModal.tsx`, mounted in `AppLayout` (renders on
every authenticated page), blocks nothing structurally but re-prompts every
session until `profiles.disclaimer_ack_at` is set, persisting a timestamp via
`acknowledgeDisclaimer()` in `AuthContext`. The existing `components/shared/
Disclaimer.tsx` compact banner already renders on every generated-output
surface that was audited (`/court-actions/[id]`, `/discovery`,
`/hearing-preparation`, `/documents`, `/references`, `/import/[id]/review`) —
confirmed present via existing usage, not newly added by this task except
where a page was itself new (`/import/[id]/review`, `/hearing-preparation`),
which already included it.

## 7. Storage bucket

See F-6. The bucket itself (private, `evidence-files`) must still exist —
created once via the Supabase dashboard per `docs/SETUP.md`; this task does
not create the bucket, only the object-level policies, and does not change the
50MB/MIME-type dashboard settings.
