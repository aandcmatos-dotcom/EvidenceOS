"use client";

import { useState } from "react";
import { HelpCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuidedQuestion } from "@/lib/court-actions/types";

// Step 3: one topic at a time, skippable when not required, prefilled from case
// records where possible, with a persistent "Why are we asking this?" link.
export default function GuidedQuestionRunner({ questions, onChange }: {
  questions: GuidedQuestion[];
  onChange: (q: GuidedQuestion[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [showWhy, setShowWhy] = useState(false);
  const q = questions[index];
  const answered = questions.filter((x) => (x.answer ?? "").trim() !== "").length;

  const update = (answer: string) =>
    onChange(questions.map((x) => x.id === q.id ? { ...x, answer } : x));

  const canNext = !q.required || (q.answer ?? "").trim() !== "";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">Question {index + 1} of {questions.length} · {answered} answered</p>
        <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-5 mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-1">
          {q.prompt} {q.required ? <span className="text-red-400">*</span> : <span className="text-gray-400 font-normal text-xs">(optional — you can skip this)</span>}
        </label>

        <button onClick={() => setShowWhy(!showWhy)} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 mb-3">
          <HelpCircle size={12} /> Why are we asking this?
        </button>
        {showWhy && <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2 mb-3">{q.whyAsking}</p>}

        {q.prefilledFrom && !q.answer && (
          <p className="text-[11px] text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1.5 mb-3 inline-block">
            Prefilled from {q.prefilledFrom} — edit if it&apos;s not right.
          </p>
        )}

        {q.kind === "long_text" ? (
          <textarea rows={3} value={q.answer ?? ""} onChange={(e) => update(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
        ) : q.kind === "boolean" ? (
          <div className="flex gap-2">
            {["Yes", "No"].map((v) => (
              <button key={v} type="button" onClick={() => update(v)}
                className={cn("px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                  q.answer === v ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
                {v}
              </button>
            ))}
          </div>
        ) : q.kind === "choice" ? (
          <select value={q.answer ?? ""} onChange={(e) => update(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option value="">Select…</option>
            {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={q.kind === "date" ? "date" : "text"} value={q.answer ?? ""} onChange={(e) => update(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => { setIndex((i) => Math.max(0, i - 1)); setShowWhy(false); }} disabled={index === 0}
          className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
          <ChevronLeft size={15} /> Previous
        </button>
        <div className="flex items-center gap-1">
          {questions.map((x, i) => (
            <button key={x.id} onClick={() => { setIndex(i); setShowWhy(false); }}
              className={cn("w-2 h-2 rounded-full transition-colors",
                i === index ? "bg-purple-600" : (x.answer ?? "").trim() ? "bg-green-400" : "bg-gray-200")} />
          ))}
        </div>
        {index < questions.length - 1 ? (
          <button onClick={() => { setIndex((i) => Math.min(questions.length - 1, i + 1)); setShowWhy(false); }} disabled={!canNext}
            className="flex items-center gap-1 px-3 py-2 text-sm text-purple-600 font-medium hover:text-purple-700 disabled:opacity-30 transition-colors">
            {(q.answer ?? "").trim() === "" && !q.required ? "Skip" : "Next"} <ChevronRight size={15} />
          </button>
        ) : (
          <span className="flex items-center gap-1 px-3 py-2 text-sm text-green-600 font-medium"><Check size={15} /> Last question</span>
        )}
      </div>
    </div>
  );
}
