# Evidence OS — Setup Guide (Documents / AI / References / Review)

Everything you need to get the new modules running without hitting errors. Do these **in order**.

---

## 1. Get the new code

```bash
git checkout claude/evidence-os-documents-ai
git pull
npm install          # no new dependencies were added, but this is safe to run
```

---

## 2. Run the database migrations in Supabase

Open **Supabase → SQL Editor → New query**. Run these **two** files, in order. Both are
idempotent (safe to run more than once). Copy the full contents of each file from the repo:

1. `supabase/migrations/003_documents_references_reviews.sql`
   — adds the Documents, References, Reviews, AI, and jurisdiction tables, and expands `cases`
   with case number, type, state, county, court, division, judge, parties, etc.

2. `supabase/migrations/004_security_audit.sql`
   — adds audit / file-access / export / AI-request / redaction logging tables, and consent +
   retention columns on `profiles`.

> If you're setting up a brand-new Supabase project from scratch, run `001`, `002`, `003`, `004`
> in that order. If your project is already live (you've been using the app), you only need `003`
> and `004` — the earlier ones already ran.

**Verify it worked** — run this and confirm you see the new tables, all with `rowsecurity = t`:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public'
  and tablename in ('legal_references','generated_documents','document_reviews',
                    'review_findings','ai_conversations','audit_logs','export_history')
order by tablename;
```

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

The four new modules currently render from **illustrative sample data** so you can see and use the
full workflow immediately. The database schema, RLS, and all provenance/versioning tables from
step 2 are live and validated; wiring each module's create/read/update to those tables (replacing
the sample data, exactly like we did earlier for Evidence, Timeline, etc.) is the next increment.

## Safety model (why this is not "legal advice" software)

- Every factual or rule statement must trace to a source you provided; anything else is flagged
  "no source located," never shown as fact.
- The assistant cannot recommend strategy, choose motions/claims, predict outcomes, or state that
  evidence is admissible or that a document is legally sufficient — these are blocked in code.
- References carry verification status and effective dates; superseded/conflicting sources are
  surfaced to you, never silently resolved.
- Nothing is redacted, and no case data trains any model, without your explicit action/opt-in.
