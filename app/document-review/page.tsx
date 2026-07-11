"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { SeverityBadge } from "@/components/shared/badges";
import { MOCK_REVIEW } from "@/lib/mock/reviews";
import { MOCK_DOCUMENTS } from "@/lib/mock/documents";
import {
  FINDING_CATEGORY_LABEL, type FindingDecision, type ReviewFinding,
} from "@/lib/review/types";
import {
  ClipboardCheck, FileText, Upload, ClipboardPaste, AlertTriangle,
  Check, Pencil, X, UserCheck, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocumentReviewPage() {
  const [started, setStarted] = useState(false);
  const [findings, setFindings] = useState<ReviewFinding[]>(MOCK_REVIEW.findings);
  const [activeFinding, setActiveFinding] = useState<string | null>(null);

  const decide = (id: string, decision: FindingDecision) =>
    setFindings((prev) => prev.map((f) => f.id === id ? { ...f, decision } : f));

  if (!started) {
    return (
      <AppLayout title="Document Review">
        <div className="mb-5"><Disclaimer compact /></div>
        <StartScreen onStart={() => setStarted(true)} />
        <AssistantLauncher contextLabel="Document Review" />
      </AppLayout>
    );
  }

  const s = MOCK_REVIEW.summary;
  const openCount = findings.filter((f) => f.decision === "open").length;

  return (
    <AppLayout title="Document Review">
      <div className="mb-5"><Disclaimer compact /></div>

      {/* Dashboard */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">{MOCK_REVIEW.documentTitle}</h2>
            <p className="text-xs text-gray-400">Reviewed {MOCK_REVIEW.runAt} · {openCount} open of {findings.length} findings</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={15} /> Export Review Report
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

      {/* Split reviewer */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: document */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Document</h3>
          </div>
          <div className="space-y-3 text-sm text-gray-800 leading-relaxed">
            <p className="font-semibold">DECLARATION</p>
            <p><Highlight findings={findings} section="Paragraph 3" active={activeFinding} onClick={setActiveFinding}>
              The other parent has repeatedly disregarded the parenting schedule.
            </Highlight></p>
            <p><Highlight findings={findings} section="Paragraph 4" active={activeFinding} onClick={setActiveFinding}>
              This pattern has caused emotional distress to our child.
            </Highlight></p>
            <p><Highlight findings={findings} section="Paragraph 5" active={activeFinding} onClick={setActiveFinding}>
              See Fla. R. Civ. P. 1.090.
            </Highlight></p>
            <p><Highlight findings={findings} section="Exhibit 2 reference" active={activeFinding} onClick={setActiveFinding}>
              Attached text messages (Exhibit 2).
            </Highlight></p>
            <p className="text-gray-400 italic text-xs">(Procedure findings below refer to the motion body and filing package.)</p>
          </div>
        </div>

        {/* Right: findings */}
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} active={activeFinding === f.id}
              onSelect={() => setActiveFinding(f.id)} onDecide={(d) => decide(f.id, d)} />
          ))}
        </div>
      </div>

      <AssistantLauncher contextLabel="Document Review" />
    </AppLayout>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  const [source, setSource] = useState<"existing" | "upload" | "paste">("existing");
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
          <select className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white mb-5 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            {MOCK_DOCUMENTS.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        )}
        {source === "upload" && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-5">
            <Upload size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Drop a file or click to browse</p>
          </div>
        )}
        {source === "paste" && (
          <textarea rows={4} placeholder="Paste the document text to review…"
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl mb-5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        )}

        <button onClick={onStart} className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
          Run Review
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

function Highlight({ findings, section, active, onClick, children }: {
  findings: ReviewFinding[]; section: string; active: string | null;
  onClick: (id: string) => void; children: React.ReactNode;
}) {
  const f = findings.find((x) => x.section === section);
  if (!f) return <>{children}</>;
  const isActive = active === f.id;
  const toneCls = f.decision !== "open" ? "bg-gray-100 text-gray-400 line-through decoration-1" :
    isActive ? "bg-purple-200" : "bg-yellow-100 hover:bg-yellow-200";
  return (
    <mark onClick={() => onClick(f.id)} className={cn("cursor-pointer rounded px-0.5 transition-colors", toneCls)}>
      {children}
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
