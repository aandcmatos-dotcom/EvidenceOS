"use client";

import { useState } from "react";
import { Check, Pencil, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FACT_SUPPORT_LABEL, type FactCandidate, type FactSupport } from "@/lib/court-actions/types";

const supportStyles: Record<FactSupport, string> = {
  directly_supported: "bg-green-100 text-green-700",
  partially_supported: "bg-yellow-100 text-yellow-700",
  user_provided: "bg-blue-100 text-blue-700",
  conflicting_records: "bg-red-100 text-red-700",
  needs_verification: "bg-orange-100 text-orange-700",
  unsupported: "bg-red-100 text-red-700",
};

// Step 4: proposed fact | source | date | support level | user approval.
// Approved facts become the ONLY facts the package may use.
export default function FactReviewTable({ facts, onChange }: {
  facts: FactCandidate[];
  onChange: (facts: FactCandidate[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const decide = (id: string, decision: FactCandidate["decision"], editedText?: string) =>
    onChange(facts.map((f) => f.id === id ? { ...f, decision, ...(editedText !== undefined ? { editedText } : {}) } : f));

  const unresolvedConflicts = facts.filter((f) => f.support === "conflicting_records" && f.decision === "pending");

  return (
    <div>
      {unresolvedConflicts.length > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">
            {unresolvedConflicts.length} fact{unresolvedConflicts.length !== 1 ? "s have" : " has"} conflicting records.
            The package cannot be generated until each conflict is resolved (edit or reject the fact).
          </p>
        </div>
      )}

      <div className="space-y-2">
        {facts.map((f) => (
          <div key={f.id} className={cn("bg-white rounded-xl border p-4",
            f.decision === "rejected" ? "border-gray-100 opacity-50" :
            f.support === "conflicting_records" && f.decision === "pending" ? "border-red-200" : "border-gray-100")}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                {editingId === f.id ? (
                  <div className="flex items-start gap-2">
                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
                      className="flex-1 text-sm border border-purple-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                    <button onClick={() => { decide(f.id, "edited", editText); setEditingId(null); }}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700">Save</button>
                  </div>
                ) : (
                  <p className={cn("text-sm text-gray-800 leading-snug", f.decision === "rejected" && "line-through")}>
                    {f.editedText ?? f.text}
                    {f.decision === "edited" && <span className="ml-2 text-[10px] text-purple-600 font-medium">(edited by you)</span>}
                  </p>
                )}
              </div>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0", supportStyles[f.support])}>
                {FACT_SUPPORT_LABEL[f.support]}
              </span>
            </div>

            <p className="text-xs text-gray-400 mb-2">
              {f.sourceLabel ? <>Source: {f.sourceLabel}{f.sourceDate ? ` · ${f.sourceDate}` : ""}</> : "User-provided and unverified"}
            </p>

            {f.conflictNote && f.decision === "pending" && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mb-2">{f.conflictNote}</p>
            )}

            {f.decision === "pending" || f.decision === "edited" ? (
              <div className="flex items-center gap-1.5">
                {f.decision === "pending" && (
                  <button onClick={() => decide(f.id, "approved")}
                    className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-2 py-1 transition-colors">
                    <Check size={12} /> Approve
                  </button>
                )}
                <button onClick={() => { setEditingId(f.id); setEditText(f.editedText ?? f.text); }}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => decide(f.id, "rejected")}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors">
                  <X size={12} /> Reject
                </button>
                {f.decision === "edited" && (
                  <button onClick={() => decide(f.id, "approved")}
                    className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-2 py-1 transition-colors">
                    <Check size={12} /> Approve edited version
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Check size={13} className={f.decision === "approved" ? "text-green-500" : "text-gray-400"} />
                {f.decision === "approved" ? "Approved" : "Rejected"}
                <button onClick={() => decide(f.id, "pending")} className="ml-1 text-purple-600 hover:underline">undo</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
