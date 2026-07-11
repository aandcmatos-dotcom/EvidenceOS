import type { SourceType } from "@/lib/documents/types";

export interface SelectableSource {
  id: string;
  sourceType: SourceType;
  label: string;
  sublabel: string;
  date: string | null;
  category: string;
  verified: boolean;
}

// Records a user can pull into a draft (Step 2). Mirrors real case tables for Phase 1.
export const MOCK_SOURCES: SelectableSource[] = [
  { id: "evt-5", sourceType: "event", label: "Missed custody exchange", sublabel: "Timeline event", date: "2026-04-15", category: "Exchange", verified: true },
  { id: "evt-8", sourceType: "event", label: "School pickup dispute", sublabel: "Timeline event", date: "2026-04-24", category: "School", verified: true },
  { id: "ev-1", sourceType: "evidence", label: "Exhibit 1 — Police Report (Apr 15)", sublabel: "Evidence · PDF", date: "2026-04-15", category: "Police", verified: true },
  { id: "ev-2", sourceType: "evidence", label: "Exhibit 2 — Text Messages (April)", sublabel: "Evidence · PDF", date: "2026-04-30", category: "Messages", verified: true },
  { id: "comm-3", sourceType: "communication", label: "Text thread — no reply", sublabel: "Communication · 47 messages", date: "2026-04-18", category: "Communications", verified: true },
  { id: "ord-1", sourceType: "order", label: "Temporary Custody Order", sublabel: "Court order", date: "2026-01-15", category: "Court Orders", verified: true },
  { id: "ppl-4", sourceType: "person", label: "Robert Smith", sublabel: "Person · Respondent", date: null, category: "People", verified: true },
  { id: "ref-1", sourceType: "reference", label: "Fla. R. Civ. P. 1.080 — Service", sublabel: "Reference · verified official", date: "2025-01-01", category: "References", verified: true },
  { id: "ref-4", sourceType: "reference", label: "Judge Williams — Standing Procedures", sublabel: "Reference · needs verification", date: "2025-09-01", category: "References", verified: false },
];
