"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL_DISCLAIMER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  FileText, ExternalLink, Info, ShieldAlert, Flag, Clock,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  title: string;
  event_date: string;
  category: string;
  severity: string;
  flagged: boolean;
}

interface EvidenceItem { id: string; title: string; category: string; }

interface Pattern {
  category: string;
  count: number;
  flaggedCount: number;
  highCount: number;
  monthlyData: number[];
  monthLabels: string[];
  trend: "up" | "down" | "stable";
  riskLevel: "High" | "Medium" | "Low";
  dateRange: string;
  evidenceCount: number;
}

const riskColors = {
  High:   { bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    bar: "bg-red-500",    icon: "text-red-600",    chart: "#ef4444" },
  Medium: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", bar: "bg-orange-500", icon: "text-orange-600", chart: "#f97316" },
  Low:    { bg: "bg-blue-50",   border: "border-blue-100",   badge: "bg-blue-100 text-blue-700",  bar: "bg-blue-400",   icon: "text-blue-600",   chart: "#60a5fa" },
} as const;

function buildPatterns(events: TimelineEvent[], evidence: EvidenceItem[]): Pattern[] {
  const byCategory = new Map<string, TimelineEvent[]>();
  events.forEach((e) => {
    const list = byCategory.get(e.category) ?? [];
    list.push(e);
    byCategory.set(e.category, list);
  });

  // Last 4 calendar months (oldest first)
  const now = new Date();
  const months: { y: number; m: number; label: string }[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleDateString("en-US", { month: "short" }) });
  }

  const patterns: Pattern[] = [];
  byCategory.forEach((evts, category) => {
    if (evts.length < 2) return; // a single event is not a pattern

    const monthlyData = months.map(({ y, m }) =>
      evts.filter((e) => {
        const d = new Date(e.event_date + "T00:00:00");
        return d.getFullYear() === y && d.getMonth() === m;
      }).length
    );

    const recent = monthlyData[2] + monthlyData[3];
    const earlier = monthlyData[0] + monthlyData[1];
    const trend: Pattern["trend"] = recent > earlier ? "up" : recent < earlier ? "down" : "stable";

    const flaggedCount = evts.filter((e) => e.flagged).length;
    const highCount = evts.filter((e) => e.severity === "high").length;
    const riskLevel: Pattern["riskLevel"] =
      highCount >= 2 || flaggedCount >= 3 ? "High" :
      highCount >= 1 || flaggedCount >= 1 || (trend === "up" && evts.length >= 4) ? "Medium" : "Low";

    const dates = evts.map((e) => e.event_date).sort();
    const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dateRange = `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;

    const evidenceCount = evidence.filter((ev) => ev.category === category).length;

    patterns.push({ category, count: evts.length, flaggedCount, highCount, monthlyData, monthLabels: months.map((m) => m.label), trend, riskLevel, dateRange, evidenceCount });
  });

  const riskOrder = { High: 0, Medium: 1, Low: 2 };
  return patterns.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel] || b.count - a.count);
}

function MiniBarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-12">
      {data.map((val, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full rounded-sm transition-all"
            style={{ height: `${Math.max((val / max) * 36, val > 0 ? 4 : 1)}px`, backgroundColor: color, opacity: 0.85 }} />
          <span className="text-[9px] text-gray-400">{labels[i]}</span>
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

function PatternCard({ pattern }: { pattern: Pattern }) {
  const risk = riskColors[pattern.riskLevel];
  const maxCount = 20;

  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all", risk.border)}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", risk.bg)}>
              <ShieldAlert size={18} className={risk.icon} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Repeated {pattern.category} events</h3>
              <p className="text-xs text-gray-400 mt-0.5">{pattern.dateRange}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-3xl font-black text-gray-900">{pattern.count}</span>
            <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", risk.badge)}>
              {pattern.riskLevel} Priority
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <MiniBarChart data={pattern.monthlyData} labels={pattern.monthLabels} color={risk.chart} />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-xs font-medium text-gray-600">
              <TrendIcon trend={pattern.trend} />
              <span className={pattern.trend === "up" ? "text-red-600" : pattern.trend === "down" ? "text-green-600" : "text-gray-500"}>
                {pattern.trend === "up" ? "Increasing" : pattern.trend === "down" ? "Decreasing" : "Stable"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{pattern.evidenceCount} evidence file{pattern.evidenceCount !== 1 ? "s" : ""} in category</p>
          </div>
        </div>

        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className={cn("h-full rounded-full", risk.bar)}
            style={{ width: `${Math.min((pattern.count / maxCount) * 100, 100)}%` }} />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          {pattern.flaggedCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 font-medium"><Flag size={11} /> {pattern.flaggedCount} flagged</span>
          )}
          {pattern.highCount > 0 && (
            <span className="flex items-center gap-1 text-orange-600 font-medium"><AlertTriangle size={11} /> {pattern.highCount} high severity</span>
          )}
          {pattern.flaggedCount === 0 && pattern.highCount === 0 && <span>No flagged or high-severity events in this group.</span>}
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3 bg-gray-50/40 rounded-b-2xl">
        <Link href="/timeline" className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
          <ExternalLink size={13} /> View in Timeline
        </Link>
        <Link href="/evidence" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <FileText size={13} /> View Evidence
        </Link>
      </div>
    </div>
  );
}

export default function PatternsPage() {
  const { activeCase } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const [{ data: evts }, { data: evd }] = await Promise.all([
      supabase.from("timeline_events").select("id, title, event_date, category, severity, flagged").eq("case_id", activeCase.id),
      supabase.from("evidence").select("id, title, category").eq("case_id", activeCase.id),
    ]);
    setEvents((evts ?? []) as TimelineEvent[]);
    setEvidence((evd ?? []) as EvidenceItem[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const patterns = buildPatterns(events, evidence);
  const highCount = patterns.filter((p) => p.riskLevel === "High").length;

  return (
    <AppLayout title="Pattern Insights">
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-amber-800 text-sm font-semibold mb-0.5">Review for accuracy before use</p>
          <p className="text-amber-700 text-xs leading-relaxed">{LEGAL_DISCLAIMER}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{loading ? "…" : patterns.length}</p>
            <p className="text-xs text-gray-400">Possible patterns found</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <ShieldAlert size={18} className="text-red-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{loading ? "…" : highCount}</p>
            <p className="text-xs text-gray-400">High priority patterns</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">{loading ? "…" : events.length}</p>
            <p className="text-xs text-gray-400">Timeline events analyzed</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Info size={16} className="text-purple-600 flex-shrink-0" />
        <p className="text-sm text-gray-600">
          Groups of repeated timeline events are highlighted below, with monthly frequency and trends drawn from
          <strong> your own entered data</strong>. This is an organizational summary, not legal analysis.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Analyzing your timeline…</div>
      ) : patterns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <Sparkles size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">Not enough data to detect patterns yet</p>
          <p className="text-gray-400 text-sm mb-4">
            Patterns appear when a category has two or more timeline events. Keep logging events as they happen.
          </p>
          <Link href="/timeline" className="inline-block px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Add Timeline Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {patterns.map((pattern) => (
            <PatternCard key={pattern.category} pattern={pattern} />
          ))}
        </div>
      )}

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-500">
          Pattern detection groups <em>your own entries</em> by category and frequency. It does not predict outcomes
          or provide legal strategy. Always review findings for accuracy and consult a licensed attorney.
        </p>
      </div>
    </AppLayout>
  );
}
