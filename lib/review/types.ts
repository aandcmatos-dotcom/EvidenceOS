// Document Review & Rule-Checking types.

export type FindingCategory =
  | "source_accuracy" | "citation" | "court_procedure"
  | "evidence_foundation" | "civil_procedure" | "writing_quality";

export const FINDING_CATEGORY_LABEL: Record<FindingCategory, string> = {
  source_accuracy: "Source accuracy",
  citation: "Citation check",
  court_procedure: "Court & judge procedure",
  evidence_foundation: "Evidence foundation",
  civil_procedure: "Civil / family procedure",
  writing_quality: "Writing quality",
};

// Severity — deliberately avoids "invalid" / "noncompliant".
export type Severity = "information" | "review" | "important" | "critical_verification";

export const SEVERITY_LABEL: Record<Severity, string> = {
  information: "Information",
  review: "Review",
  important: "Important",
  critical_verification: "Critical verification needed",
};

export type FindingDecision = "open" | "accepted" | "edited" | "dismissed" | "attorney_review";

export interface ReviewFinding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  section: string;          // which part of the document
  highlightedText: string;  // exact text flagged
  explanation: string;      // neutral "possible issue" language
  sourceRelied: string | null;   // stored source name, or null → "No verified source located"
  ruleExcerpt: string | null;
  effectiveDate: string | null;
  suggestedCorrection: string | null;  // neutral; never a fabricated citation
  decision: FindingDecision;
}

export interface ReviewSummary {
  status: "not_run" | "complete";
  possibleIssues: number;
  unsupportedStatements: number;
  sourceConflicts: number;
  citationWarnings: number;
  procedureWarnings: number;
  evidenceFoundationWarnings: number;
  writingSuggestions: number;
}

export interface DocumentReview {
  id: string;
  documentTitle: string;
  runAt: string;
  summary: ReviewSummary;
  findings: ReviewFinding[];
  sourcesChecked: string[];
  sourcesUnavailable: string[];
}
