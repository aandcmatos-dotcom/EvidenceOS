// Question-generation safety layer (spec §11). Sibling to sourceGuard, but for
// witness/deposition/examination questions:
//  (a) blocks harassing/intimidating/abusive phrasing,
//  (b) blocks questions that assume disputed facts are true,
//  (c) flags questions referencing a specific exhibit without a preceding
//      authentication question in the same group ("requires foundation").

export interface QuestionCheck {
  ok: boolean;
  violations: string[];
}

const HARASSMENT_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b(isn'?t it true (that )?you'?re a|you'?re (a )?(liar|unfit|crazy|worthless|pathetic))\b/i, label: "character attack" },
  { re: /\b(admit (that )?you (always|never))\b/i, label: "absolute-accusation phrasing" },
  { re: /\bhow (dare|could) you\b/i, label: "shaming phrasing" },
  { re: /\b(shut up|stupid|idiot|disgusting|ashamed of yourself)\b/i, label: "abusive language" },
  { re: /\byou (beat|abuse[ds]?|neglect(ed)?) (them|the child(ren)?)\b/i, label: "assumes a disputed accusation as fact" },
  { re: /\bwhen did you stop\b/i, label: "loaded question (presupposes misconduct)" },
];

export function checkQuestionSafety(text: string): QuestionCheck {
  const violations = HARASSMENT_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  return { ok: violations.length === 0, violations };
}

// A question "requires foundation" when it references a specific exhibit/document
// and no earlier question in its group authenticates it.
const EXHIBIT_REF = /\b(exhibit\s+\d+|this (document|email|text message|photo|recording))\b/i;
const AUTH_LANGUAGE = /\b(do you recognize|can you identify|who (created|wrote|sent|took)|is this a (true|accurate) (copy|record))\b/i;

export function markFoundationNeeds<T extends { text: string; groupLabel: string }>(
  questions: T[],
): (T & { requiresFoundation: boolean })[] {
  const authenticatedGroups = new Set<string>();
  return questions.map((q) => {
    if (AUTH_LANGUAGE.test(q.text)) {
      authenticatedGroups.add(q.groupLabel);
      return { ...q, requiresFoundation: false };
    }
    const referencesExhibit = EXHIBIT_REF.test(q.text);
    const requiresFoundation = referencesExhibit && !authenticatedGroups.has(q.groupLabel);
    return { ...q, requiresFoundation };
  });
}
