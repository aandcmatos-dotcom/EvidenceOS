// Hearing-preparation tests (deterministic). Presets carry no legal factors;
// worksheets/checklists come only from assigned references; the possible-
// noncompliance question bank stays neutral. Run: npm run test:hearing-prep

import {
  HEARING_PRESETS, getPreset, buildWorksheet, buildHearingChecklist, buildNoncomplianceQuestions,
} from "@/lib/services/hearingPreparation";
import { generateQuestions } from "@/lib/services/questionGenerationService";
import { checkProhibited } from "@/lib/ai/sourceGuard";
import type { LegalReference } from "@/lib/references/types";
import type { FactCandidate } from "@/lib/court-actions/types";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

function ref(over: Partial<LegalReference>): LegalReference {
  return {
    id: "r1", title: "Ref", jurisdiction: "Florida", state: "FL", county: null, circuitDistrict: null,
    court: null, division: null, judge: null, category: "Family Law Statute", citation: null,
    sourceUrl: null, sourceOrg: null, effectiveDate: null, lastVerifiedDate: null, supersededDate: null,
    version: 1, uploadDate: "2026-01-01", uploadedBy: "u1", verificationStatus: "verified_official",
    sourceTier: "official", applicableCaseTypes: [], summary: "", keywords: [],
    sections: [{ id: "s1", heading: "Considerations", text: "The court considers several considerations." }],
    assignedToCase: true, notes: null, ...over,
  };
}

console.log("\n[presets — metadata only, no hardcoded legal factors]");
{
  check("two seed presets exist", HEARING_PRESETS.length >= 2 && !!getPreset("temporary_timesharing") && !!getPreset("contempt_enforcement"));
  const blob = JSON.stringify(HEARING_PRESETS).toLowerCase();
  // No pre-written legal factors/elements/standards baked into presets.
  check("presets contain no baked-in legal factors", !/best interest|factor \d|element|willful|preponderance/.test(blob));
  check("contempt preset offers the question bank", getPreset("contempt_enforcement")!.contemptBank === true);
}

console.log("\n[worksheets — built only from assigned references]");
{
  const preset = getPreset("temporary_timesharing")!;
  const empty = buildWorksheet(preset, []);
  check("no references → single verify-with-court row", empty.length === 1 && empty[0].needsCourtVerification && /verify the applicable/i.test(empty[0].prompt));
  check("empty worksheet invents no factors", empty[0].sourceLabel === null);

  const withRef = buildWorksheet(preset, [ref({ title: "Fla. Stat. 61.13", sections: [{ id: "s1", heading: "Considerations", text: "..." }] })]);
  check("assigned reference → cited worksheet row", withRef.some((r) => r.sourceLabel?.includes("Fla. Stat. 61.13")));

  const unverified = buildWorksheet(preset, [ref({ verificationStatus: "needs_verification" })]);
  check("unverified reference row flagged needs-verification", unverified.every((r) => r.needsCourtVerification) && unverified[0].sourceLabel?.includes("needs verification"));
}

console.log("\n[procedural checklist — cites reference or points to the court]");
{
  const none = buildHearingChecklist([]);
  check("no judge/division reference → verify-with-court lead item", none[0].id === "hp-lead" && /verify the hearing procedure with the court/i.test(none[0].text));
  const withJudge = buildHearingChecklist([ref({ category: "Judge-Specific Procedure", title: "Judge Smith Standing Order" })]);
  check("judge reference → cited lead item", withJudge[0].sourceLabel === "Judge Smith Standing Order" && withJudge[0].origin === "judge_procedure");
}

console.log("\n[possible-noncompliance question bank — neutral + double-screened]");
{
  const { questions, removed } = buildNoncomplianceQuestions([
    { text: "Parent shall exchange the child at 6pm on Fridays.", sourceLabel: "Final Judgment ¶4" },
  ]);
  check("bank produces questions", questions.length >= 2);
  check("uses 'possible noncompliance' framing", questions.some((q) => /possible noncompliance/i.test(q.text)));
  check("no question asserts a violation/willfulness/finding", questions.every((q) => checkProhibited(q.text).clean));
  check("no question contains banned contempt words", questions.every((q) => !/\b(willful|violation|violated|contempt was)\b/i.test(q.text)));
  check("removed count is a number", typeof removed === "number");
}

console.log("\n[/questions contempt type routes through the guards]");
{
  const facts: FactCandidate[] = [
    { id: "f1", text: "Order requires Friday 6pm exchanges.", decision: "approved", sourceType: "court_order", sourceLabel: "Final Judgment", sourceDate: "2025-01-01" } as unknown as FactCandidate,
  ];
  const res = generateQuestions({ witnessName: "Self", questionType: "contempt", approvedFacts: facts });
  check("contempt question set generated", res.questions.length > 0);
  check("contempt questions pass the prohibited screen", res.questions.every((q) => checkProhibited(q.text).clean));
  check("contempt questions avoid violation/willful language", res.questions.every((q) => !/\b(willful|in violation of|violated)\b/i.test(q.text)));
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
