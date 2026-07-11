# Evidence OS — Setup Guide (Documents / AI / References / Review / Court Actions)

Everything you need to get the new modules running without hitting errors. Do these **in order**.

> **Court Action Workspace branch (`claude/court-action-workspace`):** one additional migration —
> run `supabase/migrations/006_court_actions.sql` in the Supabase SQL Editor after 003–005. It adds
> the 28 Court Action tables (actions, fact/citation approvals, packages, style profiles,
> jurisdiction packs, discovery, questions, hearing packages, exhibit packets), all idempotent with
> RLS. No storage buckets or manual policies needed. New sidebar modules: Court Actions, Discovery,
> Hearing Preparation, Question Builder.

---

## 1. Get the new code

```bash
git checkout claude/evidence-os-documents-ai
git pull
npm install          # no new dependencies were added, but this is safe to run
```

---

## 2. Run the database migrations in Supabase

Open **Supabase → SQL Editor → New query**. Run these **three** files, in order. All are
idempotent (safe to run more than once). Copy the full contents of each file from the repo:

1. `supabase/migrations/003_documents_references_reviews.sql`
   — adds the Documents, References, Reviews, AI, and jurisdiction tables, and expands `cases`
   with case number, type, state, county, court, division, judge, parties, etc.

2. `supabase/migrations/004_security_audit.sql`
   — adds audit / file-access / export / AI-request / redaction logging tables, and consent +
   retention columns on `profiles`.

3. `supabase/migrations/005_seed_templates.sql`
   — seeds the 6 built-in document templates (Declaration, Chronology, Exhibit List, etc.) so the
   Documents → Templates tab and the draft wizard have real rows to show. Without this, "Draft New
   Document" still works — you'll just start from a blank document until you seed templates.

> If you're setting up a brand-new Supabase project from scratch, run `001`, `002`, `003`, `004`,
> `005` in that order. If your project is already live (you've been using the app), you only need
> `003`, `004`, `005` — the earlier ones already ran.

**Verify it worked** — run this and confirm you see the new tables, all with `rowsecurity = t`:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public'
  and tablename in ('legal_references','generated_documents','document_reviews',
                    'review_findings','ai_conversations','audit_logs','export_history')
order by tablename;
```

Then confirm the templates seeded:

```sql
select name, category, built_in from document_templates order by name;
```

You should see 6 rows, all `built_in = true`.

That's the **only** Supabase work required. No new storage buckets, no new policies to click
through by hand — the migrations create every table, index, foreign key, and RLS policy for you.

---

## 3. (Optional) Turn on the real AI assistant

The app works fully **without** an API key — the AI assistant and draft generator run on the
built-in deterministic services, and every safety guard is active. To connect a real model:

1. Get an Anthropic API key from https://console.anthropic.com
2. Add it to your `.env.local` (never commit this file):

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # optional, defaults to claude-sonnet-5
   EVIDENCE_OS_MODEL=claude-sonnet-5
   ```

3. Restart `npm run dev`.

The key is used **server-side only**. Even with the model connected, all output still passes
through the source guard (unsourced factual/rule statements are downgraded to "no source located")
and the prohibited-phrasing filter (no advice, no outcome prediction, no admissibility claims).

> Note: the assistant panel and drafting currently call the deterministic services directly. The
> `lib/ai/llmClient.ts` adapter and `SAFETY_SYSTEM_PROMPT` are in place; wiring a given feature to
> the live model is a one-line swap inside that feature's service (documented in the file).

---

## 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000 (plain `http://`, not `https://`).

New items appear in the left sidebar: **Documents**, **References**, **Document Review**.

---

## 5. Run the safety tests (optional but recommended)

```bash
npm run test:phase3
```

This runs 30 assertions against the real service code — the source guard, prohibited-phrase
detection, citation "not found" handling (no fabricated citations), retrieval priority ordering,
conflict surfacing, review findings, and sensitive-data redaction. You should see
`✅ ALL PASS — 30 passed, 0 failed`.

---

## What you can do now

- **Documents** → *Draft New Document*: pick a template, select your own case records as sources,
  answer the generated questions, generate a draft where every sentence shows its source, confirm
  the review checklist, then export to Word/PDF/text (with a sensitive-data redaction check first).
- **References**: store statutes, rules, and court/judge procedures with honest verification
  status, official-vs-secondary labels, and effective/superseded dates; search and filter them.
- **Document Review**: run source, citation, procedure, evidence-foundation, and writing checks
  against your stored records and verified references, with a split-screen reviewer.
- **AI Assistant** (purple button, bottom-right of the new pages): draft, rewrite, summarize, and
  organize — it refuses legal-strategy questions and offers neutral alternatives instead.

## Current data state

All four modules are now wired to real Supabase data, scoped to your active case:

- **Documents**: templates load from `document_templates`; the draft wizard pulls real timeline
  events, evidence, communications, court orders, people, and assigned references as source
  material; generated drafts are saved to `generated_documents` with full source provenance
  (`document_sources`) and a version snapshot (`document_versions`); exports are logged.
- **References**: create, search, verify, and assign references to your case; verifying one writes
  a `verification_records` entry and updates the reference's status and last-verified date.
- **Document Review**: run a review against any saved document (or pasted text) using your case's
  assigned references — the review and every finding are persisted, and marking a finding
  Accept/Edit/Dismiss/Attorney-review saves that decision.

Two things intentionally still use local/mock behavior since they weren't part of this pass:
uploading a reference **file** (PDF/DOCX) — use "Manual citation" or "Paste text" for now — and
the AI Assistant panel's chat, which runs the deterministic Phase 3 service rather than persisting
conversations to `ai_conversations`/`ai_messages` yet.

## Safety model (why this is not "legal advice" software)

- Every factual or rule statement must trace to a source you provided; anything else is flagged
  "no source located," never shown as fact.
- The assistant cannot recommend strategy, choose motions/claims, predict outcomes, or state that
  evidence is admissible or that a document is legally sufficient — these are blocked in code.
- References carry verification status and effective dates; superseded/conflicting sources are
  surfaced to you, never silently resolved.
- Nothing is redacted, and no case data trains any model, without your explicit action/opt-in.
