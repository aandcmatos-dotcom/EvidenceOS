import AppLayout from "@/components/AppLayout";
import {
  mockMetrics,
  mockPatternInsights,
  mockEvidence,
  mockTimelineEvents,
  mockTasks,
} from "@/lib/mock-data";
import {
  FolderOpen,
  Clock,
  Users,
  CalendarClock,
  TrendingUp,
  FileText,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const severityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const categoryDots: Record<string, string> = {
  Exchange: "bg-red-500",
  Education: "bg-orange-500",
  Medical: "bg-yellow-500",
  Communications: "bg-purple-500",
  "Law Enforcement": "bg-blue-600",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
};

export default function DashboardPage() {
  return (
    <AppLayout title="Dashboard">
      {/* Disclaimer banner */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-amber-800 text-sm">
          <strong>Information only.</strong> Evidence OS organizes your information. It is not legal advice and does not
          create an attorney-client relationship. Consult a licensed attorney for legal guidance.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<FolderOpen size={20} className="text-purple-600" />}
          bg="bg-purple-50"
          label="Total Evidence"
          value={mockMetrics.totalEvidence.toLocaleString()}
          sub="+12 this week"
          subColor="text-green-600"
        />
        <MetricCard
          icon={<Clock size={20} className="text-blue-600" />}
          bg="bg-blue-50"
          label="Timeline Events"
          value={mockMetrics.timelineEvents.toLocaleString()}
          sub="+5 this week"
          subColor="text-green-600"
        />
        <MetricCard
          icon={<Users size={20} className="text-indigo-600" />}
          bg="bg-indigo-50"
          label="People"
          value={mockMetrics.people.toString()}
          sub="3 witnesses"
          subColor="text-gray-500"
        />
        <MetricCard
          icon={<CalendarClock size={20} className="text-orange-600" />}
          bg="bg-orange-50"
          label="Next Hearing"
          value={mockMetrics.nextHearing.date}
          sub={`${mockMetrics.nextHearing.time} · ${mockMetrics.nextHearing.location}`}
          subColor="text-orange-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Timeline Overview */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-purple-600" />
              <h2 className="font-semibold text-gray-900">Case Timeline Overview</h2>
            </div>
            <Link
              href="/timeline"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-1">
            {mockTimelineEvents.map((event, i) => (
              <div
                key={event.id}
                className="flex items-start gap-4 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer"
              >
                <div className="flex-shrink-0 w-16 text-right">
                  <span className="text-xs text-gray-400 font-medium">{event.shortDate}</span>
                </div>
                <div className="flex-shrink-0 relative flex flex-col items-center">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full mt-0.5",
                      categoryDots[event.category] ?? "bg-gray-400"
                    )}
                  />
                  {i < mockTimelineEvents.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{event.title}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        severityColors[event.severity]
                      )}
                    >
                      {event.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{event.description}</p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400 group-hover:text-purple-600 transition-colors">
                  {event.evidenceIds.length} file{event.evidenceIds.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Pattern Insights */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-purple-600" />
            <h2 className="font-semibold text-gray-900">AI Pattern Insights</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">Detected patterns in your case data</p>
          <div className="space-y-3">
            {mockPatternInsights.map((insight) => (
              <div key={insight.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700 font-medium">{insight.label}</span>
                  <span className="text-2xl font-bold text-gray-900">{insight.count}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", insight.color)}
                    style={{ width: `${Math.min((insight.count / 40) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Powered by Evidence OS AI · Updated daily
            </p>
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
            <Link
              href="/evidence"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {mockEvidence.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.category} · {item.date} · {item.size}
                  </p>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
          <button className="mt-3 w-full border border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2">
            <Plus size={15} />
            Add Evidence
          </button>
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-purple-600" />
              <h2 className="font-semibold text-gray-900">Tasks</h2>
            </div>
            <Link
              href="/tasks"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {mockTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <input
                  type="checkbox"
                  defaultChecked={task.status === "done"}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400">Due {task.due}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      priorityColors[task.priority]
                    )}
                  />
                  <span className="text-xs text-gray-400 capitalize">{task.priority}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full border border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-2">
            <Plus size={15} />
            Add Task
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  icon,
  bg,
  label,
  value,
  sub,
  subColor,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub: string;
  subColor: string;
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
