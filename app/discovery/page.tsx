"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { getActions } from "@/lib/db/court-actions";
import { logAudit } from "@/lib/db/audit";
import {
  generateDiscovery, DISCOVERY_KIND_LABEL, type DiscoveryKind, type DiscoveryGenResult,
} from "@/lib/services/discoveryService";
import type { FactCandidate } from "@/lib/court-actions/types";
import { FileSearch, Plus, Trash2, AlertTriangle, Printer, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestRow {
  id: string; kind: DiscoveryKind; title: string; recipient: string | null;
  status: string; created_at: string;
  discovery_request_items: { ordinal: number; text: string }[];
}
interface ActionOption { id: string; title: string }

export default function DiscoveryPage() {
  const { user, activeCase } = useAuth();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: reqs }, acts] = await Promise.all([
        supabase.from("discovery_requests").select("*, discovery_request_items(ordinal, text)")
          .eq("case_id", activeCase.id).order("created_at", { ascending: false }),
        getActions(activeCase.id),
      ]);
      setRequests((reqs ?? []) as unknown as RequestRow[]);
      setActions(((acts ?? []) as unknown as ActionOption[]));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discovery request draft?")) return;
    await supabase.from("discovery_requests").delete().eq("id", id);
    fetchAll();
  };

  const printRequest = (r: RequestRow) => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!doctype html><html><head><title>${esc(r.title)}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.6;color:#111}
h1{font-size:18px;text-transform:uppercase;text-align:center}ol li{margin:10px 0}
.disclaimer{margin-top:36px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px}
@media print{body{margin:.5in}}</style></head><body>
<h1>${esc(r.title)}</h1>
<ol>${[...r.discovery_request_items].sort((a, b) => a.ordinal - b.ordinal).map((i) => `<li>${esc(i.text)}</li>`).join("")}</ol>
<p class="disclaimer">Prepared with Evidence OS from user-selected information. Not legal advice; review before use.</p>
<script>window.onload=()=>window.print()</script></body></html>`;
    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — allow pop-ups to print."); return; }
    win.document.write(html); win.document.close();
  };

  return (
    <AppLayout title="Discovery">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : building ? (
        <DiscoveryBuilder actions={actions} onDone={() => { setBuilding(false); fetchAll(); }} onCancel={() => setBuilding(false)}
          caseId={activeCase.id} userId={user?.id ?? null} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-gray-500 text-sm">{loading ? "Loading…" : `${requests.length} discovery draft${requests.length !== 1 ? "s" : ""}`}</p>
            <button onClick={() => setBuilding(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              <Plus size={15} /> New Discovery Request
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <FileSearch size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No discovery requests yet</p>
              <p className="text-gray-400 text-sm">Build numbered requests for production, interrogatories, or admissions from your topics and approved facts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileSearch size={18} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                        <p className="text-xs text-gray-400">{DISCOVERY_KIND_LABEL[r.kind]} · {r.discovery_request_items.length} numbered items · {new Date(r.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => printRequest(r)} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-purple-300 hover:text-purple-700 transition-colors">
                        <Printer size={13} /> Print / PDF
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <AssistantLauncher contextLabel="Discovery" />
    </AppLayout>
  );
}

function DiscoveryBuilder({ actions, onDone, onCancel, caseId, userId }: {
  actions: ActionOption[]; onDone: () => void; onCancel: () => void; caseId: string; userId: string | null;
}) {
  const [kind, setKind] = useState<DiscoveryKind>("production");
  const [recipient, setRecipient] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [actionId, setActionId] = useState("");
  const [facts, setFacts] = useState<FactCandidate[]>([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [preview, setPreview] = useState<DiscoveryGenResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  // Load approved facts from the chosen action so requests can confirm them.
  useEffect(() => {
    if (!actionId) { setFacts([]); return; }
    supabase.from("fact_candidates").select("*").eq("action_id", actionId)
      .then(({ data }) => {
        setFacts(((data ?? []) as Record<string, unknown>[]).map((f) => ({
          id: f.id as string, text: f.text as string,
          sourceType: (f.source_type as FactCandidate["sourceType"]) ?? null,
          sourceLabel: (f.source_label as string) ?? null,
          sourceDate: (f.source_date as string) ?? null,
          support: f.support as FactCandidate["support"],
          conflictNote: null,
          decision: f.decision as FactCandidate["decision"],
          editedText: (f.edited_text as string) ?? undefined,
        })));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId]);

  const approvedCount = facts.filter((f) => f.decision === "approved" || f.decision === "edited").length;

  const generate = () => {
    const topics = topicsText.split("\n").map((t) => t.trim()).filter(Boolean);
    setPreview(generateDiscovery({
      kind, recipient: recipient.trim(), topics, approvedFacts: facts,
      dateRangeStart: rangeStart || undefined, dateRangeEnd: rangeEnd || undefined,
    }));
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    setError("");
    try {
      const { data, error: reqErr } = await supabase.from("discovery_requests").insert({
        case_id: caseId, action_id: actionId || null, kind, title: preview.title,
        recipient: recipient.trim() || null,
        date_range_start: rangeStart || null, date_range_end: rangeEnd || null,
        definitions: preview.definitions, instructions: preview.instructions, status: "draft",
      } as never).select().single();
      if (reqErr) throw reqErr;
      const reqRow = data as { id: string };
      const { error: itemsErr } = await supabase.from("discovery_request_items").insert(
        preview.items.map((i) => ({ request_id: reqRow.id, ordinal: i.ordinal, text: i.text, source_fact_id: i.sourceFactId })) as never
      );
      if (itemsErr) throw itemsErr;
      if (userId) await logAudit({ userId, caseId, action: "discovery.create", entityType: "discovery_requests", entityId: reqRow.id });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">New discovery request</h2>
        <p className="text-sm text-gray-500 mb-5">Numbered items are generated from your topics and (optionally) the approved facts of a court action. Response deadlines are never calculated automatically.</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
            <select value={kind} onChange={(e) => { setKind(e.target.value as DiscoveryKind); setPreview(null); }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              {(Object.keys(DISCOVERY_KIND_LABEL) as DiscoveryKind[]).map((k) => <option key={k} value={k}>{DISCOVERY_KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recipient</label>
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Respondent"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date range start <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date range end <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
        </div>

        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Topics <span className="text-gray-400 font-normal">(one per line)</span></label>
        <textarea rows={3} value={topicsText} onChange={(e) => setTopicsText(e.target.value)}
          placeholder={"school attendance records for the 2025-26 school year\ncommunications about the April exchanges"}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none mb-4" />

        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Use approved facts from a court action <span className="text-gray-400 font-normal">(optional)</span></label>
        <select value={actionId} onChange={(e) => setActionId(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 mb-1">
          <option value="">None</option>
          {actions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        {actionId && <p className="text-xs text-gray-400 mb-3">{approvedCount} approved fact{approvedCount !== 1 ? "s" : ""} will feed numbered items.</p>}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 my-3">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={generate} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
            {preview ? "Regenerate preview" : "Generate preview"}
          </button>
        </div>

        {preview && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">{preview.title}</h3>
            {preview.warnings.map((w) => (
              <p key={w} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-2">
                <Info size={12} className="mt-0.5 flex-shrink-0" /> {w}
              </p>
            ))}
            <ol className="space-y-2 my-4">
              {preview.items.map((i) => (
                <li key={i.ordinal} className="flex gap-2 text-sm text-gray-800">
                  <span className="text-gray-400 flex-shrink-0">{i.ordinal}.</span>
                  <span className="flex-1">{i.text}
                    {i.sourceFactId && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 rounded-full px-1.5 py-0.5">from approved fact</span>}
                  </span>
                </li>
              ))}
            </ol>
            <button onClick={save} disabled={saving || preview.items.length === 0}
              className={cn("w-full py-2.5 rounded-xl text-sm font-bold transition-colors",
                "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50")}>
              {saving ? "Saving…" : <span className="flex items-center justify-center gap-1.5"><Check size={15} /> Save draft</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
