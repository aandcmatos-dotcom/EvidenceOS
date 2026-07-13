"use client";

import { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FolderOpen, Clock, Users, AlertTriangle,
  FileText, CheckSquare, ArrowRight, Plus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const severityColors: Record<string, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low:    "bg-blue-100 text-blue-700 border-blue-200",
};

const categoryDots: Record<string, string> = {
  Exchange:       "bg-red-500",
  School:         "bg-orange-500",
  Medical:        "bg-yellow-500",
  Communications: "bg-purple-500",
  Police:         "bg-blue-600",
  "Court Orders": "bg-indigo-500",
  Financial:      "bg-green-500",
  Other:          "bg-gray-400",
};

const priorityColors: Record<string, string> = {
  high:   "bg-red-500",
  medium: "bg-yellow-500",
  low:    "bg-blue-400",
};

interface RecentEvidence { id: string; title: string; category: string; file_type: string | null; created_at: string; }
interface RecentEvent { id: string; title: string; description: string | null; event_date: string; category: string; severity: string; }
interface RecentTask { id: string; title: string; due_date: string | null; priority: string; status: string; }

interface Metrics {
  evidence: number;
  events: number;
  people: number;
  tasks: number;
  unverifiedDeadlines: number;
}

export default function DashboardPage() {
  const { activeCase } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>({ evidence: 0, events: 0, people: 0, tasks: 0, unverifiedDeadlines: 0 });
  const [recentEvidence, setRecentEvidence] = useState<RecentEvidence[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);

    const caseId = activeCase.id;
    const [
      { count: evCount },
      { count: eventCount },
      { count: peopleCount },
      { count: taskCount },
      { data: recentEv },
      { data: recentEv2 },
      { data: recentT },
    ] = await Promise.all([
      supabase.from("evidence").select("*", { count: "exact", head: true }).eq("case_id", caseId),
      supabase.from("timeline_events").select("*", { count: "exact", head: true }).eq("case_id", caseId),
      supabase.from("people").select("*", { count: "exact", head: true }).eq("case_id", caseId),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("case_id", caseId),
      supabase.from("evidence").select("id, title, category, file_type, created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(3),
      supabase.from("timeline_events").select("id, title, description, event_date, category, severity").eq("case_id", caseId).order("event_date", { ascending: false }).limit(6),
      supabase.from("tasks").select("id, title, due_date, priority, status").eq("case_id", caseId).neq("status", "done").order("due_date", { ascending: true }).limit(5),
    ]);

    const { count: dlCount } = await supabase.from("deadlines")
      .select("*", { count: "exact", head: true })
      .eq("case_id", caseId).eq("status", "requires_verification");

    setMetrics({
      evidence: evCount ?? 0,
      events: eventCount ?? 0,
      people: peopleCount ?? 0,
      tasks: taskCount ?? 0,
      unverifiedDeadlines: dlCount ?? 0,
    });
    setRecentEvidence((recentEv ?? []) as RecentEvidence[]);
    setRecentEvents((recentEv2 ?? []) as RecentEvent[]);
    setRecentTasks((recentT ?? []) as RecentTask[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <AppLayout title="Dashboard">
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-amber-800 text-sm">
          <strong>Information only.</strong> Evidence OS organizes your information — it is not legal advice and does not
          create an attorney-client relationship. Consult a licensed attorney for legal guidance.
        </p>
      </div>

      {!activeCase && !loading ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium mb-2">No case selected</p>
          <Link href="/onboarding" className="inline-block px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Create Your First Case
          </Link>
        </div>
      ) : (
        <>
          {!loading && metrics.unverifiedDeadlines > 0 && (
            <Link href="/calendar" className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5 hover:bg-orange-100 transition-colors">
              <AlertTriangle size={16} className="text-orange-600 flex-shrink-0" />
              <p className="text-sm text-orange-800 flex-1">
                <strong>{metrics.unverifiedDeadlines} deadline{metrics.unverifiedDeadlines !== 1 ? "s" : ""} requiring verification.</strong> Verify them on the Calendar so they appear with a confirmed date.
              </p>
              <ArrowRight size={15} className="text-orange-400" />
            </Link>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MetricCard icon={<FolderOpen size={20} className="text-purple-600" />} bg="bg-purple-50"
              label="Total Evidence" value={loading ? "…" : metrics.evidence.toString()} sub="Files uploaded" subColor="text-gray-500" />
            <MetricCard icon={<Clock size={20} className="text-blue-600" />} bg="bg-blue-50"
              label="Timeline Events" value={loading ? "…" : metrics.events.toString()} sub="Recorded events" subColor="text-gray-500" />
            <MetricCard icon={<Users size={20} className="text-indigo-600" />} bg="bg-indigo-50"
              label="People" value={loading ? "…" : metrics.people.toString()} sub="In this case" subColor="text-gray-500" />
            <MetricCard icon={<CheckSquare size={20} className="text-orange-600" />} bg="bg-orange-50"
              label="Open Tasks" value={loading ? "…" : metrics.tasks.toString()} sub="Pending items" subColor="text-orange-600" />
          </div>

          {/* Documents & references quick access */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Link href="/documents" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><FileText size={18} className="text-purple-600" /></div>
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Documents</p><p className="text-xs text-gray-400">Draft & review documents</p></div>
              <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
            </Link>
            <Link href="/references" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><FolderOpen size={18} className="text-indigo-600" /></div>
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900">References</p><p className="text-xs text-gray-400">Verify rules & procedures</p></div>
              <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
            </Link>
            <Link href="/document-review" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><CheckSquare size={18} className="text-green-600" /></div>
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Document Review</p><p className="text-xs text-gray-400">Source & procedure checks</p></div>
              <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-5 mb-5">
            {/* Timeline */}
            <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-purple-600" />
                  <h2 className="font-semibold text-gray-900">Recent Timeline Events</h2>
                </div>
                <Link href="/timeline" className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : recentEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-2">No timeline events yet.</p>
                  <Link href="/timeline" className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add your first event</Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentEvents.map((event, i) => (
                    <div key={event.id} className="flex items-start gap-4 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div className="flex-shrink-0 w-14 text-right">
                        <span className="text-xs text-gray-400 font-medium">{fmtDate(event.event_date)}</span>
                      </div>
                      <div className="flex-shrink-0 relative flex flex-col items-center">
                        <div className={cn("w-3 h-3 rounded-full mt-0.5", categoryDots[event.category] ?? "bg-gray-400")} />
                        {i < recentEvents.length - 1 && <div className="w-px h-8 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-900">{event.title}</span>
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", severityColors[event.severity] ?? severityColors.low)}>
                            {event.severity}
                          </span>
                        </div>
                        {event.description && <p className="text-xs text-gray-500 line-clamp-1">{event.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Case Overview</h2>
              <div className="space-y-3">
                {[
                  { label: "Evidence Files", value: metrics.evidence, href: "/evidence", color: "bg-purple-100 text-purple-700" },
                  { label: "Timeline Events", value: metrics.events, href: "/timeline", color: "bg-blue-100 text-blue-700" },
                  { label: "People", value: metrics.people, href: "/people", color: "bg-indigo-100 text-indigo-700" },
                  { label: "Open Tasks", value: metrics.tasks, href: "/tasks", color: "bg-orange-100 text-orange-700" },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className={cn("text-sm font-bold px-2.5 py-0.5 rounded-full", item.color)}>
                      {loading ? "…" : item.value}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link href="/hearing-notebook" className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
                  Prepare Hearing Packet
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-2 gap-5">
            {/* Recent Evidence */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" />
                  <h2 className="font-semibold text-gray-900">Recent Evidence</h2>
                </div>
                <Link href="/evidence" className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : recentEvidence.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-2">No evidence uploaded yet.</p>
                  <Link href="/evidence" className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Upload evidence</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentEvidence.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">{item.title}</p>
                        <p className="text-xs text-gray-400">{item.category}{item.file_type ? ` · ${item.file_type.toUpperCase()}` : ""} · {fmtDate(item.created_at)}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
              <Link href="/evidence" className="mt-3 w-full border border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2">
                <Plus size={15} /> Upload Evidence
              </Link>
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare size={18} className="text-purple-600" />
                  <h2 className="font-semibold text-gray-900">Open Tasks</h2>
                </div>
                <Link href="/tasks" className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-2">No open tasks.</p>
                  <Link href="/tasks" className="text-purple-600 text-sm font-semibold hover:text-purple-700">+ Add a task</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", priorityColors[task.priority] ?? "bg-gray-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-xs text-gray-400">{task.due_date ? `Due ${fmtDate(task.due_date)}` : "No due date"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/tasks" className="mt-3 w-full border border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2">
                <Plus size={15} /> Add Task
              </Link>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function MetricCard({ icon, bg, label, value, sub, subColor }: {
  icon: React.ReactNode; bg: string; label: string; value: string; sub: string; subColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={cn("text-xs font-medium", subColor)}>{sub}</p>
    </div>
  );
}
