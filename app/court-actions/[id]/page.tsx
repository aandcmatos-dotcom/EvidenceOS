"use client";

import { use, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import StatusBadge from "@/components/court-actions/StatusBadge";
import GuidedQuestionRunner from "@/components/court-actions/GuidedQuestionRunner";
import FactReviewTable from "@/components/court-actions/FactReviewTable";
import ReferenceApprovalList from "@/components/court-actions/ReferenceApprovalList";
import PackageComponentPicker from "@/components/court-actions/PackageComponentPicker";
import ConsistencyReport from "@/components/court-actions/ConsistencyReport";
import ChecklistView from "@/components/court-actions/ChecklistView";
import { MOCK_SOURCES, type SelectableSource } from "@/lib/mock/sources";
import {
  MOCK_ACTIONS, POSTURE_QUESTIONS, SCHOOL_RELIEF_QUESTIONS, MOCK_FACT_CANDIDATES,
  MOCK_CITATION_SUGGESTIONS, TEMPORARY_RELIEF_PACKAGE, MOCK_CHECKLIST, MOCK_CONSISTENCY_FINDINGS,
} from "@/lib/mock/court-actions";
import {
  TASK_TYPE_LABEL, type CourtActionTaskType, type PostureQuestion,
  type GuidedQuestion, type FactCandidate, type CitationSuggestion,
  type PackageComponent, type ChecklistItem,
} from "@/lib/court-actions/types";
import { EXPORT_ATTESTATION } from "@/lib/disclaimers";
import {
  ChevronLeft, ChevronRight, Check, FileText, AlertTriangle, Sparkles,
  Download, Info, ClipboardCheck, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Define the task", "Source materials", "Focused questions", "Fact review",
  "Legal references", "Package contents", "Generate drafts", "Review & edit",
  "Package review", "Export",
];

export default function CourtActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const action = MOCK_ACTIONS.find((a) => a.id === id) ?? MOCK_ACTIONS[0];

  const [step, setStep] = useState(action?.step ?? 1);
  const [taskType, setTaskType] = useState<CourtActionTaskType>(action?.taskType ?? "temporary_relief");
  const [freeText, setFreeText] = useState("");
  const [posture, setPosture] = useState<PostureQuestion[]>(POSTURE_QUESTIONS.map((p) => ({ ...p })));
  const [selectedSources, setSelectedSources] = useState<string[]>(["evt-5", "ev-2", "comm-3", "ord-1"]);
  const [questions, setQuestions] = useState<GuidedQuestion[]>(SCHOOL_RELIEF_QUESTIONS.map((q) => ({ ...q })));
  const [facts, setFacts] = useState<FactCandidate[]>(MOCK_FACT_CANDIDATES.map((f) => ({ ...f })));
  const [citations, setCitations] = useState<CitationSuggestion[]>(MOCK_CITATION_SUGGESTIONS.map((c) => ({ ...c })));
  const [components, setComponents] = useState<PackageComponent[]>(TEMPORARY_RELIEF_PACKAGE.map((c) => ({ ...c })));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(MOCK_CHECKLIST.map((c) => ({ ...c })));
  const [generated, setGenerated] = useState(false);
  const [attested, setAttested] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const approvedFacts = facts.filter((f) => f.decision === "approved" || f.decision === "edited").length;
  const approvedCitations = citations.filter((c) => c.decision === "approved").length;
  const unresolvedConflicts = facts.filter((f) => f.support === "conflicting_records" && f.decision === "pending").length;
  const selectedComponents = components.filter((c) => c.selected);

  const canProceed = () => {
    if (step === 4) return unresolvedConflicts === 0;
    if (step === 7) return generated;
    return true;
  };

  // Phase 1 autosave affordance: mock actions have no persistence yet, but the UI
  // reflects the save-and-return behavior the real build will have.
  const fakeSave = () => { setSavedNote(true); setTimeout(() => setSavedNote(false), 1500); };
  const next = () => { fakeSave(); setStep((s) => Math.min(s + 1, 10)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  if (!action) {
    return (
      <AppLayout title="Court Action">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-3">Action not found.</p>
          <Link href="/court-actions" className="text-purple-600 text-sm font-semibold">Back to Court Actions</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Court Action">
      <div className="mb-4"><Disclaimer compact /></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/court-actions" className="text-gray-400 hover:text-gray-600"><ChevronLeft size={18} /></Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{action.title}</h1>
            <p className="text-xs text-gray-400">{TASK_TYPE_LABEL[taskType]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedNote && <span className="flex items-center gap-1 text-xs text-green-600"><Save size={12} /> Progress saved</span>}
          <StatusBadge status={action.status} />
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr_240px] gap-5">
        {/* Left: step navigation */}
        <nav className="space-y-0.5">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step, active = n === step;
            return (
              <button key={label} onClick={() => n <= step && setStep(n)}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors",
                  active ? "bg-purple-600 text-white" : done ? "text-gray-700 hover:bg-gray-50" : "text-gray-300 cursor-default")}>
                <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border",
                  active ? "border-white/40 text-white" : done ? "bg-purple-100 border-purple-200 text-purple-700" : "border-gray-200")}>
                  {done ? <Check size={11} /> : n}
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Center: current step */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[440px]">
          {step === 1 && <Step1 taskType={taskType} setTaskType={setTaskType} freeText={freeText} setFreeText={setFreeText} posture={posture} setPosture={setPosture} />}
          {step === 2 && <Step2 selected={selectedSources} setSelected={setSelectedSources} />}
          {step === 3 && (
            <div>
              <StepHeading title="Focused questions" sub="Plain-language questions tailored to this task. Answers are saved automatically." />
              <GuidedQuestionRunner questions={questions} onChange={setQuestions} />
            </div>
          )}
          {step === 4 && (
            <div>
              <StepHeading title="Review the factual record" sub="Each proposed fact shows its source and support level. Only facts you approve can appear in the package." />
              <FactReviewTable facts={facts} onChange={setFacts} />
            </div>
          )}
          {step === 5 && (
            <div>
              <StepHeading title="Possible legal references" sub="The following verified public references may be related to the selected issue. Review each source before approving its use. Nothing is cited without your approval." />
              <ReferenceApprovalList suggestions={citations} onChange={setCitations} />
            </div>
          )}
          {step === 6 && (
            <div>
              <StepHeading title="Select package contents" sub="Choose which documents and materials to generate for this task." />
              <PackageComponentPicker components={components} onChange={setComponents} />
            </div>
          )}
          {step === 7 && <Step7 components={selectedComponents} approvedFacts={approvedFacts} approvedCitations={approvedCitations} generated={generated} onGenerate={() => setGenerated(true)} />}
          {step === 8 && <Step8 components={selectedComponents} facts={facts} />}
          {step === 9 && (
            <div>
              <StepHeading title="Package review" sub="Consistency findings compare the same fields across every generated document. Resolve differences before export — the system flags them but does not pick a value." />
              <ConsistencyReport findings={MOCK_CONSISTENCY_FINDINGS} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Component status</p>
              <div className="space-y-1.5">
                {selectedComponents.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5">
                    <span className="text-sm text-gray-700">{c.name}</span>
                    <StatusBadge status={generated ? "user_review_required" : "not_started"} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 10 && <Step10 attested={attested} setAttested={setAttested} checklist={checklist} setChecklist={setChecklist} components={selectedComponents} />}
        </div>

        {/* Right: context rail */}
        <aside className="space-y-3">
          <RailCard title="Selected sources" value={`${selectedSources.length}`} sub="records feeding this action" />
          <RailCard title="Approved facts" value={`${approvedFacts} / ${facts.length}`} sub={unresolvedConflicts > 0 ? `${unresolvedConflicts} conflict${unresolvedConflicts !== 1 ? "s" : ""} to resolve` : "no unresolved conflicts"} warn={unresolvedConflicts > 0} />
          <RailCard title="Approved citations" value={`${approvedCitations} / ${citations.length}`} sub="references cleared for use" />
          <RailCard title="Package" value={`${selectedComponents.length}`} sub="components selected" />
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1"><AlertTriangle size={12} /> Reminder</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Everything generated here comes from your selected records and answers. You decide whether and how to use it — consider discussing this issue with a licensed attorney.
            </p>
          </div>
        </aside>
      </div>

      {/* Footer nav */}
      <div className="flex justify-between mt-5">
        <button onClick={back} disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors">
          <ChevronLeft size={15} /> Back
        </button>
        {step < 10 ? (
          <button onClick={next} disabled={!canProceed()}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continue <ChevronRight size={15} />
          </button>
        ) : (
          <Link href="/court-actions" className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Done
          </Link>
        )}
      </div>

      <AssistantLauncher contextLabel="Court Actions" />
    </AppLayout>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500">{sub}</p>
    </div>
  );
}

function RailCard({ title, value, sub, warn }: { title: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm p-4", warn ? "border-orange-200" : "border-gray-100")}>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-xl font-black text-gray-900 my-0.5">{value}</p>
      <p className={cn("text-xs", warn ? "text-orange-600 font-medium" : "text-gray-400")}>{sub}</p>
    </div>
  );
}

// ── Step 1: task + case posture ("Important Context to Review") ─────────────
function Step1({ taskType, setTaskType, freeText, setFreeText, posture, setPosture }: {
  taskType: CourtActionTaskType; setTaskType: (t: CourtActionTaskType) => void;
  freeText: string; setFreeText: (v: string) => void;
  posture: PostureQuestion[]; setPosture: (p: PostureQuestion[]) => void;
}) {
  const [showPosture, setShowPosture] = useState(false);
  const answer = (id: string, a: "yes" | "no" | "unknown") =>
    setPosture(posture.map((p) => p.id === id ? { ...p, answer: a } : p));
  const answeredCount = posture.filter((p) => p.answer !== null).length;

  return (
    <div>
      <StepHeading title="Define the task" sub="What are you preparing for? Only the task type is required — everything else can come later." />
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(Object.keys(TASK_TYPE_LABEL) as CourtActionTaskType[]).map((t) => (
          <button key={t} onClick={() => setTaskType(t)}
            className={cn("text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
              taskType === t ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700 hover:border-purple-300")}>
            {TASK_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Add any facts, background, concerns, or instructions that were not covered above. <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <textarea rows={3} value={freeText} onChange={(e) => setFreeText(e.target.value)}
        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none mb-5" />

      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        <button onClick={() => setShowPosture(!showPosture)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/60 hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Info size={15} className="text-purple-600" /> Important context to review
          </span>
          <span className="text-xs text-gray-400">{answeredCount} of {posture.length} answered</span>
        </button>
        {showPosture && (
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-3">
              These circumstances may affect procedure or document preparation. Review the listed sources and
              confirm the information before continuing. Your answers collect context — they are not legal conclusions.
            </p>
            <div className="space-y-2">
              {posture.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{p.prompt}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    {(["yes", "no", "unknown"] as const).map((v) => (
                      <button key={v} onClick={() => answer(p.id, v)}
                        className={cn("text-[11px] font-medium px-2.5 py-1 rounded-lg border capitalize transition-colors",
                          p.answer === v ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-500 border-gray-200 hover:border-purple-300")}>
                        {v === "unknown" ? "Not sure" : v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 2: source selection ─────────────────────────────────────────────────
function Step2({ selected, setSelected }: { selected: string[]; setSelected: (s: string[]) => void }) {
  const [typeFilter, setTypeFilter] = useState("All");
  const types = ["All", "event", "evidence", "communication", "order", "person", "reference"];
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const filtered = MOCK_SOURCES.filter((s) => typeFilter === "All" || s.sourceType === typeFilter);

  return (
    <div>
      <StepHeading title="Select source material" sub="Choose the records this action may draw from. Every document in the package uses this same set, so dates and names stay consistent." />
      <div className="flex items-center gap-2 mb-3">
        {types.map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={cn("text-xs font-medium px-3 py-1.5 rounded-full border capitalize transition-colors",
              typeFilter === t ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
            {t === "All" ? "All types" : t}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 mb-3">{selected.length} selected</p>
      <div className="space-y-2 max-h-[340px] overflow-y-auto">
        {filtered.map((s: SelectableSource) => (
          <label key={s.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
            selected.includes(s.id) ? "border-purple-300 bg-purple-50/50" : "border-gray-100 hover:bg-gray-50")}>
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sublabel}{s.date ? ` · ${s.date}` : ""}</p>
            </div>
            {!s.verified && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                <AlertTriangle size={9} /> Needs verification
              </span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Step 7: generate ─────────────────────────────────────────────────────────
function Step7({ components, approvedFacts, approvedCitations, generated, onGenerate }: {
  components: PackageComponent[]; approvedFacts: number; approvedCitations: number;
  generated: boolean; onGenerate: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const run = () => { setBusy(true); setTimeout(() => { onGenerate(); setBusy(false); }, 1200); };

  return (
    <div>
      <StepHeading title="Generate drafts" sub="Every component is generated from the same approved facts and approved references — nothing else." />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{approvedFacts}</p><p className="text-[11px] text-gray-500">approved facts</p></div>
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{approvedCitations}</p><p className="text-[11px] text-gray-500">approved citations</p></div>
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{components.length}</p><p className="text-[11px] text-gray-500">components to generate</p></div>
      </div>
      {!generated ? (
        <div className="text-center py-6">
          <button onClick={run} disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {busy ? "Generating package…" : <><Sparkles size={16} /> Generate Package</>}
          </button>
          <p className="text-xs text-gray-400 mt-3 max-w-sm mx-auto">
            Drafts will not invent facts, dates, citations, or rules. Statements without an approved source are flagged, not asserted.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {components.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-green-50/60 border border-green-100 rounded-xl px-4 py-3">
              <Check size={15} className="text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-800 flex-1">{c.name}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">User review required</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 8: review & edit (split view) ───────────────────────────────────────
function Step8({ components, facts }: { components: PackageComponent[]; facts: FactCandidate[] }) {
  const [activeDoc, setActiveDoc] = useState(components[0]?.id ?? null);
  const doc = components.find((c) => c.id === activeDoc);
  const usedFacts = facts.filter((f) => f.decision === "approved" || f.decision === "edited");

  return (
    <div>
      <StepHeading title="Review and edit" sub="Click a factual sentence to see its supporting record. Each component is edited individually; the package stays linked to one approved fact set." />
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {components.map((c) => (
          <button key={c.id} onClick={() => setActiveDoc(c.id)}
            className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
              activeDoc === c.id ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{doc?.name ?? "Document"} (draft preview)</p>
          <div className="space-y-2 text-sm text-gray-800 leading-relaxed">
            {usedFacts.length === 0 ? (
              <p className="text-gray-400 text-sm">No approved facts yet — approve facts in step 4 to populate this draft.</p>
            ) : usedFacts.map((f, i) => (
              <p key={f.id}><span className="text-gray-400 mr-1">{i + 1}.</span>{f.editedText ?? f.text}</p>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sources behind this draft</p>
          {usedFacts.map((f) => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-0.5"><FileText size={12} className="text-purple-500" /><span className="text-xs font-semibold text-gray-800">{f.sourceLabel ?? "User-provided and unverified"}</span></div>
              <p className="text-xs text-gray-500 line-clamp-2">{f.editedText ?? f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 10: export + checklists ─────────────────────────────────────────────
function Step10({ attested, setAttested, checklist, setChecklist, components }: {
  attested: boolean; setAttested: (v: boolean) => void;
  checklist: ChecklistItem[]; setChecklist: (c: ChecklistItem[]) => void;
  components: PackageComponent[];
}) {
  const [done, setDone] = useState<string | null>(null);
  const exports = [
    "Individual DOCX", "Individual PDF", "Combined package PDF", "ZIP of all documents",
    "Filing checklist PDF", "Hearing notebook PDF", "Evidence index CSV", "Timeline CSV",
  ];
  return (
    <div>
      <StepHeading title="Export" sub="Export happens on your device. Filing and service always remain your decision — there is no one-click filing." />
      <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer mb-4">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5" />
        <span className="text-xs text-amber-800">{EXPORT_ATTESTATION}</span>
      </label>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {exports.map((e) => (
          <button key={e} disabled={!attested} onClick={() => { setDone(e); setTimeout(() => setDone(null), 1800); }}
            className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              done === e ? "border-green-400 bg-green-50 text-green-800" : "border-gray-200 text-gray-700 hover:border-purple-300")}>
            <Download size={15} className={done === e ? "text-green-600" : "text-purple-600"} />
            {e}
            <span className="ml-auto text-[10px] text-gray-400">{components.length} docs</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck size={16} className="text-purple-600" />
        <h3 className="text-sm font-bold text-gray-900">Procedural checklists</h3>
        <span className="text-xs text-gray-400">— each item shows where it came from</span>
      </div>
      <ChecklistView items={checklist} onChange={setChecklist} />
    </div>
  );
}
