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
