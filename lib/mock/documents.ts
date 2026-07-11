import type { GeneratedDocument, DocumentTemplate, UserQuestion } from "@/lib/documents/types";

export const MOCK_DOCUMENTS: GeneratedDocument[] = [
  {
    id: "doc-1",
    title: "Declaration re: April Custody Exchanges",
    category: "Declaration / Affidavit",
    status: "in_review",
    updatedAt: "2026-06-28",
    version: 3,
    findingsCount: 4,
    usesSupersededReference: false,
    statements: [
      { id: "s1", text: "On April 15, 2026, the scheduled custody exchange did not occur.", status: "supported",
        sources: [{ sourceType: "event", sourceId: "evt-5", label: "Timeline: Missed Exchange (Apr 15)", excerpt: "Exchange did not occur at 3:00 PM." }] },
      { id: "s2", text: "I sent 47 messages between April 15 and April 28 that received no response.", status: "supported",
        sources: [{ sourceType: "evidence", sourceId: "ev-2", label: "Exhibit 2 — Text Messages", excerpt: "47 outbound messages, no reply." }] },
      { id: "s3", text: "The other parent has repeatedly disregarded the parenting schedule.", status: "needs_verification",
        sources: [] },
      { id: "s4", text: "This pattern has caused emotional distress to our child.", status: "user_entered",
        sources: [{ sourceType: "user_answer", sourceId: "ua-1", label: "Your answer: impact statement" }] },
    ],
  },
  {
    id: "doc-2",
    title: "Parenting Communication — Schedule Confirmation",
    category: "Parenting Communication",
    status: "draft",
    updatedAt: "2026-07-02",
    version: 1,
    findingsCount: 0,
    usesSupersededReference: false,
    statements: [],
  },
  {
    id: "doc-3",
    title: "Chronology of Communications (Jan–Jun)",
    category: "Chronology",
    status: "reviewed",
    updatedAt: "2026-07-05",
    version: 2,
    findingsCount: 1,
    usesSupersededReference: true,
    statements: [],
  },
];

export const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-1", name: "Neutral Parenting Communication", category: "Parenting Communication",
    description: "A calm, factual message to a co-parent. Organizes your points without emotional language.",
    variables: ["{{case.case_name}}", "{{opposing_party.name}}", "{{document.date}}", "{{selected_events}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
  {
    id: "tpl-2", name: "Declaration / Affidavit", category: "Declaration / Affidavit",
    description: "Numbered declaration format with caption, statements, and signature block.",
    variables: ["{{case.case_name}}", "{{case.case_number}}", "{{case.court_name}}", "{{user.full_name}}", "{{selected_events}}", "{{selected_evidence}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
  {
    id: "tpl-3", name: "Factual Chronology", category: "Chronology",
    description: "Date-ordered table of events with linked evidence and source indicators.",
    variables: ["{{case.case_name}}", "{{selected_events}}", "{{selected_evidence}}", "{{selected_communications}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
  {
    id: "tpl-4", name: "Exhibit List", category: "Exhibit List",
    description: "Numbered exhibit index with descriptions and document dates.",
    variables: ["{{case.case_name}}", "{{case.case_number}}", "{{selected_evidence}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
  {
    id: "tpl-5", name: "Cover Letter to Clerk", category: "Letter",
    description: "Simple transmittal letter. You supply the recipient and purpose.",
    variables: ["{{case.case_name}}", "{{case.case_number}}", "{{case.court_name}}", "{{user.full_name}}", "{{document.date}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
  {
    id: "tpl-6", name: "Hearing Preparation Outline", category: "Hearing Outline",
    description: "Structured outline of points, supporting evidence, and questions for a hearing.",
    variables: ["{{case.case_name}}", "{{hearing.date}}", "{{selected_events}}", "{{selected_evidence}}", "{{selected_people}}"],
    builtIn: true, updatedAt: "2026-05-01",
  },
];

// Questions a template surfaces when required variables are missing (Step 3).
export const MOCK_QUESTIONS: UserQuestion[] = [
  { id: "q1", prompt: "What is the purpose of this document?", kind: "long_text", required: true },
  { id: "q2", prompt: "Who is the recipient?", kind: "text", required: true },
  { id: "q3", prompt: "What result are you asking for?", kind: "long_text", required: true },
  { id: "q4", prompt: "What tone should be used?", kind: "choice", options: ["Neutral / factual", "Formal", "Firm but respectful"], required: true },
  { id: "q5", prompt: "Is there a filing or response deadline?", kind: "date", required: false },
  { id: "q6", prompt: "Does the document require a signature?", kind: "boolean", required: true },
  { id: "q7", prompt: "Have you verified all quoted language against the original source?", kind: "boolean", required: true },
];
