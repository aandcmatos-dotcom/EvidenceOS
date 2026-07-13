"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { getReferences } from "@/lib/db/references";
import { verifyDeadline } from "@/lib/db/deadlines";
import { candidateDueDate, type DeadlineRow } from "@/lib/services/deadlines";
import { AlertTriangle, Library, Check } from "lucide-react";

interface RefOption {
  id: string; title: string; citation: string | null; summary: string | null;
  full_text: string | null;
  reference_sections: { text: string | null }[];
  reference_case_links: { case_id: string }[];
}

export default function DeadlineVerifyModal({ deadline, onClose, onVerified }: {
  deadline: DeadlineRow | null; onClose: () => void; onVerified: () => void;
}) {
  const { user, activeCase } = useAuth();
  const [refs, setRefs] = useState<RefOption[]>([]);
  const [refId, setRefId] = useState("");
  const [triggerConfirmed, setTriggerConfirmed] = useState(false);
  const [finalDate, setFinalDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !activeCase || !deadline) return;
    getReferences(user.id).then((data) => {
      const assigned = ((data ?? []) as unknown as RefOption[])
        .filter((r) => (r.reference_case_links ?? []).some((l) => l.case_id === activeCase.id));
      setRefs(assigned);
    });
    setRefId(""); setTriggerConfirmed(false); setFinalDate(""); setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline?.id, user, activeCase]);

  if (!deadline) return null;

  const selectedRef = refs.find((r) => r.id === refId) ?? null;
  const refText = selectedRef
    ? [selectedRef.summary, selectedRef.full_text, ...(selectedRef.reference_sections ?? []).map((s) => s.text)].filter(Boolean).join(" ")
    : null;
  const candidate = candidateDueDate(triggerConfirmed, deadline.trigger_date, refText);

  const verify = async () => {
    if (!user || !activeCase || !refId || !finalDate) return;
    setSaving(true);
    setError("");
    try {
      await verifyDeadline({
        id: deadline.id, caseId: activeCase.id, userId: user.id,
        countingMethodReferenceId: refId, userConfirmedDueDate: finalDate,
        computedCandidateDate: candidate?.date ?? null,
      });
      onVerified();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Verify deadline">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-sm font-semibold text-gray-900">{deadline.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Trigger event: <span className="font-medium">{deadline.trigger_event}</span>
            {deadline.trigger_date ? <> · Trigger date: <span className="font-medium">{deadline.trigger_date}</span></> : " · No trigger date recorded"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Counting-method reference <span className="text-red-400">*</span></label>
          {refs.length === 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              No references are assigned to this case. Assign the rule that governs this deadline on the References page, then return here.
            </p>
          ) : (
            <select value={refId} onChange={(e) => setRefId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              <option value="">Select the rule you verified…</option>
              {refs.map((r) => <option key={r.id} value={r.id}>{r.title}{r.citation ? ` (${r.citation})` : ""}</option>)}
            </select>
          )}
          {selectedRef && (
            <p className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 mt-2">
              <Library size={12} className="mt-0.5 flex-shrink-0 text-purple-500" />
              {selectedRef.summary ?? "No summary stored — review the full reference text."}
            </p>
          )}
        </div>

        {deadline.trigger_date && (
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={triggerConfirmed} onChange={(e) => setTriggerConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <span className="text-sm text-gray-700">I confirm the trigger date ({deadline.trigger_date}) is correct.</span>
          </label>
        )}

        {candidate && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-sm text-blue-900 font-semibold mb-1">Candidate date: {candidate.date}</p>
            <ul className="text-xs text-blue-800 space-y-0.5 list-disc pl-4">
              {candidate.assumptions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Final due date — confirmed by you <span className="text-red-400">*</span></label>
          <input type="date" value={finalDate} onChange={(e) => setFinalDate(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button onClick={verify} disabled={saving || !refId || !finalDate}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors">
          {saving ? "Verifying…" : <span className="flex items-center justify-center gap-1.5"><Check size={15} /> Verify deadline</span>}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          Until verified, this deadline stays in the requires-verification queue and never appears on the calendar.
        </p>
      </div>
    </Modal>
  );
}
