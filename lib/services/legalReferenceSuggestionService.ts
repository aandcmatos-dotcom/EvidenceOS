// Legal reference suggestions (spec §10 Step 5): wraps the existing retrieval
// service to present the case's assigned references as approval-gated citation
// suggestions. Nothing is cited until the user approves it, and approval never
// implies the reference definitely applies.

import type { LegalReference } from "@/lib/references/types";
import type { CitationSuggestion } from "@/lib/court-actions/types";
import { retrieveReferences } from "./referenceSearchService";

export function suggestCitations(
  taskDescription: string,
  assignedReferences: LegalReference[],
): CitationSuggestion[] {
  const { references } = retrieveReferences(
    { caseId: "current", query: taskDescription, jurisdiction: null, court: null, judge: null, onlyAssigned: false },
    assignedReferences,
  );
  // Fall back to all assigned references when the query matches nothing —
  // an empty suggestion list would hide rules the user assigned on purpose.
  const pool = references.length > 0
    ? references
    : assignedReferences.map((r) => ({
        referenceId: r.id, title: r.title, citation: r.citation, excerpt: r.summary,
        effectiveDate: r.effectiveDate, verificationStatus: r.verificationStatus,
        priority: 0, assignedToCase: r.assignedToCase,
      }));

  return pool.map((r) => {
    const full = assignedReferences.find((a) => a.id === r.referenceId);
    return {
      id: r.referenceId,
      title: r.title,
      citation: r.citation,
      plainSummary: full?.summary ?? r.excerpt,
      excerpt: r.excerpt,
      effectiveDate: r.effectiveDate,
      jurisdiction: full?.jurisdiction ?? "",
      whyRelated: "This reference is assigned to your case and matched the task description. Review the excerpt to judge relevance yourself.",
      limitations: r.verificationStatus === "verified_official"
        ? "Rules change; confirm the current version on the official source before relying on it."
        : "This reference is not verified — confirm it against the official source before approving.",
      verificationStatus: r.verificationStatus,
      decision: "pending",
    };
  });
}
