"use client";

import { useState } from "react";
import type { AIAnalysisResult } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import {
  Sparkles, AlertTriangle, CheckCircle, Edit2, Check, X,
  Calendar, Users, Tag, FileText, Info, ChevronDown, ChevronUp,
} from "lucide-react";

interface AIReviewScreenProps {
  fileName: string;
  analysis: AIAnalysisResult;
  onApprove: (approved: AIAnalysisResult) => void;
  onCancel: () => void;
}

const LEGAL_NOTICE =
  "AI suggestions are for organizational purposes only. They do not constitute legal advice. " +
  "Review all suggestions for accuracy before saving. You may edit any field below.";

export default function AIReviewScreen({
  fileName, analysis, onApprove, onCancel,
}: AIReviewScreenProps) {
  const [summary, setSummary] = useState(analysis.summary);
  const [category, setCategory] = useState(analysis.categorysuggestion);
  const [title, setTitle] = useState(analysis.titleSuggestion);
  const [tags, setTags] = useState(analysis.tagSuggestions.join(", "));
  const [acceptedEvents, setAcceptedEvents] = useState<boolean[]>(
    analysis.timelineEventSuggestions.map(() => false)
  );
  const [showDisclaimers, setShowDisclaimers] = useState(false);

  const handleApprove = () => {
    const approved: AIAnalysisResult = {
      ...analysis,
      summary,
      categorysuggestion: category,
      titleSuggestion: title,
      tagSuggestions: tags.split(",").map((t) => t.trim()).filter(Boolean),
      timelineEventSuggestions: analysis.timelineEventSuggestions.filter((_, i) => acceptedEvents[i]),
      requiresReview: true,
    };
    onApprove(approved);
  };

  const confidenceColor = {
    high: "text-green-600 bg-green-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-red-600 bg-red-50",
  }[analysis.confidence];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">AI Document Analysis</p>
                <p className="text-xs text-gray-400 truncate max-w-xs">{fileName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold capitalize", confidenceColor)}>
                {analysis.confidence} confidence
              </span>
              <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Legal notice */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800 mb-0.5">Review Required Before Saving</p>
              <p className="text-xs text-amber-700 leading-relaxed">{LEGAL_NOTICE}</p>
            </div>
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-bold text-gray-700">AI Summary</label>
              <Edit2 size={12} className="text-gray-400" />
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none leading-relaxed"
            />
          </div>

          {/* Suggested title + category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <FileText size={13} /> Suggested Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <Tag size={13} /> Suggested Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              >
                {["Messages", "School", "Medical", "Police", "Court Orders", "Photos", "Videos", "Other"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Detected data */}
          <div className="grid grid-cols-2 gap-4">
            {analysis.datesDetected.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Calendar size={11} /> Dates Detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.datesDetected.map((d) => (
                    <span key={d} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {analysis.peopleDetected.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Users size={11} /> People Detected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.peopleDetected.map((p) => (
                    <span key={p} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <Tag size={13} /> Tags (comma-separated)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Timeline event suggestions */}
          {analysis.timelineEventSuggestions.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Suggested Timeline Events</p>
              <p className="text-xs text-gray-400 mb-3">Check the events you want to create. Uncheck to skip.</p>
              <div className="space-y-2">
                {analysis.timelineEventSuggestions.map((event, i) => (
                  <label key={i} className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    acceptedEvents[i] ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-200"
                  )}>
                    <input
                      type="checkbox"
                      checked={acceptedEvents[i]}
                      onChange={(e) => {
                        const next = [...acceptedEvents];
                        next[i] = e.target.checked;
                        setAcceptedEvents(next);
                      }}
                      className="mt-0.5 w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.category} · {event.date}</p>
                      <p className="text-xs text-gray-400 mt-0.5 italic">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimers expandable */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDisclaimers(!showDisclaimers)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-1.5"><Info size={13} /> AI Disclaimers ({analysis.disclaimers.length})</span>
              {showDisclaimers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showDisclaimers && (
              <div className="px-4 pb-3 space-y-1">
                {analysis.disclaimers.map((d, i) => (
                  <p key={i} className="text-xs text-gray-500 leading-relaxed">· {d}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">AI output requires your review</p>
            <button
              onClick={handleApprove}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
            >
              <CheckCircle size={15} /> Approve & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
