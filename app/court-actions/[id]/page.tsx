"use client";

import { use, useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  getActionById, updateAction, saveAnswer, setActionSources, saveFactCandidates,
  saveCitationSuggestions, ensurePackage, getPackageComponents, linkComponentDocument,
  saveConsistencyFindings, saveChecklist, recordConfirmations,
} from "@/lib/db/court-actions";
import { createDocument, saveDocumentVersion } from "@/lib/db/documents";
import { getSelectableSources } from "@/lib/db/sources";
import { getReferences } from "@/lib/db/references";
import { logAudit } from "@/lib/db/audit";
import { extractFactCandidates } from "@/lib/services/factExtractionService";
import { suggestCitations } from "@/lib/services/legalReferenceSuggestionService";
import { buildChecklist } from "@/lib/services/proceduralChecklistService";
import { checkPackageConsistency, type PackageDocument } from "@/lib/services/documentConsistencyService";
import { exportDocx, exportPDF, exportText, copyToClipboard, type ExportDoc } from "@/lib/documents/export";
import { questionBankFor, TEMPORARY_RELIEF_PACKAGE } from "@/lib/mock/court-actions";
import type { SelectableSource } from "@/lib/mock/sources";
import type { LegalReference } from "@/lib/references/types";
import type { DraftStatement } from "@/lib/documents/types";
import {
  TASK_TYPE_LABEL, type CourtActionTaskType, type ActionStatus,
  type GuidedQuestion, type FactCandidate, type CitationSuggestion,
  type PackageComponent, type ChecklistItem, type ConsistencyFinding,
} from "@/lib/court-actions/types";
import { EXPORT_ATTESTATION, REVIEW_CONFIRMATIONS } from "@/lib/disclaimers";
import {
  ChevronLeft, ChevronRight, Check, FileText, AlertTriangle, Sparkles,
  Download, ClipboardCheck, Save, Copy, FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Define the task", "Source materials", "Focused questions", "Fact review",
  "Legal references", "Package contents", "Generate drafts", "Review & edit",
  "Package review", "Export",
];

interface ActionRow {
  id: string; case_id: string; title: string; task_type: CourtActionTaskType;
  status: ActionStatus; step: number; free_text: string | null;
  court_action_answers: { question_key: string; answer: string | null }[];
  court_action_sources: { source_type: string; source_id: string }[];
  fact_candidates: Record<string, unknown>[];
  citation_suggestions: Record<string, unknown>[];
  court_action_packages: { id: string; package_components: Record<string, unknown>[] }[];
}

interface RefRow {
  id: string; title: string; citation: string | null; category: string;
  verification_status: string; effective_date: string | null; summary: string | null;
  jurisdiction: string | null;
  reference_sections: { heading: string | null; text: string | null }[];
  reference_case_links: { case_id: string }[];
}

function toLegalReference(r: RefRow): LegalReference {
  return {
    id: r.id, title: r.title, jurisdiction: r.jurisdiction ?? "", state: "", county: null,
    circuitDistrict: null, court: null, division: null, judge: null,
    category: r.category as LegalReference["category"], citation: r.citation,
    sourceUrl: null, sourceOrg: null, effectiveDate: r.effective_date, lastVerifiedDate: null,
    supersededDate: null, version: 1, uploadDate: "", uploadedBy: "",
    verificationStatus: r.verification_status as LegalReference["verificationStatus"],
    sourceTier: "official", applicableCaseTypes: [], summary: r.summary ?? "", keywords: [],
    sections: (r.reference_sections ?? []).map((s, i) => ({ id: `${r.id}-${i}`, heading: s.heading ?? "", text: s.text ?? "" })),
    assignedToCase: true, notes: null,
  };
}

export default function CourtActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, activeCase } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [action, setAction] = useState<ActionRow | null>(null);

  const [step, setStep] = useState(1);
  const [freeText, setFreeText] = useState("");
  const [sources, setSources] = useState<SelectableSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [assignedRefs, setAssignedRefs] = useState<LegalReference[]>([]);
  const [questions, setQuestions] = useState<GuidedQuestion[]>([]);
  const [facts, setFacts] = useState<FactCandidate[]>([]);
  const [citations, setCitations] = useState<CitationSuggestion[]>([]);
  const [components, setComponents] = useState<PackageComponent[]>(TEMPORARY_RELIEF_PACKAGE.map((c) => ({ ...c })));
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<{ name: string; statements: DraftStatement[] }[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyFinding[]>([]);
  const [confirmations, setConfirmations] = useState<boolean[]>(REVIEW_CONFIRMATIONS.map(() => false));
  const [attested, setAttested] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Load everything ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user || !activeCase) { setLoading(false); return; }
    setLoading(true);
    try {
      const row = (await getActionById(id)) as unknown as ActionRow;
      setAction(row);
      setStep(row.step ?? 1);
      setFreeText(row.free_text ?? "");

      const bank = questionBankFor(row.task_type).map((q) => ({ ...q }));
      const answers = new Map(row.court_action_answers.map((a) => [a.question_key, a.answer ?? ""]));
      setQuestions(bank.map((q) => ({ ...q, answer: answers.get(q.id) ?? q.answer })));

      setSelectedSources(row.court_action_sources.map((s) => s.source_id));

      if (row.fact_candidates.length > 0) {
        setFacts(row.fact_candidates.map((f) => ({
          id: f.id as string, text: f.text as string,
          sourceType: (f.source_type as FactCandidate["sourceType"]) ?? null,
          sourceLabel: (f.source_label as string) ?? null,
          sourceDate: (f.source_date as string) ?? null,
          support: f.support as FactCandidate["support"],
          conflictNote: (f.conflict_note as string) ?? null,
          decision: f.decision as FactCandidate["decision"],
          editedText: (f.edited_text as string) ?? undefined,
        })));
      }
      if (row.citation_suggestions.length > 0) {
        setCitations(row.citation_suggestions.map((c) => ({
          id: c.id as string, title: c.title as string, citation: (c.citation as string) ?? null,
          plainSummary: (c.excerpt as string) ?? "", excerpt: (c.excerpt as string) ?? "",
          effectiveDate: null, jurisdiction: "", whyRelated: (c.why_related as string) ?? "",
          limitations: (c.limitations as string) ?? "", verificationStatus: "verified_official",
          decision: c.decision as CitationSuggestion["decision"],
        })));
      }
      const pkg = row.court_action_packages[0];
      if (pkg && pkg.package_components.length > 0) {
        setComponents(pkg.package_components.map((c) => ({
          id: c.id as string, name: c.name as string, description: (c.description as string) ?? "",
          templateRecommended: !!c.template_recommended, selected: !!c.selected,
          status: c.status as ActionStatus,
        })));
      }

      const [srcList, refList] = await Promise.all([
        getSelectableSources(activeCase.id, user.id),
        getReferences(user.id),
      ]);
      setSources(srcList);
      const assigned = ((refList ?? []) as unknown as RefRow[])
        .filter((r) => (r.reference_case_links ?? []).some((l) => l.case_id === activeCase.id))
        .map(toLegalReference);
      setAssignedRefs(assigned);
      setChecklist(buildChecklist(assigned));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this action.");
    } finally {
      setLoading(false);
    }
  }, [id, user, activeCase]);

  useEffect(() => { load(); }, [load]);

  const approvedFacts = facts.filter((f) => f.decision === "approved" || f.decision === "edited");
  const approvedCitations = citations.filter((c) => c.decision === "approved");
  const unresolvedConflicts = facts.filter((f) => f.support === "conflicting_records" && f.decision === "pending").length;
  const selectedComponents = components.filter((c) => c.selected);

  // ── Persist the current step's state ───────────────────────────────────────
  const persistStep = useCallback(async (currentStep: number) => {
    if (!action) return;
    setSaveError("");
    try {
      if (currentStep === 1) {
        await updateAction(action.id, { free_text: freeText, status: "in_progress" });
      } else if (currentStep === 2) {
        const chosen = sources.filter((s) => selectedSources.includes(s.id));
        await setActionSources(action.id, chosen.map((s) => ({ sourceType: s.sourceType, sourceId: s.id })));
      } else if (currentStep === 3) {
        for (const q of questions) {
          if ((q.answer ?? "") !== "") await saveAnswer(action.id, q.id, q.answer ?? "");
        }
      } else if (currentStep === 4) {
        await saveFactCandidates(action.id, facts);
      } else if (currentStep === 5) {
        await saveCitationSuggestions(action.id, citations);
      } else if (currentStep === 6) {
        await ensurePackage(action.id, components);
      }
      await updateAction(action.id, { step: Math.min(currentStep + 1, 10) });
      setSavedNote(true); setTimeout(() => setSavedNote(false), 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    }
  }, [action, freeText, sources, selectedSources, questions, facts, citations, components]);

  // Entering step 4 with no facts yet → extract candidates from selections + answers.
  useEffect(() => {
    if (step === 4 && facts.length === 0 && sources.length > 0) {
      const chosen = sources.filter((s) => selectedSources.includes(s.id));
      setFacts(extractFactCandidates(chosen, questions));
    }
    if (step === 5 && citations.length === 0 && assignedRefs.length > 0 && action) {
      setCitations(suggestCitations(`${TASK_TYPE_LABEL[action.task_type]} ${freeText}`, assignedRefs));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canProceed = () => {
    if (step === 4) return unresolvedConflicts === 0;
    if (step === 7) return generatedDocs.length > 0;
    return true;
  };

  const next = async () => { await persistStep(step); setStep((s) => Math.min(s + 1, 10)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ── Generate the package (step 7) ──────────────────────────────────────────
  const generatePackage = async () => {
    if (!action || !user || !activeCase) return;
    setSaveError("");
    try {
      const packageId = await ensurePackage(action.id, components);
      const rows = await getPackageComponents(packageId);

      const statements: DraftStatement[] = approvedFacts.map((f, i) => ({
        id: `st-${i}`,
        text: f.editedText ?? f.text,
        status: f.support === "user_provided" ? "user_entered" : f.support === "directly_supported" ? "supported" : "needs_verification",
        sources: f.sourceLabel ? [{ sourceType: f.sourceType ?? "user_answer", sourceId: f.id, label: f.sourceLabel }] : [],
      }));
      const citationStatements: DraftStatement[] = approvedCitations.map((c, i) => ({
        id: `cit-${i}`,
        text: `Reference (user-approved): ${c.title}${c.citation ? `, ${c.citation}` : ""}.`,
        status: "supported",
        sources: [{ sourceType: "reference", sourceId: c.id, label: c.title, excerpt: c.excerpt }],
      }));

      const docs: { name: string; statements: DraftStatement[] }[] = [];
      for (const row of rows.filter((r) => r.selected)) {
        const body = [...statements, ...citationStatements];
        const doc = await createDocument({
          case_id: activeCase.id, created_by: user.id, title: `${action.title} — ${row.name}`,
          category: "Custom Document", status: "draft", body, version: 1,
        });
        const docRow = doc as { id: string };
        await saveDocumentVersion({
          documentId: docRow.id, version: 1, body,
          sourcesSnapshot: statements.flatMap((s) => s.sources),
          referenceVersionsSnapshot: approvedCitations.map((c) => ({ id: c.id, title: c.title })),
          createdBy: user.id,
        });
        await linkComponentDocument(row.id, docRow.id, "user_review_required");
        docs.push({ name: row.name, statements: body });
      }
      setGeneratedDocs(docs);

      // Consistency check across the generated package + case record.
      const supabase = createClient();
      const { data: caseRow } = await supabase.from("cases")
        .select("case_number, judge").eq("id", activeCase.id).single();
      const cr = caseRow as { case_number: string | null; judge: string | null } | null;
      const pkgDocs: PackageDocument[] = docs.map((d) => ({
        name: d.name, text: d.statements.map((s) => s.text).join(" "),
      }));
      const findings = checkPackageConsistency(pkgDocs, { caseNumber: cr?.case_number, judge: cr?.judge });
      setConsistency(findings);
      await saveConsistencyFindings(packageId, findings.map((f) => ({ field: f.field, values: f.values, note: f.note })));
      await saveChecklist(action.id, checklist);
      await updateAction(action.id, { status: "user_review_required" });
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "court_action.generate", entityType: "court_actions", entityId: action.id });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Generation failed.");
    }
  };

  const confirmAndRecord = async () => {
    if (!action || !user) return;
    if (confirmations.every(Boolean)) {
      try {
        await recordConfirmations("court_action", action.id, REVIEW_CONFIRMATIONS, user.id);
        await updateAction(action.id, { status: "ready_for_export" });
      } catch { /* confirmation recording is best-effort */ }
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!activeCase) {
    return (
      <AppLayout title="Court Action">
        <div className="mb-5"><Disclaimer compact /></div>
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      </AppLayout>
    );
  }
  if (loading) {
    return <AppLayout title="Court Action"><div className="py-16 text-center text-gray-400 text-sm">Loading action…</div></AppLayout>;
  }
  if (loadError || !action) {
    return (
      <AppLayout title="Court Action">
        <div className="text-center py-20">
          <p className="text-gray-500 mb-1">Could not load this action.</p>
          {loadError && <p className="text-xs text-red-500 mb-3">{loadError}</p>}
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
            <p className="text-xs text-gray-400">{TASK_TYPE_LABEL[action.task_type]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedNote && <span className="flex items-center gap-1 text-xs text-green-600"><Save size={12} /> Progress saved</span>}
          <StatusBadge status={action.status} />
        </div>
      </div>

      {saveError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-[200px_1fr_240px] gap-5">
        {/* Left: steps */}
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

        {/* Center */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[440px]">
          {step === 1 && (
            <div>
              <StepHeading title="Define the task" sub="Confirm what this action is preparing, and add anything not covered elsewhere." />
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm font-semibold text-gray-800">{TASK_TYPE_LABEL[action.task_type]}</p>
                <p className="text-xs text-gray-400">Task type was set when this action was created.</p>
              </div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Add any facts, background, concerns, or instructions that were not covered above. <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea rows={4} value={freeText} onChange={(e) => setFreeText(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
            </div>
          )}
          {step === 2 && (
            <div>
              <StepHeading title="Select source material" sub="Choose the records this action may draw from. Every document in the package uses this same set, so dates and names stay consistent." />
              {sources.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No records found in this case yet. Add evidence, timeline events, or other records first.</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3">{selectedSources.length} selected</p>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto">
                    {sources.map((s) => (
                      <label key={s.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                        selectedSources.includes(s.id) ? "border-purple-300 bg-purple-50/50" : "border-gray-100 hover:bg-gray-50")}>
                        <input type="checkbox" checked={selectedSources.includes(s.id)}
                          onChange={() => setSelectedSources((prev) => prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id])}
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
                </>
              )}
            </div>
          )}
          {step === 3 && (
            <div>
              <StepHeading title="Focused questions" sub="Plain-language questions tailored to this task. Answers save when you continue." />
              {questions.length > 0 && <GuidedQuestionRunner questions={questions} onChange={setQuestions} />}
            </div>
          )}
          {step === 4 && (
            <div>
              <StepHeading title="Review the factual record" sub="Each proposed fact shows its source and support level. Only facts you approve can appear in the package." />
              {facts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No fact candidates yet — select sources in step 2 or answer questions in step 3, then return here.</p>
              ) : (
                <FactReviewTable facts={facts} onChange={setFacts} />
              )}
            </div>
          )}
          {step === 5 && (
            <div>
              <StepHeading title="Possible legal references" sub="The following verified public references may be related to the selected issue. Review each source before approving its use. Nothing is cited without your approval." />
              {citations.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No references are assigned to this case yet. Assign references on the References page and they will appear here for review.</p>
              ) : (
                <ReferenceApprovalList suggestions={citations} onChange={setCitations} />
              )}
            </div>
          )}
          {step === 6 && (
            <div>
              <StepHeading title="Select package contents" sub="Choose which documents and materials to generate for this task." />
              <PackageComponentPicker components={components} onChange={setComponents} />
            </div>
          )}
          {step === 7 && (
            <Step7 approvedFacts={approvedFacts.length} approvedCitations={approvedCitations.length}
              componentCount={selectedComponents.length} generated={generatedDocs.length > 0} onGenerate={generatePackage} />
          )}
          {step === 8 && <Step8 docs={generatedDocs} />}
          {step === 9 && (
            <div>
              <StepHeading title="Package review" sub="Consistency findings compare the same fields across every generated document and the case record. The system flags differences but never picks a value." />
              <ConsistencyReport findings={consistency} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2">Review confirmations</p>
              <div className="space-y-2">
                {REVIEW_CONFIRMATIONS.map((c, i) => (
                  <label key={c} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={confirmations[i]}
                      onChange={() => setConfirmations((prev) => prev.map((v, idx) => idx === i ? !v : v))}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm text-gray-700">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 10 && (
            <Step10 attested={attested} setAttested={setAttested} checklist={checklist} setChecklist={setChecklist}
              docs={generatedDocs} actionTitle={action.title} />
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-3">
          <RailCard title="Selected sources" value={`${selectedSources.length}`} sub="records feeding this action" />
          <RailCard title="Approved facts" value={`${approvedFacts.length} / ${facts.length}`}
            sub={unresolvedConflicts > 0 ? `${unresolvedConflicts} conflict${unresolvedConflicts !== 1 ? "s" : ""} to resolve` : "no unresolved conflicts"} warn={unresolvedConflicts > 0} />
          <RailCard title="Approved citations" value={`${approvedCitations.length} / ${citations.length}`} sub="references cleared for use" />
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
          <button onClick={step === 9 ? async () => { await confirmAndRecord(); await next(); } : next} disabled={!canProceed() || (step === 9 && !confirmations.every(Boolean))}
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

function Step7({ approvedFacts, approvedCitations, componentCount, generated, onGenerate }: {
  approvedFacts: number; approvedCitations: number; componentCount: number;
  generated: boolean; onGenerate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); await onGenerate(); setBusy(false); };
  return (
    <div>
      <StepHeading title="Generate drafts" sub="Every component is generated from the same approved facts and approved references — nothing else." />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{approvedFacts}</p><p className="text-[11px] text-gray-500">approved facts</p></div>
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{approvedCitations}</p><p className="text-[11px] text-gray-500">approved citations</p></div>
        <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-xl font-black text-gray-900">{componentCount}</p><p className="text-[11px] text-gray-500">components to generate</p></div>
      </div>
      {!generated ? (
        <div className="text-center py-6">
          <button onClick={run} disabled={busy || approvedFacts === 0 || componentCount === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {busy ? "Generating package…" : <><Sparkles size={16} /> Generate Package</>}
          </button>
          <p className="text-xs text-gray-400 mt-3 max-w-sm mx-auto">
            {approvedFacts === 0
              ? "Approve at least one fact in step 4 before generating."
              : "Drafts will not invent facts, dates, citations, or rules. Statements without an approved source are flagged, not asserted."}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4">
          <Check size={16} className="text-green-600" />
          <p className="text-sm text-green-800">Package generated and saved to your Documents. Continue to review each component.</p>
        </div>
      )}
    </div>
  );
}

function Step8({ docs }: { docs: { name: string; statements: DraftStatement[] }[] }) {
  const [active, setActive] = useState(0);
  const doc = docs[active];
  return (
    <div>
      <StepHeading title="Review and edit" sub="Each component was generated from the same approved fact set. Full editing lives on the document's page in Documents." />
      {docs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">Nothing generated yet — go back to step 7.</p>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {docs.map((d, i) => (
              <button key={d.name} onClick={() => setActive(i)}
                className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                  active === i ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
                {d.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{doc.name} (draft)</p>
              <div className="space-y-2 text-sm text-gray-800 leading-relaxed max-h-[320px] overflow-y-auto">
                {doc.statements.map((s, i) => (
                  <p key={s.id}><span className="text-gray-400 mr-1">{i + 1}.</span>{s.text}</p>
                ))}
              </div>
            </div>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sources behind this draft</p>
              {doc.statements.map((s) => (
                <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <FileText size={12} className="text-purple-500" />
                    <span className="text-xs font-semibold text-gray-800">{s.sources[0]?.label ?? "User-provided and unverified"}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Step10({ attested, setAttested, checklist, setChecklist, docs, actionTitle }: {
  attested: boolean; setAttested: (v: boolean) => void;
  checklist: ChecklistItem[]; setChecklist: (c: ChecklistItem[]) => void;
  docs: { name: string; statements: DraftStatement[] }[]; actionTitle: string;
}) {
  const [done, setDone] = useState<string | null>(null);

  const combinedDoc = (): ExportDoc => ({
    title: actionTitle,
    statements: docs.flatMap((d) => [
      { id: `h-${d.name}`, text: `——— ${d.name.toUpperCase()} ———`, status: "user_entered" as const, sources: [] },
      ...d.statements,
    ]),
    signatureBlock: "Respectfully submitted,\n\n_______________________________\n(Signature)",
  });

  const run = async (id: string) => {
    const doc = combinedDoc();
    if (id === "DOCX") exportDocx(doc);
    else if (id === "PDF") exportPDF(doc);
    else if (id === "TXT") exportText(doc);
    else if (id === "COPY") { const ok = await copyToClipboard(doc); if (!ok) { alert("Could not copy."); return; } }
    setDone(id); setTimeout(() => setDone(null), 2000);
  };

  const formats = [
    { id: "DOCX", icon: <FileType size={16} className="text-blue-600" />, label: "Combined package (Word)" },
    { id: "PDF", icon: <Download size={16} className="text-red-600" />, label: "Combined package (PDF)" },
    { id: "TXT", icon: <FileText size={16} className="text-gray-600" />, label: "Plain text" },
    { id: "COPY", icon: <Copy size={16} className="text-purple-600" />, label: "Copy to clipboard" },
  ];

  return (
    <div>
      <StepHeading title="Export" sub="Export happens on your device. Filing and service always remain your decision — there is no one-click filing. Individual documents can also be exported from the Documents page." />
      <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer mb-4">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-0.5" />
        <span className="text-xs text-amber-800">{EXPORT_ATTESTATION}</span>
      </label>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {formats.map((f) => (
          <button key={f.id} disabled={!attested || docs.length === 0} onClick={() => run(f.id)}
            className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              done === f.id ? "border-green-400 bg-green-50 text-green-800" : "border-gray-200 text-gray-700 hover:border-purple-300")}>
            {f.icon} {f.label}
            <span className="ml-auto text-[10px] text-gray-400">{docs.length} docs</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck size={16} className="text-purple-600" />
        <h3 className="text-sm font-bold text-gray-900">Procedural checklists</h3>
        <span className="text-xs text-gray-400">— each item shows where it came from</span>
      </div>
      {checklist.length > 0 ? (
        <ChecklistView items={checklist} onChange={setChecklist} />
      ) : (
        <p className="text-sm text-gray-400">Assign references to this case to derive rule-based checklist items.</p>
      )}
    </div>
  );
}
