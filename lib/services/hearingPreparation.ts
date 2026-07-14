// Hearing-preparation service. Hearing-type-aware preparation that stays strictly
// neutral: it never hardcodes legal factors, elements, or standards. Preset
// worksheets are built ONLY from the user's assigned references — if no reference
// covers a preset, the worksheet says so and points the user back to the court.
//
// Language rule (enforced by checkProhibited + the neutral-language CI gate):
// generated copy describes "possible noncompliance" only — never a "violation",
// "willfulness", or a contempt finding, and never predicts an outcome.

import type { LegalReference } from "@/lib/references/types";
import type { ChecklistItem } from "@/lib/court-actions/types";
import { buildChecklist } from "@/lib/services/proceduralChecklistService";
import { checkProhibited } from "@/lib/ai/sourceGuard";
import { checkQuestionSafety } from "@/lib/ai/questionSafetyGuard";

// A worksheet gathers user-assigned reference material into rows the user fills in.
// "factor" worksheets collect the considerations a reference lists; "provision"
// worksheets collect the specific order/agreement provisions at issue. Neither
// ships with any pre-written legal content.
export type WorksheetKind = "factor" | "provision";

export interface HearingPreset {
  key: string;
  label: string;
  description: string;          // neutral, descriptive only
  worksheetKind: WorksheetKind;
  // Reference categories whose assigned material seeds the worksheet. Used only to
  // decide which of the user's OWN references to surface — never to supply content.
  referenceCategories: string[];
  contemptBank: boolean;        // offer the possible-noncompliance question bank
}

// Presets carry no legal factors/elements — only workflow metadata. They mirror
// the seed rows in migration 011 and are user-editable there.
export const HEARING_PRESETS: HearingPreset[] = [
  {
    key: "temporary_timesharing",
    label: "Temporary timesharing / parenting",
    description:
      "Organize your evidence and the considerations listed in your assigned references for a temporary timesharing or parenting matter.",
    worksheetKind: "factor",
    referenceCategories: ["Family Law Statute", "Family Law Procedural Rule", "State Statute"],
    contemptBank: false,
  },
  {
    key: "contempt_enforcement",
    label: "Contempt / enforcement",
    description:
      "Organize the specific order provisions at issue and the events describing possible noncompliance, using your assigned references.",
    worksheetKind: "provision",
    referenceCategories: ["Family Law Statute", "Family Law Procedural Rule", "State Statute", "Local Court Rule"],
    contemptBank: true,
  },
];

export function getPreset(key: string): HearingPreset | undefined {
  return HEARING_PRESETS.find((p) => p.key === key);
}

export interface WorksheetRow {
  id: string;
  prompt: string;             // what the user should address
  sourceLabel: string | null; // the assigned reference this row came from, if any
  userNote: string;           // filled in by the user
  needsCourtVerification: boolean;
}

// Build a worksheet from the user's assigned references only. Each reference
// SECTION becomes a row the user addresses; the reference is cited, not summarized
// into a legal conclusion. When nothing is assigned, we emit a single row telling
// the user to verify the applicable factors/provisions with the court — we never
// invent them.
export function buildWorksheet(preset: HearingPreset, references: LegalReference[]): WorksheetRow[] {
  const relevant = references.filter((r) => preset.referenceCategories.includes(r.category));
  let n = 0;
  const rid = () => `ws-${preset.key}-${++n}`;

  const noun = preset.worksheetKind === "factor" ? "considerations" : "order provisions";

  if (relevant.length === 0) {
    return [
      {
        id: rid(),
        prompt: `No reference on file for the applicable ${noun}. Verify the applicable ${noun} with the court and add the reference to your library.`,
        sourceLabel: null,
        userNote: "",
        needsCourtVerification: true,
      },
    ];
  }

  const rows: WorksheetRow[] = [];
  for (const ref of relevant) {
    const needsVerify = ref.verificationStatus !== "verified_official";
    const suffix = needsVerify ? " (needs verification)" : "";
    const sections = ref.sections.length > 0 ? ref.sections : [{ id: "", heading: "", text: "" }];
    for (const s of sections) {
      const label = `${ref.title}${s.heading ? `, ${s.heading}` : ""}${suffix}`;
      const prompt =
        preset.worksheetKind === "factor"
          ? `Address the consideration from ${s.heading || ref.title} with your own facts and evidence.`
          : `Identify the specific provision from ${s.heading || ref.title} and the events describing possible noncompliance.`;
      rows.push({ id: rid(), prompt, sourceLabel: label, userNote: "", needsCourtVerification: needsVerify });
    }
  }
  return rows;
}

// Per-hearing procedural checklist. Reuses the shared checklist engine (assigned
// references drive it) and prepends a hearing-specific item that cites the assigned
// judge/division procedure — or tells the user to verify with the court when none
// is on file. Never fabricates a procedure.
export function buildHearingChecklist(references: LegalReference[]): ChecklistItem[] {
  const items = buildChecklist(references);
  const judgeRef = references.find(
    (r) => r.category === "Judge-Specific Procedure" || r.category === "Judicial Division Procedure" || r.category === "Hearing Procedure",
  );
  const lead: ChecklistItem = judgeRef
    ? {
        id: "hp-lead",
        phase: "before_drafting",
        text: `Follow the hearing procedure in ${judgeRef.title}${judgeRef.verificationStatus === "verified_official" ? "" : " (needs verification)"}.`,
        origin: judgeRef.verificationStatus === "verified_official" ? "judge_procedure" : "unverified",
        sourceLabel: judgeRef.title,
        done: false,
      }
    : {
        id: "hp-lead",
        phase: "before_drafting",
        text: "Verify the hearing procedure with the court — no judge or division reference on file.",
        origin: "general_practice",
        sourceLabel: null,
        done: false,
      };
  return [lead, ...items];
}

export interface NoncomplianceQuestion {
  text: string;
  sourceLabel: string | null;
}

// Possible-noncompliance question bank for contempt/enforcement hearings. Built
// from user-approved facts about an existing order. Every question is neutral and
// double-screened (question-safety + prohibited-phrase), so nothing asserts a
// violation, willfulness, or a finding.
export function buildNoncomplianceQuestions(
  provisions: { text: string; sourceLabel?: string | null }[],
): { questions: NoncomplianceQuestion[]; removed: number } {
  const drafts: NoncomplianceQuestion[] = [];
  for (const p of provisions) {
    const prov = p.text.length > 110 ? p.text.slice(0, 107) + "…" : p.text;
    const src = p.sourceLabel ?? null;
    drafts.push({ text: `What does the existing order require regarding: ${prov}?`, sourceLabel: src });
    drafts.push({ text: `What records describe possible noncompliance with that requirement?`, sourceLabel: src });
    drafts.push({ text: `On what dates did the events describing possible noncompliance occur?`, sourceLabel: src });
  }
  const safe = drafts.filter((d) => checkQuestionSafety(d.text).ok && checkProhibited(d.text).clean);
  return { questions: safe, removed: drafts.length - safe.length };
}
