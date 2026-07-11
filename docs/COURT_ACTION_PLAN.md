# Court Action Workspace — Analysis & Plan (not yet implemented)

Target branch: `claude/court-action-workspace` (create from `claude/evidence-os-documents-ai`
once that branch is merged/stable — this expansion assumes Documents, References, and Document
Review already exist and are wired to real data, which they now are).

This doc is planning only. Nothing here is built yet.

---

## 1. Flaws, gaps, and open questions in the spec

Raising these now because each one changes the data model or the build order.

**1.1 — The spec re-lists services that already exist.**
Section 21 asks for `documentDraftingService.ts`, `documentReviewService.ts`,
`documentPackageService.ts`, `exportService.ts` — the first two already exist and are wired to
real data. Treat Court Actions as an **orchestration layer that reuses them**, not a rewrite. A
Court Action's "generate drafts" step should call the existing `generateDraft()` once per selected
package component, not duplicate its logic. Same for `documentReviewService` — a package-wide
review is N calls to the existing `runReview()`, aggregated.

**1.2 — Fact approval and citation approval need to be decoupled from any single document.**
Today, a `DraftStatement`'s source/status lives inside one document's `body` JSON. The new
workflow (Section 4, Step 4–5) requires approving facts and citations **once**, before any
document exists, then reusing that same approved set across every document in a package — that's
the only way Section 17's cross-document consistency check works (same dates/names/relief
everywhere). This means promoting facts and citations to first-class, case/action-scoped entities:
`fact_candidates` → `fact_approvals`, `citation_suggestions` → `citation_approvals`, both keyed to
a `court_action_id`, not a `document_id`. Documents are *built from* the approved sets, not the
other way around. This is the single biggest architectural change from what exists today.

**1.3 — "Jurisdiction Reference Pack" needs to be a pointer layer, not duplicate storage.**
`legal_references` already stores full reference records with jurisdiction/court/division/judge
fields. A "pack" should be a *named, versioned bundle of references for a given jurisdiction
tuple* — a `jurisdiction_reference_packs` row with `reference_pack_items` pointing at existing
`legal_references` rows — not a second copy of reference content. When a user creates a case with
a matching state/county/court, the system attaches the matching pack's items as candidate
references, but nothing is duplicated.

**1.4 — "Official form" vs. "template" is a real distinction that needs its own table.**
An official form (e.g., a state Supreme Court–approved family-law form) is a fixed, jurisdiction-
authored document; a `document_template` is our internal reusable structure. I'll model
`official_forms` as a catalog (name, jurisdiction, source URL, PDF, fillable-field list) that a
`document_template` can *implement*, or that can stand alone as a "download the official form and
fill it out yourself" fallback when we haven't built a template for it.

**1.5 — 150+ named document types is not a Phase 1 (or Phase 2) build target.**
Section 8 lists roughly 150 document types. Hand-authoring templates for all of them is a
multi-month effort on its own and isn't what "Phase 1 — prototype with mock data" implies. Plan:
seed a `document_definitions` catalog as **data** (name, category, plain-language definition,
prerequisites, related docs, "template available: yes/no") covering the full list, but only build
real generation templates for a **starter set of ~12–15** spanning the categories that the
acceptance-criteria workflow in Section 25 actually exercises (motion, response, notice, proposed
order, affidavit/verification, witness list, exhibit list, direct/cross-exam questions, hearing
summary, testimony outline, filing/service/hearing checklists). Everything else shows as a
definition card with "No template available yet — this document type is not yet supported for
drafting" rather than silently generating garbage.

**1.6 — Cross-examination and deposition question generation need their own safety layer.**
The existing `sourceGuard`/`checkProhibited` catch advice/prediction language in *documents*, but
Section 11's rules for questions are different in kind: don't assume disputed facts are true,
flag foundation-required questions, and — critically — detect abusive/harassing/intimidating
phrasing. That last one is a new pattern-matching concern (not just "don't give legal advice").
Plan: a sibling `questionSafetyGuard.ts` with its own prohibited-pattern list (badgering,
repetition-of-the-same-accusation, character attacks unrelated to any selected source) and a
"requires foundation" heuristic (flags any question referencing a specific exhibit/document by
name without a preceding authentication question in the same group).

**1.7 — Deadline calculation risk needs an explicit non-goal statement.**
Nothing in this new spec asks for deadline math, but "task and deadline tracking" plus
"discovery deadlines" plus "response deadline" appear throughout. The existing Document Review
design already has a rule for this (never calculate a deadline unless trigger date + rule +
calendar assumptions are all present and shown). Carry that rule forward explicitly for Court
Actions and Discovery — a request for admissions, for instance, must not auto-calculate "30 days
from service" unless a verified rule row supplies the counting method.

**1.8 — Overlap with existing Hearing Notebook and Reports pages.**
`/hearing-notebook` (5-step wizard, CSV/PDF export) and `/reports` (5 CSV/print generators)
already do a subset of what Section 13's "Build My Hearing Package" and Section 10's checklist
exports want. Rather than building a third, parallel export path: (a) extend
`lib/documents/export.ts` to accept a list of named sections (not just flat statements) so it can
render a multi-document package, not just one document; (b) have Hearing Preparation supersede
Hearing Notebook — same underlying export helpers, richer input. Retire the old Hearing Notebook
page's step wizard once Hearing Preparation covers its cases; keep the Reports page as-is (it's
case-summary reporting, a different job than package generation) but point its CSV logic at the
same shared export helpers so there's one implementation instead of three.

**1.9 — "Recommended by template" and every neutral-language rule needs a build-time check, not just an AI-output check.**
`checkProhibited()` only screens AI-generated text. But Section 2 bans specific *static UI copy*
too ("Recommended," "Best," "Most likely to win" must never label an option). That's a content
discipline problem, not a runtime one. Plan: a lightweight test (like `test/phase3.test.ts`) that
greps every new page's literal JSX strings for a banned-phrase list, run as part of each phase's
QC pass — catches a developer (or me) accidentally writing "Recommended" as a label.

**1.10 — E-filing/one-click filing is explicitly out of scope — keep it that way through every phase.**
Section 10 says "do not permit one-click filing or service in the initial version," implying a
future version might. I'd recommend treating this as a permanent non-goal for this product, not
just "initial version" — filing/service status should stay user-reported checkboxes
(`filing_status_records`, `service_status_records` as simple user-entered logs) across all six
phases. Actually integrating with e-filing portals is a different trust/liability category and
should be a separate, explicit decision later, not something that falls out of "Phase 6 production
hardening."

**1.11 — Table count needs trimming for each real phase, not built as 40 tables at once.**
Section 20 lists ~40 tables. Building them all in one migration (the mistake to avoid) makes QC
impossible. My Phase 2 table list below is intentionally smaller (~26) — several of the spec's
proposed tables collapse into one with a `type` discriminator column (e.g., `question_sets` +
`question_groups` + `questions` → one `questions` table with a `group_label` text column and a
parent `question_set_id`; `discovery_requests` + `discovery_request_items` stays as two because
the item list genuinely needs its own rows). I'll flag every collapse below so it's a visible
decision, not a silent scope cut.

---

## 2. Architecture: how this builds on what exists

```
Court Action Workspace (NEW orchestration layer)
        │
        ├── reuses ─→ documentDraftingService  (existing, guard-validated)
        ├── reuses ─→ documentReviewService     (existing, guard-validated)
        ├── reuses ─→ referenceSearchService     (existing, priority + conflicts)
        ├── reuses ─→ citationValidationService  (existing, no-fabrication guard)
        ├── reuses ─→ lib/documents/export.ts    (existing, extended for packages)
        ├── reuses ─→ lib/security/redaction.ts  (existing, extra sensitive-kinds)
        │
        └── NEW services (orchestration + new content types only)
               situationIntakeService      — maps free text / picked situation → candidate document_definitions
               documentOptionService       — neutral definitions + "why this may relate"
               casePostureService          — the yes/no/unknown case-posture questionnaire
               guidedQuestionService       — branching question banks keyed by task type
               factExtractionService       — turns selected records + answers into fact_candidates
               factApprovalService         — user approve/reject/edit per fact
               legalReferenceSuggestionService — wraps referenceSearchService, returns suggestions for approval
               citationApprovalService     — user approve/reject per suggested citation
               documentPackageService      — orchestrates N calls to documentDraftingService
               hearingPackageService       — package preset for hearing-prep component sets
               questionGenerationService   — witness/deposition/exam questions + questionSafetyGuard
               discoveryService            — RFA/RFP/interrogatory numbered-request generation
               subpoenaService             — subpoena drafting, jurisdiction-gated
               exhibitPacketService        — coversheets, Bates numbering, combined PDF
               proceduralChecklistService  — derives checklist items from assigned references
               documentStyleService        — caption/format profile resolution + override precedence
               signatureService / serviceCertificateService / certificationService — final-components logic
               documentConsistencyService  — cross-document field-diffing over a package
```

Everything in the "reuses" block stays untouched at its interface; Court Actions calls it. This
is the difference between a 3-week build and a 3-month rewrite.

---

## 3. Route map

```
/court-actions                     dashboard: continue / start / describe / hearing prep / etc.
/court-actions/new                 "Tell Us What Is Happening" intake
/court-actions/[id]                action workspace shell (left: steps, center: content, right: sources/rules/warnings)
/court-actions/[id]/posture        Step: case-posture questionnaire (first time only)
/court-actions/[id]/sources        Step 2: source selection
/court-actions/[id]/questions      Step 3: guided questions
/court-actions/[id]/facts          Step 4: fact review table
/court-actions/[id]/references     Step 5: reference suggestions + approval
/court-actions/[id]/package        Step 6: package component selection
/court-actions/[id]/draft          Step 7-8: generate + split-screen review (per component)
/court-actions/[id]/consistency    Step 9: package consistency + status
/court-actions/[id]/export         Step 10: export

/discovery                         discovery workspace (list + new RFA/RFP/interrogatory/subpoena)
/discovery/[id]

/hearing-preparation                "Build My Hearing Package" entry + saved packages
/hearing-preparation/[id]

/questions                          standalone Question Builder (also reachable from an action or hearing package)
/questions/[id]

/exhibits                           exhibit packet assembly (index, coversheets, Bates numbers, combined PDF)

/case-overview                      NEW: case identity + posture + style profile, split out of onboarding
/case-overview/style                caption/formatting/signature/service profile editor
```

Existing routes (`/documents`, `/references`, `/document-review`, `/timeline`, `/evidence`, etc.)
are unchanged and are the data sources this new layer reads from.

---

## 4. Court Action workflow (Steps 1–10, condensed)

```
1 Define task        →  free text OR picked situation  →  document_definitions matched by keyword/category
2 Select sources      →  timeline/evidence/comms/orders/people/refs, multi-select w/ filters
3 Guided questions     →  branching by task type, prepopulated from case, "why are we asking this?"
4 Fact review          →  fact_candidates generated from (2)+(3) → user approves/edits/rejects → fact_approvals
5 Reference review     →  legalReferenceSuggestionService (wraps existing retrieval) → user approves/rejects → citation_approvals
6 Package selection    →  checklist of components for this task type (template-recommended, individually toggleable)
7 Generate drafts      →  documentPackageService calls documentDraftingService per component, using ONLY
                           approved facts (4) + approved citations (5) + style profile
8 Review & edit         →  split-screen per component, reuses existing Step5-style source panel
9 Package consistency   →  documentConsistencyService diffs party names/dates/case no./relief across components
10 Export                →  extended export.ts: per-doc DOCX/PDF, combined package PDF, ZIP, checklists, CSVs
```

Autosave after every step (writes to `court_action_answers`/`court_action_sources` immediately,
not just on "Continue") — required by Section 19 ("never discard entered information without
warning," "support save-and-return").

---

## 5. Component tree (new, Phase 1 scope only — no data layer yet)

```
components/court-actions/
  ActionDashboard.tsx        — cards: continue/start/describe/hearing-prep/respond/etc.
  IntakePicker.tsx           — situation chips + free-text field
  DocumentOptionCard.tsx     — neutral definition card w/ expand sections, no ranking
  PostureQuestionnaire.tsx   — yes/no/unknown case-posture form
  ActionStepNav.tsx          — left rail step list w/ status pills (Not started…Ready for export)
  SourceSelector.tsx         — generalizes the existing draft-wizard Step2 (adds AI-suggested toggle)
  GuidedQuestionRunner.tsx   — one-topic-at-a-time question flow w/ "why are we asking this?"
  FactReviewTable.tsx        — proposed fact | source | date | support level | approve/edit/reject
  ReferenceApprovalList.tsx  — extends existing ReferenceCard w/ add/reject/save-for-later actions
  PackageComponentPicker.tsx — checklist w/ "select all" / "recommended by template" / custom save
  PackageSplitEditor.tsx     — reuses existing Step5/SplitReviewer patterns per component
  ConsistencyReport.tsx      — field-by-field mismatch table
  ExportPanel.tsx            — per-doc + combined package export controls
  StatusBadge.tsx            — the 13-state status enum from Section 19

components/questions/
  QuestionBuilderWizard.tsx, QuestionGroupList.tsx, QuestionCard.tsx (foundation-required flag, source chip)

components/discovery/
  DiscoveryRequestBuilder.tsx, SubpoenaBuilder.tsx, ProceduralChecklist.tsx (shared w/ hearing-prep)

components/hearing-prep/
  HearingPackageBuilder.tsx  — thin wrapper around PackageComponentPicker w/ a hearing-specific preset
```

Reused, not rebuilt: `Modal`, `Disclaimer`, `AssistantLauncher`, `SupportBadge`, `VerificationBadge`,
`SeverityBadge`, and the entire existing draft-wizard step pattern.

---

## 6. Data model (Phase 2 candidate — trimmed from the spec's ~40 to ~26, collapses noted)

Only needed once we leave the mock-data Phase 1. Grouped by concern, each following the existing
migration idiom (owner/case-scoped RLS via the same `do $$ … loop` pattern already in 003/004).

**Action + package core**
- `court_actions` (case_id, task_type, status, title, created_by, timestamps)
- `court_action_answers` (action_id, question_key, answer, answered_at) — *collapses
  `court_action_steps` into a status column on `court_actions` itself; a separate steps table adds
  no query value over a status enum + `court_action_answers` history*
- `court_action_sources` (action_id, source_type, source_id) — the once-selected, package-wide source set
- `fact_candidates` / `fact_approvals` (as in 1.2)
- `citation_suggestions` / `citation_approvals` (as in 1.2)
- `court_action_packages` (action_id, name) — usually 1:1 with the action, but versionable if the
  user rebuilds the package later
- `package_components` (package_id, document_definition_id, generated_document_id nullable, status)
- `package_consistency_findings` (package_id, field, values_json, severity)

**Document definitions & official forms**
- `document_definitions` (name, category, plain_definition, purpose, prerequisites, related_ids,
  jurisdiction filter, has_template boolean) — *seed data, not user-authored*
- `official_forms` (jurisdiction, name, source_url, pdf_path, fillable_fields_json)

**Case style / final-document components**
- `case_style_profiles` (case_id, font, font_size, spacing, margins, heading_style, …)
- `court_captions` (case_id, label, caption_text, is_default)
- `signature_profiles` (case_id, kind, image_path nullable, saved_name)
- `service_profiles` (case_id, label, recipients_json, default_method)
- `document_component_settings` (document_id, component_key, enabled, source_reference_id nullable)
  — *collapses `certification_types` into a fixed enum in code (it's a closed list per the spec,
  not user-extensible), avoiding a lookup table for something that never changes*

**Jurisdiction packs**
- `jurisdiction_reference_packs` (state, county, circuit, court, division, judge, name)
- `reference_pack_items` (pack_id, legal_reference_id) — pure pointer table, per 1.3

**Discovery & subpoenas**
- `discovery_requests` (case_id, action_id, kind, status)
- `discovery_request_items` (request_id, ordinal, text, source_fact_id)
- `subpoenas` (case_id, action_id, kind, recipient, status)
  — *collapses `subpoena_instructions` into a jsonb column on `subpoenas` populated from the
  matching jurisdiction pack's procedural references at generation time — it's a snapshot, not an
  independently editable entity*

**Questions**
- `question_sets` (case_id, action_id nullable, witness_person_id, question_type)
- `questions` (set_id, group_label, text, source_fact_id nullable, requires_foundation boolean,
  ordinal) — *collapses `question_groups` into a `group_label` text column on `questions`; a
  separate table only pays off if groups need their own metadata, which the spec doesn't ask for*

**Hearing packages & exhibits**
- `hearing_packages` (case_id, hearing_id, action_id nullable, name)
- `hearing_package_items` (package_id, package_component ref) — *reuses `package_components`
  rather than a parallel item table, since a hearing package IS a `court_action_packages` row with
  a hearing-specific component preset*
- `exhibit_packets` (case_id, action_id nullable, name, bates_prefix)
- `exhibit_coversheets` (packet_id, evidence_id, exhibit_number, description)

**Review confirmations**
- `user_review_confirmations` (entity_type, entity_id, confirmation_key, confirmed_by, confirmed_at)
  — *generalizes the existing inline `REVIEW_CONFIRMATIONS` checkbox pattern into one reusable
  table instead of a bespoke table per document/action/package*

Not building yet (defer past Phase 2, or fold into existing tables when the need is concrete):
`court_action_types` / `court_action_templates` (a task-type enum in code is sufficient until we
have real usage data on what varies per type), `filing_status_records` / `service_status_records`
(start as jsonb status fields on `court_actions`/`generated_documents`; promote to real tables only
if we need a history of status changes, not just current status).

---

## 7. AI source-grounding design (extends what exists)

- Every fact and citation gets approved **before** it can be used in a draft — `factApprovalService`
  and `citationApprovalService` are gates, structurally equivalent to `sourceGuard` but running at
  approval time instead of generation time. A document can only be generated from
  `fact_approvals.status = 'approved'` rows and `citation_approvals.status = 'approved'` rows.
- `documentDraftingService` (existing) is called with the approved sets as its source pool —
  **no interface change needed**, since it already accepts an arbitrary `SelectableSource[]`.
- `documentConsistencyService` runs `guardStatements()`-style validation but across the WHOLE
  package: extracts key fields (case number, party names, requested relief, hearing date) per
  generated document via light regex/heuristic extraction, and flags any value that differs from
  the case record or from another document in the same package. Purely comparative — it never
  invents a "correct" value, only flags disagreement for user resolution.
- `questionSafetyGuard` (new, sibling to `sourceGuard`): screens generated questions for (a) the
  existing prohibited-phrasing patterns, (b) a harassment/intimidation pattern list, (c) whether a
  question references a specific exhibit without a preceding authentication question in its group
  → flags `requires_foundation`.

## 8. Jurisdiction reference design

Already covered in 1.3 / Section 6 table list. One addition: when a case is created (or its
state/county/court/division/judge is edited), a background step matches it against
`jurisdiction_reference_packs` and attaches matching pack items as `reference_case_links` rows with
`verification_status` inherited from the underlying reference — the user still has to explicitly
"assign" or approve them for use in a specific action (attachment ≠ approval).

## 9. Package-generation design

Summarized in Section 6 above (`court_action_packages` → `package_components` → existing
`generated_documents`). Key rule carried over from the existing Documents module: a
`package_components` row's status mirrors the richer status enum from Section 19 (not just the
existing 4-state `generated_documents.status`) — status lives on the component join row, not
overloaded onto the document itself, since the same document could theoretically belong to
multiple packages later.

## 10. Risk & safeguards summary

| Risk | Safeguard |
|---|---|
| Fact/citation reuse across many documents amplifies one error everywhere | Approval gate is the single point of truth; editing an approved fact after generation flags every `package_component` that used it as "review required" |
| Question generation produces harassing/leading content | `questionSafetyGuard` + explicit UI copy from Section 11 ("do not advise the user that impeachment will be successful") |
| Deadline math silently wrong | Same rule as existing Document Review: never compute without trigger date + rule + calendar assumptions all shown |
| Scope creep re-opens "is this legal advice" risk | Content-string QC test (1.9) run every phase, same disclaimer component reused everywhere (never a new bespoke disclaimer string) |
| 40-table migration is unauditable | Trimmed to ~26, phased, validated against Postgres exactly like 001–005 before merge |
| Duplicate export/report logic diverges over time | One extended `lib/documents/export.ts`, Reports/Hearing-Prep/Court-Actions all call it |

## 11. Phase 1 implementation plan (when we start coding — not yet)

Mock-data UI only, no new tables, no live ingestion — matches the spec's own Phase 1 scope.

**Files to create** (~28, grouped):
- `app/court-actions/page.tsx` + `[id]/{posture,sources,questions,facts,references,package,draft,consistency,export}/page.tsx` (dashboard + 9 step routes, or one shell page with client-side step state — recommend the latter, mirroring the existing `/documents/draft` single-page wizard pattern, to avoid 9 route round-trips)
- `components/court-actions/*` (14 components listed in §5)
- `lib/mock/court-actions.ts`, `lib/mock/document-definitions.ts`, `lib/mock/questions.ts`
- `lib/court-actions/types.ts` (CourtAction, FactCandidate, CitationSuggestion, PackageComponent, etc.)
- `lib/services/situationIntakeService.ts`, `documentOptionService.ts` (deterministic keyword-match over mock document_definitions, same style as existing Phase 3 services)
- Sidebar nav: add "Court Actions" (and stub links for Discovery, Hearing Preparation, Exhibits — pointing at "coming soon" pages until their own phase)

**Explicitly not in Phase 1:** database writes, real reference retrieval (reuse existing mock
References data), real document generation (reuse existing mock Documents flow), Question
Builder / Discovery / Subpoena UIs (those are Phase 4 per the spec's own phasing — Phase 1 here is
just the Court Action prototype, not the whole feature set).

**QC gate before calling Phase 1 done:** build clean, lint clean on new files, the existing 30
Phase-3 tests still pass unmodified (nothing here touches `lib/ai/*` or `lib/services/*` yet), plus
one new test file asserting the content-string check from 1.9 over the new components.
