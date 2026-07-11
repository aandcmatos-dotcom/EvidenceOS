"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { SeverityBadge } from "@/components/shared/badges";
import { useAuth } from "@/contexts/AuthContext";
import { getDocuments } from "@/lib/db/documents";
import { getReferences } from "@/lib/db/references";
import { createReview, addFindings, updateFindingDecision } from "@/lib/db/reviews";
import { logAudit } from "@/lib/db/audit";
import { runReview, type ReviewInput } from "@/lib/services/documentReviewService";
import type { StructuredStatement } from "@/lib/ai/schema";
import type { DraftStatement } from "@/lib/documents/types";
import type { LegalReference } from "@/lib/references/types";
import {
  FINDING_CATEGORY_LABEL, type FindingDecision, type ReviewFinding, type DocumentReview,
} from "@/lib/review/types";
import {
  ClipboardCheck, FileText, Upload, ClipboardPaste, AlertTriangle,
  Check, Pencil, X, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocRow { id: string; title: string; body: DraftStatement[] }
interface RefRow {
  id: string; title: string; citation: string | null; category: string; verification_status: string;
  effective_date: string | null; summary: string | null;
  reference_sections: { heading: string; text: string }[];
}

export default function DocumentReviewPage() {
  const { user, activeCase } = useAuth();
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [references, setReferences] = useState<RefRow[]>([]);
  const [loadingCase, setLoadingCase] = useState(true);

  const [review, setReview] = useState<DocumentReview | null>(null);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);
  const [activeStatements, setActiveStatements] = useState<DraftStatement[]>([]);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const fetchCaseData = useCallback(async () => {
    if (!activeCase || !user) { setLoadingCase(false); return; }
    setLoadingCase(true);
    try {
      const [docs, refs] = await Promise.all([getDocuments(activeCase.id), getReferences(user.id)]);
      setDocuments((docs ?? []) as unknown as DocRow[]);
      setReferences((refs ?? []) as unknown as RefRow[]);
    } finally {
      setLoadingCase(false);
    }
  }, [activeCase, user]);

  useEffect(() => { fetchCaseData(); }, [fetchCaseData]);

  const decide = async (id: string, decision: FindingDecision) => {
    setFindings((prev) => prev.map((f) => f.id === id ? { ...f, decision } : f));
    try { await updateFindingDecision(id, decision); } catch { /* keep local state even if persistence lags */ }
  };

  const runOn = async (docId: string, pasted?: string) => {
    if (!activeCase || !user) return;
    setRunning(true);
    try {
      const doc = documents.find((d) => d.id === docId);
      const statements = pasted ? textToStatements(pasted) : (doc?.body ?? []);
      const structured = statements.map(toStructured);
      const refPool: LegalReference[] = references.map(toLegalReference);
      const bodyText = statements.map((s) => s.text).join(" ");

      const input: ReviewInput = {
        documentTitle: doc?.title ?? "Pasted document",
        bodyText,
        statements: structured,
        references: refPool,
        procedureChecks: buildProcedureChecks(bodyText, refPool),
        evidenceChecks: buildEvidenceChecks(statements, refPool),
      };
      const result = runReview(input);

      const saved = await createReview({
        caseId: activeCase.id, documentId: doc?.id ?? null, documentTitle: result.documentTitle,
        createdBy: user.id, summary: result.summary as unknown as Record<string, unknown>,
        sourcesChecked: result.sourcesChecked, sourcesUnavailable: result.sourcesUnavailable,
      });
      const savedRow = saved as { id: string };
      await addFindings(savedRow.id, result.findings.map((f) => ({
        category: f.category, severity: f.severity, section: f.section, highlightedText: f.highlightedText,
        explanation: f.explanation, referenceSectionId: null, sourceRelied: f.sourceRelied,
        ruleExcerpt: f.ruleExcerpt, effectiveDate: f.effectiveDate, suggestedCorrection: f.suggestedCorrection,
      })));
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "document.review", entityType: "document_reviews", entityId: savedRow.id });

      setReview({ ...result, id: savedRow.id });
      setFindings(result.findings);
      setActiveStatements(statements);
    } finally {
      setRunning(false);
    }
  };

  if (!activeCase) {
    return (
      <AppLayout title="Document Review">
        <div className="mb-5"><Disclaimer compact /></div>
        <div className="text-center py-16"><p className="text-gray-400 text-sm">Select or create a case first.</p></div>
      </AppLayout>
    );
  }

  if (!review) {
    return (
      <AppLayout title="Document Review">
        <div className="mb-5"><Disclaimer compact /></div>
        <StartScreen documents={documents} loading={loadingCase} running={running} onRun={runOn} />
        <AssistantLauncher contextLabel="Document Review" />
      </AppLayout>
    );
  }

  const s = review.summary;
  const openCount = findings.filter((f) => f.decision === "open").length;

  return (
    <AppLayout title="Document Review">
      <div className="mb-5"><Disclaimer compact /></div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">{review.documentTitle}</h2>
            <p className="text-xs text-gray-400">Reviewed {review.runAt} · {openCount} open of {findings.length} findings</p>
          </div>
          <button onClick={() => setReview(null)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <ClipboardCheck size={15} /> Run Another Review
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Metric value={s.possibleIssues} label="Possible issues" tone="purple" />
          <Metric value={s.unsupportedStatements} label="Unsupported statements" tone="orange" />
          <Metric value={s.sourceConflicts} label="Source conflicts" tone="red" />
          <Metric value={s.citationWarnings} label="Citation warnings" tone="red" />
          <Metric value={s.procedureWarnings} label="Procedure warnings" tone="yellow" />
          <Metric value={s.evidenceFoundationWarnings} label="Evidence foundation" tone="yellow" />
          <Metric value={s.writingSuggestions} label="Writing suggestions" tone="blue" />
          <Metric value={openCount} label="Still open" tone="gray" />
        </div>
        <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <p>This is a review aid, not a legal approval or compliance certification. Findings use neutral, possible-issue language and point to the stored source relied upon. Where no verified source exists, the finding says so rather than inventing one.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Document</h3>
          </div>
          {activeStatements.length === 0 ? (
            <p className="text-sm text-gray-400">No document text available.</p>
          ) : (
            <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
              {activeStatements.map((st, i) => (
                <p key={st.id ?? i}>
                  <StatementHighlight statement={st} index={i} findings={findings} active={activeFinding} onClick={setActiveFinding} />
                </p>
              ))}
              {(s.procedureWarnings > 0 || s.evidenceFoundationWarnings > 0) && (
                <p className="text-gray-400 italic text-xs">(Procedure and evidence-foundation findings below refer to the document as a whole, not a specific sentence.)</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          {findings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">No findings — nothing flagged in this review.</div>
          ) : (
            findings.map((f) => (
              <FindingCard key={f.id} finding={f} active={activeFinding === f.id}
                onSelect={() => setActiveFinding(f.id)} onDecide={(d) => decide(f.id, d)} />
            ))
          )}
        </div>
      </div>

      <AssistantLauncher contextLabel="Document Review" />
    </AppLayout>
  );
}

// ── Mapping helpers ───────────────────────────────────────────────────────
function toStructured(s: DraftStatement): StructuredStatement {
  return {
    statement: s.text,
    sourceIds: s.sources.map((src) => src.sourceId),
    sourceExcerpts: s.sources.map((src) => src.excerpt ?? ""),
    status: s.status,
    confidence: s.status === "supported" ? "high" : s.status === "no_source" ? "low" : "medium",
    uncertainty: s.status === "no_source" ? "No source located." : null,
    missingInformation: [],
    jurisdiction: null,
    referenceVersion: null,
    userVerificationRequired: s.status === "no_source" || s.status === "needs_verification",
  };
}

function toLegalReference(r: RefRow): LegalReference {
  return {
    id: r.id, title: r.title, jurisdiction: "", state: "", county: null, circuitDistrict: null,
    court: null, division: null, judge: null, category: r.category as LegalReference["category"],
    citation: r.citation, sourceUrl: null, sourceOrg: null, effectiveDate: r.effective_date,
    lastVerifiedDate: null, supersededDate: null, version: 1, uploadDate: "", uploadedBy: "",
    verificationStatus: r.verification_status as LegalReference["verificationStatus"],
    sourceTier: "official", applicableCaseTypes: [], summary: r.summary ?? "", keywords: [],
    sections: (r.reference_sections ?? []).map((sec, i) => ({ id: `${r.id}-${i}`, heading: sec.heading, text: sec.text })),
    assignedToCase: true, notes: null,
  };
}

function textToStatements(text: string): DraftStatement[] {
  return text.split(/\n+/).filter((l) => l.trim()).map((line, i) => ({
    id: `pasted-${i}`, text: line.trim(), status: "needs_verification", sources: [],
  }));
}

// Derives procedure checks from assigned local/division rules that mention conferral or proposed orders.
function buildProcedureChecks(bodyText: string, refs: LegalReference[]) {
  const checks: { requirement: string; present: boolean; sourceRelied: string | null; ruleExcerpt: string | null; effectiveDate: string | null }[] = [];
  const lower = bodyText.toLowerCase();
  const procedural = refs.filter((r) => ["Local Court Rule", "Judicial Division Procedure", "Judge-Specific Procedure", "Administrative Order"].includes(r.category));

  procedural.forEach((r) => {
    r.sections.forEach((sec) => {
      const text = sec.text.toLowerCase();
      if (text.includes("confer")) {
        checks.push({
          requirement: "Conferral certification", present: lower.includes("confer"),
          sourceRelied: `${r.title}, ${sec.heading}`, ruleExcerpt: sec.text, effectiveDate: r.effectiveDate,
        });
      }
      if (text.includes("proposed order")) {
        checks.push({
          requirement: "Proposed order", present: lower.includes("proposed order"),
          sourceRelied: `${r.title}, ${sec.heading}`, ruleExcerpt: sec.text, effectiveDate: r.effectiveDate,
        });
      }
    });
  });
  return checks;
}

// Derives evidence-foundation prompts for evidence-type sources referenced in the document,
// using assigned evidence-rule references as the source relied upon.
function buildEvidenceChecks(statements: DraftStatement[], refs: LegalReference[]) {
  const evidenceRule = refs.find((r) => r.category === "Evidence Rule");
  const checks: { evidenceLabel: string; concern: string; sourceRelied: string | null }[] = [];
  const seen = new Set<string>();
  statements.forEach((s) => {
    s.sources.filter((src) => src.sourceType === "evidence").forEach((src) => {
      if (seen.has(src.sourceId)) return;
      seen.add(src.sourceId);
      checks.push({
        evidenceLabel: src.label,
        concern: "this item may not clearly identify the sender, recipient, date, or how it was obtained. Confirm authentication details before relying on it.",
        sourceRelied: evidenceRule ? evidenceRule.title : null,
      });
    });
  });
  return checks;
}

// ── UI ──────────────────────────────────────────────────────────────────────
function StartScreen({ documents, loading, running, onRun }: {
  documents: DocRow[]; loading: boolean; running: boolean; onRun: (docId: string, pasted?: string) => void;
}) {
  const [source, setSource] = useState<"existing" | "upload" | "paste">("existing");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [pasted, setPasted] = useState("");

  useEffect(() => { if (documents.length > 0 && !selectedDoc) setSelectedDoc(documents[0].id); }, [documents, selectedDoc]);

  const handleRun = () => {
    if (source === "paste") { if (pasted.trim()) onRun("", pasted); return; }
    if (source === "existing" && selectedDoc) onRun(selectedDoc);
  };

  const canRun = source === "paste" ? pasted.trim().length > 0 : !!selectedDoc;

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={20} className="text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">Review a document</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Checks source accuracy, citations, court and judge procedures, evidence foundation, civil/family procedure,
          and writing quality — against your stored records and verified references only.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { id: "existing" as const, label: "Existing document", icon: <FileText size={16} /> },
            { id: "upload" as const, label: "Upload DOCX / PDF", icon: <Upload size={16} /> },
            { id: "paste" as const, label: "Paste text", icon: <ClipboardPaste size={16} /> },
          ].map((o) => (
            <button key={o.id} onClick={() => setSource(o.id)}
              className={cn("flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all",
                source === o.id ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:border-purple-300")}>
              {o.icon}<span className="text-xs font-medium">{o.label}</span>
            </button>
          ))}
        </div>

        {source === "existing" && (
          loading ? (
            <p className="text-sm text-gray-400 mb-5">Loading your documents…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-400 mb-5">No documents drafted yet. Draft one first, or paste text to review instead.</p>
          ) : (
            <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white mb-5 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          )
        )}
        {source === "upload" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-5">
            <Upload size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Drop a file or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">File upload isn&apos;t wired yet — use &quot;Paste text&quot; for now.</p>
          </div>
        )}
        {source === "paste" && (
          <textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste the document text to review…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl mb-5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        )}

        <button onClick={handleRun} disabled={!canRun || running}
          className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
          {running ? "Running review…" : "Run Review"}
        </button>
      </div>
    </div>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: string }) {
  const toneCls: Record<string, string> = {
    purple: "text-purple-700", orange: "text-orange-600", red: "text-red-600",
    yellow: "text-yellow-600", blue: "text-blue-600", gray: "text-gray-700",
  };
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className={cn("text-2xl font-black", toneCls[tone])}>{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{label}</p>
    </div>
  );
}

function StatementHighlight({ statement, index, findings, active, onClick }: {
  statement: DraftStatement; index: number; findings: ReviewFinding[]; active: string | null; onClick: (id: string) => void;
}) {
  const match = findings.find((f) =>
    f.section === `Statement ${index + 1}` ||
    (f.highlightedText && statement.text.includes(f.highlightedText))
  );
  if (!match) return <>{statement.text}</>;
  const isActive = active === match.id;
  const toneCls = match.decision !== "open" ? "bg-gray-100 text-gray-400 line-through decoration-1" :
    isActive ? "bg-purple-200" : "bg-yellow-100 hover:bg-yellow-200";
  return (
    <mark onClick={() => onClick(match.id)} className={cn("cursor-pointer rounded px-0.5 transition-colors", toneCls)}>
      {statement.text}
    </mark>
  );
}

function FindingCard({ finding, active, onSelect, onDecide }: {
  finding: ReviewFinding; active: boolean; onSelect: () => void; onDecide: (d: FindingDecision) => void;
}) {
  const decided = finding.decision !== "open";
  return (
    <div onClick={onSelect}
      className={cn("bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all",
        active ? "border-purple-300 ring-2 ring-purple-100" : "border-gray-100 hover:border-gray-200",
        decided && "opacity-60")}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-gray-500">{FINDING_CATEGORY_LABEL[finding.category]}</span>
        <SeverityBadge severity={finding.severity} />
      </div>
      <p className="text-xs text-gray-400 mb-1">{finding.section}</p>
      <p className="text-sm text-gray-800 mb-2 leading-snug">{finding.explanation}</p>

      {finding.sourceRelied ? (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 mb-2">
          <p className="text-[11px] font-semibold text-gray-500 mb-0.5">Source relied upon</p>
          <p className="text-xs text-gray-700">{finding.sourceRelied}</p>
          {finding.ruleExcerpt && <p className="text-xs text-gray-500 italic mt-1">&ldquo;{finding.ruleExcerpt}&rdquo;</p>}
          {finding.effectiveDate && <p className="text-[10px] text-gray-400 mt-1">Effective {finding.effectiveDate}</p>}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-2">
          <p className="text-xs text-red-700">No verified source located in the current reference library.</p>
        </div>
      )}

      {finding.suggestedCorrection && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 mb-2">
          <p className="text-[11px] font-semibold text-purple-600 mb-0.5">Suggested neutral wording</p>
          <p className="text-xs text-gray-700">{finding.suggestedCorrection}</p>
        </div>
      )}

      {decided ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Check size={13} className="text-green-500" /> Marked as <span className="font-semibold capitalize">{finding.decision.replace("_", " ")}</span>
          <button onClick={(e) => { e.stopPropagation(); onDecide("open"); }} className="ml-2 text-purple-600 hover:underline">undo</button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <ActionBtn icon={<Check size={12} />} label="Accept" onClick={(e) => { e.stopPropagation(); onDecide("accepted"); }} />
          <ActionBtn icon={<Pencil size={12} />} label="Edit" onClick={(e) => { e.stopPropagation(); onDecide("edited"); }} />
          <ActionBtn icon={<X size={12} />} label="Dismiss" onClick={(e) => { e.stopPropagation(); onDecide("dismissed"); }} />
          <ActionBtn icon={<UserCheck size={12} />} label="Attorney review" onClick={(e) => { e.stopPropagation(); onDecide("attorney_review"); }} />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 hover:border-purple-300 hover:text-purple-700 transition-colors">
      {icon} {label}
    </button>
  );
}
