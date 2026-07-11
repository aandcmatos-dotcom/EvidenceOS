import type {
  CourtAction, FactCandidate, CitationSuggestion, PackageComponent,
  GuidedQuestion, PostureQuestion, ChecklistItem, ConsistencyFinding,
} from "@/lib/court-actions/types";

export const COMMON_SITUATIONS = [
  "The other parent is not following the parenting plan.",
  "The other parent withheld the children.",
  "A scheduled exchange did not happen.",
  "I need temporary school-related relief.",
  "I need more time before a hearing.",
  "The other party has not provided discovery.",
  "I need documents or records from a third party.",
  "I need to respond to a motion.",
  "I need to correct or clarify a prior filing.",
  "I need the court to enforce an order.",
  "I need to modify an existing order.",
  "I need to prepare for a hearing or trial.",
  "I need to organize evidence.",
  "I need to prepare questions for a witness.",
  "I need to request records.",
  "I need to object to something filed by the other party.",
  "I need to summarize what has happened in the case.",
  "I need to document a pattern of events.",
  "I need to prepare an exhibit packet.",
];

export const NOT_SURE_OPTIONS = [
  "I am not sure — show me more information",
  "Create questions for an attorney",
  "Search my court's official procedures",
  "Review existing orders first",
  "Save this issue without drafting",
];

export const MOCK_ACTIONS: CourtAction[] = [
  { id: "act-1", title: "Temporary school designation", taskType: "temporary_relief", status: "in_progress", step: 4, updatedAt: "2026-07-09" },
  { id: "act-2", title: "Missed exchanges — enforcement", taskType: "enforcement", status: "citation_approval_required", step: 5, updatedAt: "2026-07-06" },
];

// Case posture questionnaire (Section 4B). Context only — never legal conclusions.
export const POSTURE_QUESTIONS: PostureQuestion[] = [
  { id: "p1", prompt: "Is there an existing parenting plan?", answer: null },
  { id: "p2", prompt: "Is paternity legally established?", answer: null },
  { id: "p3", prompt: "Is a divorce or dissolution still pending?", answer: null },
  { id: "p4", prompt: "Has a final judgment been entered?", answer: null },
  { id: "p5", prompt: "Is there an existing support order?", answer: null },
  { id: "p6", prompt: "Is there an existing timesharing order?", answer: null },
  { id: "p7", prompt: "Is another motion involving the same issue pending?", answer: null },
  { id: "p8", prompt: "Has the other party been formally served?", answer: null },
  { id: "p9", prompt: "Is the requested issue temporary or final? (Yes = temporary)", answer: null },
  { id: "p10", prompt: "Is there already a hearing scheduled?", answer: null },
  { id: "p11", prompt: "Has the judge previously ruled on this issue?", answer: null },
  { id: "p12", prompt: "Are there active discovery deadlines?", answer: null },
  { id: "p13", prompt: "Are there minors whose information may require redaction?", answer: null },
  { id: "p14", prompt: "Do you know of a filing deadline?", answer: null },
  { id: "p15", prompt: "Is the situation being presented as an emergency?", answer: null },
];

// Guided questions for the temporary school-designation task (Section 10 Step 3 example).
export const SCHOOL_RELIEF_QUESTIONS: GuidedQuestion[] = [
  { id: "gq1", prompt: "What existing order addresses educational decision-making?", whyAsking: "Documents usually reference the order that governs the issue, so the draft can quote it accurately instead of paraphrasing.", kind: "text", required: true, prefilledFrom: "Court Orders: Temporary Custody Order" },
  { id: "gq2", prompt: "What school currently serves the child?", whyAsking: "The current placement is a basic fact most school-related documents state up front.", kind: "text", required: true },
  { id: "gq3", prompt: "What school is being requested?", whyAsking: "The requested change must be stated specifically so the proposed order can match the motion.", kind: "text", required: true },
  { id: "gq4", prompt: "Why is temporary relief being requested now?", whyAsking: "Your own explanation, in your words, becomes the user-provided basis of the request.", kind: "long_text", required: true },
  { id: "gq5", prompt: "Is there an upcoming enrollment deadline?", whyAsking: "Deadlines you know about are recorded as user-entered dates — the system does not calculate legal deadlines.", kind: "date", required: false },
  { id: "gq6", prompt: "Was agreement requested from the other party?", whyAsking: "Some local procedures expect a conferral attempt before a motion; your answer is recorded as fact, not judged.", kind: "boolean", required: true },
  { id: "gq7", prompt: "What response was received?", whyAsking: "The other party's response (or silence) is a fact the documents can state with a source.", kind: "long_text", required: false },
  { id: "gq8", prompt: "Is a hearing already scheduled?", whyAsking: "Several package components (notice, summaries) change depending on whether a hearing exists.", kind: "boolean", required: true },
  { id: "gq9", prompt: "What specific temporary relief should the proposed order contain?", whyAsking: "The proposed order must ask for exactly what the motion asks for; this keeps the package consistent.", kind: "long_text", required: true },
  { id: "gq10", prompt: "Add any facts, background, concerns, or instructions that were not covered above.", whyAsking: "Anything you add here is labeled user-provided and stays under your control.", kind: "long_text", required: false },
];

// Fact review table (Step 4).
export const MOCK_FACT_CANDIDATES: FactCandidate[] = [
  { id: "fc1", text: "A Temporary Custody Order was entered on January 15, 2026, addressing timesharing.", sourceType: "order", sourceLabel: "Court Order: Temporary Custody Order", sourceDate: "2026-01-15", support: "directly_supported", conflictNote: null, decision: "pending" },
  { id: "fc2", text: "On April 15, 2026, the scheduled custody exchange did not occur.", sourceType: "event", sourceLabel: "Timeline: Missed custody exchange", sourceDate: "2026-04-15", support: "directly_supported", conflictNote: null, decision: "pending" },
  { id: "fc3", text: "Between April 15 and April 28, 2026, 47 messages were sent with no documented response.", sourceType: "communication", sourceLabel: "Communication: Text thread — no reply", sourceDate: "2026-04-18", support: "directly_supported", conflictNote: null, decision: "pending" },
  { id: "fc4", text: "The child has attended Lincoln Elementary since August 2025.", sourceType: null, sourceLabel: null, sourceDate: null, support: "user_provided", conflictNote: null, decision: "pending" },
  { id: "fc5", text: "A school-enrollment dispute occurred on April 24, 2026.", sourceType: "event", sourceLabel: "Timeline: School pickup dispute", sourceDate: "2026-04-24", support: "partially_supported", conflictNote: null, decision: "pending" },
  { id: "fc6", text: "The other parent agreed to the school change in March.", sourceType: null, sourceLabel: "Conflicts with Communication: Text thread — no reply (no agreement documented)", sourceDate: null, support: "conflicting_records", conflictNote: "Your communications records do not document an agreement. Resolve this conflict before generating the package.", decision: "pending" },
];

// Citation suggestions (Step 5). The AI never inserts a citation without approval.
export const MOCK_CITATION_SUGGESTIONS: CitationSuggestion[] = [
  {
    id: "cs1", title: "Local Rule — Family Division Motion Practice", citation: "Admin. Order 2024-07",
    plainSummary: "Sets conferral and proposed-order expectations for family-division motions.",
    excerpt: "Placeholder excerpt — the moving party should certify a good-faith attempt to confer before hearing.",
    effectiveDate: "2024-07-01", jurisdiction: "9th Judicial Circuit, Orange County, FL",
    whyRelated: "You indicated a motion may be prepared in the family division; this stored rule describes local motion procedure.",
    limitations: "Local procedure may have changed; confirm the current version on the circuit's official site.",
    verificationStatus: "verified_official", decision: "pending",
  },
  {
    id: "cs2", title: "Rules of Civil Procedure — Service of Pleadings and Papers", citation: "Fla. R. Civ. P. 1.080",
    plainSummary: "Describes how pleadings and papers after the initial complaint are served on parties.",
    excerpt: "Placeholder excerpt — the certificate of service must state the manner and date of service.",
    effectiveDate: "2025-01-01", jurisdiction: "Florida",
    whyRelated: "Any filed document in the package will include a certificate of service; this stored rule describes service requirements.",
    limitations: "Statewide rule; local requirements may add to it.",
    verificationStatus: "verified_official", decision: "pending",
  },
  {
    id: "cs3", title: "Judge Williams — Standing Procedures (Div. 32)", citation: null,
    plainSummary: "Uploaded copy of the division's standing procedures, including exhibit and proposed-order handling.",
    excerpt: "Placeholder excerpt — exhibits should be pre-marked and emailed to chambers by a stated deadline.",
    effectiveDate: "2025-09-01", jurisdiction: "Div. 32, 9th Judicial Circuit",
    whyRelated: "Your case is assigned to this division; these procedures may govern how the package is delivered.",
    limitations: "This reference is marked Needs verification — confirm it against the court's official posting before approving.",
    verificationStatus: "needs_verification", decision: "pending",
  },
];

// Package components for temporary relief (Step 6).
export const TEMPORARY_RELIEF_PACKAGE: PackageComponent[] = [
  { id: "pc1", name: "Motion for Temporary Relief", description: "The primary written request.", templateRecommended: true, selected: true, status: "not_started" },
  { id: "pc2", name: "Supporting Affidavit / Verification", description: "Sworn factual basis for the motion.", templateRecommended: true, selected: true, status: "not_started" },
  { id: "pc3", name: "Proposed Order", description: "Draft order matching the requested relief.", templateRecommended: true, selected: true, status: "not_started" },
  { id: "pc4", name: "Notice of Hearing", description: "Sets the hearing on the record once scheduled.", templateRecommended: false, selected: false, status: "not_started" },
  { id: "pc5", name: "Exhibit List", description: "Numbered index of supporting evidence.", templateRecommended: true, selected: true, status: "not_started" },
  { id: "pc6", name: "Witness List", description: "People who may testify and their topics.", templateRecommended: false, selected: false, status: "not_started" },
  { id: "pc7", name: "Hearing Summary / Chronology", description: "Date-ordered personal reference for the hearing.", templateRecommended: false, selected: false, status: "not_started" },
  { id: "pc8", name: "Direct-Examination Questions", description: "Prepared questions for your witnesses.", templateRecommended: false, selected: false, status: "not_started" },
  { id: "pc9", name: "Cross-Examination Questions", description: "Prepared questions for the other party's witnesses.", templateRecommended: false, selected: false, status: "not_started" },
  { id: "pc10", name: "Filing / Service / Hearing Checklists", description: "Procedural task lists from stored sources.", templateRecommended: true, selected: true, status: "not_started" },
];

// Procedural checklist (Section 14) with per-item origin labels.
export const MOCK_CHECKLIST: ChecklistItem[] = [
  { id: "cl1", phase: "before_drafting", text: "Review the existing Temporary Custody Order for language on educational decision-making.", origin: "general_practice", sourceLabel: null, done: false },
  { id: "cl2", phase: "before_drafting", text: "Confirm the case caption matches the most recent filed document.", origin: "general_practice", sourceLabel: null, done: false },
  { id: "cl3", phase: "before_drafting", text: "Certify a good-faith attempt to confer before hearing.", origin: "official_rule", sourceLabel: "Admin. Order 2024-07, § II", done: false },
  { id: "cl4", phase: "before_filing", text: "Include a proposed order with the motion.", origin: "official_rule", sourceLabel: "Admin. Order 2024-07, § IV", done: false },
  { id: "cl5", phase: "before_filing", text: "Review the certificate of service names and addresses.", origin: "official_rule", sourceLabel: "Fla. R. Civ. P. 1.080(f)", done: false },
  { id: "cl6", phase: "before_filing", text: "Review redactions for minors' identifying information.", origin: "general_practice", sourceLabel: null, done: false },
  { id: "cl7", phase: "service", text: "Serve all listed recipients and save proof of service.", origin: "official_rule", sourceLabel: "Fla. R. Civ. P. 1.080", done: false },
  { id: "cl8", phase: "evidence", text: "Pre-mark exhibits and email to chambers by the stated deadline.", origin: "judge_procedure", sourceLabel: "Judge Williams — Standing Procedures (needs verification)", done: false },
  { id: "cl9", phase: "hearing", text: "Confirm hearing date, time, format, and time allowed.", origin: "user_entered", sourceLabel: null, done: false },
  { id: "cl10", phase: "after_hearing", text: "Record rulings, save notes, and update the court-order tracker.", origin: "general_practice", sourceLabel: null, done: false },
];

// Cross-document consistency findings (Step 9). Comparative only.
export const MOCK_CONSISTENCY_FINDINGS: ConsistencyFinding[] = [
  {
    id: "cf1", field: "Requested relief",
    values: [
      { document: "Motion for Temporary Relief", value: "temporary designation of Roosevelt Elementary" },
      { document: "Proposed Order", value: "designation of Roosevelt Elementary" },
    ],
    note: "The motion says \"temporary designation\" but the proposed order omits \"temporary.\" Review both and make them match — the system does not choose which wording is correct.",
  },
  {
    id: "cf2", field: "Hearing date",
    values: [
      { document: "Notice of Hearing", value: "August 12, 2026" },
      { document: "Hearing Summary", value: "August 21, 2026" },
    ],
    note: "Two documents state different hearing dates. Confirm the correct date from the court's notice and update the other document.",
  },
];
