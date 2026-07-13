"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import DiscoveryRequestBuilder from "@/components/discovery/DiscoveryRequestBuilder";
import SubpoenaBuilder from "@/components/discovery/SubpoenaBuilder";
import { MarkServedModal, LogResponseModal, DeficiencyWorksheet, type TrackableInstrument } from "@/components/discovery/InstrumentTracking";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { getActions, getCaptions, recordConfirmations } from "@/lib/db/court-actions";
import { logAudit } from "@/lib/db/audit";
import { DISCOVERY_KIND_LABEL, type DiscoveryKind } from "@/lib/services/discoveryService";
import { buildInstrumentHtml } from "@/lib/services/instrumentPrintService";
import { FileSearch, Plus, Trash2, Printer, Check, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

// Unified row across discovery_requests and subpoenas.
interface InstrumentRow {
  table: "discovery_requests" | "subpoenas";
  id: string;
  instrument: string;
  recipient: string;
  status: string;                 // draft | finalized | served (user-reported)
  servedDate: string | null;      // user-entered
  createdAt: string;
  // print payload
  title: string;
  definitions: string | null;
  instructions: string | null;
  items: { ordinal: number; text: string; dateRange?: string | null }[];
  productionBlock?: { date: string | null; place: string | null } | null;
  custodianCertText?: string | null;
}

interface ActionOption { id: string; title: string }
interface PersonOption { id: string; name: string; role: string }

const FINALIZE_CONFIRMATIONS = [
  "I reviewed every numbered item.",
  "I reviewed the recipient information.",
  "I understand this is not legal advice and I am responsible for how this instrument is used.",
];

export default function DiscoveryPage() {
  const { user, activeCase } = useAuth();
  const [rows, setRows] = useState<InstrumentRow[]>([]);
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [defaultCaption, setDefaultCaption] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "request" | "subpoena">("list");
  const [finalizing, setFinalizing] = useState<InstrumentRow | null>(null);
  const [serving, setServing] = useState<InstrumentRow | null>(null);
  const [logging, setLogging] = useState<InstrumentRow | null>(null);
  const [worksheet, setWorksheet] = useState<InstrumentRow | null>(null);
  const [confirms, setConfirms] = useState<boolean[]>(FINALIZE_CONFIRMATIONS.map(() => false));

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: reqs }, { data: sps }, acts, { data: ppl }, captions] = await Promise.all([
        supabase.from("discovery_requests").select("*, discovery_request_items(ordinal, text)")
          .eq("case_id", activeCase.id).order("created_at", { ascending: false }),
        supabase.from("subpoenas").select("*, subpoena_items(ordinal, text, date_range_start, date_range_end)")
          .eq("case_id", activeCase.id).order("created_at", { ascending: false }),
        getActions(activeCase.id),
        supabase.from("people").select("id, name, role").eq("case_id", activeCase.id).order("name"),
        getCaptions(activeCase.id),
      ]);

      const reqRows: InstrumentRow[] = ((reqs ?? []) as Record<string, unknown>[]).map((r) => ({
        table: "discovery_requests", id: r.id as string,
        instrument: DISCOVERY_KIND_LABEL[r.kind as DiscoveryKind] ?? (r.kind as string),
        recipient: (r.recipient as string) ?? "—",
        status: (r.status as string) ?? "draft",
        servedDate: (r.served_date as string) ?? null,
        createdAt: r.created_at as string,
        title: r.title as string,
        definitions: (r.definitions as string) ?? null,
        instructions: (r.instructions as string) ?? null,
        items: ((r.discovery_request_items as { ordinal: number; text: string }[]) ?? [])
          .sort((a, b) => a.ordinal - b.ordinal).map((i) => ({ ordinal: i.ordinal, text: i.text })),
      }));

      const spRows: InstrumentRow[] = ((sps ?? []) as Record<string, unknown>[]).map((s) => ({
        table: "subpoenas", id: s.id as string,
        instrument: s.kind === "duces_tecum" ? "Subpoena Duces Tecum" : "Subpoena (Testimony + Records)",
        recipient: (s.recipient as string) ?? "—",
        status: (s.status as string) ?? "draft",
        servedDate: (s.served_date as string) ?? null,
        createdAt: s.created_at as string,
        title: `Subpoena — ${s.recipient as string}`,
        definitions: null,
        instructions: "Produce the documents described below. If any item is objected to, state the basis and produce the remainder.",
        items: ((s.subpoena_items as { ordinal: number; text: string; date_range_start: string | null; date_range_end: string | null }[]) ?? [])
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((i) => ({ ordinal: i.ordinal, text: i.text, dateRange: i.date_range_start || i.date_range_end ? `${i.date_range_start ?? "start"} – ${i.date_range_end ?? "present"}` : null })),
        productionBlock: { date: (s.production_date as string) ?? null, place: (s.production_place as string) ?? null },
        custodianCertText: (s.custodian_cert_text as string) ?? null,
      }));

      setRows([...reqRows, ...spRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setActions((acts ?? []) as unknown as ActionOption[]);
      setPeople((ppl ?? []) as unknown as PersonOption[]);
      setDefaultCaption(((captions ?? []) as { caption_text: string; is_default: boolean }[]).find((c) => c.is_default)?.caption_text ?? null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const printRow = (r: InstrumentRow) => {
    const html = buildInstrumentHtml({
      captionText: defaultCaption, title: r.title,
      definitions: r.definitions, instructions: r.instructions,
      items: r.items, productionBlock: r.productionBlock ?? null,
      custodianCertText: r.custodianCertText ?? null,
      signatureName: user?.user_metadata?.full_name ?? null,
    });
    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — allow pop-ups to print."); return; }
    win.document.write(html); win.document.close();
  };

  const deleteRow = async (r: InstrumentRow) => {
    if (!confirm(`Delete this ${r.instrument} draft?`)) return;
    await supabase.from(r.table).delete().eq("id", r.id);
    fetchAll();
  };

  const finalize = async () => {
    if (!finalizing || !user || !activeCase) return;
    await recordConfirmations(finalizing.table === "subpoenas" ? "subpoena" : "discovery_request", finalizing.id, FINALIZE_CONFIRMATIONS, user.id);
    await supabase.from(finalizing.table).update({ status: "finalized" } as never).eq("id", finalizing.id);
    await logAudit({ userId: user.id, caseId: activeCase.id, action: "discovery.finalize", entityType: finalizing.table, entityId: finalizing.id });
    setFinalizing(null);
    setConfirms(FINALIZE_CONFIRMATIONS.map(() => false));
    fetchAll();
  };

  return (
    <AppLayout title="Discovery">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : mode === "request" ? (
        <DiscoveryRequestBuilder actions={actions} caseId={activeCase.id} userId={user?.id ?? null}
          onDone={() => { setMode("list"); fetchAll(); }} onCancel={() => setMode("list")} />
      ) : mode === "subpoena" ? (
        <SubpoenaBuilder people={people} caseId={activeCase.id} userId={user?.id ?? null}
          onDone={() => { setMode("list"); fetchAll(); }} onCancel={() => setMode("list")} />
      ) : worksheet ? (
        <DeficiencyWorksheet row={worksheet as TrackableInstrument} caseId={activeCase.id} userId={user?.id ?? null}
          onBack={() => setWorksheet(null)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-gray-500 text-sm">{loading ? "Loading…" : `${rows.length} instrument${rows.length !== 1 ? "s" : ""}`}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("subpoena")} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:border-purple-300 hover:text-purple-700 transition-colors">
                <Gavel size={15} /> New Subpoena
              </button>
              <button onClick={() => setMode("request")} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                <Plus size={15} /> New Discovery Request
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <FileSearch size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No discovery instruments yet</p>
              <p className="text-gray-400 text-sm">Build requests for production, interrogatories, admissions, or a document subpoena.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {["Instrument", "Recipient / target", "Status", "Date served", "Response due", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.table}-${r.id}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{r.instrument}</p>
                        <p className="text-[11px] text-gray-400">{r.items.length} item{r.items.length !== 1 ? "s" : ""} · {new Date(r.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700">{r.recipient}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                          r.status === "finalized" ? "bg-green-100 text-green-700" :
                          r.status === "served" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600")}>
                          {r.status === "served" ? "Served (user-reported)" : r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{r.servedDate ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">requires verification</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          {r.status === "draft" && (
                            <button onClick={() => setFinalizing(r)}
                              className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-2 py-1 transition-colors">
                              <Check size={11} /> Finalize
                            </button>
                          )}
                          {!r.servedDate && r.status !== "draft" && (
                            <button onClick={() => setServing(r)}
                              className="text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2 py-1 transition-colors">
                              Mark served
                            </button>
                          )}
                          {r.servedDate && (
                            <>
                              <button onClick={() => setLogging(r)}
                                className="text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:border-purple-300 hover:text-purple-700 transition-colors">
                                Log response
                              </button>
                              <button onClick={() => setWorksheet(r)}
                                className="text-[11px] font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:border-purple-300 hover:text-purple-700 transition-colors">
                                Worksheet
                              </button>
                            </>
                          )}
                          <button onClick={() => printRow(r)} className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:border-purple-300 hover:text-purple-700 transition-colors">
                            <Printer size={11} /> Print
                          </button>
                          <button onClick={() => deleteRow(r)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={!!finalizing} onClose={() => setFinalizing(null)} title="Finalize instrument">
        <p className="text-sm text-gray-500 mb-4">Confirm each item to mark this instrument finalized. Finalizing records your review — it does not file or serve anything.</p>
        <div className="space-y-2 mb-4">
          {FINALIZE_CONFIRMATIONS.map((c, i) => (
            <label key={c} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={confirms[i]}
                onChange={() => setConfirms((prev) => prev.map((v, idx) => idx === i ? !v : v))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-gray-700">{c}</span>
            </label>
          ))}
        </div>
        <button onClick={finalize} disabled={!confirms.every(Boolean)}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors">
          Finalize
        </button>
      </Modal>

      {activeCase && (
        <>
          <MarkServedModal row={serving as TrackableInstrument | null} caseId={activeCase.id} userId={user?.id ?? null}
            onClose={() => setServing(null)} onDone={fetchAll} />
          <LogResponseModal row={logging as TrackableInstrument | null} caseId={activeCase.id} userId={user?.id ?? null}
            onClose={() => setLogging(null)} onDone={fetchAll} />
        </>
      )}

      <AssistantLauncher contextLabel="Discovery" />
    </AppLayout>
  );
}
