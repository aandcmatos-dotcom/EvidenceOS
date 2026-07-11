"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalEvent {
  key: string;
  day: number;
  title: string;
  color: string;
  isHearing: boolean;
}

const categoryColors: Record<string, string> = {
  Exchanges: "bg-red-500",
  Exchange: "bg-red-500",
  School: "bg-orange-400",
  Medical: "bg-yellow-500",
  Police: "bg-blue-600",
  Communications: "bg-purple-400",
  "Court Orders": "bg-blue-500",
  Financial: "bg-green-500",
  Other: "bg-gray-400",
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { activeCase } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ hearing_type: "", hearing_date: "", location: "", notes: "" });

  const supabase = createClient();

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fetchEvents = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const caseId = activeCase.id;
    const [{ data: tl }, { data: tk }, { data: hr }] = await Promise.all([
      supabase.from("timeline_events").select("id, title, event_date, category")
        .eq("case_id", caseId).gte("event_date", monthStart).lte("event_date", monthEnd),
      supabase.from("tasks").select("id, title, due_date")
        .eq("case_id", caseId).neq("status", "done").gte("due_date", monthStart).lte("due_date", monthEnd),
      supabase.from("hearings").select("id, hearing_type, hearing_date")
        .eq("case_id", caseId).gte("hearing_date", `${monthStart}T00:00:00`).lte("hearing_date", `${monthEnd}T23:59:59`),
    ]);

    const evts: CalEvent[] = [];
    (hr ?? []).forEach((h: { id: string; hearing_type: string; hearing_date: string | null }) => {
      if (!h.hearing_date) return;
      const d = new Date(h.hearing_date);
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      evts.push({ key: `h-${h.id}`, day: d.getDate(), title: `HEARING ${time}`, color: "bg-purple-600", isHearing: true });
    });
    (tl ?? []).forEach((e: { id: string; title: string; event_date: string; category: string }) => {
      const day = parseInt(e.event_date.slice(8, 10), 10);
      evts.push({ key: `t-${e.id}`, day, title: e.title, color: categoryColors[e.category] ?? "bg-gray-400", isHearing: false });
    });
    (tk ?? []).forEach((t: { id: string; title: string; due_date: string | null }) => {
      if (!t.due_date) return;
      const day = parseInt(t.due_date.slice(8, 10), 10);
      evts.push({ key: `k-${t.id}`, day, title: `Due: ${t.title}`, color: "bg-gray-600", isHearing: false });
    });
    setEvents(evts);
    setLoading(false);
  }, [activeCase, monthStart, monthEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const addHearing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.hearing_type.trim() || !form.hearing_date) return;
    setSaving(true);
    const { error } = await supabase.from("hearings").insert({
      case_id: activeCase.id,
      hearing_type: form.hearing_type.trim(),
      hearing_date: new Date(form.hearing_date).toISOString(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    } as never);
    setSaving(false);
    if (error) { alert(`Could not save hearing: ${error.message}`); return; }
    setForm({ hearing_type: "", hearing_date: "", location: "", notes: "" });
    setModalOpen(false);
    fetchEvents();
  };

  const offset = new Date(year, month, 1).getDay();
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const hearingDays = new Set(events.filter((e) => e.isHearing).map((e) => e.day));
  const isToday = (day: number) => year === now.getFullYear() && month === now.getMonth() && day === now.getDate();

  return (
    <AppLayout title="Calendar">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-gray-900 w-44 text-center">{monthLabel}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={18} /></button>
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Hearing
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Showing hearings, timeline events, and task due dates for this month. Add timeline events from the Timeline page and tasks from the Tasks page.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-gray-50 bg-gray-50/30" />
          ))}
          {days.map((day) => {
            const dayEvents = events.filter((e) => e.day === day);
            const isHearing = hearingDays.has(day);
            return (
              <div key={day} className={cn(
                "min-h-[100px] border-b border-r border-gray-50 p-2 hover:bg-gray-50/50 transition-colors",
                isHearing && "bg-purple-50/40"
              )}>
                <span className={cn(
                  "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                  isHearing ? "bg-purple-600 text-white" : isToday(day) ? "bg-purple-100 text-purple-700" : "text-gray-700"
                )}>
                  {day}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.map((event) => (
                    <div key={event.key} title={event.title} className={`text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md ${event.color} truncate`}>
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Hearing">
        <form onSubmit={addHearing} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing Type</label>
            <input type="text" required value={form.hearing_type}
              onChange={(e) => setForm((f) => ({ ...f, hearing_type: e.target.value }))}
              placeholder="e.g. Custody Modification Hearing"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date &amp; Time</label>
            <input type="datetime-local" required value={form.hearing_date}
              onChange={(e) => setForm((f) => ({ ...f, hearing_date: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Dept. 42, Superior Court"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.notes} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Hearing"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
