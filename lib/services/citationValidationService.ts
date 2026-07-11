// Citation validation. Checks citations in a document against the reference library.
// NEVER fabricates a corrected citation. When nothing verified is found, says so.

import type { LegalReference } from "@/lib/references/types";
import type { CitationFinding } from "@/lib/ai/schema";

// Rough citation matcher: statute/rule patterns (e.g. "Fla. R. Civ. P. 1.080", "§ 90.901").
const CITATION_RE = /(§\s?\d+[\d.]*(?:,\s?[A-Za-z. ]+Stat\.?)?|[A-Z][A-Za-z.]*\.?\s?R\.?\s?[A-Za-z.]*\.?\s?P\.?\s?\d+[\d.]*|Admin\.?\s?Order\s?[\d-]+)/g;

export function extractCitations(text: string): string[] {
  const found = text.match(CITATION_RE) ?? [];
  return Array.from(new Set(found.map((c) => c.trim())));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/[.,]/g, "").trim();
}

export function validateCitations(text: string, references: LegalReference[]): CitationFinding[] {
  const citations = extractCitations(text);
  return citations.map((citationText) => {
    const target = normalize(citationText);
    const match = references.find((r) => r.citation && normalize(r.citation) === target);
    const loose = references.find((r) => r.citation && normalize(r.citation).includes(target.split(" ").slice(-1)[0]));

    if (!match && !loose) {
      return {
        citationText, found: false, matchedReferenceId: null, issue: "not_found",
        effectiveDate: null,
        message: "No verified source located in the current reference library. Verify the citation and text before relying on it.",
      };
    }
    const ref = (match ?? loose)!;
    if (ref.verificationStatus === "superseded") {
      return {
        citationText, found: true, matchedReferenceId: ref.id, issue: "superseded",
        effectiveDate: ref.effectiveDate,
        message: `This citation matches a reference marked superseded${ref.supersededDate ? ` on ${ref.supersededDate}` : ""}. Confirm the current version.`,
      };
    }
    if (ref.verificationStatus === "needs_verification" || ref.verificationStatus === "possibly_outdated") {
      return {
        citationText, found: true, matchedReferenceId: ref.id, issue: "unverified",
        effectiveDate: ref.effectiveDate,
        message: "This citation matches a stored reference that is not yet verified. Confirm it against the official source.",
      };
    }
    if (!match && loose) {
      return {
        citationText, found: true, matchedReferenceId: ref.id, issue: "possible_miscitation",
        effectiveDate: ref.effectiveDate,
        message: "A similar citation was found but the exact rule number did not match. Review for a possible miscitation.",
      };
    }
    return {
      citationText, found: true, matchedReferenceId: ref.id, issue: null,
      effectiveDate: ref.effectiveDate,
      message: `Matches ${ref.title}${ref.effectiveDate ? ` (effective ${ref.effectiveDate})` : ""}.`,
    };
  });
}
