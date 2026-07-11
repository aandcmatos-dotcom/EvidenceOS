# Evidence OS — Documents, AI Assistant, References & Review

Design for the four connected modules. Evidence OS is an **organization and document-productivity
platform**. It must never provide legal advice, recommend strategy, predict outcomes, or represent
that a document is legally sufficient. Every AI statement must trace to a stored source.

## 1. Application architecture

```
Next.js App Router (client components + Supabase)
│
├── Data layer:  Supabase Postgres + RLS, Storage (private buckets, signed URLs)
├── Service layer (lib/services/*.ts): pure functions returning STRUCTURED JSON.
│      In Phase 1–3 these are deterministic mocks; Phase 4 swaps the mock body for a
│      real LLM call behind the SAME interface. The UI never changes.
├── AI safety gate (lib/ai/sourceGuard.ts): rejects any factual/rule statement that
│      lacks source IDs before it can be displayed.
└── UI layer (app/*, components/*): reusable cards, panels, wizards.
```

Guiding rule: **no oversized files**. Each page composes small components; each service is one concern.

## 2. Route structure

| Route | Purpose |
|-------|---------|
| `/documents` | Tabs: My Documents · Templates · Draft New · Review · Exported |
| `/documents/draft` | 7-step drafting wizard |
| `/documents/[id]` | View / edit a generated document |
| `/references` | Legal Reference Library (search, filters, ingest) |
| `/references/[id]` | Reference detail + versions |
| `/document-review` | Review dashboard + split-screen reviewer |
| `/onboarding` | Expanded case-creation (jurisdiction fields) |

Navigation order: Dashboard · Timeline · Evidence · Communications · People · Court Orders ·
**Documents** · **References** · **Document Review** · Hearing Notebook · Tasks · Settings.

## 3. Database schema (Phase 2)

New tables (all with `created_at`/`updated_at`, RLS scoped through `cases.owner_id`):

- **jurisdictions, courts, judicial_divisions, judges** — reference geography; a case links to one jurisdiction.
- **document_templates, template_sections, template_variables** — reusable templates.
- **generated_documents, document_versions, document_sources, document_exports** — drafts + provenance.
  `document_sources` links a document to evidence/events/communications/orders/people/references.
  `document_versions` snapshots the sources + reference versions used at generation time.
- **legal_references, legal_reference_versions, reference_sections, reference_case_links,
  reference_document_links, verification_records, source_urls** — the reference library with version control.
- **document_reviews, review_findings** — review runs + findings; each finding can link to the exact reference section.
- **ai_conversations, ai_messages, ai_source_links** — assistant history + per-message source provenance.

Expanded **cases** columns: case_number, case_type, state, county, circuit_district, court_name,
division, judge, magistrate, petitioner, respondent, user_role, opposing_party, opposing_counsel,
date_opened, case_status.

## 4. Component tree (Phase 1)

```
components/
  documents/  DocumentCard, TemplateCard, DraftWizard (Step1..Step7),
              SourcePicker, SourceBadge, ReviewChecklist, ExportPanel
  references/ ReferenceCard, ReferenceFilters, IngestModal, VerificationBadge, VersionList
  review/     ReviewDashboard, FindingCard, SplitReviewer, SeverityBadge
  assistant/  AIAssistantPanel, ModeSelector, SourceAwareResponse, MessageBubble
  shared/     Disclaimer, JurisdictionLabel
```

## 5. AI safety & source-traceability

- All AI output is **structured JSON** (`lib/ai/schema.ts`) with required fields: `statement`,
  `sourceIds`, `sourceExcerpts`, `confidence`, `uncertainty`, `missingInformation`, `jurisdiction`,
  `referenceVersion`, `userVerificationRequired`.
- `sourceGuard.validate()` rejects any factual/rule statement lacking `sourceIds` → shown as
  "No source located" rather than displayed as fact.
- Legal-strategy questions get the fixed refusal + neutral alternatives.
- Retrieval priority: judge → division → local rules → admin orders → state family → civil →
  evidence → statutes → other official → user-uploaded → secondary. Conflicts are surfaced, never resolved silently.
- Every statement carries a status: Supported · Partially supported · User-entered · Needs verification · No source located.

## 6. Phased plan

- **Phase 1** — UI + mock data: nav, Documents (tabs + wizard), Templates, AI Assistant panel,
  References library, Document Review dashboard + split reviewer. *(this build)*
- **Phase 2** — DB schema, migrations, CRUD, versioning, jurisdiction linking, source traceability.
- **Phase 3** — Structured mock AI services: draft generation, reference retrieval, review findings,
  citation checking, source links (deterministic, schema-validated).
- **Phase 4** — Real LLM API, PDF/DOCX parsing + export, official-source import, redaction, audit logs.

QC audit + bug-fix pass runs at the end of every phase before moving on.
