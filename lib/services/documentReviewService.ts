// Document review service. Runs source, citation, procedure, evidence-foundation,
// and writing checks over a document using only stored records + verified references.
// Produces neutral, possible-issue findings — never "invalid" or "admissible".

import type { LegalReference } from "@/lib/references/types";
import type { ReviewFinding, ReviewSummary, DocumentReview, Severity } from "@/lib/review/types";
import type { StructuredStatement } from "@/lib/ai/schema";
import { guardStatements } from "@/lib/ai/sourceGuard";
import { validateCitations } from "./citationValidationService";

let counter = 0;
const fid = () => `f-${++counter}`;

export interface ReviewInput {
  documentTitle: string;
  bodyText: string;               // full document text (for citation + writing checks)
  statements: StructuredStatement[]; // structured statements (for source-accuracy)
  references: LegalReference[];   // verified references available to the case
  procedureChecks?: { requirement: string; present: boolean; sourceRelied: string | null; ruleExcerpt: string | null; effectiveDate: string | null }[];
  evidenceChecks?: { evidenceLabel: string; concern: string; sourceRelied: string | null }[];
}

export function runReview(input: ReviewInput): DocumentReview {
  counter = 0;
  const findings: ReviewFinding[] = [];

  // Defense in depth: re-run the source guard so any unsourced factual/rule statement
  // is treated as "no_source" here even if it reached us ungated.
  const { statements: guarded } = guardStatements(input.statements);

  // A. Source accuracy — statements without a located source, or needing verification.
  guarded.forEach((s, i) => {
    if (s.status === "no_source") {
      findings.push(mk("source_accuracy", "important", `Statement ${i + 1}`, s.statement,
        "Possible issue: no source located for this statement. Limit it to your records or remove it.",
        null, null, null, null));
    } else if (s.status === "needs_verification") {
      findings.push(mk("source_accuracy", "review", `Statement ${i + 1}`, s.statement,
        "Review recommended: this statement relies on a source marked \"Needs verification.\"",
        null, null, null, null));
    }
  });

  // B. Citations.
  validateCitations(input.bodyText, input.references).forEach((c) => {
    if (c.issue) {
      const sev: Severity = c.issue === "not_found" ? "critical_verification" : c.issue === "superseded" ? "important" : "review";
      findings.push(mk("citation", sev, "Citation", c.citationText, c.message,
        c.matchedReferenceId ? "Reference library" : null, null, c.effectiveDate, null));
    }
  });

  // C. Court/judge procedures (caller supplies checks derived from stored rules).
  (input.procedureChecks ?? []).forEach((p) => {
    if (!p.present) {
      findings.push(mk("court_procedure", "review", "Procedure", p.requirement,
        `Review recommended: the stored procedure states this may be required. ${p.requirement} appears missing.`,
        p.sourceRelied, p.ruleExcerpt, p.effectiveDate, `Consider addressing: ${p.requirement}.`));
    }
  });

  // D. Evidence foundation.
  (input.evidenceChecks ?? []).forEach((e) => {
    findings.push(mk("evidence_foundation", "review", e.evidenceLabel, e.evidenceLabel,
      `Possible foundation or evidentiary issue for review: ${e.concern}`,
      e.sourceRelied, null, null, null));
  });

  // F. Writing quality — light heuristics over the text.
  writingHeuristics(input.bodyText).forEach((w) => findings.push(w));

  const summary = summarize(findings);
  return {
    id: "rev-generated",
    documentTitle: input.documentTitle,
    runAt: new Date().toISOString().slice(0, 10),
    summary,
    findings,
    sourcesChecked: input.references.map((r) => `${r.title}${r.effectiveDate ? ` (eff. ${r.effectiveDate})` : ""}`),
    sourcesUnavailable: input.references.filter((r) => r.verificationStatus === "needs_verification").map((r) => `${r.title} — Needs verification`),
  };
}

function writingHeuristics(text: string): ReviewFinding[] {
  const out: ReviewFinding[] = [];
  const emotional = /\b(disgusting|outrageous|liar|hate|always|never|obviously|clearly)\b/i;
  if (emotional.test(text)) {
    out.push(mk("writing_quality", "information", "Tone",
      (text.match(emotional) ?? [""])[0],
      "Information: possibly emotional or absolute language detected. Consider neutral, factual wording.",
      null, null, null, null));
  }
  if (text.split(/\s+/).length > 1200) {
    out.push(mk("writing_quality", "information", "Length", "(document length)",
      "Information: the document is long. Consider whether it can be tightened for clarity.",
      null, null, null, null));
  }
  return out;
}

function summarize(findings: ReviewFinding[]): ReviewSummary {
  const by = (c: string) => findings.filter((f) => f.category === c).length;
  return {
    status: "complete",
    possibleIssues: findings.length,
    unsupportedStatements: findings.filter((f) => f.category === "source_accuracy").length,
    sourceConflicts: 0,
    citationWarnings: by("citation"),
    procedureWarnings: by("court_procedure") + by("civil_procedure"),
    evidenceFoundationWarnings: by("evidence_foundation"),
    writingSuggestions: by("writing_quality"),
  };
}

function mk(
  category: ReviewFinding["category"], severity: Severity, section: string, highlightedText: string,
  explanation: string, sourceRelied: string | null, ruleExcerpt: string | null,
  effectiveDate: string | null, suggestedCorrection: string | null,
): ReviewFinding {
  return { id: fid(), category, severity, section, highlightedText, explanation, sourceRelied, ruleExcerpt, effectiveDate, suggestedCorrection, decision: "open" };
}
