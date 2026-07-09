import AppLayout from "@/components/AppLayout";
import { mockTimelineEvents } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Filter, Plus, Download } from "lucide-react";

const categoryColors: Record<string, string> = {
  Exchange: "bg-red-500",
  Education: "bg-orange-500",
  Medical: "bg-yellow-500",
  Communications: "bg-purple-500",
  "Law Enforcement": "bg-blue-600",
};

const severityBg: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-blue-100 text-blue-700",
};

const allEvents = [
  ...mockTimelineEvents,
  {
    id: 6, date: "Apr 10, 2025", shortDate: "Apr 10", title: "Court Order Issued",
    description: "Family Court issued temporary orders regarding holiday schedule.", category: "Law Enforcement", severity: "high", evidenceCount: 1,
  },
  {
    id: 7, date: "Apr 5, 2025", shortDate: "Apr 5", title: "School Absence",
    description: "Child absent from school without notification to other parent.", category: "Education", severity: "medium", evidenceCount: 2,
  },
  {
    id: 8, date: "Mar 28, 2025", shortDate: "Mar 28", title: "Missed Exchange",
    description: "Scheduled pickup at 6:00 PM did not occur. Child not available.", category: "Exchange", severity: "high", evidenceCount: 4,
  },
];

export default function TimelinePage() {
  return (
    <AppLayout title="Timeline">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm">{allEvents.length} events · Sorted by date</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={15} /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={15} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Plus size={15} /> Add Event
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="relative">
          <div className="absolute left-[7.5rem] top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-0">
            {allEvents.map((event, i) => (
              <div key={event.id} className="flex items-start gap-6 group">
                <div className="w-28 text-right flex-shrink-0 pt-3">
                  <span className="text-sm font-medium text-gray-500">{event.shortDate}</span>
                </div>
                <div className="flex-shrink-0 relative z-10 pt-3.5">
                  <div className={cn("w-4 h-4 rounded-full border-2 border-white shadow", categoryColors[event.category] ?? "bg-gray-400")} />
                </div>
                <div className="flex-1 pb-8 pt-2">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group-hover:border-purple-200">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{event.title}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", severityBg[event.severity])}>
                          {event.severity}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {event.category}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{event.evidenceCount} file{event.evidenceCount !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
