"use client";

import { cn } from "@/lib/utils";
import { CHECKLIST_ORIGIN_LABEL, type ChecklistItem, type ChecklistItemOrigin } from "@/lib/court-actions/types";

const PHASE_LABEL: Record<ChecklistItem["phase"], string> = {
  before_drafting: "Before drafting",
  before_filing: "Before filing",
  service: "Service",
  evidence: "Evidence",
  hearing: "Hearing",
  after_hearing: "After hearing",
};

const originStyles: Record<ChecklistItemOrigin, string> = {
  official_rule: "bg-green-100 text-green-700",
  judge_procedure: "bg-purple-100 text-purple-700",
  clerk_instruction: "bg-blue-100 text-blue-700",
  user_entered: "bg-indigo-100 text-indigo-700",
  general_practice: "bg-gray-100 text-gray-600",
  unverified: "bg-orange-100 text-orange-700",
};

// Section 14: every item shows where it came from (rule, judge, clerk, user, practice).
export default function ChecklistView({ items, onChange }: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const toggle = (id: string) => onChange(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const phases = Array.from(new Set(items.map((i) => i.phase)));

  return (
    <div className="space-y-5">
      {phases.map((phase) => (
        <div key={phase}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{PHASE_LABEL[phase]}</p>
          <div className="space-y-1.5">
            {items.filter((i) => i.phase === phase).map((item) => (
              <label key={item.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-3 cursor-pointer hover:bg-gray-50/50 transition-colors">
                <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm text-gray-800", item.done && "line-through text-gray-400")}>{item.text}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", originStyles[item.origin])}>
                      {CHECKLIST_ORIGIN_LABEL[item.origin]}
                    </span>
                    {item.sourceLabel && <span className="text-[10px] text-gray-400">{item.sourceLabel}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
