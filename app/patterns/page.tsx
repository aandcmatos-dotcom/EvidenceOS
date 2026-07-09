"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { mockPatternInsights, mockEvidence, LEGAL_DISCLAIMER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Users, FileText, ExternalLink, Info, ShieldAlert, Eye,
} from "lucide-react";

const riskColors = {
  High:   { bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    bar: "bg-red-500" },
  Medium: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
  Low:    { bg: "bg-blue-50",   border: "border-blue-100",   badge: "bg-blue-100 text-blue-700",  bar: "bg-blue-400" },
} as const;

type RiskLevel = keyof typeof riskColors;

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const months = ["Jan", "Feb", "Mar", "Apr"];
  return (
    <div className="flex items-end gap-1.5 h-12">
      {data.map((val, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${(val / max) * 36}px`, backgroundColor: color, opacity: 0.85 }}
          />
          <span className="text-[9px] text-gray-400">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp size={14} className="text-red-500" />;
  if (trend === "down") return <TrendingDown size={14} className="text-green-500" />;
  return <Minus size={14} className="text-gray-400" />;
}

function PatternCard({ insight }: { insight: typeof mockPatternInsights[0] }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const risk = riskColors[insight.riskLevel as RiskLevel] ?? riskColors.Low;
  const relatedEvidence = mockEvidence.filter((e) =>
    insight.relatedPeople.some((name) =>
      e.aiSummary.toLowerCase().includes(name.toLowerCase().split(" ")[1] ?? "")
    )
  ).slice(0, 3);

  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all", risk.border)}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", risk.bg)}>
              <ShieldAlert size={18} className={insight.riskLevel === "High" ? "text-red-600" : insight.riskLevel === "Medium" ? "text-orange-600" : "text-blue-600"} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{insight.label}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{insight.dateRange}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-3xl font-black text-gray-900">{insight.count}</span>
            <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", risk.badge)}>
              {insight.riskLevel} Risk
            </span>
          </div>
        </div>

        {/* Trend + chart */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <MiniBarChart data={insight.monthlyData} color={insight.chartColor} />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-xs font-medium text-gray-600">
              <TrendIcon trend={insight.trend} />
              <span className={
                (insight.trend as string) === "up" ? "text-red-600" :
                (insight.trend as string) === "down" ? "text-green-600" : "text-gray-500"
              }>
                {(insight.trend as string) === "up" ? "Increasing" : (insight.trend as string) === "down" ? "Decreasing" : "Stable"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{insight.evidenceCount} supporting files</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={cn("h-full rounded-full", risk.bar)}
            style={{ width: `${Math.min((insight.count / 35) * 100, 100)}%` }}
          />
        </div>

        {/* Description */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
          <div className="flex items-start gap-2">
            <Info size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">{insight.description}</p>
          </div>
        </div>

        {/* Related people */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
            <Users size={10} /> People:
          </span>
          {insight.relatedPeople.map((person) => (
            <span key={person} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {person}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3 bg-gray-50/40 rounded-b-2xl">
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <Eye size={13} /> {showEvidence ? "Hide" : "View"} Supporting Evidence
        </button>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ExternalLink size={13} /> View in Timeline
        </button>
      </div>

      {/* Supporting evidence panel */}
      {showEvidence && (
        <div className="border-t border-purple-100 p-4 bg-purple-50/30">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Supporting Documents</p>
          {relatedEvidence.length === 0 ? (
            <p className="text-xs text-gray-400">No linked evidence found.</p>
          ) : (
            <div className="space-y-2">
              {relatedEvidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2">
                  <FileText size={13} className="text-purple-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{ev.title}</p>
                    <p className="text-[10px] text-gray-400">{ev.date} · {ev.fileType}</p>
                  </div>
                  {ev.exhibitNumber && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      {ev.exhibitNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatternsPage() {
  const highCount = mockPatternInsights.filter((p) => p.riskLevel === "High").length;

  return (
    <AppLayout title="AI Pattern Insights">
      {/* Disclaimer */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-amber-800 text-sm font-semibold mb-0.5">Review for accuracy before use</p>
          <p className="text-amber-700 text-xs leading-relaxed">{LEGAL_DISCLAIMER}</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{mockPatternInsights.length}</p>
            <p className="text-xs text-gray-400">Possible patterns detected</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <ShieldAlert size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{highCount}</p>
            <p className="text-xs text-gray-400">High risk patterns</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">
              {mockPatternInsights.reduce((s, p) => s + p.evidenceCount, 0)}
            </p>
            <p className="text-xs text-gray-400">Supporting evidence files</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Sparkles size={16} className="text-purple-600" />
        <p className="text-sm text-gray-600">
          AI analyzed <strong>357 timeline events</strong> and <strong>1,243 evidence items</strong> to detect the following possible patterns.
          All findings require user review. This is not legal advice.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {mockPatternInsights.map((insight) => (
          <PatternCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500">
          AI detects <em>possible patterns</em> based on user-provided data. It does not predict outcomes or provide legal strategy.
          Always review findings for accuracy and consult a licensed attorney.
        </p>
      </div>
    </AppLayout>
  );
}
