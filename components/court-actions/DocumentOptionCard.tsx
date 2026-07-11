"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react";
import type { DocumentDefinition } from "@/lib/court-actions/types";
import { DEFINITION_DISCLAIMER } from "@/lib/mock/document-definitions";

// Neutral definition card (Section 9). Options are never labeled recommended/best/
// correct — the parent screen explains they are possible categories to review.
export default function DocumentOptionCard({ definition, matchedKeywords, onExplore }: {
  definition: DocumentDefinition;
  matchedKeywords?: string[];
  onExplore?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  const sections: { key: string; label: string; body: React.ReactNode }[] = [
    { key: "does", label: "What this document generally does", body: <p>{definition.commonPurpose}</p> },
    { key: "not", label: "What this document does not guarantee", body: <p>{definition.whatItDoesNotGuarantee}</p> },
    {
      key: "questions", label: "Questions to answer before selecting",
      body: <ul className="list-disc pl-4 space-y-1">{definition.questionsBeforeSelecting.map((q) => <li key={q}>{q}</li>)}</ul>,
    },
    {
      key: "source", label: "Official source",
      body: definition.officialSource ? (
        <div>
          <p className="font-medium text-gray-700">{definition.officialSource}</p>
          {definition.sourceExcerpt && <p className="italic mt-1">&ldquo;{definition.sourceExcerpt}&rdquo;</p>}
          {definition.effectiveDate && <p className="text-gray-400 mt-1">Effective {definition.effectiveDate}</p>}
        </div>
      ) : <p>No verified source located in the current reference library.</p>,
    },
    {
      key: "related", label: "Related documents",
      body: definition.relatedDocuments.length > 0
        ? <ul className="list-disc pl-4 space-y-1">{definition.relatedDocuments.map((r) => <li key={r}>{r}</li>)}</ul>
        : <p>None listed.</p>,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText size={18} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{definition.name}</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Possible document category</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{definition.category} · {definition.typicalStage}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-2">{definition.plainDefinition}</p>
      <p className="text-xs text-gray-400 mb-3">This may be relevant depending on your circumstances. {DEFINITION_DISCLAIMER}</p>

      {matchedKeywords && matchedKeywords.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[10px] text-gray-400">Matched your description on:</span>
          {matchedKeywords.map((k) => (
            <span key={k} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">{k}</span>
          ))}
        </div>
      )}

      <div className="divide-y divide-gray-50 border-t border-gray-50">
        {sections.map((s) => (
          <div key={s.key}>
            <button onClick={() => toggle(s.key)} className="w-full flex items-center justify-between py-2 text-xs font-medium text-gray-600 hover:text-purple-700 transition-colors">
              {s.label}
              {expanded === s.key ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {expanded === s.key && <div className="pb-3 text-xs text-gray-500 leading-relaxed">{s.body}</div>}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {definition.hasTemplate ? (
          onExplore ? (
            <button onClick={() => onExplore(definition.id)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
              Explore this option
            </button>
          ) : (
            <Link href={`/court-actions/act-new?definition=${definition.id}`} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
              Explore this option
            </Link>
          )
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <AlertTriangle size={12} /> No template available yet — this document type is not yet supported for drafting.
          </span>
        )}
        {definition.officialSource && (
          <span className="flex items-center gap-1 text-[11px] text-gray-400"><ExternalLink size={11} /> Review the official source before choosing.</span>
        )}
      </div>
    </div>
  );
}
