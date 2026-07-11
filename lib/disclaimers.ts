// Central disclaimer text shown across onboarding, drafting, AI chat, review, references, export.

export const PLATFORM_DISCLAIMER =
  "Evidence OS provides document organization, writing assistance, and access to user-uploaded or " +
  "publicly available reference materials. It does not provide legal advice, legal representation, or a " +
  "determination that any document, argument, evidence, procedure, or citation is legally sufficient. " +
  "Laws, rules, and judicial procedures may change or may apply differently depending on the facts and " +
  "jurisdiction. Users must review all information and may wish to consult a licensed attorney.";

export const EXPORT_ATTESTATION =
  "I reviewed the document, its facts, citations, sources, procedural references, and AI-generated content. " +
  "I understand that Evidence OS has not determined that this document is legally sufficient or appropriate to file.";

// Fixed response when a user asks a legal-strategy question.
export const STRATEGY_REFUSAL =
  "I can help locate and organize relevant facts, documents, court rules, and public legal references, " +
  "but I cannot recommend a legal strategy or tell you what action to take.";

export const STRATEGY_ALTERNATIVES = [
  "Find stored rules related to the topic",
  "List relevant facts and evidence",
  "Identify missing records",
  "Generate questions to discuss with an attorney",
  "Create a neutral procedural checklist from verified sources",
];

// Review screen confirmations (Step 6 of drafting).
export const REVIEW_CONFIRMATIONS = [
  "I reviewed the facts.",
  "I reviewed the dates.",
  "I reviewed the names.",
  "I reviewed quotations.",
  "I reviewed citations.",
  "I understand this is not legal advice.",
  "I am responsible for determining whether the document is appropriate to use or file.",
];
