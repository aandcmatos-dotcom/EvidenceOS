// Browser ingestion pipeline: hash → dedup → upload → register → extract.
// Runs client-side (Phase 1) but is structured as discrete steps so it could move
// to a server queue later. No AI, no classification.

import { createClient } from "@/lib/supabase/client";
import {
  sha256Hex, importStoragePath, mapWithConcurrency, expandZip, isAccepted,
} from "@/lib/import/helpers";
import { insertImportFile, applyExtraction } from "@/lib/db/imports";
import { extractFromFile } from "@/lib/services/extraction";

export interface IngestItem {
  key: string;               // stable UI key
  blob: File | Blob;
  filename: string;
  folderPath: string;        // "" for root
  mime: string | null;
  size: number;
  // filled during the run:
  sha256?: string;
  fileId?: string;
  status: string;            // pending | hashing | duplicate | uploading | uploaded | extracting | extracted | needs_ocr | failed | promoted
  error?: string | null;
}

export type ProgressFn = (key: string, patch: Partial<IngestItem>) => void;

// Turn a raw File list (from drop or folder picker) into ingest items, expanding
// zips into their members with the zip name prefixed onto the folder path.
export async function buildIngestItems(files: { file: File; relativePath: string }[]): Promise<IngestItem[]> {
  const items: IngestItem[] = [];
  let n = 0;
  for (const { file, relativePath } of files) {
    if (!isAccepted(file.name)) continue;
    if (file.name.toLowerCase().endsWith(".zip")) {
      const members = await expandZip(file);
      for (const m of members) {
        items.push({
          key: `k${n++}`, blob: new Blob([m.data as unknown as BlobPart]), filename: m.filename,
          folderPath: m.folderPath, mime: null, size: m.data.length, status: "pending",
        });
      }
    } else {
      const folder = relativePath.includes("/") ? relativePath.slice(0, relativePath.lastIndexOf("/")) : "";
      items.push({
        key: `k${n++}`, blob: file, filename: file.name, folderPath: folder,
        mime: file.type || null, size: file.size, status: "pending",
      });
    }
  }
  return items;
}

// Upload + register phase. `existingHashes` (id keyed by sha) implements
// resumable dedup: an already-seen hash is marked duplicate and skipped.
export async function runUpload(
  items: IngestItem[], caseId: string, batchId: string,
  existingHashes: Map<string, string>, onProgress: ProgressFn,
): Promise<void> {
  const supabase = createClient();
  const seen = new Map(existingHashes);

  await mapWithConcurrency(items, 5, async (item) => {
    try {
      onProgress(item.key, { status: "hashing" });
      const buf = await item.blob.arrayBuffer();
      const hash = await sha256Hex(buf);
      item.sha256 = hash;

      const dupOf = seen.get(hash);
      if (dupOf) {
        const row = await insertImportFile({
          batchId, caseId, storagePath: null, filename: item.filename, folderPath: item.folderPath || null,
          mime: item.mime, size: item.size, sha256: hash, status: "duplicate", duplicateOf: dupOf,
        });
        item.fileId = row.id;
        onProgress(item.key, { status: "duplicate", sha256: hash, fileId: row.id });
        return;
      }

      const path = importStoragePath(caseId, batchId, hash, item.filename);
      onProgress(item.key, { status: "uploading", sha256: hash });
      const { error: upErr } = await supabase.storage.from("evidence-files")
        .upload(path, item.blob, { upsert: false, contentType: item.mime ?? undefined });
      if (upErr) throw upErr;

      const row = await insertImportFile({
        batchId, caseId, storagePath: path, filename: item.filename, folderPath: item.folderPath || null,
        mime: item.mime, size: item.size, sha256: hash, status: "uploaded",
      });
      item.fileId = row.id;
      seen.set(hash, row.id);
      onProgress(item.key, { status: "uploaded", sha256: hash, fileId: row.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      item.error = msg;
      onProgress(item.key, { status: "failed", error: msg });
    }
  });
}

// Extraction phase — small concurrency so the UI stays responsive.
export async function runExtraction(items: IngestItem[], onProgress: ProgressFn): Promise<void> {
  const targets = items.filter((i) => i.fileId && (i.status === "uploaded"));
  await mapWithConcurrency(targets, 3, async (item) => {
    if (!item.fileId) return;
    onProgress(item.key, { status: "extracting" });
    try {
      const result = await extractFromFile(item.blob, item.filename, item.mime);
      const status = await applyExtraction(item.fileId, result);
      onProgress(item.key, { status, error: result.error });
    } catch (err) {
      onProgress(item.key, { status: "failed", error: err instanceof Error ? err.message : "Extraction failed." });
    }
  });
}
