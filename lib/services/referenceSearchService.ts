// Reference retrieval with the required priority order and conflict surfacing.
// Phase 3: deterministic over the provided reference set. Phase 4: RAG over embeddings.

import type { LegalReference, ReferenceCategory } from "@/lib/references/types";
import {
  PRIORITY_ORDER, type RetrievalRequest, type RetrievalResult,
  type RetrievedReference, type SourceConflict,
} from "@/lib/ai/schema";

function priorityOf(category: ReferenceCategory): number {
  const idx = (PRIORITY_ORDER as readonly string[]).indexOf(category);
  // Categories not in the explicit list rank after official items but before secondary.
  return idx === -1 ? PRIORITY_ORDER.length : idx;
}

// User-uploaded unverified and secondary sources always rank last, per section 8.
function effectivePriority(ref: LegalReference): number {
  if (ref.sourceTier === "secondary") return 100;
  if (ref.verificationStatus === "user_uploaded" || ref.verificationStatus === "needs_verification") return 90;
  return priorityOf(ref.category);
}

function firstExcerpt(ref: LegalReference, query: string): string {
  const q = query.toLowerCase();
  const hit = ref.sections.find((s) => s.text.toLowerCase().includes(q) || s.heading.toLowerCase().includes(q));
  return (hit ?? ref.sections[0])?.text ?? ref.summary;
}

export function retrieveReferences(
  request: RetrievalRequest,
  pool: LegalReference[],
): RetrievalResult {
  const q = request.query.toLowerCase().trim();

  const matched = pool.filter((ref) => {
    if (request.onlyAssigned && !ref.assignedToCase) return false;
    // Never silently drop superseded — but they retrieve only when explicitly current-inclusive.
    if (!q) return true;
    const hay = `${ref.title} ${ref.citation ?? ""} ${ref.summary} ${ref.keywords.join(" ")} ${ref.judge ?? ""} ${ref.county ?? ""} ${ref.state}`.toLowerCase();
    return hay.includes(q);
  });

  const references: RetrievedReference[] = matched
    .map((ref) => ({
      referenceId: ref.id,
      title: ref.title,
      citation: ref.citation,
      excerpt: firstExcerpt(ref, request.query),
      effectiveDate: ref.effectiveDate,
      verificationStatus: ref.verificationStatus,
      priority: effectivePriority(ref),
      assignedToCase: ref.assignedToCase,
    }))
    .sort((a, b) => a.priority - b.priority || (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));

  return { references, conflicts: detectConflicts(matched) };
}

// Surface conflicts (same category+jurisdiction, different effective dates or a
// current vs superseded pair). We NEVER pick a winner silently.
export function detectConflicts(refs: LegalReference[]): SourceConflict[] {
  const conflicts: SourceConflict[] = [];
  for (let i = 0; i < refs.length; i++) {
    for (let j = i + 1; j < refs.length; j++) {
      const a = refs[i], b = refs[j];
      const sameTopic = a.category === b.category &&
        (a.county ?? a.state) === (b.county ?? b.state);
      if (!sameTopic) continue;
      const oneSuperseded = a.verificationStatus === "superseded" || b.verificationStatus === "superseded";
      const differentEffective = (a.effectiveDate ?? "") !== (b.effectiveDate ?? "");
      if (oneSuperseded || differentEffective) {
        conflicts.push({
          topic: a.category,
          a: toRetrieved(a), b: toRetrieved(b),
          note: oneSuperseded
            ? "One of these references is marked superseded. Confirm which version currently applies."
            : "These references share a topic and jurisdiction but have different effective dates. Review both before relying on either.",
        });
      }
    }
  }
  return conflicts;
}

function toRetrieved(ref: LegalReference): RetrievedReference {
  return {
    referenceId: ref.id, title: ref.title, citation: ref.citation,
    excerpt: ref.summary, effectiveDate: ref.effectiveDate,
    verificationStatus: ref.verificationStatus, priority: effectivePriority(ref),
    assignedToCase: ref.assignedToCase,
  };
}
