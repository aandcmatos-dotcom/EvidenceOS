// Import classification. Deterministic heuristic classifier (always available) plus
// a validator for optional LLM output (via the env-gated route). No legal conclusions:
// summaries are descriptive and screened by checkProhibited. Confidential flags reuse
// the same redaction detector used at export, so ingestion + export share one detector.

import { detectSensitive } from "@/lib/security/redaction";
import { checkProhibited } from "@/lib/ai/sourceGuard";
import type { ClassificationResult, PrimaryType, ClassificationFlag, DetectedPerson, Confidence } from "@/lib/ai/schema";

export interface ClassifyInput {
  filename: string;
  folderPath: string | null;
  extractedText: string | null;
  emlHeaders: { from: string | null; to: string | null; date: string | null; subject: string | null } | null;
  existingPeople: { id: string; name: string }[];
  caseNumber: string | null;
}

// Filename/folder keyword → primary type (low-confidence suggestions).
const TYPE_KEYWORDS: { type: PrimaryType; subtype: string; re: RegExp }[] = [
  { type: "court_order", subtype: "order", re: /\border\b|\bjudgment\b|\bdecree\b/i },
  { type: "pleading_filing", subtype: "motion", re: /\bmotion\b/i },
  { type: "pleading_filing", subtype: "petition", re: /\bpetition\b/i },
  { type: "pleading_filing", subtype: "response", re: /\bresponse\b|\banswer\b|\bopposition\b/i },
  { type: "hearing_material", subtype: "notice_of_hearing", re: /\bnotice of hearing\b|\bhearing\b/i },
  { type: "evidence", subtype: "police_report", re: /\bpolice\b|\bincident report\b|\bLAPD\b/i },
  { type: "evidence", subtype: "medical_record", re: /\bmedical\b|\bclinic\b|\bhospital\b|\bpatient\b/i },
  { type: "evidence", subtype: "school_record", re: /\bschool\b|\battendance\b|\bIEP\b|\breport card\b|\benrollment\b/i },
  { type: "communication", subtype: "text_message_export", re: /ourfamilywizard|talkingparents|text message|\bsms\b/i },
  { type: "communication", subtype: "email", re: /\bemail\b|\.eml$/i },
  { type: "discovery", subtype: "other", re: /\bdiscovery\b|\binterrogator|\brequest for production\b|\bsubpoena\b|\badmission\b/i },
  { type: "evidence", subtype: "financial_record", re: /\bbank\b|\bstatement\b|\bpay ?stub\b|\bfinancial\b|\bincome\b/i },
  { type: "legal_reference", subtype: "other", re: /\bstatute\b|\brule\b|\badmin(?:istrative)? order\b/i },
];

const SUBJECT_KEYWORDS: { cat: string; re: RegExp }[] = [
  { cat: "school", re: /\bschool\b|\battendance\b|\benroll|\bIEP\b/i },
  { cat: "medical", re: /\bmedical\b|\bdoctor\b|\bclinic\b|\bhospital\b/i },
  { cat: "parenting_time", re: /\bparenting\b|\btimesharing\b|\bcustody\b|\bvisitation\b/i },
  { cat: "exchanges", re: /\bexchange\b|\bpickup\b|\bpick-up\b|\bdrop-?off\b/i },
  { cat: "communication", re: /\bemail\b|\bmessage\b|\btext\b/i },
  { cat: "safety", re: /\bsafety\b|\bharm\b|\bthreat\b|\binjunction\b/i },
  { cat: "support", re: /\bsupport\b|\balimony\b|\bchild support\b/i },
  { cat: "financial", re: /\bfinancial\b|\bincome\b|\bbank\b/i },
  { cat: "police", re: /\bpolice\b|\bincident\b/i },
  { cat: "child_welfare", re: /\bDCF\b|\bchild welfare\b|\bCPS\b/i },
  { cat: "discovery", re: /\bdiscovery\b|\bsubpoena\b/i },
  { cat: "court_procedure", re: /\bhearing\b|\bfiling\b|\bmotion\b|\border\b/i },
];

function dateFrom(text: string, emlDate: string | null): { date: string | null; confidence: Confidence } {
  if (emlDate) {
    const d = new Date(emlDate);
    if (!isNaN(d.getTime())) return { date: d.toISOString().slice(0, 10), confidence: "high" };
  }
  // Long-form or ISO dates in the text.
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return { date: iso[0], confidence: "medium" };
  const long = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (long) {
    const d = new Date(long[0]);
    if (!isNaN(d.getTime())) return { date: d.toISOString().slice(0, 10), confidence: "medium" };
  }
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slash) {
    const d = new Date(`${slash[3]}-${slash[1].padStart(2, "0")}-${slash[2].padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return { date: d.toISOString().slice(0, 10), confidence: "low" };
  }
  return { date: null, confidence: "low" };
}

// Name similarity: case-insensitive exact or last-name match against existing people.
function matchPeople(text: string, existing: { id: string; name: string }[]): DetectedPerson[] {
  const found = new Map<string, DetectedPerson>();
  for (const p of existing) {
    const re = new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) found.set(p.name.toLowerCase(), { name: p.name, suggestedRole: "existing", matchedPersonId: p.id });
  }
  // Capitalized two-word names not already matched → suggestions (never auto-created).
  const names = text.match(/\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g) ?? [];
  for (const n of names.slice(0, 8)) {
    if (!found.has(n.toLowerCase())) found.set(n.toLowerCase(), { name: n, suggestedRole: "unknown", matchedPersonId: null });
  }
  return Array.from(found.values());
}

function detectFlags(text: string | null, hasDate: boolean, caseMatches: boolean, caseNumberPresent: boolean): ClassificationFlag[] {
  const flags: ClassificationFlag[] = [];
  if (!hasDate) flags.push("undated");
  if (caseNumberPresent && !caseMatches) flags.push("wrong_case_number");
  if (!text || text.trim().length < 24) flags.push("unreadable_portions");
  if (text) {
    const sensitive = detectSensitive(text);
    if (sensitive.some((s) => s.kind === "ssn" || s.kind === "bank_account" || s.kind === "credit_card")) flags.push("contains_ssn_or_account");
    if (sensitive.some((s) => s.kind === "minor_dob")) flags.push("contains_minor_identifiers");
    if (/\b(diagnos|prescription|patient|medical record|treatment)\b/i.test(text) || sensitive.some((s) => s.kind === "medical_record")) flags.push("contains_medical");
  }
  return flags;
}

// Deterministic classifier — always available, low/medium confidence.
export function classifyHeuristic(input: ClassifyInput): ClassificationResult {
  const haystack = `${input.filename} ${input.folderPath ?? ""} ${input.emlHeaders?.subject ?? ""} ${(input.extractedText ?? "").slice(0, 4000)}`;
  const isEml = /\.eml$/i.test(input.filename) || !!input.emlHeaders;

  let primaryType: PrimaryType = isEml ? "communication" : "other";
  let subtype = isEml ? "email" : "other";
  for (const k of TYPE_KEYWORDS) {
    if (k.re.test(haystack)) { primaryType = k.type; subtype = k.subtype; break; }
  }

  const subjectCategories = SUBJECT_KEYWORDS.filter((s) => s.re.test(haystack)).map((s) => s.cat);
  const { date, confidence: dateConfidence } = dateFrom(input.extractedText ?? "", input.emlHeaders?.date ?? null);

  const caseNumMatch = input.extractedText?.match(/\b\d{2,4}[-\s]?[A-Z]{1,4}[-\s]?\d{3,6}\b/);
  const detectedCaseNumber = caseNumMatch ? caseNumMatch[0] : null;
  const caseNumberMatches = !!detectedCaseNumber && !!input.caseNumber &&
    detectedCaseNumber.replace(/[-\s]/g, "").toLowerCase() === input.caseNumber.replace(/[-\s]/g, "").toLowerCase();

  const detectedPeople = input.extractedText ? matchPeople(input.extractedText, input.existingPeople) : [];
  const flags = detectFlags(input.extractedText, !!date, caseNumberMatches, !!detectedCaseNumber);

  // Confidence: heuristics never claim "high" — that is reserved for the LLM path.
  const confidence: Confidence = primaryType !== "other" && date ? "medium" : "low";

  const summary = buildNeutralSummary(primaryType, subtype, subjectCategories, date, input.filename);

  return {
    primaryType, subtype, subjectCategories, documentDate: date, dateConfidence,
    detectedPeople, detectedCaseNumber, caseNumberMatches, summary, confidence, flags, source: "heuristic",
  };
}

// Descriptive, non-conclusory summary. Passed through checkProhibited so no
// advice/prediction/sufficiency phrasing can slip in.
function buildNeutralSummary(type: PrimaryType, subtype: string, subjects: string[], date: string | null, filename: string): string {
  const typeLabel = type.replace(/_/g, " ");
  const parts = [
    `Imported file "${filename}" appears to be a ${subtype.replace(/_/g, " ")} (${typeLabel}).`,
    subjects.length ? `Topics referenced: ${subjects.join(", ")}.` : "",
    date ? `A date of ${date} was detected.` : "No clear date was detected.",
    "This is a descriptive summary of the file's apparent contents for organization only.",
  ].filter(Boolean);
  const summary = parts.join(" ");
  return checkProhibited(summary).clean ? summary : `Imported file "${filename}". Descriptive summary withheld pending review.`;
}

// Validate + sanitize LLM output into a ClassificationResult. Rejects a summary
// that fails the prohibited-phrase screen (falls back to a neutral placeholder).
export function validateLlmClassification(raw: unknown, input: ClassifyInput): ClassificationResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const primaryTypes: PrimaryType[] = ["court_order", "pleading_filing", "evidence", "communication", "discovery", "hearing_material", "case_note", "legal_reference", "administrative_record", "other"];
  const primaryType = primaryTypes.includes(r.primaryType as PrimaryType) ? (r.primaryType as PrimaryType) : "other";
  const conf = (["high", "medium", "low"] as const).includes(r.confidence as Confidence) ? (r.confidence as Confidence) : "low";
  let summary = typeof r.summary === "string" ? r.summary : "";
  if (!checkProhibited(summary).clean) summary = `Imported file "${input.filename}". Descriptive summary withheld pending review.`;

  const heuristic = classifyHeuristic(input);
  return {
    primaryType,
    subtype: typeof r.subtype === "string" ? r.subtype : heuristic.subtype,
    subjectCategories: Array.isArray(r.subjectCategories) ? (r.subjectCategories as string[]).filter((s) => typeof s === "string") : heuristic.subjectCategories,
    documentDate: typeof r.documentDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.documentDate) ? r.documentDate : heuristic.documentDate,
    dateConfidence: (["high", "medium", "low"] as const).includes(r.dateConfidence as Confidence) ? (r.dateConfidence as Confidence) : heuristic.dateConfidence,
    // People matching is done deterministically against real rows, never trusted from the model.
    detectedPeople: heuristic.detectedPeople,
    detectedCaseNumber: heuristic.detectedCaseNumber,
    caseNumberMatches: heuristic.caseNumberMatches,
    summary: summary || heuristic.summary,
    confidence: conf,
    // Flags come from the deterministic detector (redaction) plus model-agnostic checks.
    flags: heuristic.flags,
    source: "ai",
  };
}
