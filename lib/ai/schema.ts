// ============================================================================
// Structured AI output schema. ALL AI output must be produced as one of these
// shapes and pass sourceGuard validation BEFORE it is displayed.
// Phase 3 fills these with deterministic mock services; Phase 4 swaps the mock
// bodies for a real LLM behind the identical interfaces.
// ============================================================================

import type { SourceType, SupportStatus } from "@/lib/documents/types";
import type { VerificationStatus } from "@/lib/references/types";

export type Confidence = "high" | "medium" | "low";

// The atomic unit: a single statement with its provenance.
export interface StructuredStatement {
  statement: string;
  sourceIds: string[];        // ids of records/references relied on
  sourceExcerpts: string[];   // exact text relied on (parallel to sourceIds)
  status: SupportStatus;
  confidence: Confidence;
  uncertainty: string | null; // what the model is unsure about
  missingInformation: string[];
  jurisdiction: string | null;
  referenceVersion: number | null;
  userVerificationRequired: boolean;
}

export interface SourceCitationRef {
  sourceType: SourceType;
  sourceId: string;
  label: string;
  excerpt?: string;
  referenceVersion?: number;
  verificationStatus?: VerificationStatus;
}

// ── Drafting ────────────────────────────────────────────────────────────────
export interface DraftRequest {
  caseId: string;
  templateId: string | null;
  selectedSourceIds: string[];
  answers: Record<string, string>;   // questionId -> answer
  jurisdiction: string | null;
}

export interface UserQuestionSpec {
  id: string;
  prompt: string;
  kind: "text" | "long_text" | "choice" | "date" | "boolean";
  options?: string[];
  required: boolean;
  fromVariable: string | null;   // template variable this fills
}

export interface MissingInformation {
  field: string;
  reason: string;
}

export interface DraftResult {
  statements: StructuredStatement[];
  citations: SourceCitationRef[];
  missingInformation: MissingInformation[];
  unsupportedStatementIds: number[];  // indexes into statements
  overallConfidence: Confidence;
  warnings: string[];
}

// ── Reference retrieval ─────────────────────────────────────────────────────
export interface RetrievalRequest {
  caseId: string;
  query: string;
  jurisdiction: string | null;
  court: string | null;
  judge: string | null;
  onlyAssigned: boolean;
}

export interface RetrievedReference {
  referenceId: string;
  title: string;
  citation: string | null;
  excerpt: string;
  effectiveDate: string | null;
  verificationStatus: VerificationStatus;
  priority: number;            // lower = higher priority (see PRIORITY_ORDER)
  assignedToCase: boolean;
}

export interface SourceConflict {
  topic: string;
  a: RetrievedReference;
  b: RetrievedReference;
  note: string;                // never resolved silently — surfaced to user
}

export interface RetrievalResult {
  references: RetrievedReference[];
  conflicts: SourceConflict[];
}

// ── Citation validation ─────────────────────────────────────────────────────
export interface CitationFinding {
  citationText: string;
  found: boolean;
  matchedReferenceId: string | null;
  issue: string | null;        // "not found" | "outdated" | "wrong jurisdiction" ...
  effectiveDate: string | null;
  message: string;             // neutral; NEVER a fabricated corrected citation
}

// ── Review findings ─────────────────────────────────────────────────────────
export interface ProcedureFinding {
  requirement: string;
  present: boolean;
  sourceRelied: string | null;
  ruleExcerpt: string | null;
  effectiveDate: string | null;
  message: string;
}

export interface EvidenceFoundationFinding {
  evidenceLabel: string;
  concern: string;
  sourceRelied: string | null;
  message: string;
}

export interface ConfidenceAssessment {
  confidence: Confidence;
  basis: string;
  missingInformation: string[];
}

// Retrieval priority order (index = priority; lower is higher priority).
export const PRIORITY_ORDER = [
  "Judge-Specific Procedure",
  "Judicial Division Procedure",
  "Local Court Rule",
  "Administrative Order",
  "Family Law Procedural Rule",
  "Rules of Civil Procedure",
  "Evidence Rule",
  "Family Law Statute",
  "State Statute",
  "Other Public Authority",
] as const;

// ── Import classification (Import Prompt 2) ─────────────────────────────────
export type PrimaryType =
  | "court_order" | "pleading_filing" | "evidence" | "communication" | "discovery"
  | "hearing_material" | "case_note" | "legal_reference" | "administrative_record" | "other";

export type ClassificationFlag =
  | "possible_duplicate_content" | "unreadable_portions" | "contains_minor_identifiers"
  | "contains_ssn_or_account" | "contains_medical" | "wrong_case_number" | "undated";

export interface DetectedPerson {
  name: string;
  suggestedRole: string;
  matchedPersonId: string | null;   // matched to an existing people row, or null (never auto-created)
}

// Strict classification result. Persisted to import_file_classifications; user
// edits are protected from any reclassification.
export interface ClassificationResult {
  primaryType: PrimaryType;
  subtype: string;
  subjectCategories: string[];
  documentDate: string | null;      // ISO date, best single date
  dateConfidence: Confidence;
  detectedPeople: DetectedPerson[];
  detectedCaseNumber: string | null;
  caseNumberMatches: boolean;
  summary: string;                  // neutral, descriptive — must pass checkProhibited
  confidence: Confidence;
  flags: ClassificationFlag[];
  source: "ai" | "heuristic";
}
