// Fact extraction (spec §10 Step 4): turns the action's selected records and the
// user's guided-question answers into fact candidates for the approval table.
// Deterministic: one candidate per selected record + one per substantive answer.
// User answers are always labeled user-provided; nothing is invented.

import type { SelectableSource } from "@/lib/mock/sources";
import type { FactCandidate, GuidedQuestion } from "@/lib/court-actions/types";

let counter = 0;
const fid = () => `fact-${++counter}`;

export function extractFactCandidates(
  selectedSources: SelectableSource[],
  questions: GuidedQuestion[],
): FactCandidate[] {
  counter = 0;
  const out: FactCandidate[] = [];

  for (const s of selectedSources) {
    if (s.sourceType === "person" || s.sourceType === "reference") continue; // people/refs aren't facts
    const dated = s.date ? `On ${s.date}, ` : "";
    const label =
      s.sourceType === "event" ? `${dated}the following event is recorded: ${s.label}.` :
      s.sourceType === "evidence" ? `${dated}the following record exists in the case file: ${s.label}.` :
      s.sourceType === "communication" ? `${dated}the following communication is recorded: ${s.label}.` :
      s.sourceType === "order" ? `${dated}the following court order is in the case record: ${s.label}.` :
      `${dated}${s.label}.`;
    out.push({
      id: fid(),
      text: label,
      sourceType: s.sourceType,
      sourceLabel: s.label,
      sourceDate: s.date,
      support: s.verified ? "directly_supported" : "needs_verification",
      conflictNote: null,
      decision: "pending",
    });
  }

  // Substantive long-text answers become user-provided candidates.
  for (const q of questions) {
    const a = (q.answer ?? "").trim();
    if (!a || a.length < 12 || q.kind === "date" || q.kind === "boolean") continue;
    out.push({
      id: fid(),
      text: a,
      sourceType: null,
      sourceLabel: null,
      sourceDate: null,
      support: "user_provided",
      conflictNote: null,
      decision: "pending",
    });
  }

  return out;
}
