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
  generateQuestions, QUESTION_TYPE_LABEL, type QuestionType, type QuestionGenResult,
} from "@/lib/services/questionGenerationService";
import type { FactCandidate } from "@/lib/court-actions/types";
import { HelpCircle, Plus, Trash2, AlertTriangle, Printer, Check, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetRow {
  id: string; witness_name: string | null; question_type: QuestionType; goals: string | null;
  created_at: string; questions: { group_label: string; text: string; requires_foundation: boolean; ordinal: number; source_label: string | null }[];
}
interface PersonOption { id: string; name: string; role: string }
interface ActionOption { id: string; title: string }

export default function QuestionsPage() {
  const { user, activeCase } = useAuth();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [actions, setActions] = useState<ActionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: setRows }, { data: ppl }, acts] = await Promise.all([
        supabase.from("question_sets").select("*, questions(group_label, text, requires_foundation, ordinal, source_label)")
          .eq("case_id", activeCase.id).order("created_at", { ascending: false }),
        supabase.from("people").select("id, name, role").eq("case_id", activeCase.id).order("name"),
        getActions(activeCase.id),
      ]);
      setSets((setRows ?? []) as unknown as SetRow[]);
      setPeople((ppl ?? []) as unknown as PersonOption[]);
      setActions((acts ?? []) as unknown as ActionOption[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question set?")) return;
    await supabase.from("question_sets").delete().eq("id", id);
    fetchAll();
  };

  const printSet = (s: SetRow) => {
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const groups = Array.from(new Set(s.questions.map((q) => q.group_label)));
    const html = `<!doctype html><html><head><title>Questions — ${esc(s.witness_name ?? "Witness")}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.6;color:#111}
h1{font-size:18px;text-transform:uppercase;text-align:center}h2{font-size:14px;margin-top:22px;text-transform:uppercase;letter-spacing:1px}
ol li{margin:8px 0}.f{color:#b45309;font-size:11px}.s{color:#666;font-size:11px}
.disclaimer{margin-top:36px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px}
@media print{body{margin:.5in}}</style></head><body>
<h1>${esc(QUESTION_TYPE_LABEL[s.question_type])} — ${esc(s.witness_name ?? "Witness")}</h1>
${groups.map((g) => `<h2>${esc(g)}</h2><ol>${[...s.questions].filter((q) => q.group_label === g).sort((a, b) => a.ordinal - b.ordinal)
  .map((q) => `<li>${esc(q.text)}${q.requires_foundation ? ' <span class="f">[foundation needed first]</span>' : ""}${q.source_label ? ` <span class="s">(source: ${esc(q.source_label)})</span>` : ""}</li>`).join("")}</ol>`).join("")}
<p class="disclaimer">Prepared with Evidence OS from user-approved facts. Question drafts are organizational aids, not legal advice, and do not guarantee any testimony or outcome.</p>
<script>window.onload=()=>window.print()</script></body></html>`;
    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — allow pop-ups to print."); return; }
    win.document.write(html); win.document.close();
  };

  return (
    <AppLayout title="Question Builder">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : building ? (
        <QuestionBuilder people={people} actions={actions} caseId={activeCase.id} userId={user?.id ?? null}
          onDone={() => { setBuilding(false); fetchAll(); }} onCancel={() => setBuilding(false)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-gray-500 text-sm">{loading ? "Loading…" : `${sets.length} question set${sets.length !== 1 ? "s" : ""}`}</p>
            <button onClick={() => setBuilding(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              <Plus size={15} /> New Question Set
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
          ) : sets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <HelpCircle size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">No question sets yet</p>
              <p className="text-gray-400 text-sm">Build witness, deposition, direct, or cross-examination question drafts from your approved facts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <HelpCircle size={18} className="text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">{QUESTION_TYPE_LABEL[s.question_type]} — {s.witness_name ?? "Witness"}</h3>
                        <p className="text-xs text-gray-400">{s.questions.length} questions · {new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => printSet(s)} className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-purple-300 hover:text-purple-700 transition-colors">
                        <Printer size={13} /> Print / PDF
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1.5">
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
      <AssistantLauncher contextLabel="Question Builder" />
    </AppLayout>
  );
}

function QuestionBuilder({ people, actions, caseId, userId, onDone, onCancel }: {
  people: PersonOption[]; actions: ActionOption[]; caseId: string; userId: string | null;
  onDone: () => void; onCancel: () => void;
}) {
  const [witnessId, setWitnessId] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [qType, setQType] = useState<QuestionType>("direct");
  const [actionId, setActionId] = useState("");
  const [facts, setFacts] = useState<FactCandidate[]>([]);
  const [goals, setGoals] = useState("");
  const [preview, setPreview] = useState<QuestionGenResult | null>(null);
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

  const name = witnessId ? (people.find((p) => p.id === witnessId)?.name ?? "") : witnessName;
  const approvedCount = facts.filter((f) => f.decision === "approved" || f.decision === "edited").length;

  const generate = () => {
    setPreview(generateQuestions({ witnessName: name || "the witness", questionType: qType, approvedFacts: facts, goals: goals.trim() || undefined }));
  };

  const save = async () => {
    if (!preview) return;
    setSaving(true);
    setError("");
    try {
      const { data, error: setErr } = await supabase.from("question_sets").insert({
        case_id: caseId, action_id: actionId || null,
        witness_person_id: witnessId || null, witness_name: name || null,
        question_type: qType, goals: goals.trim() || null,
      } as never).select().single();
      if (setErr) throw setErr;
      const setRow = data as { id: string };
      const { error: qErr } = await supabase.from("questions").insert(
        preview.questions.map((q, i) => ({
          set_id: setRow.id, group_label: q.groupLabel, text: q.text,
          source_label: q.sourceLabel, requires_foundation: q.requiresFoundation, ordinal: i,
        })) as never
      );
      if (qErr) throw qErr;
      if (userId) await logAudit({ userId, caseId, action: "questions.create", entityType: "question_sets", entityId: setRow.id });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the question set.");
    } finally {
      setSaving(false);
    }
  };

  const groups = preview ? Array.from(new Set(preview.questions.map((q) => q.groupLabel))) : [];

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">New question set</h2>
        <p className="text-sm text-gray-500 mb-5">
          Questions are drafted only from facts you approved in a court action, screened for abusive or loaded
          phrasing, and marked where an exhibit needs foundation first. They do not guarantee any testimony or outcome.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Witness</label>
            {people.length > 0 ? (
              <select value={witnessId} onChange={(e) => setWitnessId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                <option value="">Type a name instead…</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
            ) : null}
            {!witnessId && (
              <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} placeholder="Witness name"
                className={cn("w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400", people.length > 0 && "mt-2")} />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Question type</label>
            <select value={qType} onChange={(e) => { setQType(e.target.value as QuestionType); setPreview(null); }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Approved facts from a court action</label>
        <select value={actionId} onChange={(e) => setActionId(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 mb-1">
          <option value="">None (background questions only)</option>
          {actions.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        {actionId && <p className="text-xs text-gray-400 mb-3">{approvedCount} approved fact{approvedCount !== 1 ? "s" : ""} available.</p>}

        <label className="block text-sm font-semibold text-gray-700 mb-1.5 mt-3">Goals or additional context <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none mb-4" />

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={generate} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
            {preview ? "Regenerate preview" : "Generate preview"}
          </button>
        </div>

        {preview && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            {preview.warnings.map((w) => (
              <p key={w} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-2">
                <Info size={12} className="mt-0.5 flex-shrink-0" /> {w}
              </p>
            ))}
            {preview.removedForSafety > 0 && (
              <p className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 mb-2">
                <ShieldAlert size={12} className="mt-0.5 flex-shrink-0" /> {preview.removedForSafety} draft question(s) removed by the safety screen.
              </p>
            )}
            {groups.map((g) => (
              <div key={g} className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">{g}</p>
                <ol className="space-y-1.5">
                  {preview.questions.filter((q) => q.groupLabel === g).map((q, i) => (
                    <li key={`${g}-${i}`} className="flex gap-2 text-sm text-gray-800">
                      <span className="text-gray-400 flex-shrink-0">•</span>
                      <span className="flex-1">
                        {q.text}
                        {q.requiresFoundation && <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5">foundation needed first</span>}
                        {q.sourceLabel && <span className="ml-2 text-[10px] text-gray-400">source: {q.sourceLabel}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <button onClick={save} disabled={saving || preview.questions.length === 0}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : <span className="flex items-center justify-center gap-1.5"><Check size={15} /> Save question set</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
