// Question generation (spec §11). Deterministic Phase 4 implementation: builds
// short, fact-specific question drafts from APPROVED facts only, grouped per the
// spec, screened by questionSafetyGuard, with foundation flags. A future LLM sits
// behind this same interface and its output still passes the same guards.

import type { FactCandidate } from "@/lib/court-actions/types";
import { checkQuestionSafety, markFoundationNeeds } from "@/lib/ai/questionSafetyGuard";

export type QuestionType =
  | "direct" | "cross" | "redirect" | "rebuttal"
  | "deposition" | "interview" | "custodian" | "expert";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  direct: "Direct examination",
  cross: "Cross-examination",
  redirect: "Redirect",
  rebuttal: "Rebuttal",
  deposition: "Deposition",
  interview: "Witness interview",
  custodian: "Custodian of records",
  expert: "Expert witness",
};

export interface GeneratedQuestion {
  text: string;
  groupLabel: string;
  sourceLabel: string | null;   // record supporting the question, or null for background
  requiresFoundation: boolean;
}

export interface QuestionGenRequest {
  witnessName: string;
  questionType: QuestionType;
  approvedFacts: FactCandidate[];   // ONLY approved/edited facts are accepted
  goals?: string;
}

export interface QuestionGenResult {
  questions: GeneratedQuestion[];
  removedForSafety: number;         // count of drafts the guard blocked
  warnings: string[];
}

export function generateQuestions(req: QuestionGenRequest): QuestionGenResult {
  const usable = req.approvedFacts.filter((f) => f.decision === "approved" || f.decision === "edited");
  const warnings: string[] = [];
  if (usable.length === 0) warnings.push("No approved facts were provided — only background questions were generated.");

  const drafts: { text: string; groupLabel: string; sourceLabel: string | null }[] = [];

  // Background — always safe, always first.
  drafts.push(
    { text: "Please state your name for the record.", groupLabel: "Background", sourceLabel: null },
    { text: `What is your relationship to the parties in this case?`, groupLabel: "Background", sourceLabel: null },
  );

  // Personal knowledge + timeline, one short question per approved fact.
  usable.forEach((f) => {
    const factText = f.editedText ?? f.text;
    const src = f.sourceLabel ?? "User-provided fact";
    const dated = f.sourceDate ? ` on ${f.sourceDate}` : "";

    if (req.questionType === "cross") {
      // Short, single-fact, non-assumptive.
      drafts.push({ text: `Were you present${dated} for the events described in the records regarding: ${trimFact(factText)}?`, groupLabel: "Personal knowledge", sourceLabel: src });
      drafts.push({ text: `Do you have any record that contradicts the following: ${trimFact(factText)}?`, groupLabel: "Contradictions", sourceLabel: src });
    } else if (req.questionType === "custodian") {
      drafts.push({ text: `Are you the custodian of the records relating to: ${trimFact(factText)}?`, groupLabel: "Authentication", sourceLabel: src });
      drafts.push({ text: `Were those records made at or near the time of the events they describe, in the ordinary course of business?`, groupLabel: "Authentication", sourceLabel: src });
    } else {
      drafts.push({ text: `What do you personally know about the following${dated}: ${trimFact(factText)}?`, groupLabel: "Specific incidents", sourceLabel: src });
    }

    // Exhibit-referencing question when the fact has an evidence source —
    // preceded by an authentication question so foundation is laid in-group.
    if (f.sourceType === "evidence") {
      drafts.push({ text: `Do you recognize the document marked as an exhibit relating to ${trimFact(factText)}?`, groupLabel: "Existing orders and records", sourceLabel: src });
      drafts.push({ text: `Does this document accurately reflect what you observed?`, groupLabel: "Existing orders and records", sourceLabel: src });
    }
  });

  if (req.goals?.trim()) {
    drafts.push({ text: `Is there anything else you can tell the court about: ${req.goals.trim()}?`, groupLabel: "Follow-up", sourceLabel: "Your stated goals" });
  }

  // Safety gate: drop anything the guard flags.
  const safe = drafts.filter((d) => checkQuestionSafety(d.text).ok);
  const removedForSafety = drafts.length - safe.length;
  if (removedForSafety > 0) warnings.push(`${removedForSafety} draft question(s) were removed by the safety screen.`);

  // Foundation marking.
  const marked = markFoundationNeeds(safe.map((d) => ({ ...d })));

  return {
    questions: marked.map((m) => ({
      text: m.text, groupLabel: m.groupLabel, sourceLabel: m.sourceLabel, requiresFoundation: m.requiresFoundation,
    })),
    removedForSafety,
    warnings,
  };
}

function trimFact(text: string): string {
  const t = text.replace(/\.$/, "");
  return t.length > 110 ? t.slice(0, 107) + "…" : t;
}
