// Neutral-language QC gate (plan §1.9). Scans Court Action UI source files for
// banned static copy — options must never be labeled recommended/best/correct or
// promise outcomes. Run: npm run test:language
// Catches developer-written JSX strings, complementing checkProhibited() which
// only screens AI-generated text at runtime.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SCAN_DIRS = [
  "app/court-actions", "app/discovery", "app/hearing-preparation", "app/questions",
  "components/court-actions", "lib/mock/court-actions.ts", "lib/mock/document-definitions.ts",
  "lib/court-actions",
  "lib/services/questionGenerationService.ts", "lib/services/discoveryService.ts",
  "lib/services/proceduralChecklistService.ts", "lib/services/legalReferenceSuggestionService.ts",
  "components/discovery", "lib/services/subpoenaService.ts", "lib/services/instrumentPrintService.ts",
  "app/inbound", "components/deadlines", "lib/services/deadlines.ts", "lib/db/deadlines.ts",
  "app/import", "lib/import", "lib/services/extraction.ts", "lib/db/imports.ts",
  "lib/services/importClassification.ts", "lib/services/importRouting.ts", "lib/db/classification.ts",
  "lib/services/hearingPreparation.ts",
  "app/settings", "app/invite", "app/onboarding", "components/shared/DisclaimerAckModal.tsx",
  "lib/services/roleGuard.ts", "lib/services/referenceChecklist.ts", "lib/services/caseExport.ts",
  "lib/db/caseMembers.ts", "lib/db/referencePacks.ts",
];

// Banned as user-facing labels for document options / outcomes (Section 2 + 7).
const BANNED: { re: RegExp; label: string }[] = [
  { re: /\brecommended option\b/i, label: "'recommended option' label" },
  { re: /\bbest (option|choice|filing|motion)\b/i, label: "'best X' ranking" },
  { re: /\bmost likely to (win|succeed)\b/i, label: "success-likelihood ranking" },
  { re: /\bcorrect filing\b/i, label: "'correct filing' label" },
  { re: /\brequired filing\b/i, label: "'required filing' label" },
  { re: /\byou (will|should) win\b/i, label: "outcome promise" },
  { re: /\bguaranteed?\s+(to|outcome|result)\b/i, label: "guarantee language" },
  { re: /\blegally (sufficient|valid)\b(?!.*\bnot\b)/i, label: "legal-sufficiency claim" },
  { re: /\bis admissible\b/i, label: "admissibility claim" },
  { re: /\bwe recommend (filing|the motion|this document)\b/i, label: "filing recommendation" },
  // Hearing-prep / contempt: describe "possible noncompliance" only.
  { re: /\bwillful(ly)?\b/i, label: "willfulness characterization" },
  { re: /\bcontempt (was|is) (committed|established)\b/i, label: "asserted contempt finding" },
  { re: /\bin violation of\b/i, label: "asserted violation" },
  { re: /\b(guaranteed|likely) (win|to win|outcome|result)\b/i, label: "outcome prediction" },
];

function collectFiles(path: string): string[] {
  const full = join(process.cwd(), path);
  try {
    const st = statSync(full);
    if (st.isFile()) return [full];
    return readdirSync(full).flatMap((f) => collectFiles(join(path, f)));
  } catch {
    return [];
  }
}

let passed = 0, failed = 0;
const files = SCAN_DIRS.flatMap(collectFiles).filter((f) => /\.(tsx?|ts)$/.test(f));

console.log(`\n[neutral-language] scanning ${files.length} files`);
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const hits = BANNED.filter((b) => b.re.test(text));
  if (hits.length === 0) {
    passed++;
  } else {
    failed++;
    console.log(`  ✗ ${file.replace(process.cwd() + "/", "")}`);
    hits.forEach((h) => console.log(`      contains ${h.label}`));
  }
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} files clean, ${failed} with banned phrasing\n`);
process.exit(failed === 0 ? 0 : 1);
