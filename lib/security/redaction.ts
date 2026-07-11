// Sensitive-data detection + redaction SUGGESTIONS. Never auto-redacts without
// user review (section 9). Detection is conservative and explainable.

export type SensitiveKind =
  | "ssn" | "bank_account" | "minor_dob" | "medical_record" | "drivers_license"
  | "address" | "phone" | "email" | "credit_card";

export const SENSITIVE_LABEL: Record<SensitiveKind, string> = {
  ssn: "Social Security number",
  bank_account: "Bank account number",
  minor_dob: "Minor's date of birth",
  medical_record: "Medical record number",
  drivers_license: "Driver license number",
  address: "Home address",
  phone: "Telephone number",
  email: "Email address",
  credit_card: "Credit card number",
};

export interface RedactionMatch {
  kind: SensitiveKind;
  text: string;
  start: number;
  end: number;
  suggestedReplacement: string;
}

interface Rule { kind: SensitiveKind; re: RegExp; replacement: string; validate?: (m: string) => boolean }

function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

const RULES: Rule[] = [
  { kind: "ssn", re: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN redacted]" },
  { kind: "credit_card", re: /\b(?:\d[ -]?){13,16}\b/g, replacement: "[card number redacted]", validate: luhnValid },
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[email redacted]" },
  { kind: "phone", re: /(?<!\d)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(?!\d)/g, replacement: "[phone redacted]" },
  { kind: "drivers_license", re: /\b[A-Z]\d{7,12}\b/g, replacement: "[license redacted]" },
  { kind: "medical_record", re: /\bMRN[:#]?\s?\d{5,10}\b/gi, replacement: "[medical record redacted]" },
  { kind: "bank_account", re: /\b(?:acct|account)[:#]?\s?\d{6,17}\b/gi, replacement: "[account redacted]" },
  { kind: "address", re: /\b\d{1,5}\s+[A-Za-z0-9.\s]{2,30}\s(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Ln|Lane|Dr|Drive|Ct|Court|Way|Pl|Place)\b\.?/gi, replacement: "[address redacted]" },
];

// A minor DOB requires context ("DOB", "born", "date of birth") near a date to reduce false positives.
const MINOR_DOB_RE = /\b(?:DOB|date of birth|born)\b[:\s]*(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi;

export function detectSensitive(text: string): RedactionMatch[] {
  const matches: RedactionMatch[] = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      if (rule.validate && !rule.validate(m[0])) continue;
      matches.push({ kind: rule.kind, text: m[0], start: m.index, end: m.index + m[0].length, suggestedReplacement: rule.replacement });
    }
  }

  MINOR_DOB_RE.lastIndex = 0;
  let d: RegExpExecArray | null;
  while ((d = MINOR_DOB_RE.exec(text)) !== null) {
    matches.push({ kind: "minor_dob", text: d[0], start: d.index, end: d.index + d[0].length, suggestedReplacement: "[date of birth redacted]" });
  }

  // De-dupe overlaps: keep the longest match at any given start.
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const kept: RedactionMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) { kept.push(m); lastEnd = m.end; }
  }
  return kept;
}

// Apply only the user-approved matches. Never called automatically on the whole set.
export function applyRedactions(text: string, approved: RedactionMatch[]): string {
  const ordered = [...approved].sort((a, b) => b.start - a.start); // right-to-left keeps indexes valid
  let out = text;
  for (const m of ordered) out = out.slice(0, m.start) + m.suggestedReplacement + out.slice(m.end);
  return out;
}
