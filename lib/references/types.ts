// Legal Reference Library types.

export type ReferenceCategory =
  | "State Statute" | "Family Law Statute" | "Rules of Civil Procedure"
  | "Family Law Procedural Rule" | "Evidence Rule" | "Appellate Rule"
  | "Local Court Rule" | "Administrative Order" | "Judicial Division Procedure"
  | "Judge-Specific Procedure" | "Magistrate Procedure" | "Clerk Filing Instruction"
  | "E-Filing Instruction" | "Service Requirement" | "Hearing Procedure"
  | "Emergency-Motion Procedure" | "Exhibit Procedure" | "Remote-Hearing Procedure"
  | "Formatting Requirement" | "Public Form" | "Public Court Checklist"
  | "User-Uploaded Reference" | "Other Public Authority";

export const REFERENCE_CATEGORIES: ReferenceCategory[] = [
  "State Statute", "Family Law Statute", "Rules of Civil Procedure",
  "Family Law Procedural Rule", "Evidence Rule", "Appellate Rule", "Local Court Rule",
  "Administrative Order", "Judicial Division Procedure", "Judge-Specific Procedure",
  "Magistrate Procedure", "Clerk Filing Instruction", "E-Filing Instruction",
  "Service Requirement", "Hearing Procedure", "Emergency-Motion Procedure",
  "Exhibit Procedure", "Remote-Hearing Procedure", "Formatting Requirement",
  "Public Form", "Public Court Checklist", "User-Uploaded Reference", "Other Public Authority",
];

export type VerificationStatus =
  | "verified_official" | "user_uploaded" | "needs_verification"
  | "possibly_outdated" | "superseded" | "archived";

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified_official: "Verified from official source",
  user_uploaded: "User uploaded",
  needs_verification: "Needs verification",
  possibly_outdated: "Possibly outdated",
  superseded: "Superseded",
  archived: "Archived",
};

export type SourceTier = "official" | "secondary";

export interface ReferenceSectionRecord {
  id: string;
  heading: string;
  text: string;
}

export interface LegalReference {
  id: string;
  title: string;
  jurisdiction: string;      // e.g. "Florida"
  state: string;
  county: string | null;
  circuitDistrict: string | null;
  court: string | null;
  division: string | null;
  judge: string | null;
  category: ReferenceCategory;
  citation: string | null;   // rule number / statute cite
  sourceUrl: string | null;
  sourceOrg: string | null;
  effectiveDate: string | null;
  lastVerifiedDate: string | null;
  supersededDate: string | null;
  version: number;
  uploadDate: string;
  uploadedBy: string;
  verificationStatus: VerificationStatus;
  sourceTier: SourceTier;
  applicableCaseTypes: string[];
  summary: string;
  keywords: string[];
  sections: ReferenceSectionRecord[];
  assignedToCase: boolean;
  notes: string | null;
}
