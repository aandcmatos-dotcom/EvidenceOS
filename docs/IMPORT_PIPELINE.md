# Bulk Import & Text Extraction

Ingestion plumbing for a large personal archive of court files. No AI, no
classification — this stage stores files, de-duplicates, extracts text where a text
layer exists, and lets the user promote items into the Evidence module.

## Flow

```
/import                 → create a batch (source label), list past batches, run backfill
/import/[id]            → drop a folder / files / zips
   client pipeline (lib/import/pipeline.ts):
     1. expand zips (fflate) → members with the zip name prefixed onto folder path
     2. sha256 each file (Web Crypto)
     3. dedup vs. hashes already in this case  → status "duplicate", linked to original
        (resumable: re-dropping the same folder skips already-uploaded hashes)
     4. upload to evidence-files bucket under  caseId/imports/batchId/…  (5 concurrent)
     5. register an import_files row
     6. extract text (3 concurrent) → import_files.status extracted | needs_ocr | failed
   promote (single or bulk) → evidence rows referencing the SAME storage object
```

## Extraction (lib/services/extraction.ts)

| Type | Method | text_source |
|------|--------|-------------|
| PDF | pdfjs-dist text layer | `text_layer`, or `none` + **needs_ocr** if the layer is empty/negligible |
| DOCX | mammoth `extractRawText` | `text_layer` |
| TXT / CSV / RTF | direct read (RTF lightly stripped) | `text_layer` |
| EML | headers (from/to/date/subject → `eml_headers`) + body | `text_layer` |
| DOC / MSG / images / audio / video | none | `none` |

Extracted text is capped at 500 KB (`truncated` flag set when clipped). The pure
decision logic (`finalizeExtraction`, `parseEml`, `kindFor`, `capText`, `rtfToText`)
is unit-tested; the heavy parsers are dynamically imported so they load only in the
browser.

## OCR — planned follow-up (not in this task)

Files whose PDF text layer is empty are marked **needs_ocr** and shown with an
OCR-pending count. They remain fully stored and promotable; only their text is
missing. OCR is a planned follow-up — the intended options are:

- **tesseract.js** client-side (no server cost, slower, runs in a worker), or
- a **Supabase edge function / server queue** calling a hosted OCR engine.

Because extraction already runs behind a queue with a per-file status, adding OCR is
a matter of handling `needs_ocr` rows in a second pass and writing back
`text_source = 'ocr'` — no schema change required.

## Reused by

The same `extractFromFile` service backs the previously-stubbed file uploads in
**/references** (extract into a reference's full text) and **/document-review**
(extract a DOCX/PDF/text file for review). One service, three entry points.

## Backfill

`/import` has a **Run backfill** action: it finds evidence rows that have a file but
no `extracted_text`, downloads each via a signed URL, runs the same extraction, and
writes the text back — so items uploaded before this feature join the pipeline.
