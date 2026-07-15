# Evidence OS

Court-preparation and evidence-organization platform for self-represented
family-law litigants. Does not provide legal advice, predict outcomes, or
claim legal sufficiency — see `docs/ARCHITECTURE.md` for the full design.

## Tester setup

You'll need a Supabase project and (optionally) an Anthropic API key.

1. **Run every migration in order**, `supabase/migrations/001_*.sql` through
   the highest-numbered file, in the Supabase SQL Editor. Each file is
   idempotent (safe to re-run). Current head: `012_roles_and_security.sql`.
2. **Storage bucket**: create a private bucket named `evidence-files` via the
   Supabase dashboard (Storage → New Bucket, Public: off) if it doesn't exist
   yet. Migration 012 sets the bucket's *object-level* RLS policies for you
   (case-scoped, not uploader-scoped) — you don't need to click through the
   dashboard's policy UI.
3. **Environment**: copy `.env.local.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ANTHROPIC_API_KEY=sk-ant-...   # optional — every AI feature has a deterministic fallback
   ```
4. **First case**: sign up, then `/onboarding` creates your first case (you
   become its `party`). A `party` can invite a `helper` by email from
   Settings → Team & Access; the helper gets full create/edit/upload/draft
   rights but can't confirm reviews, verify deadlines, approve final facts/
   citations, or finalize/export documents — those stay with the party
   (enforced in the database, not just the UI — see `docs/SECURITY_AUDIT.md`).
5. **Full-case export**: Settings → "Export this case" downloads a ZIP of
   your own case's data + files at any time — the anti-lock-in path if you
   want to move to another tool.

### Known stubs / incomplete surfaces

- **Official forms UI**: `official_forms` table and RLS exist; there is no
  dedicated browse/upload screen yet (forms currently flow through the
  general reference-upload path).
- **Reference file-upload ingestion**: text extraction on reference uploads
  reuses the shared extraction service but hasn't been given reference-
  specific parsing (section splitting is manual).
- **AI assistant persistence**: the assistant panel's UI, modes, and refusal
  behavior work; conversations aren't yet persisted to `ai_conversations`/
  `ai_messages` — responses are deterministic previews unless wired to the
  live LLM adapter per request.
- **Party-only-action UI gating**: the database (RLS + triggers) fully
  enforces that only a case's party can confirm reviews, verify deadlines,
  approve final facts/citations, and finalize/export documents. The
  court-actions wizard's approve/reject buttons do not yet show a helper-aware
  "Awaiting party approval" state inline at every one of those decision
  points — a helper attempting one of those actions gets a clear rejection
  from the database, just not a pre-emptive UI hint everywhere yet.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
