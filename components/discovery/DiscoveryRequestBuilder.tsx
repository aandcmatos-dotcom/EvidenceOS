"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/db/audit";
import {
  generateDiscovery, DISCOVERY_KIND_LABEL, ADMISSION_TEMPLATES,
  type DiscoveryKind, type DiscoveryGenResult,
} from "@/lib/services/discoveryService";
import type { FactCandidate } from "@/lib/court-actions/types";
import { AlertTriangle, Check, Info, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionOption { id: string; title: string }

export default function DiscoveryRequestBuilder({ actions, onDone, onCancel, caseId, userId }: {
  actions: ActionOption[]; onDone: () => void; onCancel: () => void; caseId: string; userId: string | null;
}) {
  const [kind, setKind] = useState<DiscoveryKind>("production");
  const [recipient, setRecipient] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [templateId, setTemplateId] = useState<string>(ADMISSION_TEMPLATES[0].id);
  const [actionId, setActionId] = useState("");
  const [facts, setFacts] = useState<FactCandidate[]>([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [preview, setPreview] = useState<DiscoveryGenResult | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

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
  const template = ADMISSION_TEMPLATES.find((t) => t.id === templateId) ?? ADMISSION_TEMPLATES[0];

  const generate = () => {
    const rawTopics = topicsText.split("\n").map((t) => t.trim()).filter(Boolean);
    // For admissions, wrap user topics with the selected phrasing template (still editable below).
    const topics = kind === "admissions" ? rawTopics : rawTopics;
    const result = generateDiscovery({
      kind, recipient: recipient.trim(), topics, approvedFacts: facts,
      dateRangeStart: rangeStart || undefined, dateRangeEnd: rangeEnd || undefined,
    });
    if (kind === "admissions") {
      // Re-apply the chosen template to topic-derived items (fact-derived items keep "Admit that").
      let topicIdx = 0;
      result.items = result.items.map((it) => {
        if (it.sourceFactId === null && topicIdx < rawTopics.length) {
          const wrapped = template.apply(rawTopics[topicIdx]);
          topicIdx += 1;
          return { ...it, text: wrapped };
        }
        return it;
      });
    }
    setPreview(result);
    setEditing(null);
  };

  const editItem = (ordinal: number, text: string) => {
    if (!preview) return;
    setPreview({ ...preview, items: preview.items.map((i) => i.ordinal === ordinal ? { ...i, text } : i) });
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
        <p className="text-sm text-gray-500 mb-5">
          Numbered items are generated from your topics and (optionally) the approved facts of a court action.
          Every item is editable before saving — you author the substance; the system provides structure.
          Response deadlines are never calculated automatically.
        </p>

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
          {kind === "admissions" && (
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phrasing template for your topics</label>
              <div className="flex gap-1.5 flex-wrap">
                {ADMISSION_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => { setTemplateId(t.id); setPreview(null); }}
                    className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                      templateId === t.id ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                <li key={i.ordinal} className="flex gap-2 text-sm text-gray-800 group">
                  <span className="text-gray-400 flex-shrink-0">{i.ordinal}.</span>
                  {editing === i.ordinal ? (
                    <textarea autoFocus rows={2} value={i.text}
                      onChange={(e) => editItem(i.ordinal, e.target.value)}
                      onBlur={() => setEditing(null)}
                      className="flex-1 text-sm border border-purple-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
                  ) : (
                    <span className="flex-1">{i.text}
                      {i.sourceFactId && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 rounded-full px-1.5 py-0.5">from approved fact</span>}
                      <button onClick={() => setEditing(i.ordinal)} className="ml-2 text-gray-300 hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity align-middle">
                        <Pencil size={12} />
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <button onClick={save} disabled={saving || preview.items.length === 0}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : <span className="flex items-center justify-center gap-1.5"><Check size={15} /> Save draft</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
