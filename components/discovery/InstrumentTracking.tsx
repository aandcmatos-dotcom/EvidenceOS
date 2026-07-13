"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { uploadEvidenceFile } from "@/lib/db/evidence";
import { createDeadline } from "@/lib/db/deadlines";
import { logAudit } from "@/lib/db/audit";
import { AlertTriangle, Check, Printer, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrackableInstrument {
  table: "discovery_requests" | "subpoenas";
  id: string;
  instrument: string;
  recipient: string;
  items: { ordinal: number; text: string }[];
}

// ─── Mark served ─────────────────────────────────────────────────────────────
export function MarkServedModal({ row, caseId, userId, onClose, onDone }: {
  row: TrackableInstrument | null; caseId: string; userId: string | null;
  onClose: () => void; onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("email");
  const [recipients, setRecipients] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => { setDate(""); setMethod("email"); setRecipients(row?.recipient ?? ""); setFile(null); setError(""); }, [row?.id, row?.recipient]);
  if (!row) return null;

  const save = async () => {
    if (!date || !userId) return;
    setSaving(true);
    setError("");
    try {
      let evidenceId: string | null = null;
      if (file) {
        const path = await uploadEvidenceFile(caseId, file);
        const { data: ev, error: evErr } = await supabase.from("evidence").insert({
          case_id: caseId, uploaded_by: userId,
          title: `Proof of service — ${row.instrument} (${row.recipient})`,
          category: "Other", file_path: path,
          file_type: file.name.split(".").pop()?.toUpperCase() ?? null,
          file_size_bytes: file.size, status: "pending",
          tags: ["proof of service"],
        } as never).select().single();
        if (evErr) throw evErr;
        evidenceId = (ev as { id: string }).id;
      }
      const { error: upErr } = await supabase.from(row.table).update({
        served_date: date, served_method: `${method}${recipients ? ` — ${recipients}` : ""}`, status: "served",
      } as never).eq("id", row.id);
      if (upErr) throw upErr;

      await createDeadline({
        caseId, sourceType: "discovery_instrument", sourceId: row.id,
        title: `Response to ${row.instrument} (${row.recipient})`,
        triggerEvent: "Date served", triggerDate: date,
        notes: evidenceId ? "Proof of service saved to Evidence." : null,
      });
      await logAudit({ userId, caseId, action: "discovery.mark_served", entityType: row.table, entityId: row.id, metadata: { date, method } });
      onDone(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Mark served (user-reported)">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{row.instrument} — {row.recipient}. Marking served records what you did; it does not perform service. A response deadline will be created in <strong>requires verification</strong> status.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date served <span className="text-red-400">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              {["email", "e-filing portal", "mail", "personal service", "process server", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipients</label>
          <input value={recipients} onChange={(e) => setRecipients(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Proof of service <span className="text-gray-400 font-normal">(optional — saved to Evidence)</span></label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-500" />
        </div>
        {error && <p className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {error}</p>}
        <button onClick={save} disabled={saving || !date}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors">
          {saving ? "Saving…" : "Mark served & create deadline"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Log response received ───────────────────────────────────────────────────
export function LogResponseModal({ row, caseId, userId, onClose, onDone }: {
  row: TrackableInstrument | null; caseId: string; userId: string | null;
  onClose: () => void; onDone: () => void;
}) {
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => { setDate(""); setFile(null); setNotes(""); setError(""); }, [row?.id]);
  if (!row) return null;

  const save = async () => {
    if (!date || !userId) return;
    setSaving(true);
    setError("");
    try {
      let evidenceId: string | null = null;
      if (file) {
        const path = await uploadEvidenceFile(caseId, file);
        const { data: ev, error: evErr } = await supabase.from("evidence").insert({
          case_id: caseId, uploaded_by: userId,
          title: `Response to ${row.instrument} (${row.recipient})`,
          category: "Other", file_path: path,
          file_type: file.name.split(".").pop()?.toUpperCase() ?? null,
          file_size_bytes: file.size, status: "pending",
          tags: ["discovery response"],
        } as never).select().single();
        if (evErr) throw evErr;
        evidenceId = (ev as { id: string }).id;
      }
      const { error: respErr } = await supabase.from("instrument_responses").insert({
        case_id: caseId, instrument_type: row.table === "subpoenas" ? "subpoena" : "discovery_request",
        instrument_id: row.id, received_date: date, evidence_id: evidenceId, notes: notes.trim() || null,
      } as never);
      if (respErr) throw respErr;
      await logAudit({ userId, caseId, action: "discovery.response_logged", entityType: row.table, entityId: row.id });
      onDone(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Log response received">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{row.instrument} — {row.recipient}</p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date received <span className="text-red-400">*</span></label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Response document <span className="text-gray-400 font-normal">(optional — saved to Evidence)</span></label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
        </div>
        {error && <p className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" /> {error}</p>}
        <button onClick={save} disabled={saving || !date}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors">
          {saving ? "Saving…" : "Log response"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Deficiency worksheet ────────────────────────────────────────────────────
const ITEM_STATUSES = [
  { id: "responded", label: "Responded", cls: "bg-green-100 text-green-700" },
  { id: "partial", label: "Partial", cls: "bg-yellow-100 text-yellow-700" },
  { id: "objected", label: "Objected", cls: "bg-orange-100 text-orange-700" },
  { id: "no_response", label: "No response", cls: "bg-red-100 text-red-700" },
] as const;

interface WorksheetEntry { ordinal: number; itemText: string; responseSummary: string; status: string; note: string }

export function DeficiencyWorksheet({ row, caseId, userId, onBack }: {
  row: TrackableInstrument; caseId: string; userId: string | null; onBack: () => void;
}) {
  const [entries, setEntries] = useState<WorksheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const supabase = createClient();
  const instrumentType = row.table === "subpoenas" ? "subpoena" : "discovery_request";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("deficiency_entries").select("*")
      .eq("instrument_type", instrumentType).eq("instrument_id", row.id);
    const existing = new Map(((data ?? []) as Record<string, unknown>[]).map((e) => [e.ordinal as number, e]));
    setEntries(row.items.map((it) => {
      const e = existing.get(it.ordinal);
      return {
        ordinal: it.ordinal, itemText: it.text,
        responseSummary: (e?.response_summary as string) ?? "",
        status: (e?.status as string) ?? "no_response",
        note: (e?.note as string) ?? "",
      };
    }));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id]);

  useEffect(() => { load(); }, [load]);

  const update = (ordinal: number, patch: Partial<WorksheetEntry>) =>
    setEntries((prev) => prev.map((e) => e.ordinal === ordinal ? { ...e, ...patch } : e));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("deficiency_entries").upsert(entries.map((e) => ({
        case_id: caseId, instrument_type: instrumentType, instrument_id: row.id,
        ordinal: e.ordinal, item_text: e.itemText,
        response_summary: e.responseSummary.trim() || null, status: e.status, note: e.note.trim() || null,
      })) as never, { onConflict: "instrument_type,instrument_id,ordinal" });
      if (error) throw error;
      if (userId) await logAudit({ userId, caseId, action: "discovery.deficiency_saved", entityType: row.table, entityId: row.id });
      setSavedNote(true); setTimeout(() => setSavedNote(false), 1500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const printSummary = () => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!doctype html><html><head><title>Deficiency summary</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.5;color:#111}
h1{font-size:16px;text-transform:uppercase;text-align:center}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}
th,td{border:1px solid #999;padding:6px 8px;text-align:left;vertical-align:top}th{background:#eee}
.disclaimer{margin-top:30px;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:8px}
@media print{body{margin:.5in}}</style></head><body>
<h1>Response review — ${esc(row.instrument)} (${esc(row.recipient)})</h1>
<table><tr><th style="width:36px">#</th><th>Request</th><th>Response summary (user-entered)</th><th style="width:90px">Status</th><th>Deficiency notes</th></tr>
${entries.map((e) => `<tr><td>${e.ordinal}</td><td>${esc(e.itemText)}</td><td>${esc(e.responseSummary)}</td><td>${esc(ITEM_STATUSES.find((s) => s.id === e.status)?.label ?? e.status)}</td><td>${esc(e.note)}</td></tr>`).join("")}
</table>
<p class="disclaimer">Prepared with Evidence OS from user-entered review notes. Not legal advice; statuses reflect your own assessment.</p>
<script>window.onload=()=>window.print()</script></body></html>`;
    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — allow pop-ups to print."); return; }
    win.document.write(html); win.document.close();
  };

  const deficient = entries.filter((e) => e.status !== "responded").length;

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900">Response review — {row.instrument}</h2>
          {savedNote && <span className="flex items-center gap-1 text-xs text-green-600"><Check size={12} /> Saved</span>}
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Compare each numbered request with what was received. Statuses and summaries are your own assessment.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <div className="space-y-3 mb-5">
            {entries.map((e) => (
              <div key={e.ordinal} className="border border-gray-100 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Request {e.ordinal}</p>
                    <p className="text-sm text-gray-800">{e.itemText}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Their response — your summary</p>
                    <textarea rows={2} value={e.responseSummary} onChange={(ev) => update(e.ordinal, { responseSummary: ev.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {ITEM_STATUSES.map((s) => (
                    <button key={s.id} onClick={() => update(e.ordinal, { status: s.id })}
                      className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors",
                        e.status === s.id ? s.cls : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>
                      {s.label}
                    </button>
                  ))}
                  <input value={e.note} onChange={(ev) => update(e.ordinal, { note: ev.target.value })}
                    placeholder="Deficiency note…"
                    className="flex-1 min-w-[180px] px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-5">
          <button onClick={onBack} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Back</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save worksheet"}
          </button>
          <button onClick={printSummary} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors">
            <Printer size={14} /> Print summary
          </button>
        </div>

        {deficient > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="flex items-start gap-2 text-sm text-gray-700 mb-2">
              <Info size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
              A motion to compel is a document type commonly reviewed when responses are considered deficient.
              Whether to prepare one is your decision — review the definition and official sources first.
            </p>
            <Link href="/court-actions/new" className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700">
              Explore document categories in Court Actions <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
