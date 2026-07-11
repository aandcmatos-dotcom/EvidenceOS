// Document drafting service. Produces schema-validated, guard-checked structured output.
// Phase 3: deterministic. Phase 4: swap buildStatements() body for an LLM call that
// returns the SAME StructuredStatement[] shape, then run it through the guard unchanged.

import type { SelectableSource } from "@/lib/mock/sources";
import type { DraftRequest, DraftResult, StructuredStatement, SourceCitationRef } from "@/lib/ai/schema";
import { guardStatements, checkProhibited } from "@/lib/ai/sourceGuard";

export function generateDraft(
  request: DraftRequest,
  sourcePool: SelectableSource[],
): DraftResult {
  const selected = sourcePool.filter((s) => request.selectedSourceIds.includes(s.id));

  const raw = buildStatements(request, selected);

  // Safety gate: force unsourced factual/rule statements to "no_source".
  const { statements, failedIndexes } = guardStatements(raw);

  // Strip any statement that slipped prohibited phrasing through (defense in depth).
  const safe = statements.map((s) => {
    const check = checkProhibited(s.statement);
    if (!check.clean) {
      return { ...s, statement: "[Removed: statement contained advice/prediction language and was withheld.]", status: "no_source" as const, sourceIds: [], userVerificationRequired: true };
    }
    return s;
  });

  const citations: SourceCitationRef[] = selected.map((s) => ({
    sourceType: s.sourceType, sourceId: s.id, label: s.label,
    verificationStatus: s.verified ? undefined : "needs_verification",
  }));

  const missingInformation = [
    ...(request.answers["q2"] ? [] : [{ field: "recipient", reason: "No recipient was provided." }]),
    ...(request.answers["q5"] ? [] : [{ field: "deadline", reason: "No filing/response deadline was provided." }]),
  ];

  const warnings: string[] = [];
  if (selected.some((s) => !s.verified)) warnings.push("One or more selected sources are marked \"Needs verification.\"");
  if (safe.some((s) => s.status === "no_source")) warnings.push("Some statements have no located source and are flagged for your review.");

  const overallConfidence = safe.every((s) => s.status === "supported")
    ? "high" : safe.some((s) => s.status === "supported") ? "medium" : "low";

  return { statements: safe, citations, missingInformation, unsupportedStatementIds: failedIndexes, overallConfidence, warnings };
}

// Deterministic statement builder — organizes ONLY selected sources + user answers.
function buildStatements(request: DraftRequest, selected: SelectableSource[]): StructuredStatement[] {
  const out: StructuredStatement[] = [];

  selected
    .filter((s) => s.sourceType === "event" || s.sourceType === "evidence" || s.sourceType === "communication")
    .forEach((s) => {
      out.push({
        statement: `On ${s.date ?? "the recorded date"}, ${s.label.toLowerCase()} is reflected in the case record.`,
        sourceIds: [s.id],
        sourceExcerpts: [s.sublabel],
        status: s.verified ? "supported" : "needs_verification",
        confidence: s.verified ? "high" : "low",
        uncertainty: s.verified ? null : "Source is not yet verified.",
        missingInformation: [],
        jurisdiction: request.jurisdiction,
        referenceVersion: null,
        userVerificationRequired: !s.verified,
      });
    });

  // User's own purpose/answer statements — user_entered, no external source required.
  const purpose = request.answers["q1"];
  if (purpose && purpose.trim()) {
    out.push({
      statement: purpose.trim(),
      sourceIds: ["q1"], sourceExcerpts: ["Your answer: purpose"],
      status: "user_entered", confidence: "medium", uncertainty: null,
      missingInformation: [], jurisdiction: request.jurisdiction,
      referenceVersion: null, userVerificationRequired: false,
    });
  }

  if (out.length === 0) {
    out.push({
      statement: "No source materials were selected, so no factual statements could be drafted.",
      sourceIds: [], sourceExcerpts: [], status: "no_source", confidence: "low",
      uncertainty: "Nothing selected.", missingInformation: ["No sources selected"],
      jurisdiction: request.jurisdiction, referenceVersion: null, userVerificationRequired: true,
    });
  }
  return out;
}
