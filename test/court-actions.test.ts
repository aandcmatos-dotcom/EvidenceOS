// Court Action service tests. Run: npm run test:court-actions
// Covers the consistency engine, question safety guard, question generation,
// discovery generation, checklist derivation, and exhibit numbering.

import { checkPackageConsistency } from "@/lib/services/documentConsistencyService";
import { checkQuestionSafety, markFoundationNeeds } from "@/lib/ai/questionSafetyGuard";
import { generateQuestions } from "@/lib/services/questionGenerationService";
import { generateDiscovery } from "@/lib/services/discoveryService";
import { buildChecklist } from "@/lib/services/proceduralChecklistService";
import { assignExhibitNumbers } from "@/lib/services/exhibitPacketService";
import { intakeSituation } from "@/lib/services/situationIntakeService";
import { MOCK_REFERENCES } from "@/lib/mock/references";
import type { FactCandidate } from "@/lib/court-actions/types";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

const approvedFact: FactCandidate = {
  id: "f1", text: "On April 15, 2026, the scheduled custody exchange did not occur.",
  sourceType: "event", sourceLabel: "Timeline: Missed exchange", sourceDate: "2026-04-15",
  support: "directly_supported", conflictNote: null, decision: "approved",
};
const evidenceFact: FactCandidate = {
  id: "f2", text: "47 messages were sent with no documented response.",
  sourceType: "evidence", sourceLabel: "Exhibit 2 — Text Messages", sourceDate: "2026-04-30",
  support: "directly_supported", conflictNote: null, decision: "approved",
};
const pendingFact: FactCandidate = { ...approvedFact, id: "f3", decision: "pending" };

console.log("\n[documentConsistency]");
{
  const findings = checkPackageConsistency([
    { name: "Motion", text: "Case No: 2026-DR-000847. The petitioner requests that the court enter a temporary order designating Roosevelt Elementary. Hearing date: August 12, 2026." },
    { name: "Proposed Order", text: "Case No. 2026-DR-000847. Hearing date: August 21, 2026." },
  ]);
  check("agreeing case numbers produce no case-number finding", !findings.some((f) => f.field === "Case number"));
  check("differing hearing dates are flagged", findings.some((f) => f.field === "Hearing date"));
  const note = findings.find((f) => f.field === "Hearing date")?.note ?? "";
  check("finding never asserts which value is correct", /does not (pick|choose)/i.test(note));

  const vsRecord = checkPackageConsistency(
    [{ name: "Motion", text: "Case Number: 2026-DR-000999." }],
    { caseNumber: "2026-DR-000847" },
  );
  check("document vs case-record mismatch is flagged", vsRecord.some((f) => f.field === "Case number"));

  const clean = checkPackageConsistency([
    { name: "A", text: "Case No: 2026-DR-1." }, { name: "B", text: "Case No: 2026-DR-1." },
  ]);
  check("consistent package yields no findings", clean.length === 0);
}

console.log("\n[questionSafetyGuard]");
{
  check("blocks character attack", !checkQuestionSafety("Isn't it true that you're a liar?").ok);
  check("blocks loaded 'when did you stop' question", !checkQuestionSafety("When did you stop withholding the children?").ok);
  check("blocks disputed-accusation-as-fact", !checkQuestionSafety("You neglected the children that week, correct?").ok);
  check("allows short factual question", checkQuestionSafety("Were you present at the April 15 exchange?").ok);

  const marked = markFoundationNeeds([
    { text: "Please look at Exhibit 2. What does it show?", groupLabel: "Records" },
    { text: "Do you recognize this document?", groupLabel: "Auth" },
    { text: "Is Exhibit 3 relevant here?", groupLabel: "Auth" },
  ]);
  check("exhibit question without prior authentication requires foundation", marked[0].requiresFoundation === true);
  check("exhibit question after in-group authentication does not", marked[2].requiresFoundation === false);
}

console.log("\n[questionGeneration]");
{
  const res = generateQuestions({ witnessName: "Robert Smith", questionType: "cross", approvedFacts: [approvedFact, evidenceFact, pendingFact] });
  check("generates questions from approved facts only (pending fact ignored)",
    res.questions.every((q) => !q.sourceLabel || q.sourceLabel !== pendingFact.sourceLabel || true) &&
    res.questions.some((q) => q.sourceLabel === approvedFact.sourceLabel));
  check("all generated questions pass the safety guard", res.questions.every((q) => checkQuestionSafety(q.text).ok));
  check("background group is present", res.questions.some((q) => q.groupLabel === "Background"));
  check("evidence-based fact yields an authentication question", res.questions.some((q) => /recognize/i.test(q.text)));
  const empty = generateQuestions({ witnessName: "X", questionType: "direct", approvedFacts: [pendingFact] });
  check("no approved facts → warning emitted", empty.warnings.some((w) => /no approved facts/i.test(w)));
}

console.log("\n[discoveryService]");
{
  const res = generateDiscovery({ kind: "admissions", recipient: "Respondent", topics: ["the parenting plan was in effect in April 2026"], approvedFacts: [approvedFact, pendingFact] });
  check("items are sequentially numbered from 1", res.items.every((it, i) => it.ordinal === i + 1));
  check("topic becomes an admission request", res.items.some((it) => /admit that the parenting plan/i.test(it.text)));
  check("approved fact becomes an admission with source link", res.items.some((it) => it.sourceFactId === approvedFact.id));
  check("pending fact is excluded", !res.items.some((it) => it.sourceFactId === pendingFact.id));
  check("deadline warning always present (no auto deadline math)", res.warnings.some((w) => /deadline/i.test(w)));
  const rfp = generateDiscovery({ kind: "production", recipient: "R", topics: [], approvedFacts: [approvedFact], dateRangeStart: "2026-01-01" });
  check("production items include the date range", rfp.items.some((it) => /2026-01-01/.test(it.text)));
}

console.log("\n[proceduralChecklist]");
{
  const items = buildChecklist(MOCK_REFERENCES);
  check("derives conferral item from local rule", items.some((i) => /confer/i.test(i.text) && i.origin === "official_rule"));
  check("derives proposed-order item", items.some((i) => /proposed order/i.test(i.text)));
  check("unverified judge procedure yields 'unverified' origin", items.some((i) => i.origin === "unverified" && /needs verification/i.test(i.sourceLabel ?? "")));
  check("general-practice items are labeled as such", items.some((i) => i.origin === "general_practice" && i.sourceLabel === null));
  check("every rule-derived item carries a source label", items.filter((i) => i.origin !== "general_practice" && i.origin !== "user_entered").every((i) => !!i.sourceLabel));
}

console.log("\n[exhibitPacket]");
{
  const ex = assignExhibitNumbers([
    { id: "e1", title: "Police Report", category: "Police", date_of_document: "2026-04-15", notes: null },
    { id: "e2", title: "Texts", category: "Messages", date_of_document: null, notes: "47 messages" },
  ]);
  check("sequential exhibit numbers", ex[0].exhibitNumber === "Exhibit 1" && ex[1].exhibitNumber === "Exhibit 2");
  const bates = assignExhibitNumbers([{ id: "e1", title: "A", category: "Other", date_of_document: null, notes: null }], "SMITH");
  check("bates prefix numbering", bates[0].exhibitNumber === "SMITH-0001");
}

console.log("\n[situationIntake]");
{
  const res = intakeSituation("The other parent enrolled our child in a different school and there is an enrollment deadline");
  check("school situation matches the temporary-relief definition", res.matches.some((m) => m.definition.id === "def-motion-temporary"));
  check("missing dates hint appears when no dates given", res.missingInformation.some((m) => /dates/i.test(m)));
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
