// Minimum reference checklist (Task B). Pure, deterministic mapping from the
// existing ReferenceCategory taxonomy onto the eight categories a self-
// represented litigant is expected to have on file. Used by /references and
// /dashboard to show per-category done/missing status — never invents content,
// only reports what the user has assigned to the case.

import type { ReferenceCategory } from "@/lib/references/types";

export type ChecklistCategoryKey =
  | "statutes" | "family_law_rules" | "civil_procedure_rules" | "evidence_code"
  | "local_admin_orders" | "judge_procedures" | "clerk_efiling" | "official_forms";

export const CHECKLIST_CATEGORY_LABEL: Record<ChecklistCategoryKey, string> = {
  statutes: "Statutes",
  family_law_rules: "Family law procedural rules",
  civil_procedure_rules: "Rules of civil procedure",
  evidence_code: "Evidence code",
  local_admin_orders: "Local / administrative orders",
  judge_procedures: "Judge / division procedures",
  clerk_efiling: "Clerk filing / e-filing instructions",
  official_forms: "Official forms",
};

const CATEGORY_MAP: Record<ChecklistCategoryKey, ReferenceCategory[]> = {
  statutes: ["State Statute", "Family Law Statute"],
  family_law_rules: ["Family Law Procedural Rule"],
  civil_procedure_rules: ["Rules of Civil Procedure"],
  evidence_code: ["Evidence Rule"],
  local_admin_orders: ["Local Court Rule", "Administrative Order"],
  judge_procedures: ["Judicial Division Procedure", "Judge-Specific Procedure", "Magistrate Procedure", "Hearing Procedure"],
  clerk_efiling: ["Clerk Filing Instruction", "E-Filing Instruction"],
  official_forms: ["Public Form"],
};

export const CHECKLIST_CATEGORY_KEYS = Object.keys(CATEGORY_MAP) as ChecklistCategoryKey[];

export interface ChecklistStatus {
  key: ChecklistCategoryKey;
  label: string;
  done: boolean;
  count: number;
}

export function computeChecklistStatus(assignedCategories: ReferenceCategory[]): ChecklistStatus[] {
  const present = new Set(assignedCategories);
  return CHECKLIST_CATEGORY_KEYS.map((key) => {
    const categories = CATEGORY_MAP[key];
    const count = categories.filter((c) => present.has(c)).length;
    return { key, label: CHECKLIST_CATEGORY_LABEL[key], done: count > 0, count };
  });
}
