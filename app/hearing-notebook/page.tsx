"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import {
  mockEvidence, mockTimelineEvents, mockPeople,
  hearingTypes, LEGAL_DISCLAIMER,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  BookOpen, Check, ChevronRight, Download, FileText,
  Clock, Users, BookMarked, AlertTriangle, Sparkles,
  CheckSquare, Square, Info, Eye,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Hearing Type", icon: BookOpen },
  { id: 2, label: "Timeline Events", icon: Clock },
  { id: 3, label: "Evidence", icon: FileText },
  { id: 4, label: "Review Packet", icon: Eye },
  { id: 5, label: "Export", icon: Download },
];

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

// Step 1 – Hearing Type
function Step1({ hearingType, setHearingType, date, setDate, onNext }: {
  hearingType: string; setHearingType: (v: string) => void;
  date: string; setDate: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Hearing Type</h2>
        <p className="text-sm text-gray-500">Choose the type of hearing this packet is being prepared for.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {hearingTypes.map((type) => (
          <button
            key={type}
            onClick={() => setHearingType(type)}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all",
              hearingType === type
                ? "border-purple-600 bg-purple-50 text-purple-700"
                : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
            )}
          >
            {hearingType === type ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0" /> : <Square size={16} className="text-gray-300 flex-shrink-0" />}
            {type}
          </button>
        ))}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing Date</label>
        <input
          type="text"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="e.g. May 14, 2025"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
        />
      </div>
      <div className="flex justify-end">
        <button
          disabled={!hearingType}
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next: Select Events <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// Step 2 – Timeline events
function Step2({ selected, toggle, onNext, onBack }: {
  selected: number[]; toggle: (id: number) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Timeline Events</h2>
        <p className="text-sm text-gray-500">Choose the events most relevant to this hearing. {selected.length} selected.</p>
      </div>
      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {mockTimelineEvents.map((event) => {
          const checked = selected.includes(event.id);
          return (
            <button
              key={event.id}
              onClick={() => toggle(event.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                checked ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white hover:border-purple-200"
              )}
            >
              {checked ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" /> : <Square size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{event.title}</span>
                  <span className="text-xs text-gray-400">{event.shortDate}</span>
                  {event.flagged && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Flagged</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
        <button disabled={selected.length === 0} onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Next: Select Evidence <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// Step 3 – Evidence
function Step3({ selected, toggle, onNext, onBack }: {
  selected: number[]; toggle: (id: number) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Select Evidence</h2>
        <p className="text-sm text-gray-500">Choose supporting documents to include. {selected.length} selected.</p>
      </div>
      <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
        {mockEvidence.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
                checked ? "border-purple-400 bg-purple-50" : "border-gray-100 bg-white hover:border-purple-200"
              )}
            >
              {checked ? <CheckSquare size={16} className="text-purple-600 flex-shrink-0 mt-0.5" /> : <Square size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                  {item.exhibitNumber && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">{item.exhibitNumber}</span>
                  )}
                  <span className="text-xs text-gray-400">{item.date}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.aiSummary}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
        <button disabled={selected.length === 0} onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Review Packet <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// Step 4 – Packet Preview
function Step4({ hearingType, hearingDate, eventIds, evidenceIds, onNext, onBack }: {
  hearingType: string; hearingDate: string;
  eventIds: number[]; evidenceIds: number[];
  onNext: () => void; onBack: () => void;
}) {
  const selectedEvents = mockTimelineEvents.filter((e) => eventIds.includes(e.id));
  const selectedEvidence = mockEvidence.filter((e) => evidenceIds.includes(e.id));
  const witnesses = Array.from(new Set(selectedEvents.flatMap((e) => e.peopleIds)))
    .map((id) => mockPeople.find((p) => p.id === id))
    .filter(Boolean);
  const exhibits = selectedEvidence.filter((e) => e.exhibitNumber);

  const sections = [
    { title: "Cover Page", content: `${hearingType} · ${hearingDate || "Date TBD"} · Doe v. Smith · Case #2024-FC-00847` },
    { title: "Table of Contents", content: `${selectedEvents.length} timeline events · ${selectedEvidence.length} evidence items · ${exhibits.length} exhibits` },
    { title: "Timeline Summary", content: selectedEvents.map((e) => `${e.shortDate} – ${e.title}`).join("\n") || "No events selected." },
    { title: "Exhibit Index", content: exhibits.length > 0 ? exhibits.map((e) => `${e.exhibitNumber}: ${e.title}`).join("\n") : "No exhibits assigned yet." },
    { title: "Witness List", content: witnesses.length > 0 ? witnesses.map((w) => `${w!.name} · ${w!.role}`).join("\n") : "No witnesses identified." },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Review Packet</h2>
        <p className="text-sm text-gray-500">Review your hearing packet before exporting. Verify all information for accuracy.</p>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{LEGAL_DISCLAIMER}</p>
      </div>

      {/* Packet sections */}
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

// Step 5 – Export
function Step5({ hearingType, eventIds, evidenceIds, onBack }: {
  hearingType: string; eventIds: number[]; evidenceIds: number[];
  onBack: () => void;
}) {
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = (type: string) => {
    setExported(type);
    setTimeout(() => setExported(null), 2500);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Export Hearing Packet</h2>
        <p className="text-sm text-gray-500">Choose an export format. Review all documents before bringing to court.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">{LEGAL_DISCLAIMER}</p>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold text-gray-900">Packet Summary</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-purple-700">{hearingType.split(" ")[0]}</p>
            <p className="text-xs text-purple-500 mt-0.5">Hearing Type</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-blue-700">{eventIds.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Timeline Events</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-green-700">{evidenceIds.length}</p>
            <p className="text-xs text-green-500 mt-0.5">Evidence Items</p>
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="space-y-3">
        <ExportButton
          icon={<Download size={18} className="text-purple-600" />}
          label="Generate PDF Packet"
          description="Full hearing packet including timeline, exhibits, and evidence index."
          onClick={() => handleExport("PDF")}
          active={exported === "PDF"}
        />
        <ExportButton
          icon={<BookMarked size={18} className="text-blue-600" />}
          label="Export Exhibit Index"
          description="Numbered exhibit list formatted for court filing."
          onClick={() => handleExport("Exhibit")}
          active={exported === "Exhibit"}
        />
        <ExportButton
          icon={<FileText size={18} className="text-green-600" />}
          label="Export Timeline CSV"
          description="Chronological event log as a spreadsheet."
          onClick={() => handleExport("CSV")}
          active={exported === "CSV"}
        />
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Back</button>
      </div>
    </div>
  );
}

function ExportButton({ icon, label, description, onClick, active }: {
  icon: React.ReactNode; label: string; description: string;
  onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all",
        active ? "border-green-400 bg-green-50" : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-bold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      {active && (
        <span className="ml-auto flex items-center gap-1 text-green-700 text-xs font-medium bg-green-100 px-2.5 py-1 rounded-full">
          <Check size={11} /> Ready
        </span>
      )}
    </button>
  );
}

export default function HearingNotebookPage() {
  const [step, setStep] = useState(1);
  const [hearingType, setHearingType] = useState("");
  const [hearingDate, setHearingDate] = useState("May 14, 2025");
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);

  const toggleEvent = (id: number) =>
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleEvidence = (id: number) =>
    setSelectedEvidence((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <AppLayout title="Hearing Notebook">
      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <StepIndicator current={step} step={s.id} />
                <span className={cn(
                  "text-xs font-semibold whitespace-nowrap",
                  step === s.id ? "text-purple-700" : step > s.id ? "text-gray-500" : "text-gray-300"
                )}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-3", step > s.id ? "bg-purple-300" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {step === 1 && (
            <Step1 hearingType={hearingType} setHearingType={setHearingType}
              date={hearingDate} setDate={setHearingDate} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <Step2 selected={selectedEvents} toggle={toggleEvent}
              onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <Step3 selected={selectedEvidence} toggle={toggleEvidence}
              onNext={() => setStep(4)} onBack={() => setStep(2)} />
          )}
          {step === 4 && (
            <Step4
              hearingType={hearingType} hearingDate={hearingDate}
              eventIds={selectedEvents} evidenceIds={selectedEvidence}
              onNext={() => setStep(5)} onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5
              hearingType={hearingType}
              eventIds={selectedEvents} evidenceIds={selectedEvidence}
              onBack={() => setStep(4)}
            />
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={13} className="text-purple-500" /> Packet Progress
            </p>
            <div className="space-y-2.5">
              {[
                { label: "Hearing type", done: !!hearingType },
                { label: "Events selected", done: selectedEvents.length > 0, count: selectedEvents.length },
                { label: "Evidence selected", done: selectedEvidence.length > 0, count: selectedEvidence.length },
                { label: "Packet reviewed", done: step >= 4 },
                { label: "Exported", done: step >= 5 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done
                    ? <Check size={14} className="text-green-500 flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                  }
                  <span className={cn("text-xs", item.done ? "text-gray-700" : "text-gray-400")}>
                    {item.label}
                    {"count" in item && item.count ? ` (${item.count})` : ""}
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
