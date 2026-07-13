"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { uploadEvidenceFile } from "@/lib/db/evidence";
import { createDeadline } from "@/lib/db/deadlines";
import { createAction } from "@/lib/db/court-actions";
import { logAudit } from "@/lib/db/audit";
import { Inbox, AlertTriangle, ArrowRight, FileText, Sparkles } from "lucide-react";

interface InboundRow {
  id: string; filing_type: string | null; filer: string | null; date_served: string | null;
  hearing_date: string | null; response_action_id: string | null; created_at: string;
}

export default function InboundPage() {
  const router = useRouter();
  const { user, activeCase } = useAuth();
  const supabase = createClient();

  const [filings, setFilings] = useState<InboundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ filingType: "", filer: "", dateServed: "", hearingDate: "", responseObligation: true, notes: "" });
  const [suggested, setSuggested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchFilings = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("inbound_filings").select("*")
      .eq("case_id", activeCase.id).order("created_at", { ascending: false });
    setFilings((data ?? []) as unknown as InboundRow[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase]);

  useEffect(() => { fetchFilings(); }, [fetchFilings]);

  // Optional classification suggestion (server-side LLM; silently skipped without a key).
  const suggest = async (f: File) => {
    try {
      const res = await fetch("/api/intake-suggest", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: f.name, excerpt: "" }),
      });
      const data = await res.json();
      if (data?.suggestion?.filingType) {
        setForm((prev) => ({
          ...prev,
          filingType: prev.filingType || data.suggestion.filingType,
          filer: prev.filer || (data.suggestion.filer ?? ""),
        }));
        setSuggested(true);
      }
    } catch { /* fall back to the plain form */ }
  };

  const save = async (planResponse: boolean) => {
    if (!user || !activeCase || !file || !form.filingType.trim()) {
      setError("A document file and filing type are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Store the received document as evidence.
      const path = await uploadEvidenceFile(activeCase.id, file);
      const { data: ev, error: evErr } = await supabase.from("evidence").insert({
        case_id: activeCase.id, uploaded_by: user.id,
        title: `Received filing — ${form.filingType.trim()}`,
        category: "Court Orders", file_path: path,
        file_type: file.name.split(".").pop()?.toUpperCase() ?? null,
        file_size_bytes: file.size, status: "pending",
        tags: ["pleading/filing — received"],
        notes: form.notes.trim() || null,
      } as never).select().single();
      if (evErr) throw evErr;
      const evidenceId = (ev as { id: string }).id;

      // 2. Response obligation → requires-verification deadline.
      let deadlineId: string | null = null;
      if (form.responseObligation) {
        const dl = await createDeadline({
          caseId: activeCase.id, sourceType: "inbound_filing", sourceId: null,
          title: `Response to received ${form.filingType.trim()}`,
          triggerEvent: "Date served/received", triggerDate: form.dateServed || null,
        });
        deadlineId = dl.id;
      }

      // 3. Noticed hearing → hearings row (user-entered date is a verified fact).
      let hearingId: string | null = null;
      if (form.hearingDate) {
        const { data: hr, error: hrErr } = await supabase.from("hearings").insert({
          case_id: activeCase.id, hearing_type: `Noticed: ${form.filingType.trim()}`,
          hearing_date: new Date(form.hearingDate + "T09:00:00").toISOString(),
          notes: "Created from an inbound filing. Confirm details against the notice itself.",
        } as never).select().single();
        if (hrErr) throw hrErr;
        hearingId = (hr as { id: string }).id;
      }

      // 4. Optional response action through the standard 10-step wizard.
      let responseActionId: string | null = null;
      if (planResponse) {
        const action = await createAction({
          case_id: activeCase.id, created_by: user.id,
          title: `Respond to ${form.filingType.trim()}`,
          task_type: "respond_to_motion", status: "in_progress", step: 1,
          free_text: `Responding to a received filing: ${form.filingType.trim()}${form.filer ? `, filed by ${form.filer}` : ""}${form.dateServed ? `, served/received ${form.dateServed}` : ""}. The received document is linked as a source.`,
        });
        responseActionId = action.id;
        await supabase.from("court_action_sources").insert({
          action_id: action.id, source_type: "evidence", source_id: evidenceId,
        } as never);
      }

      const { data: filing, error: fErr } = await supabase.from("inbound_filings").insert({
        case_id: activeCase.id, evidence_id: evidenceId,
        filing_type: form.filingType.trim(), filer: form.filer.trim() || null,
        date_served: form.dateServed || null, hearing_date: form.hearingDate || null,
        hearing_id: hearingId, deadline_id: deadlineId, response_action_id: responseActionId,
        notes: form.notes.trim() || null,
      } as never).select().single();
      if (fErr) throw fErr;
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "inbound_filing.create", entityType: "inbound_filings", entityId: (filing as { id: string }).id });

      if (planResponse && responseActionId) {
        router.push(`/court-actions/${responseActionId}`);
        return;
      }
      setFile(null);
      setForm({ filingType: "", filer: "", dateServed: "", hearingDate: "", responseObligation: true, notes: "" });
      setSuggested(false);
      fetchFilings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the filing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Inbound Filings">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Intake */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <Inbox size={18} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">I received or was served with a filing</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              The document is saved to Evidence, any response obligation becomes a deadline in
              <strong> requires verification</strong> status, and a noticed hearing goes on your calendar.
            </p>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">The document <span className="text-red-400">*</span></label>
            <input type="file" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) suggest(f); }}
              className="w-full text-sm text-gray-500 mb-3" />
            {suggested && (
              <p className="flex items-center gap-1.5 text-[11px] text-purple-600 bg-purple-50 rounded-lg px-2.5 py-1.5 mb-3">
                <Sparkles size={11} /> Fields below were prefilled from the file — review and correct them.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filing type <span className="text-red-400">*</span></label>
                <input value={form.filingType} onChange={(e) => setForm((f) => ({ ...f, filingType: e.target.value }))}
                  placeholder="e.g. Motion for Contempt"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filed by</label>
                <input value={form.filer} onChange={(e) => setForm((f) => ({ ...f, filer: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date served / received</label>
                <input type="date" value={form.dateServed} onChange={(e) => setForm((f) => ({ ...f, dateServed: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing date <span className="text-gray-400 font-normal">(if noticed)</span></label>
                <input type="date" value={form.hearingDate} onChange={(e) => setForm((f) => ({ ...f, hearingDate: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer mb-3">
              <input type="checkbox" checked={form.responseObligation}
                onChange={(e) => setForm((f) => ({ ...f, responseObligation: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-gray-700">This filing may require a response — create a deadline (requires verification)</span>
            </label>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none mb-4" />

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => save(false)} disabled={saving}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save filing"}
              </button>
              <button onClick={() => save(true)} disabled={saving}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                Save & plan a response <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Received filings list */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Received filings</p>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : filings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <FileText size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nothing logged yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filings.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-sm font-semibold text-gray-900">{f.filing_type ?? "Filing"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {f.filer ? `Filed by ${f.filer} · ` : ""}{f.date_served ? `served ${f.date_served} · ` : ""}
                      {f.hearing_date ? `hearing ${f.hearing_date} · ` : ""}logged {new Date(f.created_at).toLocaleDateString()}
                    </p>
                    {f.response_action_id && (
                      <button onClick={() => router.push(`/court-actions/${f.response_action_id}`)}
                        className="mt-2 text-xs font-medium text-purple-600 hover:text-purple-700">
                        Open response workspace →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <AssistantLauncher contextLabel="Inbound Filings" />
    </AppLayout>
  );
}
