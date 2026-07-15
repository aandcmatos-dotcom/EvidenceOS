// Party/Helper role guard (migration 012). RLS + BEFORE triggers are the source
// of truth and reject these operations at the database regardless of what this
// module says — this file exists so the UI/service layer can pre-empt with a
// clear message instead of surfacing a raw Postgres error, and so callers don't
// have to round-trip a doomed request. Mirrors exactly four restricted actions:
//   (a) user_review_confirmations — party only
//   (b) deadline verification (status -> verified) — party only
//   (c) fact_candidate / citation_suggestion final decision (approved/rejected) — party only
//   (d) generated_document finalize/export (status -> reviewed/exported) — party only

export type CaseRole = "party" | "helper" | null;

export class RoleGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleGuardError";
  }
}

function requireParty(role: CaseRole, action: string) {
  if (role !== "party") {
    throw new RoleGuardError(`Only the case party may ${action}. This is staged for party approval.`);
  }
}

export function assertCanConfirmReview(role: CaseRole) {
  requireParty(role, "confirm this review step");
}

export function assertCanVerifyDeadline(role: CaseRole) {
  requireParty(role, "verify a deadline");
}

export function assertCanDecideFinal(role: CaseRole, decision: "approved" | "rejected" | "edited" | "pending" | "saved_for_later") {
  if (decision === "approved" || decision === "rejected") {
    requireParty(role, "approve or reject this item");
  }
}

export function assertCanFinalizeDocument(role: CaseRole, nextStatus: string) {
  if (nextStatus === "reviewed" || nextStatus === "exported") {
    requireParty(role, "finalize or export this document");
  }
}

export function isRoleGuardError(err: unknown): boolean {
  return err instanceof RoleGuardError || (err instanceof Error && /only the case party may/i.test(err.message));
}
