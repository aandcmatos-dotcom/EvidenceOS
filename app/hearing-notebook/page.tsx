"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hearingTypes, LEGAL_DISCLAIMER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  BookOpen, Check, ChevronRight, Download, FileText,
  Clock, BookMarked, AlertTriangle, Sparkles,
  CheckSquare, Square, Info, Eye,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Hearing Type", icon: BookOpen },
  { id: 2, label: "Timeline Events", icon: Clock },
  { id: 3, label: "Evidence", icon: FileText },
  { id: 4, label: "Review Packet", icon: Eye },
  { id: 5, label: "Export", icon: Download },
];

interface TimelineEvent { id: string; title: string; event_date: string; category: string; flagged: boolean; }
interface EvidenceRow { id: string; title: string; category: string; file_type: string | null; date_of_document: string | null; notes: string | null; }

function StepIndicator({ current, step }: { current: number; step: number }) {
  const done = step < current;
  const active = step === current;
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
      done ? "bg-purple-600 border-purple-600 text-white" :
      active ? "bg-white border-purple-600 text-purple-600" :
      "bg-white border-gray-200 text-gray-400"
    )}>
      {done ? <Check size={14} /> : step}
    </div>
  );
}

function Step1({ hearingType, setHearingType, date, setDate, onNext }: {
  hearingType: string; setHearingType: (v: string) => void;
  date: string; setDate: (v: string) => void; onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Hearing Type</h2>
        <p className="text-sm text-gray-500">Choose the type of hearing this packet is being prepared for.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {hearingTypes.map((type) => (
          <button key={type} onClick={() => setHearingType(type)}
            className={cn("flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all",
              hearingType === type ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
            )}>
            {hearingType === type ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0" /> : <Square size={16} className="text-gray-300 flex-shrink-0" />}
            {type}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div className="flex justify-end">
        <button disabled={!hearingType} onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next: Select Events <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function Step2({ events, selected, toggle, onNext, onBack }: {
  events: TimelineEvent[]; selected: string[]; toggle: (id: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Timeline Events</h2>
        <p className="text-sm text-gray-500">Choose the events most relevant to this hearing. {selected.length} selected.</p>
      </div>
      {events.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No timeline events yet. Add some on the Timeline page first.</div>
      ) : (
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          {events.map((event) => {
            const checked = selected.includes(event.id);
            return (
              <button key={event.id} onClick={() => toggle(event.id)}
                className={cn("w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                  checked ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white hover:border-purple-200"
                )}>
                {checked ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" /> : <Square size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{event.title}</span>
                    <span className="text-xs text-gray-400">{fmt(event.event_date)}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{event.category}</span>
                    {event.flagged && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Flagged</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
        <button disabled={selected.length === 0} onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next: Select Evidence <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function Step3({ evidence, selected, toggle, onNext, onBack }: {
  evidence: EvidenceRow[]; selected: string[]; toggle: (id: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Evidence</h2>
        <p className="text-sm text-gray-500">Choose supporting documents to include. {selected.length} selected.</p>
      </div>
      {evidence.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No evidence uploaded yet. Upload files in the Evidence Library first.</div>
      ) : (
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          {evidence.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <button key={item.id} onClick={() => toggle(item.id)}
                className={cn("w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                  checked ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white hover:border-purple-200"
                )}>
                {checked ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" /> : <Square size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.category}</span>
                    {item.file_type && <span className="text-xs text-gray-400">{item.file_type.toUpperCase()}</span>}
                    {item.date_of_document && <span className="text-xs text-gray-400">{fmt(item.date_of_document)}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.notes}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
        <button disabled={selected.length === 0} onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Review Packet <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function Step4({ hearingType, hearingDate, selectedEvents, selectedEvidence, caseName, onNext, onBack }: {
  hearingType: string; hearingDate: string; caseName: string;
  selectedEvents: TimelineEvent[]; selectedEvidence: EvidenceRow[];
  onNext: () => void; onBack: () => void;
}) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtDate = hearingDate ? fmt(hearingDate) : "Date TBD";

  const sections = [
    { title: "Cover Page", content: `${hearingType}\n${fmtDate}\n${caseName}` },
    { title: "Table of Contents", content: `${selectedEvents.length} timeline events · ${selectedEvidence.length} evidence items` },
    {
      title: "Timeline Summary",
      content: selectedEvents.length > 0
        ? selectedEvents.map((e) => `${fmt(e.event_date)} – ${e.title} [${e.category}]`).join("\n")
        : "No events selected."
    },
    {
      title: "Evidence Index",
      content: selectedEvidence.length > 0
        ? selectedEvidence.map((e, i) => `Item ${i + 1}: ${e.title}${e.date_of_document ? ` (${fmt(e.date_of_document)})` : ""}`).join("\n")
        : "No evidence selected."
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Review Packet</h2>
        <p className="text-sm text-gray-500">Review your hearing packet before exporting.</p>
      </div>
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{LEGAL_DISCLAIMER}</p>
      </div>
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {sections.map((section, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
              <BookMarked size={14} className="text-purple-500" />
              <span className="text-sm font-bold text-gray-700">{section.title}</span>
            </div>
            <div className="px-4 py-3">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{section.content}</pre>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
        <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
          Proceed to Export <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function Step5({ hearingType, selectedEvents, selectedEvidence, onBack }: {
  hearingType: string; selectedEvents: TimelineEvent[]; selectedEvidence: EvidenceRow[]; onBack: () => void;
}) {
  const [exported, setExported] = useState<string | null>(null);

  const exportCSV = () => {
    const rows = [
      ["Date", "Event", "Category", "Flagged"],
      ...selectedEvents.map((e) => [
        new Date(e.event_date).toLocaleDateString(),
        e.title,
        e.category,
        e.flagged ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "timeline-export.csv"; a.click();
    URL.revokeObjectURL(url);
    setExported("CSV");
    setTimeout(() => setExported(null), 2500);
  };

  const handleExport = (type: string) => {
    if (type === "CSV") { exportCSV(); return; }
    setExported(type);
    setTimeout(() => setExported(null), 2500);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Export Hearing Packet</h2>
        <p className="text-sm text-gray-500">Review all documents before bringing to court.</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{LEGAL_DISCLAIMER}</p>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold text-gray-900">Packet Summary</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-sm font-black text-purple-700 truncate">{hearingType.split(" ")[0]}</p>
            <p className="text-xs text-purple-500 mt-0.5">Hearing Type</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-blue-700">{selectedEvents.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Timeline Events</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-green-700">{selectedEvidence.length}</p>
            <p className="text-xs text-green-500 mt-0.5">Evidence Items</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { type: "CSV", icon: <FileText size={18} className="text-green-600" />, label: "Export Timeline CSV", desc: "Chronological event log as a spreadsheet. Downloads immediately." },
          { type: "PDF", icon: <Download size={18} className="text-purple-600" />, label: "Generate PDF Packet", desc: "Full packet PDF — coming soon." },
          { type: "Exhibit", icon: <BookMarked size={18} className="text-blue-600" />, label: "Export Exhibit Index", desc: "Numbered exhibit list — coming soon." },
        ].map(({ type, icon, label, desc }) => (
          <button key={type} onClick={() => handleExport(type)}
            className={cn("w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all",
              exported === type ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
            )}>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
            <div>
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            {exported === type && (
              <span className="ml-auto flex items-center gap-1 text-green-700 text-xs font-medium bg-green-100 px-2.5 py-1 rounded-full">
                <Check size={11} /> Done
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
      </div>
    </div>
  );
}

export default function HearingNotebookPage() {
  const { activeCase } = useAuth();
  const [step, setStep] = useState(1);
  const [hearingType, setHearingType] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!activeCase) return;
    const [{ data: evData }, { data: evdData }] = await Promise.all([
      supabase.from("timeline_events").select("id, title, event_date, category, flagged").eq("case_id", activeCase.id).order("event_date", { ascending: false }),
      supabase.from("evidence").select("id, title, category, file_type, date_of_document, notes").eq("case_id", activeCase.id).order("created_at", { ascending: false }),
    ]);
    setEvents((evData ?? []) as TimelineEvent[]);
    setEvidence((evdData ?? []) as EvidenceRow[]);
  }, [activeCase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleEvent = (id: string) =>
    setSelectedEventIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleEvidence = (id: string) =>
    setSelectedEvidenceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectedEvents = events.filter((e) => selectedEventIds.includes(e.id));
  const selectedEvidence = evidence.filter((e) => selectedEvidenceIds.includes(e.id));

  return (
    <AppLayout title="Hearing Notebook">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <StepIndicator current={step} step={s.id} />
                <span className={cn("text-xs font-semibold whitespace-nowrap",
                  step === s.id ? "text-purple-700" : step > s.id ? "text-gray-500" : "text-gray-300"
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-3", step > s.id ? "bg-purple-300" : "bg-gray-200")} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === 1 && <Step1 hearingType={hearingType} setHearingType={setHearingType} date={hearingDate} setDate={setHearingDate} onNext={() => setStep(2)} />}
          {step === 2 && <Step2 events={events} selected={selectedEventIds} toggle={toggleEvent} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <Step3 evidence={evidence} selected={selectedEvidenceIds} toggle={toggleEvidence} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <Step4 hearingType={hearingType} hearingDate={hearingDate} caseName={activeCase?.name ?? ""} selectedEvents={selectedEvents} selectedEvidence={selectedEvidence} onNext={() => setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <Step5 hearingType={hearingType} selectedEvents={selectedEvents} selectedEvidence={selectedEvidence} onBack={() => setStep(4)} />}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={13} className="text-purple-500" /> Packet Progress
            </p>
            <div className="space-y-2.5">
              {[
                { label: "Hearing type", done: !!hearingType },
                { label: "Events selected", done: selectedEventIds.length > 0, count: selectedEventIds.length },
                { label: "Evidence selected", done: selectedEvidenceIds.length > 0, count: selectedEvidenceIds.length },
                { label: "Packet reviewed", done: step >= 4 },
                { label: "Exported", done: step >= 5 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? <Check size={14} className="text-green-500 flex-shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />}
                  <span className={cn("text-xs", item.done ? "text-gray-700" : "text-gray-400")}>
                    {item.label}{"count" in item && item.count ? ` (${item.count})` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <p className="text-xs font-bold text-amber-800">Legal Notice</p>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">{LEGAL_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
