// Situation intake: maps a free-text description or picked situation to candidate
// document definitions. Deterministic keyword matching in Phase 1; a future phase may
// add semantic matching behind this same interface. Results are NEVER ranked as
// "recommended" or "best" — order is match-count only, and the UI labels them as
// possible categories requiring the user's review.

import { DOCUMENT_DEFINITIONS } from "@/lib/mock/document-definitions";
import type { DocumentDefinition } from "@/lib/court-actions/types";

export interface IntakeResult {
  matches: { definition: DocumentDefinition; matchedKeywords: string[] }[];
  extractedIssue: string;
  missingInformation: string[];
}

const STOPWORDS = new Set(["the", "a", "an", "is", "are", "to", "i", "my", "need", "for", "of", "and", "or", "not", "has", "have", "been", "was", "did"]);

export function intakeSituation(description: string): IntakeResult {
  const words = description.toLowerCase().split(/[^a-z-]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const matches = DOCUMENT_DEFINITIONS
    .map((definition) => {
      const matchedKeywords = definition.keywords.filter((k) =>
        words.some((w) => k.includes(w) || w.includes(k))
      );
      return { definition, matchedKeywords };
    })
    .filter((m) => m.matchedKeywords.length > 0)
    .sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);

  const missingInformation: string[] = [];
  if (!/\d{4}|\bjanuary|february|march|april|may|june|july|august|september|october|november|december\b/i.test(description)) {
    missingInformation.push("No dates were mentioned — documents usually need specific dates.");
  }
  if (!/order|plan|judgment|agreement/i.test(description)) {
    missingInformation.push("No existing order or plan was mentioned — is there one that addresses this issue?");
  }

  return {
    matches,
    extractedIssue: description.trim(),
    missingInformation,
  };
}
