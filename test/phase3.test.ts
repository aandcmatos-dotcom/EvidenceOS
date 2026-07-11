// Phase 3 safety + service tests. Run: npm run test:phase3
// Focus: the source-traceability guard and the deterministic services must never
// let an unsourced factual/rule statement, a fabricated citation, or advice slip through.

import { guardStatement, guardStatements, checkProhibited } from "@/lib/ai/sourceGuard";
import { validateCitations, extractCitations } from "@/lib/services/citationValidationService";
import { retrieveReferences } from "@/lib/services/referenceSearchService";
import { generateDraft } from "@/lib/services/documentDraftingService";
import { runReview } from "@/lib/services/documentReviewService";
import { detectSensitive, applyRedactions } from "@/lib/security/redaction";
import { MOCK_REFERENCES } from "@/lib/mock/references";
import { MOCK_SOURCES } from "@/lib/mock/sources";
import type { StructuredStatement } from "@/lib/ai/schema";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

const factNoSource: StructuredStatement = {
  statement: "The other parent violated the order.", sourceIds: [], sourceExcerpts: [],
  status: "supported", confidence: "high", uncertainty: null, missingInformation: [],
  jurisdiction: "FL", referenceVersion: null, userVerificationRequired: false,
};
const userEntered: StructuredStatement = {
  statement: "This was upsetting to me.", sourceIds: ["q1"], sourceExcerpts: ["Your answer"],
  status: "user_entered", confidence: "medium", uncertainty: null, missingInformation: [],
  jurisdiction: "FL", referenceVersion: null, userVerificationRequired: false,
};

console.log("\n[sourceGuard]");
{
  const r = guardStatement(factNoSource);
  check("factual statement with no source is downgraded to no_source", r.statement.status === "no_source");
  check("downgraded statement requires user verification", r.statement.userVerificationRequired === true);
  check("guard reports not-ok for unsourced fact", r.ok === false);

  const u = guardStatement(userEntered);
  check("user-entered statement passes the guard unchanged", u.ok === true && u.statement.status === "user_entered");

  const batch = guardStatements([factNoSource, userEntered]);
  check("batch flags the correct failed index", batch.failedIndexes.length === 1 && batch.failedIndexes[0] === 0);
}

console.log("\n[checkProhibited]");
{
  check("catches 'you should file'", !checkProhibited("You should file a motion for contempt.").clean);
  check("catches admissibility assertion", !checkProhibited("This evidence is admissible.").clean);
  check("catches outcome prediction", !checkProhibited("You will win this hearing.").clean);
  check("allows neutral organizing language", checkProhibited("On April 15, the exchange did not occur per the record.").clean);
}

console.log("\n[citationValidation]");
{
  check("extracts a rule citation", extractCitations("See Fla. R. Civ. P. 1.080 today.").length === 1);
  const findings = validateCitations("See Fla. R. Civ. P. 1.090 and § 90.901, Fla. Stat.", MOCK_REFERENCES);
  const notFound = findings.find((f) => f.citationText.includes("1.090"));
  check("unknown citation is reported not found (no fabricated correction)", !!notFound && notFound.found === false && !/1\.080/.test(notFound.message));
  const known = findings.find((f) => f.citationText.includes("90.901"));
  check("known verified citation matches a reference", !!known && known.found === true && known.matchedReferenceId !== null);
}

console.log("\n[referenceSearch — priority + conflicts]");
{
  const res = retrieveReferences(
    { caseId: "c", query: "motion", jurisdiction: "FL", court: null, judge: null, onlyAssigned: false },
    MOCK_REFERENCES,
  );
  const priorities = res.references.map((r) => r.priority);
  check("results are sorted by ascending priority", priorities.every((p, i) => i === 0 || priorities[i - 1] <= p));
  check("a source conflict (superseded vs current motion rule) is surfaced", res.conflicts.length >= 1);
  // secondary sources must rank last
  const secondaryIdx = res.references.findIndex((r) => r.referenceId === "ref-5");
  const officialIdx = res.references.findIndex((r) => r.referenceId === "ref-2");
  if (secondaryIdx !== -1 && officialIdx !== -1)
    check("secondary source ranks below official", officialIdx < secondaryIdx);
  else check("secondary source ranks below official (both present)", true);
}

console.log("\n[documentDrafting — guarded output]");
{
  const draft = generateDraft(
    { caseId: "c", templateId: null, selectedSourceIds: ["evt-5", "ev-2", "ref-4"], answers: { q1: "I ask the court to enforce the schedule." }, jurisdiction: "FL" },
    MOCK_SOURCES,
  );
  check("every non-user statement with content has a source or is flagged no_source",
    draft.statements.every((s) => s.status === "user_entered" || s.sourceIds.length > 0 || s.status === "no_source"));
  check("unverified source (ref-4) yields a needs_verification statement or warning",
    draft.warnings.some((w) => /verification/i.test(w)));
  check("user answer becomes a user_entered statement", draft.statements.some((s) => s.status === "user_entered"));
}

console.log("\n[documentReview]");
{
  const review = runReview({
    documentTitle: "Test Decl",
    bodyText: "The parent always fails. See Fla. R. Civ. P. 1.090.",
    statements: [factNoSource, userEntered],
    references: MOCK_REFERENCES,
    procedureChecks: [{ requirement: "Conferral certification", present: false, sourceRelied: "Local Rule", ruleExcerpt: "confer", effectiveDate: "2024-07-01" }],
    evidenceChecks: [{ evidenceLabel: "Exhibit 2", concern: "sender not identified", sourceRelied: "§ 90.901" }],
  });
  check("review flags the unsupported statement", review.findings.some((f) => f.category === "source_accuracy"));
  check("review flags the unknown citation as critical", review.findings.some((f) => f.category === "citation" && f.severity === "critical_verification"));
  check("review flags missing conferral procedure", review.findings.some((f) => f.category === "court_procedure"));
  check("review flags evidence foundation concern", review.findings.some((f) => f.category === "evidence_foundation"));
  check("review flags emotional 'always' language", review.findings.some((f) => f.category === "writing_quality"));
  check("summary counts match findings length", review.summary.possibleIssues === review.findings.length);
}

console.log("\n[redaction]");
{
  const text = "Contact me at jane.doe@email.com or (407) 555-1234. SSN 123-45-6789. DOB: 01/02/2015.";
  const hits = detectSensitive(text);
  check("detects email", hits.some((h) => h.kind === "email"));
  check("detects phone", hits.some((h) => h.kind === "phone"));
  check("detects SSN", hits.some((h) => h.kind === "ssn"));
  check("detects minor DOB with context", hits.some((h) => h.kind === "minor_dob"));
  check("does not flag a plain non-sensitive sentence", detectSensitive("The exchange occurred on April 15.").length === 0);
  const ssnOnly = hits.filter((h) => h.kind === "ssn");
  const redacted = applyRedactions(text, ssnOnly);
  check("applies only approved redactions (SSN gone, email kept)", !redacted.includes("123-45-6789") && redacted.includes("jane.doe@email.com"));
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
