"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uploadEvidenceFile, getEvidenceFileUrl } from "@/lib/db/evidence";
import {
  FileText, Upload, Search, Download, BookMarked,
  Tag, Calendar, AlertTriangle, CheckCircle, Clock,
  FileSpreadsheet, Archive, Image, Trash2, FolderOpen, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All Evidence", "Messages", "School", "Medical",
  "Police", "Court Orders", "Photos", "Videos", "Other",
];

const STATUS_OPTIONS = ["pending", "reviewed", "flagged"] as const;
type Status = typeof STATUS_OPTIONS[number];

const statusConfig: Record<Status, { label: string; icon: typeof CheckCircle; cls: string }> = {
  reviewed: { label: "Reviewed",      icon: CheckCircle,    cls: "bg-green-100 text-green-700" },
  pending:  { label: "Pending Review", icon: Clock,         cls: "bg-yellow-100 text-yellow-700" },
  flagged:  { label: "Flagged",        icon: AlertTriangle, cls: "bg-red-100 text-red-700" },
};

interface EvidenceRow {
  id: string;
  title: string;
  category: string;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  notes: string | null;
  status: string;
  date_of_document: string | null;
  tags: string[] | null;
  created_at: string;
}

function fileTypeIcon(type: string | null) {
  const t = (type ?? "").toUpperCase();
  if (t === "PDF") return <FileText size={18} className="text-red-500" />;
  if (["XLSX", "XLS", "CSV"].includes(t)) return <FileSpreadsheet size={18} className="text-green-600" />;
  if (["ZIP", "RAR"].includes(t)) return <Archive size={18} className="text-yellow-600" />;
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "HEIC"].includes(t)) return <Image size={18} className="text-blue-500" />;
  return <FileText size={18} className="text-gray-400" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function EvidenceCard({
  item,
  onDelete,
  onStatusChange,
}: {
  item: EvidenceRow;
  onDelete: (id: string, path: string | null) => void;
  onStatusChange: (id: string, status: Status) => void;
}) {
  const status = (item.status as Status) ?? "pending";
  const StatusIcon = statusConfig[status]?.icon ?? Clock;
  const docDate = item.date_of_document
    ? new Date(item.date_of_document).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const handleDownload = async () => {
    if (!item.file_path) return;
    try {
      const url = await getEvidenceFileUrl(item.file_path);
      window.open(url, "_blank");
    } catch {
      alert("Could not generate download link. Please try again.");
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group",
      status === "flagged" ? "border-red-200" : "border-gray-100"
    )}>
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {fileTypeIcon(item.file_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.title}</h3>
              <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusConfig[status]?.cls)}>
                <StatusIcon size={10} /> {statusConfig[status]?.label}
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-gray-400">
              {docDate && <span className="flex items-center gap-1"><Calendar size={11} /> {docDate}</span>}
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
              {item.file_type && <span>{item.file_type.toUpperCase()}</span>}
              {item.file_size && <span>{formatBytes(item.file_size)}</span>}
            </div>
          </div>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                <Tag size={9} /> {tag}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <p className="mt-3 text-xs text-gray-500 leading-relaxed line-clamp-2">{item.notes}</p>
        )}
      </div>

      <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-1 bg-gray-50/40 rounded-b-2xl justify-between">
        <div className="flex items-center gap-1">
          {item.file_path && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2.5 py-1.5 hover:bg-purple-50 rounded-lg"
            >
              <Download size={12} /> Download
            </button>
          )}
          <select
            value={status}
            onChange={(e) => onStatusChange(item.id, e.target.value as Status)}
            className="text-xs text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-purple-600 transition-colors py-1.5 pl-2 pr-6 rounded-lg hover:bg-purple-50"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
          </select>
        </div>
        <button
          onClick={() => onDelete(item.id, item.file_path)}
          className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const { activeCase } = useAuth();
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Evidence");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", category: "Other", date_of_document: "", notes: "", tags: "", status: "pending" as Status,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchEvidence = useCallback(async () => {
    if (!activeCase) return;
    setLoading(true);
    const { data } = await supabase
      .from("evidence")
      .select("id, title, category, file_path, file_type, file_size, notes, status, date_of_document, tags, created_at")
      .eq("case_id", activeCase.id)
      .order("created_at", { ascending: false });
    setEvidence((data ?? []) as EvidenceRow[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!form.title) {
      // Pre-fill title from filename (strip extension)
      setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    }
    // Pre-fill file type category hint
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
      setForm((f) => ({ ...f, category: "Photos" }));
    } else if (["mp4", "mov", "avi", "mkv"].includes(ext)) {
      setForm((f) => ({ ...f, category: "Videos" }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.title.trim()) return;
    setUploading(true);
    setUploadError("");

    try {
      let filePath: string | null = null;
      let fileType: string | null = null;
      let fileSize: number | null = null;

      if (selectedFile) {
        filePath = await uploadEvidenceFile(activeCase.id, selectedFile);
        fileType = selectedFile.name.split(".").pop()?.toUpperCase() ?? null;
        fileSize = selectedFile.size;
      }

      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);

      await supabase.from("evidence").insert({
        case_id: activeCase.id,
        title: form.title.trim(),
        category: form.category,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        notes: form.notes.trim() || null,
        date_of_document: form.date_of_document || null,
        tags: tags.length > 0 ? tags : null,
        status: form.status,
      } as never);

      setForm({ title: "", category: "Other", date_of_document: "", notes: "", tags: "", status: "pending" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadOpen(false);
      fetchEvidence();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string | null) => {
    if (!confirm("Delete this evidence item? This cannot be undone.")) return;
    if (filePath) {
      await supabase.storage.from("evidence-files").remove([filePath]);
    }
    await supabase.from("evidence").delete().eq("id", id);
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  };

  const handleStatusChange = async (id: string, status: Status) => {
    await supabase.from("evidence").update({ status } as never).eq("id", id);
    setEvidence((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
  };

  const filtered = evidence.filter((item) => {
    const matchCat = selectedCategory === "All Evidence" || item.category === selectedCategory;
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (item.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const counts: Record<string, number> = { "All Evidence": evidence.length };
  CATEGORIES.slice(1).forEach((cat) => {
    counts[cat] = evidence.filter((e) => e.category === cat).length;
  });

  return (
    <AppLayout title="Evidence Library">
      <div className="flex gap-5">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Category</p>
            <ul className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "w-full flex items-center justify-between text-sm px-3 py-2 rounded-xl transition-colors",
                      selectedCategory === cat ? "bg-purple-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span>{cat}</span>
                    {(counts[cat] ?? 0) > 0 && (
                      <span className={cn("text-xs rounded-full px-1.5 py-0.5", selectedCategory === cat ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500")}>
                        {counts[cat]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
            {STATUS_OPTIONS.map((s) => {
              const count = evidence.filter((e) => e.status === s).length;
              const cfg = statusConfig[s];
              return (
                <div key={s} className="flex items-center justify-between">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.cls)}>{cfg.label}</span>
                  <span className="text-xs text-gray-500 font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search evidence, tags, notes…"
                className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
            >
              <Upload size={14} /> Upload Evidence
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {loading ? "Loading…" : <>Showing <strong className="text-gray-600">{filtered.length}</strong> of {evidence.length} items</>}
            {search && <> · Search: "<strong className="text-purple-600">{search}</strong>"</>}
          </p>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading evidence…</div>
          ) : evidence.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <FolderOpen size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No evidence uploaded yet</p>
              <p className="text-gray-400 text-sm mb-4">Upload documents, photos, messages, or any file related to your case.</p>
              <button onClick={() => setUploadOpen(true)} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                Upload First Item
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Search size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No evidence matches your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((item) => (
                <EvidenceCard key={item.id} item={item} onDelete={handleDelete} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal open={uploadOpen} onClose={() => { setUploadOpen(false); setUploadError(""); }} title="Upload Evidence">
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                {fileTypeIcon(selectedFile.name.split(".").pop() ?? null)}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="ml-2 text-gray-400 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={24} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">Drop a file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, images, Word, Excel, ZIP — any format</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Police Report – March 5, 2024"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Document Date</label>
              <input
                type="date"
                value={form.date_of_document}
                onChange={(e) => setForm((f) => ({ ...f, date_of_document: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What is this document? Why is it relevant?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="custody, visitation, violation"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
            </select>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{uploadError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setUploadOpen(false); setUploadError(""); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {uploading ? "Uploading…" : selectedFile ? "Upload & Save" : "Save (no file)"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
