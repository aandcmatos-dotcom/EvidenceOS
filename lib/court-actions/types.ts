// Court Action Workspace types (Phase 1: UI + mock data).
// Facts and citations are approved ONCE per action, then reused by every
// document in the package — see docs/COURT_ACTION_PLAN.md §1.2.

import type { SourceType } from "@/lib/documents/types";

export type CourtActionTaskType =
  | "temporary_relief" | "hearing_prep" | "enforcement" | "respond_to_motion"
  | "discovery_request" | "deposition_questions" | "exam_questions"
  | "evidence_organization" | "exhibit_packet" | "proposed_order"
  | "procedural_checklist" | "summary";

export const TASK_TYPE_LABEL: Record<CourtActionTaskType, string> = {
  temporary_relief: "Request temporary relief",
  hearing_prep: "Prepare for a hearing",
  enforcement: "Enforce an existing order",
  respond_to_motion: "Respond to a motion",
  discovery_request: "Request discovery",
  deposition_questions: "Prepare deposition questions",
  exam_questions: "Prepare examination questions",
  evidence_organization: "Organize evidence",
  exhibit_packet: "Prepare an exhibit packet",
  proposed_order: "Prepare a proposed order",
  procedural_checklist: "Prepare a procedural checklist",
  summary: "Prepare a summary",
};

// Section 19 status enum. Filed/served are always user-reported, never automatic.
export type ActionStatus =
  | "not_started" | "in_progress" | "waiting_for_information" | "source_review_required"
  | "citation_approval_required" | "draft_ready" | "user_review_required"
  | "procedure_warning" | "ready_for_export" | "exported"
  | "filed_user_reported" | "served_user_reported" | "hearing_completed_user_reported";

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_for_information: "Waiting for information",
  source_review_required: "Source review required",
  citation_approval_required: "Citation approval required",
  draft_ready: "Draft ready",
  user_review_required: "User review required",
  procedure_warning: "Procedure warning",
  ready_for_export: "Ready for export",
  exported: "Exported",
  filed_user_reported: "Filed (user-reported)",
  served_user_reported: "Served (user-reported)",
  hearing_completed_user_reported: "Hearing completed (user-reported)",
};

export interface CourtAction {
  id: string;
  title: string;
  taskType: CourtActionTaskType;
  status: ActionStatus;
  step: number;               // 1..10, autosaved
  updatedAt: string;
}

// Fact review table (workflow Step 4). Approved facts are the ONLY facts a
// generated package may use.
export type FactSupport =
  | "directly_supported" | "partially_supported" | "user_provided"
  | "conflicting_records" | "needs_verification" | "unsupported";

export const FACT_SUPPORT_LABEL: Record<FactSupport, string> = {
  directly_supported: "Directly supported",
  partially_supported: "Partially supported",
  user_provided: "User-provided",
  conflicting_records: "Conflicting records",
  needs_verification: "Needs verification",
  unsupported: "Unsupported",
};

export type ApprovalDecision = "pending" | "approved" | "edited" | "rejected";

export interface FactCandidate {
  id: string;
  text: string;
  sourceType: SourceType | null;
  sourceLabel: string | null;   // null → no source located
  sourceDate: string | null;
  support: FactSupport;
  conflictNote: string | null;  // shown when support === "conflicting_records"
  decision: ApprovalDecision;
  editedText?: string;
}

// Reference/citation approval (workflow Step 5). The AI never inserts a
// citation a user has not approved.
export interface CitationSuggestion {
  id: string;
  title: string;
  citation: string | null;
  plainSummary: string;
  excerpt: string;
  effectiveDate: string | null;
  jurisdiction: string;
  whyRelated: string;
  limitations: string;
  verificationStatus: string;
  decision: ApprovalDecision | "saved_for_later";
}

// Package components (workflow Step 6).
export interface PackageComponent {
  id: string;
  name: string;
  description: string;
  templateRecommended: boolean; // product-configuration recommendation, NOT legal advice
  selected: boolean;
  status: ActionStatus;
}

// Neutral document-definition cards (Section 9). Definitions are data, not advice.
export interface DocumentDefinition {
  id: string;
  name: string;
  category: string;
  plainDefinition: string;
  commonPurpose: string;
  typicalStage: string;
  prerequisites: string[];
  commonAttachments: string[];
  relatedDocuments: string[];
  whatItDoesNotGuarantee: string;
  questionsBeforeSelecting: string[];
  officialSource: string | null;    // null → no verified source located
  sourceExcerpt: string | null;
  effectiveDate: string | null;
  verificationStatus: "verified_official" | "needs_verification" | "none";
  hasTemplate: boolean;             // false → definition card only, no drafting yet
  keywords: string[];               // for situation-intake matching
}

// Guided questions (workflow Step 3), branching by task type.
export interface GuidedQuestion {
  id: string;
  prompt: string;
  whyAsking: string;               // persistent "Why are we asking this?"
  kind: "text" | "long_text" | "date" | "boolean" | "choice";
  options?: string[];
  required: boolean;
  prefilledFrom?: string;          // e.g. "Case record: judge"
  answer?: string;
}

// Case posture questionnaire (Section 4B) — context only, never legal conclusions.
export interface PostureQuestion {
  id: string;
  prompt: string;
  answer: "yes" | "no" | "unknown" | null;
}

// Procedural checklist items must show where each item came from (Section 14).
export type ChecklistItemOrigin =
  | "official_rule" | "judge_procedure" | "clerk_instruction"
  | "user_entered" | "general_practice" | "unverified";

export const CHECKLIST_ORIGIN_LABEL: Record<ChecklistItemOrigin, string> = {
  official_rule: "Official rule",
  judge_procedure: "Judge procedure",
  clerk_instruction: "Clerk instruction",
  user_entered: "User-entered",
  general_practice: "General organizational practice",
  unverified: "Unverified source",
};

export interface ChecklistItem {
  id: string;
  phase: "before_drafting" | "before_filing" | "service" | "evidence" | "hearing" | "after_hearing";
  text: string;
  origin: ChecklistItemOrigin;
  sourceLabel: string | null;
  done: boolean;
}

// Cross-document consistency findings (workflow Step 9).
export interface ConsistencyFinding {
  id: string;
  field: string;                   // "Case number", "Requested relief", ...
  values: { document: string; value: string }[];
  note: string;                    // comparative only — never asserts which value is correct
}
