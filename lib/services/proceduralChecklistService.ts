// Procedural checklist engine (spec §14). Derives checklist items from the case's
// assigned references (each item labeled with its origin + source) and appends
// clearly-labeled general-practice items. Never calculates legal deadlines.

import type { ChecklistItem } from "@/lib/court-actions/types";
import type { LegalReference } from "@/lib/references/types";

let counter = 0;
const cid = () => `cli-${++counter}`;

const RULE_TRIGGERS: { pattern: RegExp; phase: ChecklistItem["phase"]; text: string }[] = [
  { pattern: /confer/i, phase: "before_drafting", text: "Certify a good-faith attempt to confer before hearing." },
  { pattern: /proposed order/i, phase: "before_filing", text: "Prepare and submit a proposed order with the filing." },
  { pattern: /certificate of service|manner and date of service/i, phase: "service", text: "Include a certificate of service stating the manner and date of service." },
  { pattern: /exhibit/i, phase: "evidence", text: "Follow the stored exhibit submission procedure (pre-marking / delivery)." },
  { pattern: /email/i, phase: "before_filing", text: "Follow the stored email-submission instructions for this division." },
  { pattern: /authentication|what its proponent claims/i, phase: "evidence", text: "Review authentication information for each exhibit." },
];

const GENERAL_PRACTICE: { phase: ChecklistItem["phase"]; text: string }[] = [
  { phase: "before_drafting", text: "Review existing orders that address this issue." },
  { phase: "before_drafting", text: "Confirm the case caption matches the most recent filed document." },
  { phase: "before_filing", text: "Review names, dates, and quotations against your records." },
  { phase: "before_filing", text: "Review redactions for minors' identifying information and other sensitive data." },
  { phase: "service", text: "Identify all recipients and save proof of service." },
  { phase: "evidence", text: "Number exhibits, confirm page readability, and remove duplicates." },
  { phase: "hearing", text: "Confirm hearing date, time, format, and time allowed." },
  { phase: "hearing", text: "Prepare a testimony outline and requested-relief summary." },
  { phase: "after_hearing", text: "Record rulings, save hearing notes, and update the court-order tracker." },
];

export function buildChecklist(references: LegalReference[]): ChecklistItem[] {
  counter = 0;
  const items: ChecklistItem[] = [];
  const seen = new Set<string>();

  for (const ref of references) {
    const origin: ChecklistItem["origin"] =
      ref.category === "Judge-Specific Procedure" || ref.category === "Judicial Division Procedure" ? "judge_procedure" :
      ref.category === "Clerk Filing Instruction" || ref.category === "E-Filing Instruction" ? "clerk_instruction" :
      "official_rule";
    const verifiedSuffix = ref.verificationStatus === "verified_official" ? "" : " (needs verification)";

    for (const section of ref.sections) {
      for (const trigger of RULE_TRIGGERS) {
        if (trigger.pattern.test(section.text) && !seen.has(trigger.text)) {
          seen.add(trigger.text);
          items.push({
            id: cid(), phase: trigger.phase, text: trigger.text,
            origin: ref.verificationStatus === "verified_official" ? origin : "unverified",
            sourceLabel: `${ref.title}${section.heading ? `, ${section.heading}` : ""}${verifiedSuffix}`,
            done: false,
          });
        }
      }
    }
  }

  for (const g of GENERAL_PRACTICE) {
    items.push({ id: cid(), phase: g.phase, text: g.text, origin: "general_practice", sourceLabel: null, done: false });
  }

  const phaseOrder = ["before_drafting", "before_filing", "service", "evidence", "hearing", "after_hearing"];
  return items.sort((a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase));
}
