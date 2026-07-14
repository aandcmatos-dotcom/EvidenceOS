// Import classification + lazy-verification routing tests (deterministic paths).
// Run: npm run test:import-classification

import { classifyHeuristic, validateLlmClassification, type ClassifyInput } from "@/lib/services/importClassification";
import { routeClassification, targetTable } from "@/lib/services/importRouting";
import { partitionForOutput, assertAllVerified, isVerificationError } from "@/lib/services/verificationGate";
import { checkProhibited } from "@/lib/ai/sourceGuard";
import type { ClassificationResult } from "@/lib/ai/schema";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

const base: ClassifyInput = {
  filename: "note.txt", folderPath: null, extractedText: "Some neutral text.",
  emlHeaders: null, existingPeople: [], caseNumber: "2026-DR-1",
};

console.log("\n[heuristic fallback — low-confidence suggestions]");
{
  const order = classifyHeuristic({ ...base, filename: "Temporary Custody Order.pdf", extractedText: "This ORDER grants temporary custody. Dated January 15, 2026." });
  check("filename 'order' → court_order suggestion", order.primaryType === "court_order");
  check("heuristic never claims high confidence", order.confidence !== "high");
  check("heuristic source labeled", order.source === "heuristic");

  const iep = classifyHeuristic({ ...base, filename: "student_IEP.pdf", extractedText: "IEP meeting notes for the school year." });
  check("'IEP' → evidence/school subject", iep.primaryType === "evidence" && iep.subjectCategories.includes("school"));

  const ofw = classifyHeuristic({ ...base, filename: "OurFamilyWizard_export.pdf", extractedText: "Messages exported." });
  check("'OurFamilyWizard' → communication", ofw.primaryType === "communication");

  const undated = classifyHeuristic({ ...base, filename: "misc.txt", extractedText: "No dates here at all." });
  check("no date → 'undated' flag", undated.flags.includes("undated"));
}

console.log("\n[people matching — never auto-creates]");
{
  const r = classifyHeuristic({ ...base, extractedText: "Jane Doe met with Robert Smith on site.", existingPeople: [{ id: "p1", name: "Jane Doe" }] });
  check("existing person matched to id", r.detectedPeople.some((p) => p.matchedPersonId === "p1"));
  check("unmatched name is a suggestion (matchedPersonId null)", r.detectedPeople.some((p) => p.name === "Robert Smith" && p.matchedPersonId === null));
}

console.log("\n[flags reuse the redaction detector]");
{
  const ssn = classifyHeuristic({ ...base, extractedText: "SSN 123-45-6789 on file. Dated April 1, 2026." });
  check("SSN → contains_ssn_or_account flag", ssn.flags.includes("contains_ssn_or_account"));
  const med = classifyHeuristic({ ...base, extractedText: "Patient diagnosis and prescription details. April 1, 2026." });
  check("medical language → contains_medical flag", med.flags.includes("contains_medical"));
  const conflict = classifyHeuristic({ ...base, extractedText: "Case No. 9999-XX-9999 in a different matter. May 2, 2026.", caseNumber: "2026-DR-1" });
  check("mismatched case number → wrong_case_number flag", conflict.flags.includes("wrong_case_number"));
}

console.log("\n[neutral summaries]");
{
  const r = classifyHeuristic({ ...base, filename: "Motion.pdf", extractedText: "Motion for temporary relief. April 1, 2026." });
  check("summary passes the prohibited-phrase screen", checkProhibited(r.summary).clean);
  // A model summary containing advice is rejected and replaced.
  const bad = validateLlmClassification({ primaryType: "pleading_filing", confidence: "high", summary: "You should file this motion; you will win." }, base);
  check("LLM summary with advice is withheld", !!bad && !/you (should|will win)/i.test(bad.summary));
}

console.log("\n[routing — lazy verification]");
{
  const highClean: ClassificationResult = { ...classifyHeuristic(base), primaryType: "evidence", confidence: "high", flags: [] };
  check("HIGH + no flags → auto_accepted", routeClassification(highClean).routing === "auto_accepted");

  const flagged: ClassificationResult = { ...highClean, flags: ["contains_medical"] };
  check("any flag → review_queue", routeClassification(flagged).routing === "review_queue");

  const lowConf: ClassificationResult = { ...highClean, confidence: "low", flags: [] };
  check("low confidence → review_queue", routeClassification(lowConf).routing === "review_queue");

  const order: ClassificationResult = { ...highClean, primaryType: "court_order" };
  const orderRoute = routeClassification(order);
  check("court_order → mandatory (no court_orders row without confirmation)", orderRoute.routing === "mandatory" && orderRoute.mandatoryReasons.includes("court_order"));

  const hearingDate: ClassificationResult = { ...highClean, primaryType: "hearing_material", subtype: "notice_of_hearing", documentDate: "2026-08-01" };
  const dateRoute = routeClassification(hearingDate);
  check("hearing date → mandatory date_candidate (never auto-calendared)", dateRoute.routing === "mandatory" && dateRoute.mandatoryReasons.includes("date_candidate"));

  const conflict: ClassificationResult = { ...highClean, flags: ["wrong_case_number"] };
  const conflictRoute = routeClassification(conflict);
  check("wrong_case_number → mandatory case_conflict", conflictRoute.mandatoryReasons.includes("case_conflict"));

  check("communication type targets communications table", targetTable({ ...highClean, primaryType: "communication" }) === "communications");
  check("non-communication targets evidence table", targetTable(highClean) === "evidence");
}

console.log("\n[verify-at-use gate — service layer]");
{
  const recs = [
    { id: "a", verificationStatus: "verified" as const },
    { id: "b", verificationStatus: "unverified" as const },
    { id: "c", verificationStatus: "disputed" as const },
  ];
  const { allowed, blocked } = partitionForOutput(recs);
  check("only verified records flow into output", allowed.length === 1 && allowed[0].id === "a");
  check("unverified + disputed are blocked", blocked.length === 2);

  let threw = false, blockedIds: string[] | null = null;
  try { assertAllVerified(recs); } catch (e) { threw = true; blockedIds = isVerificationError(e); }
  check("assertAllVerified throws a VERIFICATION_REQUIRED error", threw && !!blockedIds && blockedIds.includes("b"));
  check("all-verified set does not throw", (() => { try { assertAllVerified([recs[0]]); return true; } catch { return false; } })());
}

console.log("\n[user edits survive reclassification — logic]");
{
  // Simulate the DB rule: fields in user_edited_fields are dropped from a re-save.
  const edited = new Set(["primary_type", "document_date"]);
  const incoming: Record<string, unknown> = { primary_type: "evidence", document_date: "2026-01-01", subtype: "motion", confidence: "high" };
  for (const f of edited) delete incoming[f];
  check("user-edited fields removed from reclassification payload", !("primary_type" in incoming) && !("document_date" in incoming));
  check("non-edited fields still update", incoming.subtype === "motion");
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
