"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import { SupportBadge } from "@/components/shared/badges";
import { MOCK_TEMPLATES, MOCK_QUESTIONS } from "@/lib/mock/documents";
import { MOCK_SOURCES } from "@/lib/mock/sources";
import { generateDraft } from "@/lib/services/documentDraftingService";
import { exportDocx, exportPDF, exportText, copyToClipboard, type ExportDoc } from "@/lib/documents/export";
import { detectSensitive, applyRedactions, SENSITIVE_LABEL } from "@/lib/security/redaction";
import type { DraftStatement, UserQuestion } from "@/lib/documents/types";
import { REVIEW_CONFIRMATIONS, EXPORT_ATTESTATION } from "@/lib/disclaimers";
import {
  Check, ChevronRight, ChevronLeft, FileText, Search, Sparkles,
  AlertTriangle, Download, Copy, FileType, CheckCircle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Document Type", "Source Materials", "Questions", "Generate Draft",
  "Source Verification", "Review", "Export",
];

export default function DraftPageWrapper() {
  return (
    <Suspense fallback={<AppLayout title="Draft Document"><div className="py-16 text-center text-gray-400 text-sm">Loading…</div></AppLayout>}>
      <DraftPage />
    </Suspense>
  );
}

function DraftPage() {
  const params = useSearchParams();
  const presetTemplate = params.get("template");

  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(presetTemplate);
  const [blank, setBlank] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [questions, setQuestions] = useState<UserQuestion[]>(MOCK_QUESTIONS.map((q) => ({ ...q })));
  const [statements, setStatements] = useState<DraftStatement[]>([]);
  const [generated, setGenerated] = useState(false);
  const [confirmations, setConfirmations] = useState<boolean[]>(REVIEW_CONFIRMATIONS.map(() => false));

  const canProceed = () => {
    if (step === 1) return blank || !!templateId;
    if (step === 3) return questions.filter((q) => q.required).every((q) => (q.answer ?? "").trim() !== "");
    if (step === 6) return confirmations.every(Boolean);
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <AppLayout title="Draft Document">
      <div className="mb-5"><Disclaimer compact /></div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step, active = n === step;
          return (
            <div key={label} className="flex items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
                  done ? "bg-purple-600 border-purple-600 text-white" :
                  active ? "bg-white border-purple-600 text-purple-600" : "bg-white border-gray-200 text-gray-400")}>
                  {done ? <Check size={13} /> : n}
                </div>
                <span className={cn("text-xs font-medium whitespace-nowrap", active ? "text-purple-700" : done ? "text-gray-600" : "text-gray-400")}>{label}</span>
              </div>
              {n < STEPS.length && <div className="w-6 h-px bg-gray-200 mx-2" />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[380px]">
        {step === 1 && <Step1 templateId={templateId} setTemplateId={(id) => { setTemplateId(id); setBlank(false); }} blank={blank} setBlank={() => { setBlank(true); setTemplateId(null); }} />}
        {step === 2 && <Step2 selected={selectedSources} setSelected={setSelectedSources} />}
        {step === 3 && <Step3 questions={questions} setQuestions={setQuestions} />}
        {step === 4 && <Step4 generated={generated} onGenerate={() => { setStatements(buildDraft(selectedSources, questions)); setGenerated(true); }} statements={statements} />}
        {step === 5 && <Step5 statements={statements} />}
        {step === 6 && <Step6 confirmations={confirmations} setConfirmations={setConfirmations} statements={statements} />}
        {step === 7 && <Step7 statements={statements} />}
      </div>

      {/* Nav */}
      <div className="flex justify-between mt-5">
        {step > 1 ? (
          <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={15} /> Back
          </button>
        ) : (
          <Link href="/documents" className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={15} /> Cancel
          </Link>
        )}
        {step < 7 && (
          <button onClick={next} disabled={!canProceed() || (step === 4 && !generated)}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continue <ChevronRight size={15} />
          </button>
        )}
        {step === 7 && (
          <Link href="/documents" className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Done
          </Link>
        )}
      </div>
    </AppLayout>
  );
}

// ── Step 1 ──────────────────────────────────────────────────────────────────
function Step1({ templateId, setTemplateId, blank, setBlank }: {
  templateId: string | null; setTemplateId: (id: string) => void; blank: boolean; setBlank: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Select a document type</h2>
      <p className="text-sm text-gray-500 mb-5">Start from a template or a blank document. No template is pre-approved or certified as court-compliant.</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={setBlank}
          className={cn("text-left p-4 rounded-xl border-2 transition-all", blank ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-300")}>
          <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-purple-600" /><span className="text-sm font-semibold text-gray-900">Blank document</span></div>
          <p className="text-xs text-gray-500">Start from scratch and add your own sections.</p>
        </button>
        {MOCK_TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => setTemplateId(t.id)}
            className={cn("text-left p-4 rounded-xl border-2 transition-all", templateId === t.id ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-300")}>
            <div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-purple-600" /><span className="text-sm font-semibold text-gray-900">{t.name}</span></div>
            <p className="text-xs text-gray-500">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2 ──────────────────────────────────────────────────────────────────
function Step2({ selected, setSelected }: { selected: string[]; setSelected: (s: string[]) => void }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const types = ["All", "event", "evidence", "communication", "order", "person", "reference"];
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const filtered = MOCK_SOURCES.filter((s) => {
    if (typeFilter !== "All" && s.sourceType !== typeFilter) return false;
    if (search && !s.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Select source materials</h2>
      <p className="text-sm text-gray-500 mb-4">Choose the records this document may draw from. The draft will only use what you select here.</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white capitalize focus:outline-none focus:ring-2 focus:ring-purple-500/20">
          {types.map((t) => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
        </select>
      </div>
      <p className="text-xs text-gray-400 mb-3">{selected.length} selected</p>
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {filtered.map((s) => (
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

// ── Step 3 ──────────────────────────────────────────────────────────────────
function Step3({ questions, setQuestions }: { questions: UserQuestion[]; setQuestions: (q: UserQuestion[]) => void }) {
  const update = (id: string, answer: string) => setQuestions(questions.map((q) => q.id === id ? { ...q, answer } : q));
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Answer required questions</h2>
      <p className="text-sm text-gray-500 mb-5">These come from information the template needs. Required questions are marked.</p>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {q.prompt} {q.required && <span className="text-red-400">*</span>}
            </label>
            {q.kind === "long_text" ? (
              <textarea rows={2} value={q.answer ?? ""} onChange={(e) => update(q.id, e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
            ) : q.kind === "choice" ? (
              <select value={q.answer ?? ""} onChange={(e) => update(q.id, e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400">
                <option value="">Select…</option>
                {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : q.kind === "boolean" ? (
              <div className="flex gap-2">
                {["Yes", "No"].map((v) => (
                  <button key={v} type="button" onClick={() => update(q.id, v)}
                    className={cn("px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
                      q.answer === v ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
                    {v}
                  </button>
                ))}
              </div>
            ) : (
              <input type={q.kind === "date" ? "date" : "text"} value={q.answer ?? ""} onChange={(e) => update(q.id, e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4 ──────────────────────────────────────────────────────────────────
function Step4({ generated, onGenerate, statements }: { generated: boolean; onGenerate: () => void; statements: DraftStatement[] }) {
  const [busy, setBusy] = useState(false);
  const run = () => { setBusy(true); setTimeout(() => { onGenerate(); setBusy(false); }, 1100); };
  if (!generated) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Sparkles size={26} className="text-purple-600" /></div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Generate your draft</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          The assistant will organize your selected facts and answers into a draft. It will not invent facts,
          dates, citations, or rules. Every factual sentence will carry a source indicator.
        </p>
        <button onClick={run} disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
          {busy ? "Generating…" : <><Sparkles size={16} /> Generate Draft</>}
        </button>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Draft generated</h2>
      <p className="text-sm text-gray-500 mb-4">Review the draft below. Continue to verify each statement&apos;s source.</p>
      <div className="border border-gray-100 rounded-xl p-5 bg-gray-50/50 space-y-2 text-sm text-gray-800 leading-relaxed">
        {statements.map((s, i) => (
          <p key={s.id}><span className="text-gray-400 mr-1">{i + 1}.</span>{s.text}</p>
        ))}
      </div>
    </div>
  );
}

// ── Step 5 ──────────────────────────────────────────────────────────────────
function Step5({ statements }: { statements: DraftStatement[] }) {
  const [active, setActive] = useState<string | null>(statements[0]?.id ?? null);
  const sel = statements.find((s) => s.id === active);
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Source verification</h2>
      <p className="text-sm text-gray-500 mb-4">Click any sentence to see the record it relies on. Statements with no located source are flagged.</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {statements.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={cn("w-full text-left p-3 rounded-xl border text-sm transition-colors",
                active === s.id ? "border-purple-300 bg-purple-50/50" : "border-gray-100 hover:bg-gray-50")}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-gray-800 leading-snug">{s.text}</span>
                <SupportBadge status={s.status} />
              </div>
            </button>
          ))}
        </div>
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 h-fit">
          {sel ? (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Underlying sources</p>
              {sel.sources.length === 0 ? (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  No source located for this statement. Edit it to match your records or remove it before export.
                </div>
              ) : (
                <div className="space-y-2">
                  {sel.sources.map((src, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1"><FileText size={12} className="text-purple-500" /><span className="text-xs font-semibold text-gray-800">{src.label}</span></div>
                      {src.excerpt && <p className="text-xs text-gray-500 italic">&ldquo;{src.excerpt}&rdquo;</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-sm text-gray-400">Select a statement.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Step 6 ──────────────────────────────────────────────────────────────────
function Step6({ confirmations, setConfirmations, statements }: {
  confirmations: boolean[]; setConfirmations: (c: boolean[]) => void; statements: DraftStatement[];
}) {
  const unsupported = statements.filter((s) => s.status === "no_source" || s.status === "needs_verification").length;
  const toggle = (i: number) => setConfirmations(confirmations.map((c, idx) => idx === i ? !c : c));
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Review before export</h2>
      <p className="text-sm text-gray-500 mb-4">Confirm each item. You must check all boxes to continue.</p>
      {unsupported > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <AlertTriangle size={15} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-800">{unsupported} statement{unsupported !== 1 ? "s" : ""} still need{unsupported === 1 ? "s" : ""} verification or ha{unsupported === 1 ? "s" : "ve"} no located source. Consider fixing before you export.</p>
        </div>
      )}
      <div className="space-y-2">
        {REVIEW_CONFIRMATIONS.map((c, i) => (
          <label key={c} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={confirmations[i]} onChange={() => toggle(i)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className="text-sm text-gray-700">{c}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Step 7 ──────────────────────────────────────────────────────────────────
function Step7({ statements }: { statements: DraftStatement[] }) {
  const [attested, setAttested] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const docText = statements.map((s) => s.text).join("\n");
  const sensitive = detectSensitive(docText);
  const [redactApproved, setRedactApproved] = useState<Set<number>>(new Set());

  const exportStatements: DraftStatement[] = sensitive.length === 0 || redactApproved.size === 0
    ? statements
    : statements.map((s) => {
        const local = detectSensitive(s.text);
        const approvedLocal = local.filter((m) => {
          // approve if the corresponding global match index is approved
          const globalIdx = sensitive.findIndex((g) => g.text === m.text);
          return redactApproved.has(globalIdx);
        });
        return { ...s, text: approvedLocal.length ? applyRedactions(s.text, approvedLocal) : s.text };
      });

  const buildExportDoc = (): ExportDoc => ({
    title: "Draft Document",
    statements: exportStatements,
    signatureBlock: "Respectfully submitted,\n\n_______________________________\n(Signature)",
  });

  const run = async (id: string) => {
    const doc = buildExportDoc();
    if (id === "DOCX") exportDocx(doc);
    else if (id === "PDF") exportPDF(doc);
    else if (id === "TXT") exportText(doc);
    else if (id === "COPY") { const ok = await copyToClipboard(doc); if (!ok) { alert("Could not copy."); return; } }
    setDone(id); setTimeout(() => setDone(null), 2500);
  };

  const formats = [
    { id: "DOCX", icon: <FileType size={18} className="text-blue-600" />, label: "Word (DOCX)" },
    { id: "PDF", icon: <Download size={18} className="text-red-600" />, label: "PDF" },
    { id: "TXT", icon: <FileText size={18} className="text-gray-600" />, label: "Plain text" },
    { id: "COPY", icon: <Copy size={18} className="text-purple-600" />, label: "Copy to clipboard" },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Export</h2>
      <p className="text-sm text-gray-500 mb-4">Choose a format. Captions, headings, signature blocks, exhibit references, and citations are preserved.</p>

      {sensitive.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} /> {sensitive.length} possible sensitive item{sensitive.length !== 1 ? "s" : ""} detected
          </p>
          <p className="text-xs text-red-700 mb-3">Nothing is redacted unless you check it. Review each and choose what to redact before export.</p>
          <div className="space-y-1.5">
            {sensitive.map((m, i) => (
              <label key={i} className="flex items-center gap-2 text-xs bg-white border border-red-100 rounded-lg px-2.5 py-1.5 cursor-pointer">
                <input type="checkbox" checked={redactApproved.has(i)}
                  onChange={(e) => setRedactApproved((prev) => { const n = new Set(prev); if (e.target.checked) n.add(i); else n.delete(i); return n; })}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="font-medium text-gray-700">{SENSITIVE_LABEL[m.kind]}:</span>
                <span className="font-mono text-gray-500">{m.text}</span>
                <span className="text-gray-400 ml-auto">→ {m.suggestedReplacement}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer mb-4">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5" />
        <span className="text-xs text-amber-800">{EXPORT_ATTESTATION}</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {formats.map((f) => (
          <button key={f.id} disabled={!attested} onClick={() => run(f.id)}
            className={cn("flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              done === f.id ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-purple-300")}>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">{f.icon}</div>
            <span className="text-sm font-semibold text-gray-900">{f.label}</span>
            {done === f.id && <CheckCircle size={16} className="text-green-600 ml-auto" />}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-2 mt-4 text-xs text-gray-400">
        <Info size={13} className="mt-0.5 flex-shrink-0" />
        <p>DOCX downloads as a Word-compatible document; PDF opens your browser&apos;s print dialog (choose &ldquo;Save as PDF&rdquo;).</p>
      </div>
    </div>
  );
}

// Draft via the schema-validated, guard-checked service (Phase 3). Maps the structured
// StructuredStatement output to the UI's DraftStatement shape for display.
function buildDraft(selectedIds: string[], questions: UserQuestion[]): DraftStatement[] {
  const answers: Record<string, string> = {};
  questions.forEach((q) => { if (q.answer) answers[q.id] = q.answer; });

  const result = generateDraft(
    { caseId: "current", templateId: null, selectedSourceIds: selectedIds, answers, jurisdiction: null },
    MOCK_SOURCES,
  );

  return result.statements.map((s, i) => ({
    id: `st-${i}`,
    text: s.statement,
    status: s.status,
    sources: s.sourceIds.map((id, j) => {
      const src = MOCK_SOURCES.find((m) => m.id === id);
      return {
        sourceType: src?.sourceType ?? "user_answer",
        sourceId: id,
        label: src?.label ?? (id === "q1" ? "Your answer: purpose" : id),
        excerpt: s.sourceExcerpts[j] || undefined,
      };
    }),
  }));
}
