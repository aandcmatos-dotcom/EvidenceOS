// Full-case export (Task C): the anti-lock-in / continuity feature. One action
// produces a ZIP of every row belonging to the user's own case (RLS already
// guarantees a member can only ever read their own cases' rows — this service
// simply enumerates the tables and lets Supabase's normal client + RLS do the
// scoping) plus the stored evidence files themselves. Browser-only (dynamic
// fflate import, same pattern as the import pipeline).

import { createClient } from "@/lib/supabase/client";

// Every table whose rows are meaningfully "this case's data" for portability.
// Deliberately excludes internal-only bookkeeping (ai_request_logs, audit_logs
// stay server-side/administrative — not needed to reconstruct the case).
const EXPORT_TABLES = [
  "cases", "people", "evidence", "timeline_events", "exhibits", "tasks", "court_orders",
  "hearings", "communications", "court_actions", "court_action_answers", "fact_candidates",
  "citation_suggestions", "discovery_requests", "discovery_request_items", "subpoenas",
  "subpoena_items", "deadlines", "instrument_responses", "deficiency_entries",
  "inbound_filings", "generated_documents", "document_reviews", "review_findings",
  "question_sets", "questions", "hearing_packages", "exhibit_packets", "exhibit_coversheets",
  "import_batches", "import_files", "import_file_classifications", "case_reference_attestations",
  "case_members",
] as const;

export interface ExportProgress {
  table: string;
  done: number;
  total: number;
}

export function exportTables(): readonly string[] {
  return Array.from(new Set(EXPORT_TABLES));
}

// Every export query is scoped by exactly one equality filter tying it back to
// the case: "cases" filters on its own id, every other table filters case_id.
// No table in this list is queried unfiltered.
export function exportFilterColumn(table: string): "id" | "case_id" {
  return table === "cases" ? "id" : "case_id";
}

export async function buildCaseExport(
  caseId: string,
  caseName: string,
  userId: string,
  onProgress?: (p: ExportProgress) => void,
): Promise<Blob> {
  const supabase = createClient();
  const manifest: Record<string, unknown[]> = {};
  const tables = exportTables();

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    onProgress?.({ table, done: i, total: tables.length });
    const column = exportFilterColumn(table);
    const { data, error } = await supabase.from(table).select("*").eq(column, caseId);
    if (error) {
      // Per-table failures don't abort the export — recorded, not fatal.
      manifest[table] = [{ _export_error: error.message }];
      continue;
    }
    manifest[table] = data ?? [];
  }

  // Evidence file bytes, fetched via signed URL (same access path the app
  // already uses — RLS on storage.objects scopes this to case members).
  const evidenceRows = (manifest.evidence ?? []) as { id: string; file_path: string | null; title: string }[];
  const files: Record<string, Uint8Array> = {};
  for (const ev of evidenceRows) {
    if (!ev.file_path) continue;
    try {
      const { data: signed } = await supabase.storage.from("evidence-files").createSignedUrl(ev.file_path, 300);
      if (!signed?.signedUrl) continue;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      files[`files/${ev.file_path}`] = buf;
    } catch {
      // Skip unreadable/missing files; the JSON manifest still records the row.
    }
  }

  const { zipSync, strToU8 } = await import("fflate");
  const zipInput: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify({
      exportedAt: new Date().toISOString(), caseId, caseName, exportedBy: userId,
      note: "Evidence OS full-case export. Organizational data only — not a certified court record.",
    }, null, 2)),
    "data.json": strToU8(JSON.stringify(manifest, null, 2)),
    ...files,
  };
  const zipped = zipSync(zipInput, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
}
