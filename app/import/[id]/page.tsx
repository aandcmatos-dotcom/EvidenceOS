"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import { useAuth } from "@/contexts/AuthContext";
import { getBatch, getBatchFiles, getExistingHashes, updateBatchCounts, promoteToEvidence, type ImportFileRow } from "@/lib/db/imports";
import { buildIngestItems, runUpload, runExtraction, type IngestItem } from "@/lib/import/pipeline";
import { runClassification, type ClassifyProgress } from "@/lib/import/classifyRun";
import {
  ArrowLeft, UploadCloud, FolderInput, AlertTriangle, CheckCircle, Clock,
  FileText, Copy, ScanLine, ArrowUpRight, Sparkles, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending:    { label: "Pending",     cls: "bg-gray-100 text-gray-500",     icon: Clock },
  hashing:    { label: "Hashing",     cls: "bg-gray-100 text-gray-500",     icon: Clock },
  uploading:  { label: "Uploading",   cls: "bg-blue-100 text-blue-700",     icon: UploadCloud },
  uploaded:   { label: "Uploaded",    cls: "bg-blue-100 text-blue-700",     icon: CheckCircle },
  extracting: { label: "Extracting",  cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  extracted:  { label: "Extracted",   cls: "bg-green-100 text-green-700",   icon: FileText },
  needs_ocr:  { label: "Needs OCR",   cls: "bg-orange-100 text-orange-700", icon: ScanLine },
  duplicate:  { label: "Duplicate",   cls: "bg-gray-200 text-gray-600",     icon: Copy },
  failed:     { label: "Failed",      cls: "bg-red-100 text-red-700",       icon: AlertTriangle },
  promoted:   { label: "Promoted",    cls: "bg-purple-100 text-purple-700", icon: ArrowUpRight },
};

const FILTERS = ["all", "extracted", "needs_ocr", "duplicate", "failed", "promoted"] as const;

export default function ImportBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, activeCase } = useAuth();

  const [label, setLabel] = useState("");
  const [rows, setRows] = useState<ImportFileRow[]>([]);
  const [live, setLive] = useState<Map<string, IngestItem>>(new Map());
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [promoting, setPromoting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [classifying, setClassifying] = useState<ClassifyProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, f] = await Promise.all([getBatch(id), getBatchFiles(id)]);
      setLabel((b as { source_label: string | null }).source_label ?? "Import");
      setRows(f);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const ingest = async (picked: { file: File; relativePath: string }[]) => {
    if (!user || !activeCase) return;
    setRunning(true);
    const items = await buildIngestItems(picked);
    const map = new Map(items.map((i) => [i.key, i]));
    setLive(new Map(map));
    const onProgress = (key: string, patch: Partial<IngestItem>) => {
      setLive((prev) => {
        const next = new Map(prev);
        const cur = next.get(key);
        if (cur) next.set(key, { ...cur, ...patch });
        return next;
      });
    };
    try {
      const existing = await getExistingHashes(activeCase.id);
      await runUpload(items, activeCase.id, id, existing, onProgress);
      await runExtraction(items, onProgress);
      // Roll counts up to the batch.
      const total = items.length;
      const dup = items.filter((i) => i.status === "duplicate").length;
      const failed = items.filter((i) => i.status === "failed").length;
      const extracted = items.filter((i) => i.status === "extracted" || i.status === "needs_ocr").length;
      await updateBatchCounts(id, {
        total_count: total, uploaded_count: total - dup - failed,
        extracted_count: extracted, failed_count: failed, duplicate_count: dup,
        status: "ready_for_review",
      });
    } finally {
      setRunning(false);
      setLive(new Map());
      refresh();
    }
  };

  const onFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const picked = Array.from(fileList).map((file) => ({
      file,
      // webkitRelativePath is set for folder picks; empty for individual files.
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
    ingest(picked);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const picked: { file: File; relativePath: string }[] = [];
    const items = Array.from(e.dataTransfer.items);
    const entries = items.map((it) => it.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    if (entries.length > 0) {
      for (const entry of entries) await walkEntry(entry, "", picked);
    } else {
      for (const f of Array.from(e.dataTransfer.files)) picked.push({ file: f, relativePath: f.name });
    }
    ingest(picked);
  };

  const runClassify = async () => {
    if (!user || !activeCase) return;
    setClassifying({ done: 0, total: rows.length });
    try {
      await runClassification(id, activeCase.id, user.id, setClassifying);
    } finally {
      setClassifying(null);
      window.location.href = `/import/${id}/review`;
    }
  };

  const promote = async (ids: string[]) => {
    if (!user || !activeCase || ids.length === 0) return;
    setPromoting(true);
    try {
      await promoteToEvidence(ids, activeCase.id, user.id);
      setSelected(new Set());
      refresh();
    } finally { setPromoting(false); }
  };

  // Merge persisted rows with any in-flight live items for display.
  const liveList = Array.from(live.values());
  const display = running && liveList.length > 0
    ? liveList.map((i) => ({
        id: i.key, original_filename: i.filename, original_folder_path: i.folderPath || null,
        size_bytes: i.size, status: i.status, error_detail: i.error ?? null,
        promoted_evidence_id: null, storage_path: null,
      } as Partial<ImportFileRow> & { id: string; status: string }))
    : rows;

  const filtered = display.filter((r) => filter === "all" || r.status === filter);
  const counts = tally(rows);
  const promotable = rows.filter((r) => r.status !== "duplicate" && r.status !== "promoted" && r.status !== "failed" && r.storage_path);

  return (
    <AppLayout title="Import">
      <Link href="/import" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Imports
      </Link>
      <div className="mb-5"><Disclaimer compact /></div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{label}</h1>
          <p className="text-sm text-gray-400">
            {counts.total} files · {counts.extracted} extracted · {counts.needs_ocr} need OCR · {counts.duplicate} duplicate · {counts.failed} failed · {counts.promoted} promoted
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && !running && (
            <button onClick={runClassify} disabled={!!classifying}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
              <Sparkles size={15} /> {classifying ? `Classifying ${classifying.done}/${classifying.total}…` : "Classify & route"}
            </button>
          )}
          <Link href={`/import/${id}/review`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-purple-300 hover:text-purple-700 transition-colors">
            <ClipboardList size={15} /> Review
          </Link>
          {promotable.length > 0 && !running && (
            <button onClick={() => promote(promotable.map((r) => r.id))} disabled={promoting}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-purple-300 hover:text-purple-700 transition-colors">
              <ArrowUpRight size={15} /> Promote all ({promotable.length})
            </button>
          )}
        </div>
      </div>

      {counts.needs_ocr > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <ScanLine size={15} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-800">{counts.needs_ocr} file{counts.needs_ocr !== 1 ? "s" : ""} appear to be scans with no text layer (marked <strong>Needs OCR</strong>). They are fully stored and usable; text recognition is a planned follow-up.</p>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center mb-5 hover:border-purple-400 hover:bg-purple-50/30 transition-colors">
        <UploadCloud size={30} className="text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-600 font-medium">{running ? "Working…" : "Drop files or a folder here"}</p>
        <p className="text-xs text-gray-400 mb-3">PDF, Word, images, email, audio, zip — an entire court folder at once. Re-dropping skips files already uploaded.</p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors">
            <FileText size={14} /> Choose files
          </button>
          <button onClick={() => folderInputRef.current?.click()} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 transition-colors">
            <FolderInput size={14} /> Choose folder
          </button>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        {/* @ts-expect-error webkitdirectory is a non-standard but widely-supported attribute */}
        <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("text-xs font-medium px-3 py-1.5 rounded-full border capitalize transition-colors",
              filter === f ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
            {f === "all" ? "All" : STATUS_META[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">No files{filter !== "all" ? ` with status "${filter}"` : ""} yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-2.5 w-8"></th>
                {["File", "Folder", "Size", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                const Icon = meta.icon;
                const canPromote = !running && r.status !== "duplicate" && r.status !== "promoted" && r.status !== "failed" && (r as ImportFileRow).storage_path;
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {canPromote && (
                        <input type="checkbox" checked={selected.has(r.id)}
                          onChange={(e) => setSelected((prev) => { const n = new Set(prev); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-[240px] truncate" title={r.original_filename}>{r.original_filename}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[180px] truncate" title={r.original_folder_path ?? ""}>{r.original_folder_path || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtSize(r.size_bytes ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", meta.cls)}>
                        <Icon size={10} /> {meta.label}
                      </span>
                      {r.error_detail && <p className="text-[10px] text-red-500 mt-0.5 max-w-[220px] truncate" title={r.error_detail}>{r.error_detail}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canPromote && (
                        <button onClick={() => promote([r.id])} disabled={promoting}
                          className="text-[11px] font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50">Promote</button>
                      )}
                      {r.status === "promoted" && <span className="text-[11px] text-gray-400">in Evidence</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-full px-5 py-2.5 flex items-center gap-3 z-30">
          <span className="text-sm text-gray-600">{selected.size} selected</span>
          <button onClick={() => promote(Array.from(selected))} disabled={promoting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <ArrowUpRight size={14} /> Promote to Evidence
          </button>
        </div>
      )}
    </AppLayout>
  );
}

function tally(rows: ImportFileRow[]) {
  const c = { total: rows.length, extracted: 0, needs_ocr: 0, duplicate: 0, failed: 0, promoted: 0 };
  for (const r of rows) {
    if (r.status === "extracted") c.extracted++;
    else if (r.status === "needs_ocr") c.needs_ocr++;
    else if (r.status === "duplicate") c.duplicate++;
    else if (r.status === "failed") c.failed++;
    else if (r.status === "promoted") c.promoted++;
  }
  return c;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Recursively walk a dropped directory entry, preserving relative paths.
async function walkEntry(entry: FileSystemEntry, prefix: string, out: { file: File; relativePath: string }[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    out.push({ file, relativePath: prefix + entry.name });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve));
    for (const child of entries) await walkEntry(child, prefix + entry.name + "/", out);
  }
}
