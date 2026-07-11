"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { VerificationBadge, SourceTierBadge } from "@/components/shared/badges";
import { MOCK_REFERENCES } from "@/lib/mock/references";
import { REFERENCE_CATEGORIES, VERIFICATION_LABEL, type VerificationStatus } from "@/lib/references/types";
import {
  Library, Search, Plus, ExternalLink, Calendar, MapPin, CheckCircle2,
  Link2, Upload, FileText, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReferencesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [verification, setVerification] = useState("All");
  const [showCurrentOnly, setShowCurrentOnly] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);

  const filtered = MOCK_REFERENCES.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (verification !== "All" && r.verificationStatus !== verification) return false;
    if (showCurrentOnly && (r.verificationStatus === "superseded" || r.verificationStatus === "archived")) return false;
    if (search) {
      const hay = `${r.title} ${r.citation ?? ""} ${r.keywords.join(" ")} ${r.summary} ${r.judge ?? ""} ${r.county ?? ""} ${r.state}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const needsVerification = MOCK_REFERENCES.filter((r) => r.verificationStatus === "needs_verification").length;
  const superseded = MOCK_REFERENCES.filter((r) => r.verificationStatus === "superseded").length;

  return (
    <AppLayout title="References">
      <div className="mb-5"><Disclaimer compact /></div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <SummaryCard icon={<Library size={18} className="text-purple-600" />} bg="bg-purple-50" value={MOCK_REFERENCES.length} label="Stored references" />
        <SummaryCard icon={<AlertTriangle size={18} className="text-orange-600" />} bg="bg-orange-50" value={needsVerification} label="Need verification" />
        <SummaryCard icon={<FileText size={18} className="text-gray-500" />} bg="bg-gray-100" value={superseded} label="Superseded" />
      </div>

      {/* Controls */}
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

      <p className="text-xs text-gray-400 mb-4">Showing {filtered.length} of {MOCK_REFERENCES.length}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Library size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No references match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={cn("bg-white rounded-2xl border shadow-sm p-5",
              r.verificationStatus === "superseded" ? "border-gray-200 opacity-90" : "border-gray-100")}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Library size={18} className="text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.category}{r.citation ? ` · ${r.citation}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <VerificationBadge status={r.verificationStatus} />
                  <SourceTierBadge tier={r.sourceTier} />
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">{r.summary}</p>

              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin size={11} /> {r.jurisdiction}{r.county ? `, ${r.county} County` : ""}</span>
                {r.judge && <span className="flex items-center gap-1">{r.judge}</span>}
                <span className="flex items-center gap-1"><Calendar size={11} /> Effective {r.effectiveDate ?? "—"}</span>
                {r.lastVerifiedDate && <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Verified {r.lastVerifiedDate}</span>}
                {r.supersededDate && <span className="flex items-center gap-1 text-gray-400">Superseded {r.supersededDate}</span>}
                {r.assignedToCase && <span className="flex items-center gap-1 text-purple-600 font-medium"><Link2 size={11} /> Assigned to this case</span>}
                {r.sourceUrl && (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-purple-600 hover:text-purple-700">
                    <ExternalLink size={11} /> Original source
                  </a>
                )}
              </div>

              {r.notes && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                  <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">{r.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
      <AssistantLauncher contextLabel="Reference Library" />
    </AppLayout>
  );
}

function SummaryCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
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

function IngestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<"upload" | "url" | "paste" | "manual">("upload");
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
            <p className="text-sm text-gray-500">Drop a PDF or DOCX, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Text extraction, section splitting, and summary generation run in a later phase.</p>
          </div>
        )}
        {method === "url" && (
          <input placeholder="https://official-court-or-legislature-site…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        )}
        {method === "paste" && (
          <textarea rows={4} placeholder="Paste the rule or statute text here…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
        )}
        {method === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Title" className="col-span-2 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            <input placeholder="Citation / rule number" className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            <input placeholder="State" className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
        )}

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">New references are stored as <strong>Needs verification</strong> until you confirm the source and effective date. They are not treated as authoritative until verified.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">Add (preview)</button>
        </div>
      </div>
    </Modal>
  );
}
