// Discovery generation tests (subpoena builder + instrument formatting).
// Run: npm run test:discovery

import {
  resolveSubpoenaProcedure, findSubpoenaReferences, suggestSubpoenaItems, numberItems,
} from "@/lib/services/subpoenaService";
import { buildInstrumentHtml } from "@/lib/services/instrumentPrintService";
import { ADMISSION_TEMPLATES, generateDiscovery } from "@/lib/services/discoveryService";
import type { LegalReference } from "@/lib/references/types";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

const subpoenaRef: LegalReference = {
  id: "r1", title: "Rules of Civil Procedure — Subpoena", jurisdiction: "FL", state: "FL",
  county: null, circuitDistrict: null, court: null, division: null, judge: null,
  category: "Rules of Civil Procedure", citation: "R. 1.410", sourceUrl: null, sourceOrg: null,
  effectiveDate: "2025-01-01", lastVerifiedDate: null, supersededDate: null, version: 1,
  uploadDate: "", uploadedBy: "", verificationStatus: "verified_official", sourceTier: "official",
  applicableCaseTypes: [], summary: "Governs subpoenas.", keywords: ["subpoena"],
  sections: [
    { id: "s1", heading: "(a)", text: "A subpoena may be issued by the clerk of court or an attorney of record." },
    { id: "s2", heading: "(b)", text: "Notice must be given to each party before service on a non-party." },
    { id: "s3", heading: "(c)", text: "A witness fee and mileage must be tendered with service. Objections may be served within the stated period." },
  ],
  assignedToCase: true, notes: null,
};
const unrelatedRef: LegalReference = { ...subpoenaRef, id: "r2", title: "Evidence Code — Authentication", citation: "§ 90.901", keywords: ["authentication"], summary: "Authentication of records.", sections: [{ id: "x", heading: "", text: "Authentication generally." }] };

console.log("\n[subpoenaService — procedural gating]");
{
  const blocked = resolveSubpoenaProcedure([unrelatedRef]);
  check("no subpoena-covering reference → generation blocked", blocked.covered === false && blocked.requirements.length === 0);
  const ok = resolveSubpoenaProcedure([unrelatedRef, subpoenaRef]);
  check("subpoena reference assigned → covered", ok.covered === true);
  check("issuance requirement resolved from reference text", ok.requirements.some((r) => r.topic === "Issuance procedure"));
  check("notice-to-other-party requirement resolved", ok.requirements.some((r) => r.topic === "Notice to other party"));
  check("witness-fee requirement resolved", ok.requirements.some((r) => r.topic === "Witness fees and mileage"));
  check("objection-window requirement resolved", ok.requirements.some((r) => r.topic === "Objection window"));
  check("every requirement carries its source title + citation", ok.requirements.every((r) => r.sourceTitle.includes("Subpoena") && r.citation === "R. 1.410"));
  check("findSubpoenaReferences matches on keyword", findSubpoenaReferences([subpoenaRef]).length === 1);
}

console.log("\n[subpoenaService — item suggestions + numbering]");
{
  const sugg = suggestSubpoenaItems(
    [{ category: "School" }, { category: "Medical" }, { category: "School" }],
    [{ category: "Medical" }],
  );
  check("gap category (School: events, no evidence) is suggested", sugg.some((s) => /school/i.test(s)));
  check("covered category (Medical) is not suggested", !sugg.some((s) => /medical/i.test(s)));

  const numbered = numberItems([
    { text: "All attendance records" }, { text: "  " }, { text: "All report cards", dateRangeStart: "2025-08-01" },
  ]);
  check("blank items skipped; remaining numbered 1..n", numbered.length === 2 && numbered[0].ordinal === 1 && numbered[1].ordinal === 2);
  check("date range preserved", numbered[1].dateRangeStart === "2025-08-01");
}

console.log("\n[instrument formatting]");
{
  const html = buildInstrumentHtml({
    captionText: "IN THE CIRCUIT COURT\nCase No. 2026-DR-1\nDoe v. Smith",
    title: "Request for Admissions to Respondent",
    definitions: "Document means…", instructions: "Respond to each item…",
    items: [{ ordinal: 1, text: "Admit that the plan was in effect." }],
    serviceRecipients: "Opposing party", serviceMethod: "email",
    signatureName: "Jane Doe",
  });
  check("caption text renders", html.includes("2026-DR-1"));
  check("title renders", html.includes("Request for Admissions"));
  check("definitions + instructions sections render", html.includes("Definitions") && html.includes("Instructions"));
  check("certificate of service block renders", html.includes("Certificate of Service"));
  check("signature block renders", html.includes("Jane Doe"));
  const placeholder = buildInstrumentHtml({ captionText: null, title: "T", items: [] });
  check("missing caption renders a fill-by-hand placeholder", placeholder.includes("complete by hand"));
  const sub = buildInstrumentHtml({ captionText: null, title: "Subpoena", items: [{ ordinal: 1, text: "x" }], productionBlock: { date: "2026-08-01", place: "Clerk" }, custodianCertText: "CERT" });
  check("production + custodian blocks render for subpoenas", sub.includes("Place for Production") && sub.includes("Records Custodian Certification"));
}

console.log("\n[admission templates + independent numbering]");
{
  const t = ADMISSION_TEMPLATES.find((x) => x.id === "truth")!;
  check("truth-of-the-matter template wraps user text", t.apply("The plan was in effect").startsWith("Admit the truth of the following matter:"));
  const g = ADMISSION_TEMPLATES.find((x) => x.id === "genuineness")!;
  check("genuineness template wraps user text", /genuineness/.test(g.apply("Exhibit 2")));

  const rfa = generateDiscovery({ kind: "admissions", recipient: "R", topics: ["a", "b"], approvedFacts: [] });
  const rfp = generateDiscovery({ kind: "production", recipient: "R", topics: ["c"], approvedFacts: [] });
  check("each instrument numbers independently from 1", rfa.items[0].ordinal === 1 && rfp.items[0].ordinal === 1);
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
