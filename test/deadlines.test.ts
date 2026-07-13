// Deadline engine tests — verification is mandatory, no hardcoded day counts.
// Run: npm run test:deadlines

import {
  extractDayCount, candidateDueDate, canVerify, calendarDeadlines, verificationQueue,
  type DeadlineRow,
} from "@/lib/services/deadlines";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

console.log("\n[extractDayCount — counting basis resolves from reference text only]");
{
  check("parses '30 days' from reference text", extractDayCount("Responses shall be served within 30 days after service.")?.days === 30);
  check("parses 'business days' basis", /business/.test(extractDayCount("within 10 business days")?.basis ?? ""));
  check("no day count in text → null (no candidate ever shown)", extractDayCount("Responses shall be timely served.") === null);
}

console.log("\n[candidateDueDate — gated on user actions]");
{
  const refText = "A response shall be served within 30 days after service.";
  check("no candidate without confirmed trigger date", candidateDueDate(false, "2026-07-01", refText) === null);
  check("no candidate without a trigger date", candidateDueDate(true, null, refText) === null);
  check("no candidate without a selected reference", candidateDueDate(true, "2026-07-01", null) === null);
  const c = candidateDueDate(true, "2026-07-01", refText);
  check("candidate computed only when all inputs present", c?.date === "2026-07-31");
  check("candidate carries explicit assumptions", (c?.assumptions ?? []).some((a) => /candidate only/i.test(a)) && (c?.assumptions ?? []).some((a) => /holiday/i.test(a)));
  check("reference without a stated count yields no candidate", candidateDueDate(true, "2026-07-01", "Serve responses promptly.") === null);
}

console.log("\n[canVerify — both reference and confirmed date required]");
{
  check("blocked without reference", canVerify({ countingMethodReferenceId: null, userConfirmedDueDate: "2026-07-31" }) === false);
  check("blocked without confirmed date", canVerify({ countingMethodReferenceId: "r1", userConfirmedDueDate: null }) === false);
  check("allowed with both", canVerify({ countingMethodReferenceId: "r1", userConfirmedDueDate: "2026-07-31" }) === true);
}

console.log("\n[calendar filtering — verified only]");
{
  const rows: Pick<DeadlineRow, "status" | "due_date">[] = [
    { status: "requires_verification", due_date: "2026-07-31" },
    { status: "verified", due_date: "2026-08-05" },
    { status: "verified", due_date: null },
    { status: "completed", due_date: "2026-06-01" },
  ];
  const cal = calendarDeadlines(rows);
  check("calendar shows only verified deadlines with a due date", cal.length === 1 && cal[0].due_date === "2026-08-05");
  check("unverified deadlines go to the verification queue", verificationQueue(rows).length === 1);
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
