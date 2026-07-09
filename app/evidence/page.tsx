"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { mockEvidence, mockPeople, mockTimelineEvents, type EvidenceItem } from "@/lib/mock-data";
import {
  FileText, Upload, Search, Download, Eye, BookMarked,
  Tag, Calendar, Users, Link2, Sparkles, Filter, X, ChevronDown,
  FileSpreadsheet, Archive, AlertTriangle, CheckCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All Evidence", "Messages", "School", "Medical",
  "Police", "Court Orders", "Photos", "Videos", "Other",
];

function fileTypeIcon(type: string) {
  switch (type) {
    case "PDF": return <FileText size={18} className="text-red-500" />;
    case "XLSX": return <FileSpreadsheet size={18} className="text-green-600" />;
    case "ZIP": return <Archive size={18} className="text-yellow-600" />;
    default: return <FileText size={18} className="text-gray-400" />;
  }
}

const statusConfig = {
  reviewed: { label: "Reviewed", icon: CheckCircle, cls: "bg-green-100 text-green-700" },
  pending: { label: "Pending Review", icon: Clock, cls: "bg-yellow-100 text-yellow-700" },
  flagged: { label: "Flagged", icon: AlertTriangle, cls: "bg-red-100 text-red-700" },
} as const;

function PersonName({ id }: { id: number }) {
  const p = mockPeople.find((x) => x.id === id);
  return <>{p?.name ?? "Unknown"}</>;
}

function EventTitle({ id }: { id: number }) {
  const e = mockTimelineEvents.find((x) => x.id === id);
  return <>{e?.title ?? "Event"}</>;
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = statusConfig[item.status].icon;

  return (
    <div className={cn(
      "bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 flex flex-col",
      item.status === "flagged" ? "border-red-200" : "border-gray-100"
    )}>
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {fileTypeIcon(item.fileType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">{item.title}</h3>
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                {item.exhibitNumber && (
                  <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    <BookMarked size={10} /> {item.exhibitNumber}
                  </span>
                )}
                <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", statusConfig[item.status].cls)}>
                  <StatusIcon size={10} /> {statusConfig[item.status].label}
                </span>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar size={11} /> {item.date}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
              <span>{item.fileType} · {item.size}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-[11px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
              <Tag size={9} /> {tag}
            </span>
          ))}
        </div>

        {/* AI Summary */}
        <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={12} className="text-purple-500" />
            <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wide">AI Summary</span>
          </div>
          <p className="text-xs text-purple-800 leading-relaxed">{item.aiSummary}</p>
        </div>
      </div>

      {/* Expandable linked data */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-purple-600 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Link2 size={12} />
            {item.linkedEvents.length} linked event{item.linkedEvents.length !== 1 ? "s" : ""} ·{" "}
            {item.linkedPeople.length} person{item.linkedPeople.length !== 1 ? "s" : ""}
          </span>
          <ChevronDown size={14} className={cn("transition-transform duration-200", expanded && "rotate-180")} />
        </button>

        {expanded && (
          <div className="mt-3 space-y-2">
            {item.linkedEvents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Linked Timeline Events</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.linkedEvents.map((eid) => (
                    <span key={eid} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full">
                      <EventTitle id={eid} />
                    </span>
                  ))}
                </div>
              </div>
            )}
            {item.linkedPeople.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">People</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.linkedPeople.map((pid) => (
                    <span key={pid} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      <Users size={10} /> <PersonName id={pid} />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-1 bg-gray-50/40 rounded-b-2xl">
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2.5 py-1.5 hover:bg-purple-50 rounded-lg">
          <Eye size={12} /> Preview
        </button>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2.5 py-1.5 hover:bg-purple-50 rounded-lg">
          <Download size={12} /> Download
        </button>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors px-2.5 py-1.5 hover:bg-purple-50 rounded-lg">
          <BookMarked size={12} /> Assign Exhibit
        </button>
      </div>
    </div>
  );
}

export default function EvidencePage() {
  const [selectedCategory, setSelectedCategory] = useState("All Evidence");
  const [search, setSearch] = useState("");

  const filtered = mockEvidence.filter((item) => {
    const matchCat = selectedCategory === "All Evidence" || item.category === selectedCategory;
    const matchSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      item.aiSummary.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const counts: Record<string, number> = { "All Evidence": mockEvidence.length };
  CATEGORIES.slice(1).forEach((cat) => {
    counts[cat] = mockEvidence.filter((e) => e.category === cat).length;
  });

  return (
    <AppLayout title="Evidence Library">
      <div className="flex gap-5">
        {/* Sidebar filters */}
        <aside className="w-52 flex-shrink-0 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Category</p>
            <ul className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "w-full flex items-center justify-between text-sm px-3 py-2 rounded-xl transition-colors",
                      selectedCategory === cat
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span>{cat}</span>
                    {(counts[cat] ?? 0) > 0 && (
                      <span className={cn("text-xs rounded-full px-1.5 py-0.5", selectedCategory === cat ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500")}>
                        {counts[cat]}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
            {(["reviewed", "pending", "flagged"] as const).map((s) => {
              const count = mockEvidence.filter((e) => e.status === s).length;
              const cfg = statusConfig[s];
              return (
                <div key={s} className="flex items-center justify-between">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.cls)}>{cfg.label}</span>
                  <span className="text-xs text-gray-500 font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search evidence, tags, AI summaries..."
                className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
              <Filter size={14} /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap">
              <Upload size={14} /> Upload Evidence
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Showing <strong className="text-gray-600">{filtered.length}</strong> of {mockEvidence.length} items
            {search && <> · Search: "<strong className="text-purple-600">{search}</strong>"</>}
          </p>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Search size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No evidence matches your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map((item) => (
                <EvidenceCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
