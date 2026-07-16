# Evidence OS — Project Map

Branch: `claude/court-action-workspace` · Updated 2026-07-15 (roles, security audit, tester onboarding pass)

> Migrations now run through **012** (…`011_hearing_presets.sql`, `012_roles_and_security.sql`).
>
> **Party/Helper roles + security hardening (012):** `case_members` (party|helper, auto-registers
> the owner as party on case creation), `case_invites` (email-token invite, accepted via the
> `accept_case_invite()` SQL function so an unregistered helper can insert their own membership
> row). Every case-scoped table's RLS was re-pointed from `cases.owner_id = auth.uid()` to
> `is_case_member()`, giving helpers the same read/write reach as the party EXCEPT four
> approval surfaces enforced by BEFORE triggers (RLS can't see "which column changed"):
> `user_review_confirmations` (party-only), deadline verification (`status -> verified`),
> fact_candidate/citation_suggestion final decisions (`approved`/`rejected` — `edited`/`pending`
> stay open to helpers), and `generated_documents`/`document_exports` finalize/export.
> `lib/services/roleGuard.ts` mirrors these for pre-emptive UI errors. Storage (`evidence-files`)
> moved from dashboard-configured uploader-only policies to case-scoped SQL policies
> (`storage.objects`, keyed on the object path's case-id folder segment) — see
> `docs/SECURITY_AUDIT.md` finding F-6. `case_reference_attestations` gives each user their own
> per-case verification of a shared reference — packs (`jurisdiction_reference_packs` +
> `reference_pack_items`) link reference pointers only, never an attestation
> (`lib/db/referencePacks.ts`). Minimum reference checklist (`lib/services/referenceChecklist.ts`,
> 8 categories) surfaces on `/references` and the dashboard. Full-case export
> (`lib/services/caseExport.ts`) ZIPs ~30 case-scoped tables + evidence files, RLS-isolated.
> First-login disclaimer acknowledgment (`profiles.disclaimer_ack_at`,
> `components/shared/DisclaimerAckModal.tsx`). New routes: `/invite` (accept a helper invite),
> `/onboarding/references` (post-case-creation pack/checklist step). `contexts/AuthContext.tsx`'s
> case list query was fixed to rely on RLS membership instead of `owner_id` (was hiding every
> case from a helper). Full RLS/trigger behavior was verified live against Postgres 16 as the
> non-superuser `authenticated` role — see `docs/SECURITY_AUDIT.md` §1 for the test approach and
> §2 for seven findings (six were pre-existing gaps this task's own testing surfaced and fixed
> before merge, not regressions). `test:roles` (31): service-layer guard, attestation-never-
> copies logic, checklist mapping, export scoping.
> New tables: `subpoena_items`, `deadlines`, `instrument_responses`, `deficiency_entries`,
> `inbound_filings`, `import_batches`, `import_files`, `import_file_classifications`; `evidence`
> and `communications` gained `verification_status` / `verified_by` / `verified_at` /
> `source_import_file_id` (defaults to `verified` so existing records are not retroactively
> blocked); `evidence` earlier gained `extracted_text` / `text_source` / `page_count`.
> New routes: `/inbound`, `/import`, `/import/[id]`, `/import/[id]/review`,
> `/api/intake-suggest`, `/api/classify-file`. New deps: pdfjs-dist, mammoth, fflate.
> New test suites: `test:discovery` (22), `test:deadlines` (14), `test:import` (24),
> `test:import-classification` (27), `test:hearing-prep` (17), `test:roles` (31) — full run
> `npm test` = 196 assertions + 52-file neutral-language scan. Bulk import + text extraction:
> see docs/IMPORT_PIPELINE.md. Security audit: docs/SECURITY_AUDIT.md.
>
> **Hearing preparation (011):** hearing-type-aware presets (`hearing_type_presets`,
> global seeds + per-case editable) drive worksheets built ONLY from the user's assigned
> references — no hardcoded legal factors/elements; when no reference is on file the worksheet
> says "verify with the court". `lib/services/hearingPreparation.ts`: `buildWorksheet`,
> `buildHearingChecklist` (cites the assigned judge/division procedure or points to the court),
> `buildNoncomplianceQuestions` (double-screened). A "contempt / enforcement" question type in
> `/questions` and all generated hearing copy describe **possible noncompliance** only — the
> neutral-language gate (runtime `checkProhibited` + CI scan) now bans willfulness, asserted
> violations/contempt findings, and outcome predictions. `/hearing-notebook` retired → redirects
> to `/hearing-preparation`.
>
> **Import classification + lazy verification (010):** per-file classifier
> (`lib/services/importClassification.ts`, deterministic heuristic + optional LLM via
> `/api/classify-file`, never auto-creates people, reuses `redaction.ts` for confidential
> flags, summaries screened by `checkProhibited`). Routing (`importRouting.ts`): HIGH+no-flags
> auto-promote as `unverified`; MEDIUM/LOW/any-flag → review queue; MANDATORY confirmation for
> court orders (no `court_orders` row until confirmed), hearing/deadline dates (no calendar
> entry until confirmed), and wrong-case-number quarantine. Verify-at-use gate
> (`verificationGate.ts`) blocks unverified/disputed records from any generated-output flow at
> selection time. Review workspace at `/import/[id]/review`.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.9 |
| UI library | React / React DOM | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS (+ @tailwindcss/postcss) | ^4 |
| Icons | lucide-react | ^1.22.0 |
| Charts | recharts | ^3.9.2 |
| Backend | Supabase (`@supabase/supabase-js` ^2.110.2, `@supabase/ssr` ^0.12.0) — Postgres + Auth + Storage, RLS everywhere | — |
| Utilities | clsx ^2.1.1, tailwind-merge ^3.6.0, class-variance-authority ^0.7.1 | — |
| Lint | ESLint 9 + eslint-config-next | — |
| Tests | Node 22 type-stripping runner (no framework): `npm run test:phase3` (30), `test:court-actions` (31), `test:language` (21-file scan) | — |
| AI | Anthropic API adapter (`lib/ai/llmClient.ts`), env-gated by `ANTHROPIC_API_KEY`; deterministic services otherwise | — |

Runtime: Node.js ≥ 22 recommended (tests use `--experimental-strip-types`). Env: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `ANTHROPIC_API_KEY`, `EVIDENCE_OS_MODEL`.

## File tree (node_modules / .next / .git excluded)

```
evidenceos/
├── app/
│   ├── auth/callback/route.ts
│   ├── calendar/page.tsx
│   ├── communications/page.tsx
│   ├── court-actions/page.tsx · new/page.tsx · [id]/page.tsx
│   ├── court-orders/page.tsx
│   ├── dashboard/page.tsx
│   ├── discovery/page.tsx
│   ├── document-review/page.tsx
│   ├── documents/page.tsx · draft/page.tsx · [id]/page.tsx
│   ├── evidence/page.tsx
│   ├── exhibits/page.tsx
│   ├── hearing-notebook/page.tsx
│   ├── hearing-preparation/page.tsx
│   ├── login/page.tsx · signup/page.tsx · onboarding/page.tsx
│   ├── patterns/page.tsx
│   ├── people/page.tsx
│   ├── questions/page.tsx
│   ├── references/page.tsx
│   ├── reports/page.tsx
│   ├── settings/page.tsx
│   ├── tasks/page.tsx
│   ├── timeline/page.tsx
│   ├── layout.tsx · page.tsx · globals.css · favicon.ico
├── components/
│   ├── AppLayout.tsx · Sidebar.tsx · TopBar.tsx · Modal.tsx · AIReviewScreen.tsx
│   ├── assistant/  AIAssistantPanel.tsx · AssistantLauncher.tsx
│   ├── court-actions/  StatusBadge · DocumentOptionCard · FactReviewTable ·
│   │                   ReferenceApprovalList · PackageComponentPicker ·
│   │                   GuidedQuestionRunner · ConsistencyReport · ChecklistView
│   └── shared/  Disclaimer.tsx · badges.tsx
├── contexts/AuthContext.tsx
├── lib/
│   ├── ai/  llmClient · schema · sourceGuard · questionSafetyGuard · aiAnalysisService · types
│   ├── court-actions/types.ts
│   ├── db/  ai · audit · court-actions · documents · evidence · references · reviews · sources · timeline
│   ├── documents/  export.ts · types.ts
│   ├── mock/  court-actions · document-definitions · documents · references · reviews · sources
│   ├── references/types.ts · review/types.ts
│   ├── security/redaction.ts
│   ├── services/  citationValidation · discovery · documentConsistency · documentDrafting ·
│   │              documentReview · exhibitPacket · factExtraction · legalReferenceSuggestion ·
│   │              proceduralChecklist · questionGeneration · referenceSearch · situationIntake
│   ├── supabase/  client · server · types
│   ├── disclaimers.ts · mock-data.ts · utils.ts
├── supabase/migrations/  001_initial_schema · 002_communications ·
│                         003_documents_references_reviews · 004_security_audit ·
│                         005_seed_templates · 006_court_actions ·
│                         007_discovery_subpoenas · 008_deadlines_tracking ·
│                         009_imports · 010_classification · 011_hearing_presets ·
│                         012_roles_and_security
├── test/  alias-loader.mjs · phase3.test.ts · court-actions.test.ts · neutral-language.test.ts
├── docs/  ARCHITECTURE.md · COURT_ACTION_PLAN.md · SETUP.md
├── middleware.ts · next.config.ts · eslint.config.mjs · postcss.config.mjs
├── package.json · tsconfig.json · .env.local.example · README.md · CLAUDE.md · AGENTS.md
```

## Database schema (all RLS-protected)

**001 — Core case data:** `profiles`, `cases` (expanded in 003/006 with case_number, case_type, state, county, circuit_district, court_name, division, judge, magistrate, petitioner, respondent, user_role, opposing_party, opposing_counsel, date_opened), `people`, `evidence`, `timeline_events`, `exhibits`, `tasks`, `court_orders`, `hearings`, `hearing_packets` *(legacy, superseded by 006 `hearing_packages`)*, join tables `evidence_timeline_links`, `evidence_people_links`, `timeline_people_links`

**002 — Communications:** `communications`

**003 — Documents / References / Reviews / AI:** `jurisdictions`, `courts`, `judicial_divisions`, `judges`, `legal_references`, `legal_reference_versions`, `reference_sections`, `reference_case_links`, `source_urls`, `verification_records`, `document_templates`, `template_sections`, `template_variables`, `generated_documents`, `document_versions`, `document_sources`, `document_exports`, `document_reviews`, `review_findings`, `ai_conversations`, `ai_messages`, `ai_source_links`

**004 — Security / audit:** `audit_logs`, `file_access_history`, `export_history`, `ai_request_logs`, `source_use_logs`, `redaction_records` (+ consent/retention columns on `profiles`)

**005 — Seed:** 6 built-in rows in `document_templates` + 24 `template_variables`

**006 — Court Action Workspace:** `court_actions`, `court_action_answers`, `court_action_sources`, `fact_candidates`, `citation_suggestions`, `court_action_packages`, `package_components`, `package_consistency_findings`, `document_definitions`, `official_forms`, `case_style_profiles`, `court_captions`, `signature_profiles`, `service_profiles`, `document_component_settings`, `jurisdiction_reference_packs`, `reference_pack_items`, `procedural_checklists`, `procedural_checklist_items`, `discovery_requests`, `discovery_request_items`, `subpoenas`, `question_sets`, `questions`, `hearing_packages`, `exhibit_packets`, `exhibit_coversheets`, `user_review_confirmations`

**007 — Discovery / subpoenas:** `subpoena_items` (+ discovery/subpoena tracking columns)

**008 — Deadline tracking:** `deadlines`, `instrument_responses`, `deficiency_entries`

**009 — Imports:** `inbound_filings`, `import_batches`, `import_files`; `evidence` gained `extracted_text` / `text_source` / `page_count`

**010 — Import classification / lazy verification:** `import_file_classifications`; `evidence` + `communications` gained `verification_status` / `verified_by` / `verified_at` / `source_import_file_id` (default `verified`)

**011 — Hearing presets:** `hearing_type_presets` (workflow metadata only, no legal factors); `hearing_packages` gained `hearing_type_key` / `preset_notes`

**012 — Roles / security:** `case_members`, `case_invites`, `case_reference_attestations`; every case-scoped table's RLS re-pointed at `is_case_member()`/`is_case_party()`; BEFORE triggers gate deadline verification, fact/citation final decisions, and document finalize/export to the party; `profiles` gained `disclaimer_ack_at`; `jurisdiction_reference_packs`/`reference_pack_items` opened to global read

Storage: one private bucket `evidence-files` (signed URLs, case-scoped object policies as of migration 012 — see docs/SECURITY_AUDIT.md).

## Routes / pages

| Route | Purpose |
|---|---|
| `/` | Redirect → /dashboard |
| `/login` · `/signup` · `/auth/callback` · `/onboarding` · `/onboarding/references` | Auth + expanded case creation (jurisdiction/party fields) + post-creation reference-pack/checklist step |
| `/invite` | Accept a case-helper invite (`?token=...`) |
| `/dashboard` | Real metrics, recents, module quick-access cards |
| `/timeline` · `/evidence` · `/exhibits` · `/people` · `/communications` · `/calendar` · `/tasks` · `/court-orders` | Case-record CRUD modules |
| `/court-actions` · `/court-actions/new` · `/court-actions/[id]` | Dashboard · "Tell Us What Is Happening" intake · 10-step guided wizard |
| `/discovery` | RFP / interrogatories / admissions builder |
| `/hearing-preparation` | "Build my hearing package" (creates a hearing-prep action) |
| `/questions` | Witness/deposition/exam question builder |
| `/documents` · `/documents/draft` · `/documents/[id]` | Document library · 7-step drafting wizard · detail view |
| `/references` · `/document-review` | Legal reference library · review dashboard + split reviewer |
| `/patterns` · `/hearing-notebook` · `/reports` · `/settings` | Pattern insights · legacy hearing packet wizard · report generators · profile/cases |

## Module status

| Module | Status | Notes |
|---|---|---|
| Auth / onboarding | **working** | Full jurisdiction + party fields persist |
| Dashboard | **working** | Live Supabase counts + recents |
| Timeline / Evidence / Exhibits / People / Communications / Calendar / Tasks / Court Orders | **working** | Full CRUD; evidence uploads to private bucket; exhibits print a coversheet packet |
| Documents (library + 7-step wizard + detail) | **working** | Real sources, guarded generation, versioned persistence, DOCX/PDF/text export w/ redaction review |
| References | **working** | CRUD, verify, assign-to-case, version/supersede plumbing; file-upload ingestion now extracts text (PDF/DOCX/TXT) via the shared extraction service; minimum reference checklist (8 categories) shown per case; jurisdiction packs (save-from-case / apply-to-case, never copies attestation) |
| Party/Helper roles + Settings (`/settings`) | **working** | Invite a helper by email (token link via `/invite`); team list with role badges; full-case export (ZIP of ~30 tables + evidence files); helper has full create/edit/upload rights, party-only for confirmations/deadline verification/final fact-citation decisions/document finalize-export, enforced in RLS + BEFORE triggers, not just UI (see docs/SECURITY_AUDIT.md) |
| Bulk Import (`/import`) | **working** | Drag-drop folder + files + client-side zip expansion; sha256 dedup (resumable), 5-way concurrent upload to the evidence bucket under a batch prefix, live status table w/ filters; text extraction (pdfjs/mammoth) with needs_ocr detection; single/bulk promotion to evidence sharing the same storage object; backfill over existing evidence; audit-logged |
| Import classification + review (`/import/[id]/review`) | **working** | Per-file classifier (heuristic + optional LLM), lazy-verification routing (auto-promote HIGH+clean as unverified; review queue for MEDIUM/LOW/flagged; mandatory confirm for court orders, hearing/deadline dates, wrong-case-number quarantine); reconstruction review workspace; verify-at-use gate blocks unverified/disputed from generated output; verification badges + inline verify + timeline-add on evidence/communications lists; dashboard "awaiting attention" card |
| Document Review | **working** | Real review service against saved docs, pasted text, or an uploaded DOCX/PDF (text extracted via the shared service); findings + decisions persist |
| Court Actions (10-step wizard) | **working** | Persistence per step; fact/citation approval gates; package generation → generated_documents; consistency report; checklist; redaction-screened export + audit log |
| Discovery | **working** | All four instruments (RFP / rogs / RFA w/ phrasing templates / subpoena duces tecum) generate caption-correct, redaction-screened printable documents; unified dashboard with finalize (confirmations), mark-served (creates requires-verification deadline), response logging, and deficiency worksheets with neutral compel pathway |
| Subpoena builder | **working** | Records-only + records+testimony; custodian recipients; per-item date ranges; unselected gap suggestions; procedural panel resolved at runtime from assigned references with blocking notice when uncovered; cost estimates; linked generated_documents row |
| Deadline engine | **working** | Always created `requires_verification`; verification demands a user-selected counting-method reference + user-confirmed date (candidate parsed from reference text at runtime, never hardcoded); verified-only on calendar; dashboard queue; audit-logged verification |
| Inbound Filings (`/inbound`) | **working** | Received filing → evidence + optional deadline + noticed hearing + prefilled response wizard; optional LLM classification via `/api/intake-suggest` (deterministic form without key) |
| Question Builder | **working** | Safety-screened, foundation-flagged sets; save + print |
| Hearing Preparation | **working** | Creates hearing-prep action + hearing_packages row; deep hearing-specific component presets **partial** (uses the standard package preset) |
| AI Assistant panel | **partial** | UI + modes + strategy refusal work; responses are deterministic previews; conversations not yet persisted to ai_* tables; live LLM adapter present but not wired to the panel. Launcher button is now draggable + position-persisted (`localStorage`) since it previously covered wizard/import "Continue" buttons at its fixed bottom-right spot |
| AI Connection diagnostic (`/settings`) | **working** | On-demand real Anthropic ping (`/api/ai-status` -> `checkAnthropicConnection()`) reporting configured/connected/model/error — distinct from every feature path's silent-null fallback, so a bad key doesn't look identical to "no key set." `callModelJSON` now logs failures server-side (status, body snippet, network errors) instead of swallowing them silently |
| Pattern Insights | **working** | Rule-based analysis of real timeline data (no LLM) |
| Reports | **working** | 5 live generators (print/CSV) |
| Hearing Notebook | **working (legacy)** | Kept until Hearing Preparation fully supersedes it |
| Settings | **working** | Profile edit, case switcher, sign out; case-style/caption/signature profile editor UI **stub** (tables + db layer exist) |
| Guided questions (wizard step 3) | **partial** | Dedicated bank for temporary relief; generic bank for other task types |
| Jurisdiction reference packs | **partial** | Tables + pointer model exist; no auto-matching UI yet |
| Official forms · subpoenas · document_component_settings | **stub** | Schema only, no UI |
| Redaction / export / audit logging | **working** | Detection + user-approved apply; audit/export/AI-request logs written |
| Safety guards (sourceGuard, questionSafetyGuard, prohibited-phrase, neutral-language CI gate) | **working** | 82 automated assertions, all passing |
