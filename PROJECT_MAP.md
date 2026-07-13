# Evidence OS — Project Map

Branch: `claude/court-action-workspace` · Generated 2026-07-13

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
│                         005_seed_templates · 006_court_actions
├── test/  alias-loader.mjs · phase3.test.ts · court-actions.test.ts · neutral-language.test.ts
├── docs/  ARCHITECTURE.md · COURT_ACTION_PLAN.md · SETUP.md
├── middleware.ts · next.config.ts · eslint.config.mjs · postcss.config.mjs
├── package.json · tsconfig.json · .env.local.example · README.md · CLAUDE.md · AGENTS.md
```

## Database schema (67 tables, all RLS-protected)

**001 — Core case data:** `profiles`, `cases` (expanded in 003/006 with case_number, case_type, state, county, circuit_district, court_name, division, judge, magistrate, petitioner, respondent, user_role, opposing_party, opposing_counsel, date_opened), `people`, `evidence`, `timeline_events`, `exhibits`, `tasks`, `court_orders`, `hearings`, `hearing_packets` *(legacy, superseded by 006 `hearing_packages`)*, join tables `evidence_timeline_links`, `evidence_people_links`, `timeline_people_links`

**002 — Communications:** `communications`

**003 — Documents / References / Reviews / AI:** `jurisdictions`, `courts`, `judicial_divisions`, `judges`, `legal_references`, `legal_reference_versions`, `reference_sections`, `reference_case_links`, `source_urls`, `verification_records`, `document_templates`, `template_sections`, `template_variables`, `generated_documents`, `document_versions`, `document_sources`, `document_exports`, `document_reviews`, `review_findings`, `ai_conversations`, `ai_messages`, `ai_source_links`

**004 — Security / audit:** `audit_logs`, `file_access_history`, `export_history`, `ai_request_logs`, `source_use_logs`, `redaction_records` (+ consent/retention columns on `profiles`)

**005 — Seed:** 6 built-in rows in `document_templates` + 24 `template_variables`

**006 — Court Action Workspace:** `court_actions`, `court_action_answers`, `court_action_sources`, `fact_candidates`, `citation_suggestions`, `court_action_packages`, `package_components`, `package_consistency_findings`, `document_definitions`, `official_forms`, `case_style_profiles`, `court_captions`, `signature_profiles`, `service_profiles`, `document_component_settings`, `jurisdiction_reference_packs`, `reference_pack_items`, `procedural_checklists`, `procedural_checklist_items`, `discovery_requests`, `discovery_request_items`, `subpoenas`, `question_sets`, `questions`, `hearing_packages`, `exhibit_packets`, `exhibit_coversheets`, `user_review_confirmations`

Storage: one private bucket `evidence-files` (signed URLs).

## Routes / pages

| Route | Purpose |
|---|---|
| `/` | Redirect → /dashboard |
| `/login` · `/signup` · `/auth/callback` · `/onboarding` | Auth + expanded case creation (jurisdiction/party fields) |
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
| References | **working** | CRUD, verify, assign-to-case, version/supersede plumbing; file-upload ingestion **stub** (use paste/manual) |
| Document Review | **working** | Real review service against saved docs or pasted text; findings + decisions persist; DOCX/PDF upload parsing **stub** |
| Court Actions (10-step wizard) | **working** | Persistence per step; fact/citation approval gates; package generation → generated_documents; consistency report; checklist; redaction-screened export + audit log |
| Discovery | **working** | Numbered request generation, save, print; subpoena builder **stub** (table exists, no UI) |
| Question Builder | **working** | Safety-screened, foundation-flagged sets; save + print |
| Hearing Preparation | **working** | Creates hearing-prep action + hearing_packages row; deep hearing-specific component presets **partial** (uses the standard package preset) |
| AI Assistant panel | **partial** | UI + modes + strategy refusal work; responses are deterministic previews; conversations not yet persisted to ai_* tables; live LLM adapter present but not wired to the panel |
| Pattern Insights | **working** | Rule-based analysis of real timeline data (no LLM) |
| Reports | **working** | 5 live generators (print/CSV) |
| Hearing Notebook | **working (legacy)** | Kept until Hearing Preparation fully supersedes it |
| Settings | **working** | Profile edit, case switcher, sign out; case-style/caption/signature profile editor UI **stub** (tables + db layer exist) |
| Guided questions (wizard step 3) | **partial** | Dedicated bank for temporary relief; generic bank for other task types |
| Jurisdiction reference packs | **partial** | Tables + pointer model exist; no auto-matching UI yet |
| Official forms · subpoenas · document_component_settings | **stub** | Schema only, no UI |
| Redaction / export / audit logging | **working** | Detection + user-approved apply; audit/export/AI-request logs written |
| Safety guards (sourceGuard, questionSafetyGuard, prohibited-phrase, neutral-language CI gate) | **working** | 82 automated assertions, all passing |
