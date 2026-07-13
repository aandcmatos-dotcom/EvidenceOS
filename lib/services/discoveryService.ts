// Discovery request generation (spec §12). Deterministic: builds numbered
// requests from user-selected topics and approved facts. Never calculates a
// response deadline — deadline tracking is user-entered or rule-sourced only.

import type { FactCandidate } from "@/lib/court-actions/types";

export type DiscoveryKind = "production" | "interrogatories" | "admissions";

export const DISCOVERY_KIND_LABEL: Record<DiscoveryKind, string> = {
  production: "Request for Production",
  interrogatories: "Interrogatories",
  admissions: "Request for Admissions",
};

// Structural phrasing templates for admissions items. The user authors the
// substance; these provide the conventional opening only, and every generated
// item stays fully editable before save.
export const ADMISSION_TEMPLATES = [
  { id: "truth", label: "Admit the truth of the matter", apply: (s: string) => `Admit the truth of the following matter: ${s.replace(/\.$/, "")}.` },
  { id: "fact", label: "Admit that…", apply: (s: string) => `Admit that ${s.charAt(0).toLowerCase()}${s.slice(1).replace(/\.$/, "")}.` },
  { id: "genuineness", label: "Admit the genuineness of a document", apply: (s: string) => `Admit the genuineness of the following document: ${s.replace(/\.$/, "")}.` },
] as const;

export interface DiscoveryGenRequest {
  kind: DiscoveryKind;
  recipient: string;
  topics: string[];               // user-selected/typed topics
  approvedFacts: FactCandidate[]; // only approved/edited facts are used
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface DiscoveryItem {
  ordinal: number;
  text: string;
  sourceFactId: string | null;
}

export interface DiscoveryGenResult {
  title: string;
  definitions: string;
  instructions: string;
  items: DiscoveryItem[];
  warnings: string[];
}

export function generateDiscovery(req: DiscoveryGenRequest): DiscoveryGenResult {
  const usable = req.approvedFacts.filter((f) => f.decision === "approved" || f.decision === "edited");
  const range = req.dateRangeStart || req.dateRangeEnd
    ? ` for the period ${req.dateRangeStart ?? "the beginning of the case"} through ${req.dateRangeEnd ?? "the present"}`
    : "";

  const items: DiscoveryItem[] = [];
  let n = 0;

  for (const topic of req.topics.map((t) => t.trim()).filter(Boolean)) {
    n += 1;
    if (req.kind === "production") {
      items.push({ ordinal: n, text: `All documents and records relating to ${topic}${range}.`, sourceFactId: null });
    } else if (req.kind === "interrogatories") {
      items.push({ ordinal: n, text: `Describe in detail all facts known to you concerning ${topic}${range}, including relevant dates and the identity of any persons with knowledge.`, sourceFactId: null });
    } else {
      items.push({ ordinal: n, text: `Admit that ${topic}.`, sourceFactId: null });
    }
  }

  // Fact-derived items: admissions confirm approved facts; production asks for
  // records about them; interrogatories ask for the other party's account.
  for (const f of usable) {
    const factText = (f.editedText ?? f.text).replace(/\.$/, "");
    n += 1;
    if (req.kind === "admissions") {
      items.push({ ordinal: n, text: `Admit that ${lowerFirst(factText)}.`, sourceFactId: f.id });
    } else if (req.kind === "production") {
      items.push({ ordinal: n, text: `All documents and communications relating to the following: ${factText}${range}.`, sourceFactId: f.id });
    } else {
      items.push({ ordinal: n, text: `State all facts supporting or contradicting the following: ${factText}.`, sourceFactId: f.id });
    }
  }

  const warnings: string[] = [];
  if (items.length === 0) warnings.push("No topics or approved facts were provided — nothing to generate.");
  warnings.push("Response deadlines are not calculated automatically. Enter any deadline you have verified from an official rule or court order.");

  return {
    title: `${DISCOVERY_KIND_LABEL[req.kind]} to ${req.recipient || "Opposing Party"}`,
    definitions:
      '"Document" means any written, printed, electronic, or recorded material of any kind, including emails, text messages, photographs, and metadata. "You" and "your" refer to the responding party and anyone acting on their behalf.',
    instructions:
      "Respond to each numbered item separately. If any item is objected to, state the basis for the objection and respond to the remainder. If responsive materials are withheld, identify them and the reason.",
    items,
    warnings,
  };
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
