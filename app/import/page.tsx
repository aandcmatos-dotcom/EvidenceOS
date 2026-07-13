"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { getBatches, createBatch, getEvidenceNeedingExtraction, applyEvidenceExtraction } from "@/lib/db/imports";
import { getEvidenceFileUrl } from "@/lib/db/evidence";
import { logAudit } from "@/lib/db/audit";
import { extractFromFile } from "@/lib/services/extraction";
import { mapWithConcurrency } from "@/lib/import/helpers";
import { Upload, FolderInput, ArrowRight, RefreshCw, CheckCircle } from "lucide-react";

interface BatchRow {
  id: string; source_label: string | null; status: string;
  total_count: number; uploaded_count: number; extracted_count: number;
  failed_count: number; duplicate_count: number; created_at: string;
}

export default function ImportPage() {
  const router = useRouter();
  const { user, activeCase } = useAuth();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [backfill, setBackfill] = useState<{ running: boolean; done: number; total: number } | null>(null);

  const fetchBatches = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    try { setBatches(((await getBatches(activeCase.id)) ?? []) as unknown as BatchRow[]); }
    finally { setLoading(false); }
  }, [activeCase]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const start = async () => {
    if (!user || !activeCase) return;
    setCreating(true);
    try {
      const batch = await createBatch(activeCase.id, user.id, sourceLabel.trim());
      router.push(`/import/${batch.id}`);
    } finally { setCreating(false); }
  };

  // Backfill: extract text for existing evidence files that have none, so
  // previously uploaded items join the same pipeline.
  const runBackfill = async () => {
    if (!activeCase || !user) return;
    const targets = await getEvidenceNeedingExtraction(activeCase.id);
    if (targets.length === 0) { setBackfill({ running: false, done: 0, total: 0 }); return; }
    setBackfill({ running: true, done: 0, total: targets.length });
    let done = 0;
    await mapWithConcurrency(targets, 3, async (t) => {
      try {
        const url = await getEvidenceFileUrl(t.file_path);
        const blob = await (await fetch(url)).blob();
        const result = await extractFromFile(blob, t.title + guessExt(t.file_path), blob.type);
        await applyEvidenceExtraction(t.id, result);
      } catch { /* leave this row for a later pass */ }
      done++;
      setBackfill({ running: true, done, total: targets.length });
    });
    await logAudit({ userId: user.id, caseId: activeCase.id, action: "import.backfill", entityType: "evidence", metadata: { count: targets.length } });
    setBackfill({ running: false, done, total: targets.length });
  };

  return (
    <AppLayout title="Import Files">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <FolderInput size={18} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Import a court folder</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Drop an entire folder of files — pleadings, orders, records, communications, photos, scans, even zips.
              Files are de-duplicated, text is extracted where possible, and nothing is classified automatically.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Source label <span className="text-gray-400 font-normal">(optional)</span></label>
            <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="e.g. Laptop court folder"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 mb-4" />
            <button onClick={start} disabled={creating}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {creating ? "Starting…" : <><Upload size={16} /> Start a new import</>}
            </button>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">Backfill existing evidence</p>
              <p className="text-xs text-gray-500 mb-3">
                Extract text for evidence files uploaded before this feature, so they join the same pipeline.
              </p>
              {backfill && !backfill.running && (
                <p className="flex items-center gap-1.5 text-xs text-green-700 mb-2">
                  <CheckCircle size={13} /> {backfill.total === 0 ? "Nothing needed extraction." : `Processed ${backfill.done} of ${backfill.total}.`}
                </p>
              )}
              {backfill?.running && (
                <p className="text-xs text-gray-500 mb-2">Processing {backfill.done} / {backfill.total}…</p>
              )}
              <button onClick={runBackfill} disabled={backfill?.running}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors">
                <RefreshCw size={14} /> Run backfill
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Import batches</p>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : batches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <Upload size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No imports yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {batches.map((b) => (
                  <Link key={b.id} href={`/import/${b.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-purple-200 transition-all group">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{b.source_label || "Import"}</p>
                        <p className="text-xs text-gray-400">
                          {b.total_count} files · {b.extracted_count} extracted · {b.duplicate_count} dup · {b.failed_count} failed · {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <AssistantLauncher contextLabel="Import" />
    </AppLayout>
  );
}

function guessExt(path: string): string {
  const ext = path.split(".").pop();
  return ext && ext.length <= 5 ? `.${ext}` : "";
}
