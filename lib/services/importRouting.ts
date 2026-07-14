// Lazy-verification routing. Given a classification, decide where a file goes.
// Pure + tested. Three kinds ALWAYS require individual confirmation before they
// take effect anywhere (court orders, dates, case-number conflicts).

import type { ClassificationResult } from "@/lib/ai/schema";

export type Routing = "auto_accepted" | "review_queue" | "mandatory";

// The specific mandatory reasons, so the review UI can group them.
export type MandatoryReason = "court_order" | "date_candidate" | "case_conflict";

export interface RoutingDecision {
  routing: Routing;
  mandatoryReasons: MandatoryReason[];
}

export function routeClassification(c: ClassificationResult): RoutingDecision {
  const mandatoryReasons: MandatoryReason[] = [];

  // (a) court_order → never creates a court_orders row without confirmation.
  if (c.primaryType === "court_order") mandatoryReasons.push("court_order");
  // (b) a detected hearing/deadline date is a candidate, never auto-calendared.
  const hearingLike = c.primaryType === "hearing_material" || c.subtype === "notice_of_hearing";
  if (hearingLike && c.documentDate) mandatoryReasons.push("date_candidate");
  // (c) case-identity conflict is quarantined.
  if (c.flags.includes("wrong_case_number")) mandatoryReasons.push("case_conflict");

  if (mandatoryReasons.length > 0) return { routing: "mandatory", mandatoryReasons };

  // HIGH confidence + no flags → auto-accept (still unverified, browsable).
  if (c.confidence === "high" && c.flags.length === 0) return { routing: "auto_accepted", mandatoryReasons: [] };

  // Everything else → review queue (still promoted + browsable, just flagged).
  return { routing: "review_queue", mandatoryReasons: [] };
}

// Communication types promote to communications; everything else to evidence.
export function targetTable(c: ClassificationResult): "evidence" | "communications" {
  return c.primaryType === "communication" ? "communications" : "evidence";
}
