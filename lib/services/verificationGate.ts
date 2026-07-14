// Verify-at-use gate. Unverified records are browsable/searchable/linkable, but any
// flow that puts a record into a GENERATED OUTPUT (document sources, exhibit packets,
// hearing packages, fact candidates) must require verification_status = 'verified' at
// selection time. Enforced here in the service layer, not just the UI.

export type VerificationStatus = "unverified" | "verified" | "disputed";

export interface VerifiableRecord {
  id: string;
  verificationStatus: VerificationStatus;
}

export interface GateResult<T extends VerifiableRecord> {
  allowed: T[];      // verified records that may flow into output
  blocked: T[];      // unverified/disputed records requiring an inline verify step
}

// Partition selected records for output. References are handled by their own
// verification model and are exempt here (pass exempt=true for reference ids).
export function partitionForOutput<T extends VerifiableRecord>(records: T[]): GateResult<T> {
  const allowed: T[] = [];
  const blocked: T[] = [];
  for (const r of records) {
    if (r.verificationStatus === "verified") allowed.push(r);
    else blocked.push(r);
  }
  return { allowed, blocked };
}

// Hard assertion for service entry points that must not proceed with unverified
// records. Throws with the blocked ids so the caller can drive an inline verify step.
export function assertAllVerified<T extends VerifiableRecord>(records: T[]): void {
  const { blocked } = partitionForOutput(records);
  if (blocked.length > 0) {
    throw new Error(`VERIFICATION_REQUIRED:${blocked.map((b) => b.id).join(",")}`);
  }
}

export function isVerificationError(err: unknown): string[] | null {
  if (err instanceof Error && err.message.startsWith("VERIFICATION_REQUIRED:")) {
    return err.message.slice("VERIFICATION_REQUIRED:".length).split(",").filter(Boolean);
  }
  return null;
}
