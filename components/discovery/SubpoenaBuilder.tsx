"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/db/audit";
import { getReferences } from "@/lib/db/references";
import { getCaptions, recordConfirmations } from "@/lib/db/court-actions";
import { createDocument } from "@/lib/db/documents";
import {
  resolveSubpoenaProcedure, suggestSubpoenaItems, numberItems,
  DEFAULT_CUSTODIAN_CERT, type SubpoenaProcedureResult,
} from "@/lib/services/subpoenaService";
import { buildInstrumentHtml } from "@/lib/services/instrumentPrintService";
import { detectSensitive, applyRedactions, SENSITIVE_LABEL, type RedactionMatch } from "@/lib/security/redaction";
import type { LegalReference } from "@/lib/references/types";
import { AlertTriangle, Check, Plus, Trash2, Library, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonOption { id: string; name: string; role: string }
interface ItemInput { text: string; dateRangeStart: string; dateRangeEnd: string }

const CONFIRMATIONS = [
  "I reviewed each document request.",
  "I reviewed the recipient and address information.",
  "I reviewed the procedural requirements and their sources.",
  "I understand Evidence OS has not determined that I am authorized to issue or serve this subpoena.",
];

interface RefRow {
  id: string; title: string; citation: string | null; category: string;
  verification_status: string; effective_date: string | null; summary: string | null;
  jurisdiction: string | null; keywords: string[] | null;
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
    sourceTier: "official", applicableCaseTypes: [], summary: r.summary ?? "",
    keywords: r.keywords ?? [],
    sections: (r.reference_sections ?? []).map((s, i) => ({ id: `${r.id}-${i}`, heading: s.heading ?? "", text: s.text ?? "" })),
    assignedToCase: true, notes: null,
  };
}

export default function SubpoenaBuilder({ people, caseId, userId, onDone, onCancel }: {
  people: PersonOption[]; caseId: string; userId: string | null;
  onDone: () => void; onCancel: () => void;
}) {
  const supabase = createClient();

  const [kind, setKind] = useState<"records" | "records_testimony">("records");
  const [recipientId, setRecipientId] = useState("");
  const [newCustodian, setNewCustodian] = useState({ name: "", address: "", agent: "" });
  const [items, setItems] = useState<ItemInput[]>([{ text: "", dateRangeStart: "", dateRangeEnd: "" }]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [procedure, setProcedure] = useState<SubpoenaProcedureResult | null>(null);
  const [production, setProduction] = useState({ date: "", place: "" });
  const [costs, setCosts] = useState({ witness: "", service: "", copy: "" });
  const [certText, setCertText] = useState(DEFAULT_CUSTODIAN_CERT);
  const [confirms, setConfirms] = useState<boolean[]>(CONFIRMATIONS.map(() => false));
  const [redactApproved, setRedactApproved] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const [refs, { data: events }, { data: evidence }] = await Promise.all([
      getReferences(userId),
      supabase.from("timeline_events").select("category").eq("case_id", caseId),
      supabase.from("evidence").select("category").eq("case_id", caseId),
    ]);
    const assigned = ((refs ?? []) as unknown as RefRow[])
      .filter((r) => (r.reference_case_links ?? []).some((l) => l.case_id === caseId))
      .map(toLegalReference);
    setProcedure(resolveSubpoenaProcedure(assigned));
    setSuggestions(suggestSubpoenaItems(
      (events ?? []) as { category: string }[],
      (evidence ?? []) as { category: string }[],
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, userId]);

  useEffect(() => { load(); }, [load]);

  const numbered = numberItems(items);
  const allText = numbered.map((i) => i.text).join("\n");
  const sensitive = detectSensitive(allText);
  const blocked = procedure !== null && !procedure.covered;
  const recipientName = recipientId ? (people.find((p) => p.id === recipientId)?.name ?? "") : newCustodian.name.trim();
  const canGenerate = !blocked && numbered.length > 0 && recipientName !== "" && confirms.every(Boolean);

  const updateItem = (idx: number, patch: Partial<ItemInput>) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const addSuggestion = (s: string) => {
    setItems((prev) => [...prev.filter((i) => i.text.trim() !== ""), { text: s, dateRangeStart: "", dateRangeEnd: "" }, { text: "", dateRangeStart: "", dateRangeEnd: "" }]);
    setSuggestions((prev) => prev.filter((x) => x !== s));
  };

  const generate = async () => {
    if (!userId || !canGenerate) return;
    setSaving(true);
    setError("");
    try {
      // Recipient: existing person or new records-custodian person.
      let personId = recipientId || null;
      if (!personId && newCustodian.name.trim()) {
        const { data: p, error: pErr } = await supabase.from("people").insert({
          case_id: caseId, name: newCustodian.name.trim(), role: "Records Custodian",
          notes: [newCustodian.address.trim() && `Address: ${newCustodian.address.trim()}`, newCustodian.agent.trim() && `Registered agent: ${newCustodian.agent.trim()}`].filter(Boolean).join(" · ") || null,
        } as never).select().single();
        if (pErr) throw pErr;
        personId = (p as { id: string }).id;
      }

      // Apply user-approved redactions.
      const redactedItems = numbered.map((it) => {
        if (redactApproved.size === 0) return it;
        const local = detectSensitive(it.text).filter((m: RedactionMatch) => {
          const gi = sensitive.findIndex((g) => g.text === m.text);
          return redactApproved.has(gi);
        });
        return local.length ? { ...it, text: applyRedactions(it.text, local) } : it;
      });

      const title = kind === "records"
        ? `Subpoena Duces Tecum (Records Only) — ${recipientName}`
        : `Subpoena for Testimony and Records — ${recipientName}`;

      // generated_documents row so the draft lives in the Documents pipeline.
      const body = redactedItems.map((it, i) => ({
        id: `sp-${i}`, text: `${it.text}${it.dateRangeStart || it.dateRangeEnd ? ` (${it.dateRangeStart || "start"} – ${it.dateRangeEnd || "present"})` : ""}`,
        status: "user_entered" as const,
        sources: [{ sourceType: "user_answer" as const, sourceId: `item-${i}`, label: "Your document request" }],
      }));
      const doc = await createDocument({
        case_id: caseId, created_by: userId, title, category: "Custom Document", status: "draft", body, version: 1,
      });
      const docRow = doc as { id: string };

      const { data: sp, error: spErr } = await supabase.from("subpoenas").insert({
        case_id: caseId, kind: kind === "records" ? "duces_tecum" : "testimony",
        recipient: recipientName, recipient_person_id: personId,
        custodian_address: newCustodian.address.trim() || null,
        registered_agent: newCustodian.agent.trim() || null,
        description: `${numbered.length} document request(s)`,
        production_date: production.date || null, production_place: production.place.trim() || null,
        witness_fee_estimate: costs.witness ? Number(costs.witness) : null,
        service_fee_estimate: costs.service ? Number(costs.service) : null,
        copy_cost_estimate: costs.copy ? Number(costs.copy) : null,
        custodian_cert_text: certText, generated_document_id: docRow.id, status: "draft",
        instructions_snapshot: procedure?.requirements ?? [],
      } as never).select().single();
      if (spErr) throw spErr;
      const spRow = sp as { id: string };

      const { error: itemsErr } = await supabase.from("subpoena_items").insert(
        redactedItems.map((it) => ({
          subpoena_id: spRow.id, ordinal: it.ordinal, text: it.text,
          date_range_start: it.dateRangeStart || null, date_range_end: it.dateRangeEnd || null,
        })) as never
      );
      if (itemsErr) throw itemsErr;

      await recordConfirmations("subpoena", spRow.id, CONFIRMATIONS, userId);
      await logAudit({ userId, caseId, action: "subpoena.create", entityType: "subpoenas", entityId: spRow.id, metadata: { kind } });

      // Print with the case's default caption.
      const captions = await getCaptions(caseId);
      const defaultCaption = ((captions ?? []) as { caption_text: string; is_default: boolean }[]).find((c) => c.is_default)?.caption_text ?? null;
      const html = buildInstrumentHtml({
        captionText: defaultCaption, title,
        instructions: "Produce the documents described below. If any item is objected to, state the basis and produce the remainder.",
        items: redactedItems.map((it) => ({
          ordinal: it.ordinal, text: it.text,
          dateRange: it.dateRangeStart || it.dateRangeEnd ? `${it.dateRangeStart || "start"} – ${it.dateRangeEnd || "present"}` : null,
        })),
        productionBlock: { date: production.date || null, place: production.place.trim() || null },
        custodianCertText: certText,
      });
      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the subpoena.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">New document subpoena</h2>
        <p className="text-sm text-gray-500 mb-5">
          A subpoena compels a person or organization to provide records. Issuance and service rules vary by
          jurisdiction — the requirements shown below come from the references assigned to your case, and every
          statement lists its source.
        </p>

        {/* 1. Type */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">1 · Subpoena type</p>
        <div className="flex gap-2 mb-5">
          {[{ id: "records" as const, label: "Records only (duces tecum)" }, { id: "records_testimony" as const, label: "Records + testimony" }].map((o) => (
            <button key={o.id} onClick={() => setKind(o.id)}
              className={cn("px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                kind === o.id ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-700 hover:border-purple-300")}>
              {o.label}
            </button>
          ))}
        </div>

        {/* 2. Recipient */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">2 · Recipient / records custodian</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="col-span-2">
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              <option value="">New custodian (enter below)…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
            </select>
          </div>
          {!recipientId && (
            <>
              <input value={newCustodian.name} onChange={(e) => setNewCustodian((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name (e.g. Lincoln Elementary — Records Custodian)"
                className="col-span-2 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
              <input value={newCustodian.address} onChange={(e) => setNewCustodian((f) => ({ ...f, address: e.target.value }))}
                placeholder="Records-custodian address"
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
              <input value={newCustodian.agent} onChange={(e) => setNewCustodian((f) => ({ ...f, agent: e.target.value }))}
                placeholder="Registered agent (if known)"
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </>
          )}
        </div>

        {/* 3. Document requests */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">3 · Document requests</p>
        <div className="space-y-2 mb-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-sm text-gray-400 mt-2.5 w-5 flex-shrink-0">{idx + 1}.</span>
              <div className="flex-1 grid grid-cols-[1fr_130px_130px_auto] gap-2">
                <textarea rows={1} value={it.text} onChange={(e) => updateItem(idx, { text: e.target.value })}
                  placeholder="Describe the records requested…"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
                <input type="date" value={it.dateRangeStart} onChange={(e) => updateItem(idx, { dateRangeStart: e.target.value })}
                  className="px-2 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" title="Range start" />
                <input type="date" value={it.dateRangeEnd} onChange={(e) => updateItem(idx, { dateRangeEnd: e.target.value })}
                  className="px-2 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" title="Range end" />
                <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}
                  className="text-gray-300 hover:text-red-400 disabled:opacity-30 px-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setItems((prev) => [...prev, { text: "", dateRangeStart: "", dateRangeEnd: "" }])}
          className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 mb-3">
          <Plus size={13} /> Add item
        </button>

        {suggestions.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
              <Info size={12} /> Possible items from your record gaps — added only if you choose them
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <div key={s} className="flex items-start gap-2">
                  <button onClick={() => addSuggestion(s)}
                    className="text-[11px] font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg px-2 py-1 flex-shrink-0 transition-colors">
                    + Add
                  </button>
                  <p className="text-xs text-gray-600">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Procedural requirements */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">4 · Procedural requirements (from your assigned references)</p>
        {procedure === null ? (
          <p className="text-sm text-gray-400 mb-5">Checking your reference library…</p>
        ) : blocked ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
            <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800 mb-0.5">No verified reference covers subpoena procedure — add one in References before generating.</p>
              <p className="text-xs text-red-700">Issuance, notice, objection, fee, and service rules differ by jurisdiction. Evidence OS never assumes them — assign your court&apos;s subpoena rule or instruction to this case, then return here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {procedure.requirements.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                A reference mentioning subpoenas is assigned, but no specific issuance/notice/objection/fee/service language was located in its stored sections. Review the full reference text yourself before proceeding.
              </p>
            )}
            {procedure.requirements.map((r, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-0.5"><Library size={12} className="text-purple-500" /> {r.topic}</p>
                <p className="text-xs text-gray-600 italic mb-1">&ldquo;{r.excerpt}&rdquo;</p>
                <p className="text-[10px] text-gray-400">
                  {r.sourceTitle}{r.citation ? ` · ${r.citation}` : ""}{r.effectiveDate ? ` · effective ${r.effectiveDate}` : ""}
                  {r.verificationStatus !== "verified_official" && <span className="text-orange-600 font-medium"> · needs verification</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 5. Production + costs */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">5 · Production and cost estimates</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date for production</label>
            <input type="date" value={production.date} onChange={(e) => setProduction((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Place for production</label>
            <input value={production.place} onChange={(e) => setProduction((f) => ({ ...f, place: e.target.value }))}
              placeholder="Address or 'by mail/email to…'"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-1">
          {[{ k: "witness" as const, l: "Witness fee ($)" }, { k: "service" as const, l: "Service fee ($)" }, { k: "copy" as const, l: "Copy costs ($)" }].map((c) => (
            <div key={c.k}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{c.l}</label>
              <input type="number" min={0} step="0.01" value={costs[c.k]} onChange={(e) => setCosts((f) => ({ ...f, [c.k]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mb-5">Cost fields are your own estimates, saved with the subpoena — check your court&apos;s fee schedule for actual amounts.</p>

        {/* Custodian certification */}
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Records-custodian certification (editable)</p>
        <textarea rows={5} value={certText} onChange={(e) => setCertText(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none mb-5" />

        {/* Redaction review */}
        {sensitive.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5"><AlertTriangle size={12} /> {sensitive.length} possible sensitive item{sensitive.length !== 1 ? "s" : ""} in your requests</p>
            <div className="space-y-1">
              {sensitive.map((m, i) => (
                <label key={i} className="flex items-center gap-2 text-xs bg-white border border-red-100 rounded-lg px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={redactApproved.has(i)}
                    onChange={(e) => setRedactApproved((prev) => { const n = new Set(prev); if (e.target.checked) n.add(i); else n.delete(i); return n; })}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600" />
                  <span className="font-medium text-gray-700">{SENSITIVE_LABEL[m.kind]}:</span>
                  <span className="font-mono text-gray-500">{m.text}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Confirmations */}
        <div className="space-y-1.5 mb-4">
          {CONFIRMATIONS.map((c, i) => (
            <label key={c} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={confirms[i]}
                onChange={() => setConfirms((prev) => prev.map((v, idx) => idx === i ? !v : v))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-gray-700">{c}</span>
            </label>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={generate} disabled={!canGenerate || saving}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? "Saving…" : <span className="flex items-center justify-center gap-1.5"><Check size={15} /> Save & Print Draft</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
