"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Filter, Plus, Search, X, Flag, Clock, Trash2 } from "lucide-react";

const CATEGORIES = ["All", "Exchange", "School", "Medical", "Communications", "Police", "Court Orders", "Financial", "Other"];

const categoryStyle: Record<string, { dot: string; badge: string }> = {
  Exchange:       { dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-100" },
  School:         { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 border-orange-100" },
  Medical:        { dot: "bg-yellow-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  Police:         { dot: "bg-blue-600",   badge: "bg-blue-50 text-blue-700 border-blue-100" },
  Communications: { dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border-purple-100" },
  "Court Orders": { dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  Financial:      { dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-100" },
  Other:          { dot: "bg-gray-400",   badge: "bg-gray-50 text-gray-600 border-gray-100" },
};

const severityColors: Record<string, string> = {
  high:   "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low:    "bg-blue-100 text-blue-700 border-blue-200",
};

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  category: string;
  severity: string;
  flagged: boolean;
}

export default function TimelinePage() {
  const { activeCase } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", category: "Other", severity: "medium", flagged: false,
  });

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    if (!activeCase) return;
    setLoading(true);
    const { data } = await supabase
      .from("timeline_events")
      .select("id, title, description, event_date, category, severity, flagged")
      .eq("case_id", activeCase.id)
      .order("event_date", { ascending: false });
    setEvents((data ?? []) as TimelineEvent[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.title.trim() || !form.event_date) return;
    setSaving(true);
    await supabase.from("timeline_events").insert({
      case_id: activeCase.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date,
      category: form.category,
      severity: form.severity,
      flagged: form.flagged,
    } as never);
    setForm({ title: "", description: "", event_date: "", category: "Other", severity: "medium", flagged: false });
    setModalOpen(false);
    setSaving(false);
    fetchEvents();
  };

  const toggleFlag = async (ev: TimelineEvent) => {
    await supabase.from("timeline_events").update({ flagged: !ev.flagged } as never).eq("id", ev.id);
    setEvents((prev) => prev.map((e) => e.id === ev.id ? { ...e, flagged: !e.flagged } : e));
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("timeline_events").delete().eq("id", id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const filtered = events.filter((ev) => {
    if (flaggedOnly && !ev.flagged) return false;
    if (activeCategory !== "All" && ev.category !== activeCategory) return false;
    if (search && !ev.title.toLowerCase().includes(search.toLowerCase()) && !(ev.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppLayout title="Timeline">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setFlaggedOnly(!flaggedOnly)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors", flaggedOnly ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}
        >
          <Flag size={14} /> Flagged
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors ml-auto"
        >
          <Plus size={15} /> Add Event
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              activeCategory === cat ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"
            )}
          >
            {cat !== "All" && <span className={cn("w-2 h-2 rounded-full", categoryStyle[cat]?.dot ?? "bg-gray-400")} />}
            {cat}
          </button>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Clock size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{events.length === 0 ? "No events yet. Add your first timeline event." : "No events match your filters."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => {
            const style = categoryStyle[ev.category] ?? categoryStyle.Other;
            return (
              <div key={ev.id} className={cn("bg-white rounded-2xl border shadow-sm p-5 group", ev.flagged ? "border-red-200" : "border-gray-100")}>
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[52px] flex-shrink-0">
                    <p className="text-xs text-gray-400 font-medium">{formatDate(ev.event_date)}</p>
                  </div>
                  <div className={cn("w-3 h-3 rounded-full mt-1 flex-shrink-0", style.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-gray-900">{ev.title}</span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", severityColors[ev.severity] ?? severityColors.low)}>
                        {ev.severity}
                      </span>
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", style.badge)}>
                        {ev.category}
                      </span>
                      {ev.flagged && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Flagged</span>}
                    </div>
                    {ev.description && <p className="text-xs text-gray-500 leading-relaxed">{ev.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleFlag(ev)} title={ev.flagged ? "Unflag" : "Flag"} className={cn("p-1.5 rounded-lg transition-colors", ev.flagged ? "text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-red-400 hover:bg-red-50")}>
                      <Flag size={14} />
                    </button>
                    <button onClick={() => deleteEvent(ev.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Timeline Event">
        <form onSubmit={addEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Brief description of what happened"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Details</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What happened? Who was involved? Where?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.flagged} onChange={(e) => setForm((f) => ({ ...f, flagged: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className="text-sm text-gray-700">Flag this event as important</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Event"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
