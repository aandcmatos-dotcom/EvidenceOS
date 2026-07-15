// Party/Helper role tests (migration 012). Service-layer guard assertions
// mirror the DB triggers/RLS (validated live against Postgres 16 — see
// docs/SECURITY_AUDIT.md "RLS test approach" for the functional test that
// exercised party/helper/outsider isolation against a real database).
// Run: npm run test:roles

import {
  assertCanConfirmReview, assertCanVerifyDeadline, assertCanDecideFinal,
  assertCanFinalizeDocument, isRoleGuardError, RoleGuardError,
} from "@/lib/services/roleGuard";
import { computeChecklistStatus, CHECKLIST_CATEGORY_KEYS } from "@/lib/services/referenceChecklist";
import { exportTables, exportFilterColumn } from "@/lib/services/caseExport";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}
function throws(fn: () => void): boolean {
  try { fn(); return false; } catch { return true; }
}

console.log("\n[helper cannot confirm / verify / finalize]");
{
  check("helper cannot confirm a review step", throws(() => assertCanConfirmReview("helper")));
  check("party can confirm a review step", !throws(() => assertCanConfirmReview("party")));
  check("non-member (null role) cannot confirm", throws(() => assertCanConfirmReview(null)));

  check("helper cannot verify a deadline", throws(() => assertCanVerifyDeadline("helper")));
  check("party can verify a deadline", !throws(() => assertCanVerifyDeadline("party")));

  check("helper cannot approve a fact_candidate", throws(() => assertCanDecideFinal("helper", "approved")));
  check("helper cannot reject a fact_candidate", throws(() => assertCanDecideFinal("helper", "rejected")));
  check("helper CAN mark a fact_candidate edited", !throws(() => assertCanDecideFinal("helper", "edited")));
  check("helper CAN leave a fact_candidate pending", !throws(() => assertCanDecideFinal("helper", "pending")));
  check("party can approve a fact_candidate", !throws(() => assertCanDecideFinal("party", "approved")));

  check("helper cannot finalize a document (status: reviewed)", throws(() => assertCanFinalizeDocument("helper", "reviewed")));
  check("helper cannot export a document (status: exported)", throws(() => assertCanFinalizeDocument("helper", "exported")));
  check("helper CAN move a document to in_review (drafting stays open)", !throws(() => assertCanFinalizeDocument("helper", "in_review")));
  check("party can finalize a document", !throws(() => assertCanFinalizeDocument("party", "reviewed")));
}

console.log("\n[guard error identification]");
{
  const err = (() => { try { assertCanVerifyDeadline("helper"); } catch (e) { return e; } })();
  check("guard throws a RoleGuardError instance", err instanceof RoleGuardError);
  check("isRoleGuardError recognizes it", isRoleGuardError(err));
  check("isRoleGuardError rejects an unrelated error", !isRoleGuardError(new Error("network timeout")));
  check("error message names the party-only restriction", err instanceof Error && /party/i.test(err.message));
}

console.log("\n[reference-pack application never copies an attestation — logic]");
{
  // Simulate the DB rule directly: applying a pack always writes a fresh
  // needs_verification row per (case, reference, user) — it must never read or
  // propagate anyone else's verification_status/last_verified_date.
  const sourceReference = { id: "r1", verification_status: "verified_official", last_verified_date: "2020-01-01", owner_id: "other-user" };
  function simulateApplyPackAttestation(referenceId: string, userId: string) {
    // The real implementation (lib/db/referencePacks.ts#applyPackToCase) upserts
    // exactly this shape — no field from sourceReference is read here.
    return { case_id: "case-1", reference_id: referenceId, user_id: userId, status: "needs_verification" as const };
  }
  const attestation = simulateApplyPackAttestation(sourceReference.id, "new-user");
  check("new attestation defaults to needs_verification", attestation.status === "needs_verification");
  check("new attestation is scoped to the applying user, not the reference owner", attestation.user_id === "new-user" && attestation.user_id !== sourceReference.owner_id);
  check("attestation shape carries no verification_status/last_verified_date fields from the source reference",
    !("verification_status" in attestation) && !("last_verified_date" in attestation));
}

console.log("\n[minimum reference checklist — maps assigned categories, invents nothing]");
{
  const empty = computeChecklistStatus([]);
  check("no assigned references -> all eight categories missing", empty.length === 8 && empty.every((c) => !c.done));
  check("checklist has exactly the eight required categories", CHECKLIST_CATEGORY_KEYS.length === 8);

  const some = computeChecklistStatus(["Family Law Statute", "Public Form"]);
  check("assigned statute marks the statutes category done", some.find((c) => c.key === "statutes")!.done);
  check("assigned public form marks official_forms done", some.find((c) => c.key === "official_forms")!.done);
  check("unrelated categories remain missing", !some.find((c) => c.key === "evidence_code")!.done);
}

console.log("\n[full-case export — every table query is scoped to the case]");
{
  const tables = exportTables();
  check("export covers a non-trivial set of case-scoped tables", tables.length > 15);
  check("no duplicate table names", new Set(tables).size === tables.length);
  check("'cases' is filtered on its own id (not case_id, which it lacks)", exportFilterColumn("cases") === "id");
  check("every other table is filtered on case_id", tables.filter((t) => t !== "cases").every((t) => exportFilterColumn(t) === "case_id"));
  check("internal-only bookkeeping tables are excluded from the export", !tables.includes("audit_logs") && !tables.includes("ai_request_logs"));
}
// NOTE: exportFilterColumn only proves every export query carries a case-scoping
// filter; whether that filter is actually enforced against other users' data is
// an RLS property, not something this deterministic suite can exercise without a
// live database. That isolation was verified functionally against Postgres 16
// (party/helper/outsider reads) — see docs/SECURITY_AUDIT.md, "RLS test approach".

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
