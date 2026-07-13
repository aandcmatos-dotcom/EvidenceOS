// Deadline engine (verification-mandatory). Rules:
// - Every deadline is created in `requires_verification` status. Always.
// - No day counts, holiday logic, or rule citations live in this code. A candidate
//   due date can be DISPLAYED only when the user has (a) selected a counting-method
//   reference from their library and (b) confirmed the trigger date — and the day
//   count itself is parsed from the selected reference's text at runtime.
// - The final due date is user-entered/confirmed. The system never auto-verifies.

export type DeadlineStatus = "requires_verification" | "verified" | "completed" | "superseded";

export interface DeadlineRow {
  id: string;
  case_id: string;
  source_type: string;
  source_id: string | null;
  title: string;
  trigger_event: string;
  trigger_date: string | null;
  counting_method_reference_id: string | null;
  computed_due_date: string | null;
  due_date: string | null;
  status: DeadlineStatus;
  notes: string | null;
}

// Parse a day count from the user's selected reference text. Returns null when the
// text states no count — in that case no candidate is ever shown.
export function extractDayCount(referenceText: string): { days: number; basis: string } | null {
  const m = referenceText.match(/\b(\d{1,3})\s*(calendar\s+|business\s+|court\s+)?days?\b/i);
  if (!m) return null;
  return { days: parseInt(m[1], 10), basis: `${m[1]} ${m[2] ? m[2].trim() + " " : ""}day(s), as stated in the selected reference` };
}

export interface CandidateResult {
  date: string;                // ISO date
  assumptions: string[];       // shown to the user, verbatim
}

// Candidate due date: ONLY when a reference is selected, a trigger date is confirmed,
// and the reference text states a day count. Counting is plain calendar addition and
// says so — weekend/holiday handling must be confirmed by the user from the source.
export function candidateDueDate(
  triggerDateConfirmed: boolean,
  triggerDate: string | null,
  selectedReferenceText: string | null,
): CandidateResult | null {
  if (!triggerDateConfirmed || !triggerDate || !selectedReferenceText) return null;
  const count = extractDayCount(selectedReferenceText);
  if (!count) return null;
  const d = new Date(triggerDate + "T00:00:00");
  d.setDate(d.getDate() + count.days);
  return {
    date: d.toISOString().slice(0, 10),
    assumptions: [
      `Counting basis: ${count.basis}.`,
      "Counted as plain calendar days from the trigger date.",
      "Weekend, holiday, and service-method adjustments are NOT applied — confirm them from the source.",
      "This is a candidate only. You must confirm the final date yourself.",
    ],
  };
}

// Verification gate: a deadline may move to `verified` only with a user-selected
// counting-method reference AND a user-confirmed final due date.
export function canVerify(input: { countingMethodReferenceId: string | null; userConfirmedDueDate: string | null }): boolean {
  return !!input.countingMethodReferenceId && !!input.userConfirmedDueDate;
}

// Calendar shows verified deadlines only; everything else stays in the
// requires-verification queue.
export function calendarDeadlines<T extends { status: DeadlineStatus; due_date: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => r.status === "verified" && !!r.due_date);
}

export function verificationQueue<T extends { status: DeadlineStatus }>(rows: T[]): T[] {
  return rows.filter((r) => r.status === "requires_verification");
}
