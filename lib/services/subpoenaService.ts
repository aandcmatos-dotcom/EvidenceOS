// Subpoena duces tecum builder logic (spec §12). Procedural requirements are
// resolved from the case's assigned legal_references AT RUNTIME — no rule numbers,
// deadlines, or day counts are hardcoded here. If no assigned reference covers
// subpoenas, generation is blocked and the UI says so.

import type { LegalReference } from "@/lib/references/types";

export interface SubpoenaItemDraft {
  ordinal: number;
  text: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

export interface ProceduralRequirement {
  topic: string;               // Issuance | Notice to other party | Objection window | Witness fees | Service method
  excerpt: string;
  sourceTitle: string;
  citation: string | null;
  effectiveDate: string | null;
  verificationStatus: string;
}

export interface SubpoenaProcedureResult {
  covered: boolean;            // false → generation must be blocked
  requirements: ProceduralRequirement[];
  coveringReferences: LegalReference[];
}

const TOPIC_PATTERNS: { topic: string; re: RegExp }[] = [
  { topic: "Issuance procedure", re: /\b(issu(e|ed|ance)|who may (issue|sign)|clerk.{0,30}issue)\b/i },
  { topic: "Notice to other party", re: /\bnotice\b.{0,60}\b(part(y|ies)|before service|non-?party)\b/i },
  { topic: "Objection window", re: /\bobject(ion|ions)?\b/i },
  { topic: "Witness fees and mileage", re: /\b(witness fee|mileage|fee.{0,20}tender)\b/i },
  { topic: "Service method", re: /\bserv(e|ice|ed)\b/i },
];

// A reference "covers" subpoenas when the word appears in its title, keywords,
// summary, or any section text.
export function findSubpoenaReferences(assigned: LegalReference[]): LegalReference[] {
  const re = /subpoena/i;
  return assigned.filter((r) =>
    re.test(r.title) || re.test(r.summary) ||
    r.keywords.some((k) => re.test(k)) ||
    r.sections.some((s) => re.test(s.text) || re.test(s.heading))
  );
}

export function resolveSubpoenaProcedure(assigned: LegalReference[]): SubpoenaProcedureResult {
  const covering = findSubpoenaReferences(assigned);
  if (covering.length === 0) return { covered: false, requirements: [], coveringReferences: [] };

  const requirements: ProceduralRequirement[] = [];
  for (const ref of covering) {
    const sections = ref.sections.length > 0
      ? ref.sections
      : [{ id: ref.id, heading: "", text: ref.summary }];
    for (const section of sections) {
      for (const { topic, re } of TOPIC_PATTERNS) {
        if (re.test(section.text) && !requirements.some((q) => q.topic === topic && q.sourceTitle === ref.title)) {
          requirements.push({
            topic,
            excerpt: section.text,
            sourceTitle: `${ref.title}${section.heading ? `, ${section.heading}` : ""}`,
            citation: ref.citation,
            effectiveDate: ref.effectiveDate,
            verificationStatus: ref.verificationStatus,
          });
        }
      }
    }
  }
  return { covered: true, requirements, coveringReferences: covering };
}

// Candidate document requests derived from record gaps: categories where timeline
// events exist but no evidence record shares the category. Returned UNSELECTED —
// the user must affirmatively add each one.
export function suggestSubpoenaItems(
  events: { category: string }[],
  evidence: { category: string }[],
): string[] {
  const evidenceCats = new Set(evidence.map((e) => e.category.toLowerCase()));
  const gapCats = Array.from(new Set(events.map((e) => e.category)))
    .filter((c) => !evidenceCats.has(c.toLowerCase()));
  return gapCats.map((c) =>
    `All records relating to the ${c.toLowerCase()} events documented in this case (your timeline records ${c.toLowerCase()} events but no ${c.toLowerCase()} documents are in your evidence).`
  );
}

export function numberItems(items: { text: string; dateRangeStart?: string | null; dateRangeEnd?: string | null }[]): SubpoenaItemDraft[] {
  return items
    .filter((i) => i.text.trim())
    .map((i, idx) => ({
      ordinal: idx + 1,
      text: i.text.trim(),
      dateRangeStart: i.dateRangeStart ?? null,
      dateRangeEnd: i.dateRangeEnd ?? null,
    }));
}

export const DEFAULT_CUSTODIAN_CERT =
  "CERTIFICATION OF RECORDS CUSTODIAN\n\nI certify that I am the duly authorized custodian of the records produced " +
  "in response to this subpoena, that the copies produced are true and complete copies of the originals, and that the " +
  "records were made at or near the time of the acts or events they describe, by or from information transmitted by a " +
  "person with knowledge, and were kept in the course of regularly conducted activity.\n\n" +
  "Signature: _______________________  Date: _____________";
