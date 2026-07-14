"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import { useAuth } from "@/contexts/AuthContext";
import { getEvidenceFileUrl } from "@/lib/db/evidence";
import {
  getBatchClassifications, editClassificationField, promoteClassified,
  confirmCourtOrder, confirmDateCandidate, resolveMandatory, type ClassificationRow,
} from "@/lib/db/classification";
import { routeClassification } from "@/lib/services/importRouting";
import type { ClassificationResult } from "@/lib/ai/schema";
import {
  ArrowLeft, Gavel, CalendarClock, AlertTriangle, FileText, Check, X,
  ExternalLink, ScanLine, Copy, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

function rowToResult(r: ClassificationRow): ClassificationResult {
  return {
    primaryType: (r.primary_type as ClassificationResult["primaryType"]) ?? "other",
    subtype: r.subtype ?? "other", subjectCategories: r.subject_categories ?? [],
    documentDate: r.document_date, dateConfidence: (r.date_confidence as ClassificationResult["dateConfidence"]) ?? "low",
    detectedPeople: r.detected_people ?? [], detectedCaseNumber: r.detected_case_number,
    caseNumberMatches: r.case_number_matches ?? false, summary: r.summary ?? "",
    confidence: (r.confidence as ClassificationResult["confidence"]) ?? "low",
    flags: (r.flags as ClassificationResult["flags"]) ?? [], source: (r.classification_source as "ai" | "heuristic") ?? "heuristic",
  };
}

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, activeCase } = useAuth();
  const [rows, setRows] = useState<ClassificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setRows(await getBatchClassifications(id)); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const openFile = async (path: string | null) => {
    if (!path) return;
    try { window.open(await getEvidenceFileUrl(path), "_blank"); } catch { alert("Could not open file."); }
  };

  const mandatory = rows.filter((r) => r.routing === "mandatory" && !r.resolved);
  const reviewQueue = rows.filter((r) => r.routing === "review_queue" || (r.routing === "mandatory" && r.resolved));
  const autoAccepted = rows.filter((r) => r.routing === "auto_accepted");

  const counts = {
    auto: autoAccepted.length, review: rows.filter((r) => r.routing === "review_queue").length,
    mandatory: mandatory.length, dup: 0, undated: rows.filter((r) => (r.flags ?? []).includes("undated")).length,
  };

  if (!activeCase) return <AppLayout title="Review"><div className="py-16 text-center text-gray-400 text-sm">Select a case first.</div></AppLayout>;

  return (
    <AppLayout title="Reconstruction Review">
      <Link href={`/import/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to batch
      </Link>
      <div className="mb-5"><Disclaimer compact /></div>

      {/* Header counts */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <CountCard value={counts.auto} label="Auto-accepted" tone="green" />
        <CountCard value={counts.review} label="Review queue" tone="yellow" />
        <CountCard value={counts.mandatory} label="Need confirmation" tone="orange" />
        <CountCard value={rows.length} label="Classified" tone="purple" />
        <CountCard value={counts.undated} label="Undated" tone="gray" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-2">No classifications yet.</p>
          <Link href={`/import/${id}`} className="text-purple-600 text-sm font-semibold">Run &quot;Classify &amp; route&quot; on the batch first.</Link>
        </div>
      ) : (
        <>
          {/* MANDATORY */}
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={17} className="text-orange-600" />
              <h2 className="text-lg font-bold text-gray-900">Needs your confirmation</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Court orders, hearing/deadline dates, and case-number conflicts do not take effect until you confirm each one.
              Everything else is already stored and browsable.
            </p>
            {mandatory.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
                <Check size={16} className="text-green-600" /><p className="text-sm text-green-800">Nothing needs confirmation. This batch is complete.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mandatory.map((r) => (
                  <MandatoryCard key={r.id} row={r} caseId={activeCase.id} userId={user?.id ?? null}
                    onOpen={() => openFile(r.storage_path)} onDone={refresh} />
                ))}
              </div>
            )}
          </section>

          {/* REVIEW QUEUE */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Review queue</h2>
            <p className="text-sm text-gray-500 mb-4">
              Stored and browsable already — listed here for attention. Edit type or date inline; your edits are protected from re-classification. These verify lazily when you actually use them.
            </p>
            {reviewQueue.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing in the review queue.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["File", "Type", "Date", "Subjects", "Flags", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewQueue.map((r) => (
                      <QueueRow key={r.id} row={r} onOpen={() => openFile(r.storage_path)} onEdited={refresh} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* INVENTORY */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={17} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Inventory</h2>
              <span className="text-xs text-gray-400">informational — no approvals</span>
            </div>
            <Inventory rows={rows} />
          </section>
        </>
      )}
    </AppLayout>
  );
}

function CountCard({ value, label, tone }: { value: number; label: string; tone: string }) {
  const cls: Record<string, string> = { green: "text-green-700", yellow: "text-yellow-600", orange: "text-orange-600", purple: "text-purple-700", gray: "text-gray-700" };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className={cn("text-2xl font-black", cls[tone])}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function MandatoryCard({ row, caseId, userId, onOpen, onDone }: {
  row: ClassificationRow; caseId: string; userId: string | null; onOpen: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const reasons = routeClassification(rowToResult(row)).routing === "mandatory"
    ? [] : [];
  const isCourtOrder = row.primary_type === "court_order";
  const isConflict = (row.flags ?? []).includes("wrong_case_number");
  const isDate = !isCourtOrder && !isConflict;

  const [title, setTitle] = useState(row.original_filename.replace(/\.[^.]+$/, ""));
  const [date, setDate] = useState(row.document_date ?? "");
  const [judge, setJudge] = useState("");
  const [summary, setSummary] = useState(row.summary ?? "");
  const [dateChoice, setDateChoice] = useState<"hearing" | "deadline">("hearing");

  const run = async (fn: () => Promise<unknown>) => { if (!userId) return; setBusy(true); try { await fn(); onDone(); } finally { setBusy(false); } };

  return (
    <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isCourtOrder ? <Gavel size={16} className="text-purple-600 flex-shrink-0" /> : isConflict ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0" /> : <CalendarClock size={16} className="text-blue-600 flex-shrink-0" />}
          <p className="text-sm font-semibold text-gray-900 truncate">{row.original_filename}</p>
        </div>
        <button onClick={onOpen} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 flex-shrink-0"><ExternalLink size={12} /> Open</button>
      </div>
      {row.summary && <p className="text-xs text-gray-500 mb-3">{row.summary}</p>}

      {isCourtOrder && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-purple-700">Confirm to create a Court Order record</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Order title"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            <input value={judge} onChange={(e) => setJudge(e.target.value)} placeholder="Judge (optional)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (optional)" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
          <div className="flex gap-2">
            <button disabled={busy || !title.trim()} onClick={() => run(() => confirmCourtOrder(row, caseId, userId!, { title: title.trim(), issuedDate: date || null, judge: judge.trim() || null, summary: summary.trim() || null }))}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"><Check size={14} /> Confirm court order</button>
            <button disabled={busy} onClick={() => run(() => resolveMandatory(row.id, userId!, caseId))} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><X size={14} /> Not an order</button>
          </div>
        </div>
      )}

      {isDate && (
        <div className="space-y-2 mb-1">
          <p className="text-xs font-semibold text-blue-700">A date was detected — confirm what it becomes (nothing is on your calendar yet)</p>
          <div className="flex gap-2">
            {(["hearing", "deadline"] as const).map((c) => (
              <button key={c} onClick={() => setDateChoice(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors", dateChoice === c ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200")}>{c === "deadline" ? "Deadline (needs verification)" : "Hearing"}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div className="flex gap-2">
            <button disabled={busy || !date} onClick={() => run(() => confirmDateCandidate(row, caseId, userId!, dateChoice, date, title.trim() || "Imported date"))}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"><Check size={14} /> Confirm {dateChoice}</button>
            <button disabled={busy} onClick={() => run(() => resolveMandatory(row.id, userId!, caseId))} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><X size={14} /> Dismiss date</button>
          </div>
        </div>
      )}

      {isConflict && (
        <div className="space-y-2">
          <p className="text-xs text-red-700">Detected case number <strong>{row.detected_case_number}</strong> does not match this case. Quarantined pending your review.</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => run(async () => { await promoteClassified(row, caseId, userId!, rowToResult(row)); await resolveMandatory(row.id, userId!, caseId); })}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">It belongs to this case — keep</button>
            <button disabled={busy} onClick={() => run(() => resolveMandatory(row.id, userId!, caseId))} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Leave in import area</button>
          </div>
        </div>
      )}
      {reasons.length > 0 && null}
    </div>
  );
}

function QueueRow({ row, onOpen, onEdited }: { row: ClassificationRow; onOpen: () => void; onEdited: () => void }) {
  const [type, setType] = useState(row.primary_type ?? "other");
  const [date, setDate] = useState(row.document_date ?? "");
  const [saving, setSaving] = useState(false);

  const saveType = async (v: string) => { setType(v); setSaving(true); try { await editClassificationField(row.id, "primary_type", v); onEdited(); } finally { setSaving(false); } };
  const saveDate = async (v: string) => { setDate(v); setSaving(true); try { await editClassificationField(row.id, "document_date", v || null); onEdited(); } finally { setSaving(false); } };

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="px-4 py-3 text-sm text-gray-800 max-w-[220px] truncate" title={row.original_filename}>
        {row.original_filename}
        {row.classification_source === "heuristic" && <span className="ml-1.5 text-[9px] text-gray-400">(heuristic)</span>}
      </td>
      <td className="px-4 py-3">
        <select value={type} onChange={(e) => saveType(e.target.value)} disabled={saving}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
          {["court_order", "pleading_filing", "evidence", "communication", "discovery", "hearing_material", "case_note", "legal_reference", "administrative_record", "other"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <input type="date" value={date} onChange={(e) => saveDate(e.target.value)} disabled={saving}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{(row.subject_categories ?? []).join(", ") || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          {(row.flags ?? []).map((f) => (
            <span key={f} className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
              {f === "unreadable_portions" ? <ScanLine size={9} /> : f === "possible_duplicate_content" ? <Copy size={9} /> : <AlertTriangle size={9} />}
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={onOpen} className="text-[11px] text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"><ExternalLink size={11} /> Open</button>
      </td>
    </tr>
  );
}

function Inventory({ rows }: { rows: ClassificationRow[] }) {
  const byType = new Map<string, number>();
  const bySubject = new Map<string, number>();
  const flagCounts = new Map<string, number>();
  let peopleTotal = 0; let undated = 0;
  let minDate: string | null = null, maxDate: string | null = null;
  for (const r of rows) {
    byType.set(r.primary_type ?? "other", (byType.get(r.primary_type ?? "other") ?? 0) + 1);
    for (const s of r.subject_categories ?? []) bySubject.set(s, (bySubject.get(s) ?? 0) + 1);
    for (const f of r.flags ?? []) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1);
    peopleTotal += (r.detected_people ?? []).length;
    if (!r.document_date) undated++;
    else { if (!minDate || r.document_date < minDate) minDate = r.document_date; if (!maxDate || r.document_date > maxDate) maxDate = r.document_date; }
  }
  const Chip = ({ label, n }: { label: string; n: number }) => (
    <span className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1">
      <span className="text-gray-600">{label.replace(/_/g, " ")}</span><span className="font-bold text-gray-900">{n}</span>
    </span>
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">By type</p>
        <div className="flex flex-wrap gap-1.5">{Array.from(byType).map(([k, n]) => <Chip key={k} label={k} n={n} />)}</div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">By subject</p>
        <div className="flex flex-wrap gap-1.5">{Array.from(bySubject).map(([k, n]) => <Chip key={k} label={k} n={n} />)}{bySubject.size === 0 && <span className="text-xs text-gray-400">None detected.</span>}</div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><p className="text-[11px] text-gray-400 uppercase tracking-wide">People detected</p><p className="text-lg font-bold text-gray-900">{peopleTotal}</p></div>
        <div><p className="text-[11px] text-gray-400 uppercase tracking-wide">Undated</p><p className="text-lg font-bold text-gray-900">{undated}</p></div>
        <div><p className="text-[11px] text-gray-400 uppercase tracking-wide">Date coverage</p><p className="text-sm font-medium text-gray-700">{minDate ? `${minDate} → ${maxDate}` : "—"}</p></div>
      </div>
      {flagCounts.size > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Confidential / attention flags</p>
          <div className="flex flex-wrap gap-1.5">{Array.from(flagCounts).map(([k, n]) => <Chip key={k} label={k} n={n} />)}</div>
        </div>
      )}
    </div>
  );
}
