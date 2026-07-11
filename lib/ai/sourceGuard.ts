// ============================================================================
// Source guard — the safety gate. Every factual or rule-based statement must
// carry source data before it can be displayed. Statements that fail are NOT
// shown as fact; they are downgraded to "no_source" / flagged for the user.
// ============================================================================

import type { StructuredStatement } from "./schema";
import type { SupportStatus } from "@/lib/documents/types";

// Statements that are explicitly the user's own words don't need external sources,
// but everything else asserting a fact or a rule does.
export function requiresSource(status: SupportStatus): boolean {
  return status !== "user_entered";
}

export interface GuardResult {
  ok: boolean;
  statement: StructuredStatement;
  reason?: string;
}

// Validate a single statement. If it asserts a fact/rule with no sourceIds,
// force its status to "no_source" and require user verification.
export function guardStatement(s: StructuredStatement): GuardResult {
  if (requiresSource(s.status) && s.sourceIds.length === 0) {
    return {
      ok: false,
      reason: "Factual/rule statement has no source IDs — downgraded to 'no source located'.",
      statement: {
        ...s,
        status: "no_source",
        userVerificationRequired: true,
        confidence: "low",
      },
    };
  }
  // sourceExcerpts should be parallel to sourceIds; pad if the model under-filled.
  const excerpts = s.sourceExcerpts.length === s.sourceIds.length
    ? s.sourceExcerpts
    : s.sourceIds.map((_, i) => s.sourceExcerpts[i] ?? "");
  return { ok: true, statement: { ...s, sourceExcerpts: excerpts } };
}

// Validate a batch; returns cleaned statements + indexes that failed the guard.
export function guardStatements(statements: StructuredStatement[]): {
  statements: StructuredStatement[];
  failedIndexes: number[];
} {
  const failedIndexes: number[] = [];
  const cleaned = statements.map((s, i) => {
    const r = guardStatement(s);
    if (!r.ok) failedIndexes.push(i);
    return r.statement;
  });
  return { statements: cleaned, failedIndexes };
}

// Words that signal the model is giving legal advice / predicting outcomes /
// asserting sufficiency. Used to catch prohibited phrasing before display.
const PROHIBITED_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\byou should (file|argue|claim|object|raise)\b/i, label: "recommends a legal action" },
  { re: /\bis (admissible|inadmissible)\b/i, label: "asserts admissibility" },
  { re: /\b(legally sufficient|legally valid|will be (granted|denied|rejected))\b/i, label: "asserts legal sufficiency/outcome" },
  { re: /\byou will (win|lose|prevail)\b/i, label: "predicts outcome" },
  { re: /\bthe judge (will|must) (rule|grant|deny|find)\b/i, label: "predicts a ruling" },
  { re: /\bi recommend (filing|the|a) (motion|strategy|claim)\b/i, label: "recommends strategy" },
];

export interface ProhibitedCheck {
  clean: boolean;
  violations: { text: string; label: string }[];
}

export function checkProhibited(text: string): ProhibitedCheck {
  const violations = PROHIBITED_PATTERNS
    .filter((p) => p.re.test(text))
    .map((p) => ({ text, label: p.label }));
  return { clean: violations.length === 0, violations };
}
