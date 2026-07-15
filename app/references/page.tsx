"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { VerificationBadge, SourceTierBadge } from "@/components/shared/badges";
import { useAuth } from "@/contexts/AuthContext";
import { getReferences, createReference, assignReferenceToCase, verifyReference } from "@/lib/db/references";
import { getCaseAssignedReferenceCategories } from "@/lib/db/referencePacks";
import { computeChecklistStatus, CHECKLIST_CATEGORY_KEYS, CHECKLIST_CATEGORY_LABEL } from "@/lib/services/referenceChecklist";
import { REFERENCE_CATEGORIES, VERIFICATION_LABEL, type VerificationStatus, type ReferenceCategory } from "@/lib/references/types";
import {
  Library, Search, Plus, ExternalLink, Calendar, MapPin, CheckCircle2,
  Link2, Upload, FileText, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RefRow {
  id: string;
  title: string;
  jurisdiction: string | null;
  state: string | null;
  county: string | null;
  judge: string | null;
  category: string;
  citation: string | null;
  source_url: string | null;
  effective_date: string | null;
  last_verified_date: string | null;
  superseded_date: string | null;
  verification_status: VerificationStatus;
  source_tier: "official" | "secondary";
  summary: string | null;
  keywords: string[] | null;
  notes: string | null;
  reference_case_links: { case_id: string }[];
}

export default function ReferencesPage() {
  const { user, activeCase } = useAuth();
  const [references, setReferences] = useState<RefRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [verification, setVerification] = useState("All");
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [caseCategories, setCaseCategories] = useState<ReferenceCategory[]>([]);

  useEffect(() => {
    if (!activeCase) { setCaseCategories([]); return; }
    getCaseAssignedReferenceCategories(activeCase.id).then(setCaseCategories).catch(() => setCaseCategories([]));
  }, [activeCase]);

  const fetchRefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getReferences(user.id);
      setReferences((data ?? []) as unknown as RefRow[]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  const filtered = references.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (verification !== "All" && r.verification_status !== verification) return false;
    if (showCurrentOnly && (r.verification_status === "superseded" || r.verification_status === "archived")) return false;
    if (search) {
      const hay = `${r.title} ${r.citation ?? ""} ${(r.keywords ?? []).join(" ")} ${r.summary ?? ""} ${r.judge ?? ""} ${r.county ?? ""} ${r.state ?? ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const needsVerification = references.filter((r) => r.verification_status === "needs_verification").length;
  const superseded = references.filter((r) => r.verification_status === "superseded").length;

  const handleVerify = async (id: string) => {
    if (!user) return;
    await verifyReference(id, user.id);
    fetchRefs();
  };

  const handleAssign = async (id: string) => {
    if (!activeCase) { alert("Select a case first."); return; }
    await assignReferenceToCase(id, activeCase.id);
    fetchRefs();
  };

  return (
    <AppLayout title="References">
      <div className="mb-5"><Disclaimer compact /></div>

      {activeCase && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minimum reference checklist — {activeCase.name}</p>
          <div className="flex flex-wrap gap-2">
            {CHECKLIST_CATEGORY_KEYS.map((key) => {
              const c = computeChecklistStatus(caseCategories).find((x) => x.key === key)!;
              return (
                <span key={key} className={cn("text-xs px-2.5 py-1 rounded-full border",
                  c.done ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500")}>
                  {c.done ? "✓ " : "— "}{CHECKLIST_CATEGORY_LABEL[key]}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-5">
        <SummaryCard icon={<Library size={18} className="text-purple-600" />} bg="bg-purple-50" value={loading ? "…" : references.length} label="Stored references" />
        <SummaryCard icon={<AlertTriangle size={18} className="text-orange-600" />} bg="bg-orange-50" value={loading ? "…" : needsVerification} label="Need verification" />
        <SummaryCard icon={<FileText size={18} className="text-gray-500" />} bg="bg-gray-100" value={loading ? "…" : superseded} label="Superseded" />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, citation, rule number, judge, county…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-w-[180px]">
          <option value="All">All categories</option>
          {REFERENCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={verification} onChange={(e) => setVerification(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
          <option value="All">Any status</option>
          {(Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((v) => <option key={v} value={v}>{VERIFICATION_LABEL[v]}</option>)}
        </select>
        <button onClick={() => setShowCurrentOnly(!showCurrentOnly)}
          className={cn("text-sm font-medium px-3 py-2 rounded-lg border transition-colors",
            showCurrentOnly ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-white text-gray-600 border-gray-200")}>
          Current only
        </button>
        <button onClick={() => setIngestOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Reference
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-4">{loading ? "Loading…" : `Showing ${filtered.length} of ${references.length}`}</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading references…</div>
      ) : references.length === 0 ? (
        <div className="text-center py-16">
          <Library size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No references stored yet.</p>
          <button onClick={() => setIngestOpen(true)} className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add your first reference</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No references match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const assigned = activeCase ? r.reference_case_links.some((l) => l.case_id === activeCase.id) : false;
            return (
              <div key={r.id} className={cn("bg-white rounded-2xl border shadow-sm p-5",
                r.verification_status === "superseded" ? "border-gray-200 opacity-90" : "border-gray-100")}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Library size={18} className="text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{r.category}{r.citation ? ` · ${r.citation}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <VerificationBadge status={r.verification_status} />
                    <SourceTierBadge tier={r.source_tier} />
                  </div>
                </div>

                {r.summary && <p className="text-sm text-gray-600 mb-3">{r.summary}</p>}

                <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500 mb-2">
                  {r.jurisdiction && <span className="flex items-center gap-1"><MapPin size={11} /> {r.jurisdiction}{r.county ? `, ${r.county} County` : ""}</span>}
                  {r.judge && <span>{r.judge}</span>}
                  <span className="flex items-center gap-1"><Calendar size={11} /> Effective {r.effective_date ?? "—"}</span>
                  {r.last_verified_date && <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Verified {r.last_verified_date}</span>}
                  {r.superseded_date && <span className="text-gray-400">Superseded {r.superseded_date}</span>}
                  {assigned && <span className="flex items-center gap-1 text-purple-600 font-medium"><Link2 size={11} /> Assigned to this case</span>}
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-700">
                      <ExternalLink size={11} /> Original source
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {r.verification_status !== "verified_official" && (
                    <button onClick={() => handleVerify(r.id)} className="text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors">
                      Mark verified
                    </button>
                  )}
                  {!assigned && activeCase && (
                    <button onClick={() => handleAssign(r.id)} className="text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors">
                      Assign to {activeCase.name}
                    </button>
                  )}
                </div>

                {r.notes && (
                  <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                    <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">{r.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} userId={user?.id ?? null} caseId={activeCase?.id ?? null} onCreated={fetchRefs} />
      <AssistantLauncher contextLabel="Reference Library" />
    </AppLayout>
  );
}

function SummaryCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number | string; label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>{icon}</div>
      <div>
        <p className="text-xl font-black text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function IngestModal({ open, onClose, userId, caseId, onCreated }: {
  open: boolean; onClose: () => void; userId: string | null; caseId: string | null; onCreated: () => void;
}) {
  const [method, setMethod] = useState<"upload" | "url" | "paste" | "manual">("manual");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [form, setForm] = useState({
    title: "", citation: "", state: "", county: "", category: REFERENCE_CATEGORIES[0] as string,
    sourceUrl: "", pastedText: "",
  });

  const reset = () => setForm({ title: "", citation: "", state: "", county: "", category: REFERENCE_CATEGORIES[0], sourceUrl: "", pastedText: "" });

  const handleSave = async () => {
    if (!userId || !form.title.trim()) { alert("Title is required."); return; }
    setSaving(true);
    try {
      const created = await createReference({
        owner_id: userId,
        title: form.title.trim(),
        citation: form.citation.trim() || null,
        state: form.state.trim() || null,
        county: form.county.trim() || null,
        category: form.category,
        source_url: form.sourceUrl.trim() || null,
        full_text: form.pastedText.trim() || null,
        summary: form.pastedText ? form.pastedText.slice(0, 200) : null,
        verification_status: "needs_verification",
        source_tier: "official",
        uploaded_by: userId,
        version: 1,
      });
      const createdRow = created as { id: string };
      if (caseId && createdRow?.id) {
        await assignReferenceToCase(createdRow.id, caseId);
      }
      reset();
      onClose();
      onCreated();
    } catch (err) {
      alert(`Could not save reference: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const methods = [
    { id: "upload" as const, label: "Upload file", icon: <Upload size={14} /> },
    { id: "url" as const, label: "Official URL", icon: <Link2 size={14} /> },
    { id: "paste" as const, label: "Paste text", icon: <FileText size={14} /> },
    { id: "manual" as const, label: "Manual citation", icon: <Plus size={14} /> },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Add Reference">
      <div className="space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          {methods.map((m) => (
            <button key={m.id} onClick={() => setMethod(m.id)}
              className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                method === m.id ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200")}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {method === "upload" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
            <Upload size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-2">Choose a PDF, DOCX, or text file — its text is extracted into the reference.</p>
            <input type="file" accept=".pdf,.docx,.txt,.rtf,.csv,.eml"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setExtracting(true);
                try {
                  const { extractFromFile } = await import("@/lib/services/extraction");
                  const res = await extractFromFile(f, f.name, f.type);
                  if (res.needsOcr) alert("This file looks like a scan with no text layer. Save it, then paste the text manually.");
                  setForm((prev) => ({ ...prev, title: prev.title || f.name.replace(/\.[^.]+$/, ""), pastedText: res.text ?? prev.pastedText }));
                } finally { setExtracting(false); }
              }}
              className="w-full text-sm text-gray-500" />
            {extracting && <p className="text-xs text-purple-600 mt-2">Extracting text…</p>}
            <p className="text-xs text-gray-400 mt-2">Extracted text lands in the reference&apos;s full text below — review it before saving. Scans without a text layer need manual paste.</p>
          </div>
        )}
        {method === "url" && (
          <input value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            placeholder="https://official-court-or-legislature-site…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        )}
        {method === "paste" && (
          <textarea rows={4} value={form.pastedText} onChange={(e) => setForm((f) => ({ ...f, pastedText: e.target.value }))}
            placeholder="Paste the rule or statute text here…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="col-span-2 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          <input placeholder="Citation / rule number" value={form.citation} onChange={(e) => setForm((f) => ({ ...f, citation: e.target.value }))}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            {REFERENCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          <input placeholder="County" value={form.county} onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">New references are stored as <strong>Needs verification</strong> until you confirm the source and effective date.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Add Reference"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
