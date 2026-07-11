// Document module types. Phase 1 uses these for mock data; Phase 2 maps them to DB rows.

export type DocumentCategory =
  | "Email" | "Letter" | "Notice" | "Declaration / Affidavit" | "Motion"
  | "Response" | "Objection" | "Request" | "Proposed Order" | "Hearing Outline"
  | "Witness Outline" | "Fact Summary" | "Chronology" | "Exhibit List"
  | "Discovery Correspondence" | "Settlement Communication" | "Parenting Communication"
  | "Internal Case Note" | "Custom Document";

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "Email", "Letter", "Notice", "Declaration / Affidavit", "Motion", "Response",
  "Objection", "Request", "Proposed Order", "Hearing Outline", "Witness Outline",
  "Fact Summary", "Chronology", "Exhibit List", "Discovery Correspondence",
  "Settlement Communication", "Parenting Communication", "Internal Case Note", "Custom Document",
];

export type SourceType =
  | "evidence" | "event" | "communication" | "order" | "person" | "reference" | "user_answer" | "document";

// Traceability status for each factual statement in a draft.
export type SupportStatus =
  | "supported" | "partially_supported" | "user_entered" | "needs_verification" | "no_source";

export const SUPPORT_STATUS_LABEL: Record<SupportStatus, string> = {
  supported: "Supported",
  partially_supported: "Partially supported",
  user_entered: "User-entered",
  needs_verification: "Needs verification",
  no_source: "No source located",
};

export interface SourceCitation {
  sourceType: SourceType;
  sourceId: string;
  label: string;       // human-readable e.g. "Exhibit 3 — Police Report"
  excerpt?: string;    // exact text relied upon
}

export interface DraftStatement {
  id: string;
  text: string;
  status: SupportStatus;
  sources: SourceCitation[];
}

export type DocumentStatus = "draft" | "in_review" | "reviewed" | "exported";

export interface GeneratedDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  status: DocumentStatus;
  updatedAt: string;
  version: number;
  findingsCount: number;
  usesSupersededReference: boolean;
  statements: DraftStatement[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: DocumentCategory;
  description: string;
  variables: string[];        // e.g. "{{case.case_name}}"
  builtIn: boolean;
  updatedAt: string;
}

// A question generated from a missing template variable / required field.
export interface UserQuestion {
  id: string;
  prompt: string;
  kind: "text" | "long_text" | "choice" | "date" | "boolean";
  options?: string[];
  required: boolean;
  answer?: string;
}
