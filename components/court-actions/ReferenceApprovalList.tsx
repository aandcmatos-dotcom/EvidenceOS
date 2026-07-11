"use client";

import { useState } from "react";
import { Library, Check, X, Clock, ChevronDown, ChevronUp, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CitationSuggestion } from "@/lib/court-actions/types";

// Step 5: suggested references. The AI never inserts a citation the user has not
// approved, and approval does not mean the citation definitely applies.
export default function ReferenceApprovalList({ suggestions, onChange }: {
  suggestions: CitationSuggestion[];
  onChange: (s: CitationSuggestion[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const decide = (id: string, decision: CitationSuggestion["decision"]) =>
    onChange(suggestions.map((s) => s.id === id ? { ...s, decision } : s));

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <div key={s.id} className={cn("bg-white rounded-2xl border shadow-sm p-4",
          s.decision === "rejected" ? "border-gray-100 opacity-50" : "border-gray-100")}>
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Library size={16} className="text-purple-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{s.title}</h3>
                <p className="text-xs text-gray-400">{s.citation ?? "No citation number"} · {s.jurisdiction}{s.effectiveDate ? ` · effective ${s.effectiveDate}` : ""}</p>
              </div>
            </div>
            {s.verificationStatus === "needs_verification" && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex-shrink-0">
                <AlertTriangle size={9} /> Needs verification
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-1.5">{s.plainSummary}</p>
          <p className="text-xs text-gray-500 mb-2"><span className="font-medium text-gray-600">Why it may relate:</span> {s.whyRelated}</p>
          <p className="text-xs text-gray-400 mb-2"><span className="font-medium">Possible limitations:</span> {s.limitations}</p>

          <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mb-2">
            {expanded === s.id ? <><ChevronUp size={12} /> Hide excerpt</> : <><ChevronDown size={12} /> Show relevant excerpt</>}
          </button>
          {expanded === s.id && (
            <p className="text-xs text-gray-500 italic bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2">&ldquo;{s.excerpt}&rdquo;</p>
          )}

          {s.decision === "pending" ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => decide(s.id, "approved")}
                className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-2.5 py-1 transition-colors">
                <Check size={12} /> Approve for use in documents
              </button>
              <button onClick={() => decide(s.id, "rejected")}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
                <X size={12} /> Do not use
              </button>
              <button onClick={() => decide(s.id, "saved_for_later")}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
                <Clock size={12} /> Save for later
              </button>
              <button className="flex items-center gap-1 text-[11px] font-medium text-purple-600 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-50 transition-colors">
                <Sparkles size={12} /> Explain in plain language
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Check size={13} className={s.decision === "approved" ? "text-green-500" : "text-gray-400"} />
              {s.decision === "approved" ? "Approved — approval does not mean this reference definitely applies." :
               s.decision === "saved_for_later" ? "Saved for later" : "Marked: do not use"}
              <button onClick={() => decide(s.id, "pending")} className="ml-1 text-purple-600 hover:underline">undo</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
