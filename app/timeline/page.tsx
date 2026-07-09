"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { mockTimelineEvents, mockPeople, mockEvidence, type TimelineEvent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  Filter, Plus, Download, Search, X, Flag, FileText,
  Users, BookMarked, Calendar, ChevronDown, AlertTriangle,
} from "lucide-react";

const CATEGORIES = [
  "All", "Exchanges", "School", "Medical",
  "Police", "Communications", "Court Orders", "Financial", "Other",
];

const categoryStyle: Record<string, { dot: string; bg: string; text: string }> = {
  Exchanges:     { dot: "bg-red-500",    bg: "bg-red-50",    text: "text-red-700" },
  School:        { dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" },
  Medical:       { dot: "bg-yellow-500", bg: "bg-yellow-50", text: "text-yellow-700" },
  Police:        { dot: "bg-blue-600",   bg: "bg-blue-50",   text: "text-blue-700" },
  Communications:{ dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  "Court Orders":{ dot: "bg-indigo-600", bg: "bg-indigo-50", text: "text-indigo-700" },
  Financial:     { dot: "bg-green-600",  bg: "bg-green-50",  text: "text-green-700" },
  Other:         { dot: "bg-gray-400",   bg: "bg-gray-50",   text: "text-gray-600" },
};

const severityBadge: Record<string, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low:    "bg-blue-100 text-blue-700 border-blue-200",
};

function PersonChip({ id }: { id: number }) {
  const p = mockPeople.find((x) => x.id === id);
  return (
    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
      <Users size={10} /> {p?.name ?? "Unknown"}
    </span>
  );
}

function EvidenceChip({ id }: { id: number }) {
  const e = mockEvidence.find((x) => x.id === id);
  return (
    <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
      <FileText size={10} /> {e?.title ?? "File"}
    </span>
  );
}

function EventCard({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const catStyle = categoryStyle[event.category] ?? categoryStyle.Other;

  return (
    <div className="flex items-start gap-4 group">
      {/* Date column */}
      <div className="w-24 text-right flex-shrink-0 pt-4">
        <span className="text-xs font-semibold text-gray-500">{event.shortDate}</span>
        {event.flagged && <div className="flex justify-end mt-0.5"><Flag size={11} className="text-red-500" /></div>}
      </div>

      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0 relative z-10">
        <div className={cn("w-4 h-4 rounded-full border-2 border-white shadow-sm mt-4", catStyle.dot)} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[60px]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6 pt-2">
        <div className={cn(
          "bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all",
          event.flagged ? "border-red-200" : "border-gray-100 hover:border-purple-200"
        )}>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 text-sm">{event.title}</span>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", severityBadge[event.severity])}>
                  {event.severity}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", catStyle.bg, catStyle.text)}>
                  {event.category}
                </span>
                {event.flagged && (
                  <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    <Flag size={10} /> Important
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                <Calendar size={11} /> {event.date}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>

            {/* Exhibit refs inline */}
            {event.exhibitRefs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {event.exhibitRefs.map((ref) => (
                  <span key={ref} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    <BookMarked size={10} /> {ref}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Expand toggle */}
          <div className="border-t border-gray-50 px-4 py-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-purple-600 transition-colors"
            >
              <span>
                {event.evidenceIds.length} evidence file{event.evidenceIds.length !== 1 ? "s" : ""} ·{" "}
                {event.peopleIds.length} person{event.peopleIds.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown size={13} className={cn("transition-transform duration-200", expanded && "rotate-180")} />
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {event.peopleIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">People Involved</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.peopleIds.map((pid) => <PersonChip key={pid} id={pid} />)}
                    </div>
                  </div>
                )}
                {event.evidenceIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Supporting Evidence</p>
                    <div className="flex flex-wrap gap-1.5">
                      {event.evidenceIds.map((eid) => <EvidenceChip key={eid} id={eid} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const filtered = mockTimelineEvents.filter((e) => {
    const matchCat = activeCategory === "All" || e.category === activeCategory;
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase());
    const matchFlag = !showFlaggedOnly || e.flagged;
    return matchCat && matchSearch && matchFlag;
  });

  // Sort newest first
  const sorted = [...filtered].sort((a, b) => b.id - a.id);

  return (
    <AppLayout title="Timeline">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors",
            showFlaggedOnly
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          <Flag size={14} /> {showFlaggedOnly ? "Showing Flagged" : "Show Flagged"}
        </button>

        <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white">
          <Download size={14} /> Export CSV
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm">
          <Plus size={14} /> Add Event
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const style = categoryStyle[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                isActive
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600"
              )}
            >
              {style && <span className={cn("w-2 h-2 rounded-full", style.dot)} />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap mb-5 px-2">
        {Object.entries(categoryStyle).map(([cat, style]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full", style.dot)} />
            <span className="text-xs text-gray-500">{cat}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-400 mb-5">
        Showing <strong className="text-gray-600">{sorted.length}</strong> of {mockTimelineEvents.length} events
        {showFlaggedOnly && " · Flagged only"}
        {search && ` · Search: "${search}"`}
      </p>

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <AlertTriangle size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No events match your filters.</p>
        </div>
      ) : (
        <div className="relative">
          {sorted.map((event, i) => (
            <EventCard key={event.id} event={event} isLast={i === sorted.length - 1} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
