import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/db/audit";
import type { ExtractionResult } from "@/lib/services/extraction";

export interface ImportFileRow {
  id: string; batch_id: string; case_id: string; storage_path: string | null;
  original_filename: string; original_folder_path: string | null; mime_type: string | null;
  size_bytes: number | null; sha256: string | null; status: string;
  duplicate_of: string | null; extracted_text: string | null; text_source: string | null;
  page_count: number | null; eml_headers: Record<string, unknown> | null; truncated: boolean;
  error_detail: string | null; promoted_evidence_id: string | null; created_at: string;
}

export async function createBatch(caseId: string, userId: string, sourceLabel: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_batches")
    .insert({ case_id: caseId, created_by: userId, source_label: sourceLabel || null, status: "uploading" } as never)
    .select().single();
  if (error) throw error;
  await logAudit({ userId, caseId, action: "import.batch_create", entityType: "import_batches", entityId: (data as { id: string }).id, metadata: { sourceLabel } });
  return data as { id: string };
}

export async function getBatches(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_batches").select("*")
    .eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getBatch(batchId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
  if (error) throw error;
  return data;
}

export async function getBatchFiles(batchId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_files").select("*")
    .eq("batch_id", batchId).order("original_folder_path").order("original_filename");
  if (error) throw error;
  return (data ?? []) as ImportFileRow[];
}

// Existing hashes in this case → resumable dedup across sessions.
export async function getExistingHashes(caseId: string): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_files")
    .select("id, sha256").eq("case_id", caseId).not("sha256", "is", null);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const r of (data ?? []) as { id: string; sha256: string }[]) {
    if (!map.has(r.sha256)) map.set(r.sha256, r.id);
  }
  return map;
}

export async function insertImportFile(row: {
  batchId: string; caseId: string; storagePath: string | null; filename: string;
  folderPath: string | null; mime: string | null; size: number; sha256: string;
  status: string; duplicateOf?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_files").insert({
    batch_id: row.batchId, case_id: row.caseId, storage_path: row.storagePath,
    original_filename: row.filename, original_folder_path: row.folderPath,
    mime_type: row.mime, size_bytes: row.size, sha256: row.sha256,
    status: row.status, duplicate_of: row.duplicateOf ?? null,
  } as never).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

export async function applyExtraction(fileId: string, result: ExtractionResult) {
  const supabase = createClient();
  const status = result.error ? "failed" : result.needsOcr ? "needs_ocr" : "extracted";
  const { error } = await supabase.from("import_files").update({
    status, extracted_text: result.text, text_source: result.textSource,
    page_count: result.pageCount, truncated: result.truncated,
    eml_headers: result.emlHeaders, error_detail: result.error,
  } as never).eq("id", fileId);
  if (error) throw error;
  return status;
}

export async function setFileStatus(fileId: string, status: string, errorDetail?: string | null) {
  const supabase = createClient();
  const { error } = await supabase.from("import_files")
    .update({ status, ...(errorDetail !== undefined ? { error_detail: errorDetail } : {}) } as never)
    .eq("id", fileId);
  if (error) throw error;
}

export async function updateBatchCounts(batchId: string, counts: Partial<{
  total_count: number; uploaded_count: number; extracted_count: number;
  failed_count: number; duplicate_count: number; status: string;
}>) {
  const supabase = createClient();
  const { error } = await supabase.from("import_batches").update(counts as never).eq("id", batchId);
  if (error) throw error;
}

// Promote import files to evidence WITHOUT copying storage — the evidence row
// references the same storage_path. Title from filename; category "Unclassified".
export async function promoteToEvidence(fileIds: string[], caseId: string, userId: string) {
  const supabase = createClient();
  const { data: files, error: fErr } = await supabase.from("import_files")
    .select("*").in("id", fileIds).is("promoted_evidence_id", null);
  if (fErr) throw fErr;

  let promoted = 0;
  for (const f of (files ?? []) as ImportFileRow[]) {
    if (f.status === "duplicate" || !f.storage_path) continue;
    const ext = (f.original_filename.split(".").pop() ?? "").toUpperCase();
    const { data: ev, error: evErr } = await supabase.from("evidence").insert({
      case_id: caseId, uploaded_by: userId,
      title: f.original_filename.replace(/\.[^.]+$/, ""),
      category: "Unclassified",
      file_path: f.storage_path, file_type: ext || null, file_size_bytes: f.size_bytes,
      status: "pending",
      extracted_text: f.extracted_text, text_source: f.text_source, page_count: f.page_count,
      notes: f.original_folder_path ? `Imported from ${f.original_folder_path}` : null,
    } as never).select("id").single();
    if (evErr) throw evErr;
    const evId = (ev as { id: string }).id;
    await supabase.from("import_files").update({ status: "promoted", promoted_evidence_id: evId } as never).eq("id", f.id);
    promoted++;
  }
  await logAudit({ userId, caseId, action: "import.promote", entityType: "import_files", metadata: { count: promoted } });
  return promoted;
}

// Backfill: evidence rows that have a file but no extracted text yet.
export async function getEvidenceNeedingExtraction(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("evidence")
    .select("id, file_path, title")
    .eq("case_id", caseId).is("extracted_text", null).not("file_path", "is", null);
  if (error) throw error;
  return (data ?? []) as { id: string; file_path: string; title: string }[];
}

export async function applyEvidenceExtraction(evidenceId: string, result: ExtractionResult) {
  const supabase = createClient();
  const { error } = await supabase.from("evidence").update({
    extracted_text: result.text, text_source: result.textSource, page_count: result.pageCount,
  } as never).eq("id", evidenceId);
  if (error) throw error;
}
