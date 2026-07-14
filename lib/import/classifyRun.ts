// Client orchestrator: classify a batch's extracted files, persist, route, and
// auto-promote non-mandatory results. Uses the env-gated LLM route when available,
// always falling back to the deterministic heuristic. Per-file failures never
// abort the batch; long text is truncated before the model sees it.

import { createClient } from "@/lib/supabase/client";
import { classifyHeuristic, validateLlmClassification, type ClassifyInput } from "@/lib/services/importClassification";
import { promoteClassified, saveClassification, getBatchClassifications } from "@/lib/db/classification";
import { routeClassification } from "@/lib/services/importRouting";
import { logAiRequest } from "@/lib/db/ai";
import type { ClassificationResult } from "@/lib/ai/schema";

const MODEL_TEXT_LIMIT = 12000; // chars sent to the model per file

export interface ClassifyProgress { done: number; total: number; }

export async function runClassification(
  batchId: string, caseId: string, userId: string, onProgress: (p: ClassifyProgress) => void,
): Promise<void> {
  const supabase = createClient();

  const [{ data: files }, { data: people }, { data: caseRow }] = await Promise.all([
    supabase.from("import_files").select("id, original_filename, original_folder_path, extracted_text, eml_headers, storage_path, status")
      .eq("batch_id", batchId).neq("status", "duplicate"),
    supabase.from("people").select("id, name").eq("case_id", caseId),
    supabase.from("cases").select("case_number").eq("id", caseId).single(),
  ]);

  const existingPeople = ((people ?? []) as { id: string; name: string }[]);
  const caseNumber = (caseRow as { case_number: string | null } | null)?.case_number ?? null;
  const list = (files ?? []) as Record<string, unknown>[];

  let usedLlm = false;
  let done = 0;
  onProgress({ done, total: list.length });

  // Small sequential batches keep the UI responsive; failures are swallowed per file.
  for (const f of list) {
    try {
      const input: ClassifyInput = {
        filename: f.original_filename as string,
        folderPath: (f.original_folder_path as string) ?? null,
        extractedText: (f.extracted_text as string) ?? null,
        emlHeaders: (f.eml_headers as ClassifyInput["emlHeaders"]) ?? null,
        existingPeople, caseNumber,
      };

      let result: ClassificationResult = classifyHeuristic(input);
      if (input.extractedText && input.extractedText.length > 0) {
        try {
          const res = await fetch("/api/classify-file", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename: input.filename,
              subject: input.emlHeaders?.subject ?? null,
              text: input.extractedText.slice(0, MODEL_TEXT_LIMIT),
            }),
          });
          const data = await res.json();
          if (data?.raw) {
            const validated = validateLlmClassification(data.raw, input);
            if (validated) { result = validated; usedLlm = true; }
          }
        } catch { /* keep heuristic */ }
      }

      await saveClassification(f.id as string, caseId, result);

      // Auto-promote everything that is not mandatory (auto_accepted or review_queue).
      const routing = routeClassification(result).routing;
      if (routing !== "mandatory") {
        const rows = await getBatchClassifications(batchId);
        const row = rows.find((r) => r.import_file_id === f.id);
        if (row && !row.promoted_evidence_id) {
          try { await promoteClassified(row, caseId, userId, result); } catch { /* leave for manual promote */ }
        }
      }
    } catch { /* per-file failure never aborts the batch */ }
    done++;
    onProgress({ done, total: list.length });
  }

  await logAiRequest({ userId, caseId, mode: "classify", context: `import_batch:${batchId}`, usedLlm, model: usedLlm ? (process.env.NEXT_PUBLIC_EVIDENCE_OS_MODEL || "server") : undefined });
}
