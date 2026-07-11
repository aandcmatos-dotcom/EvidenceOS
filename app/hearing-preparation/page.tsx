"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { createAction } from "@/lib/db/court-actions";
import { logAudit } from "@/lib/db/audit";
import { CalendarClock, ArrowRight, AlertTriangle, Gavel } from "lucide-react";
import Link from "next/link";

interface PackageRow {
  id: string; name: string; hearing_type: string | null; hearing_date: string | null;
  action_id: string | null; created_at: string;
}

// "Build My Hearing Package": creates a hearing-prep court action (which carries the
// package workflow — same approved fact set drives every component) plus a
// hearing_packages record for tracking.
export default function HearingPreparationPage() {
  const router = useRouter();
  const { user, activeCase } = useAuth();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ hearingType: "", hearingDate: "", timeAllowed: "" });

  const supabase = createClient();

  const fetchPackages = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase.from("hearing_packages").select("*")
        .eq("case_id", activeCase.id).order("created_at", { ascending: false });
      setPackages((data ?? []) as unknown as PackageRow[]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const build = async () => {
    if (!user || !activeCase || !form.hearingType.trim()) return;
    setCreating(true);
    setError("");
    try {
      const action = await createAction({
        case_id: activeCase.id, created_by: user.id,
        title: `Hearing package — ${form.hearingType.trim()}`,
        task_type: "hearing_prep", status: "in_progress", step: 1,
        free_text: `Hearing type: ${form.hearingType.trim()}${form.hearingDate ? `. Hearing date (user-entered): ${form.hearingDate}` : ""}${form.timeAllowed ? `. Time allowed: ${form.timeAllowed}` : ""}.`,
      });
      const { error: pkgErr } = await supabase.from("hearing_packages").insert({
        case_id: activeCase.id, action_id: action.id, name: `Hearing package — ${form.hearingType.trim()}`,
        hearing_type: form.hearingType.trim(), hearing_date: form.hearingDate || null,
        time_allowed: form.timeAllowed.trim() || null,
      } as never);
      if (pkgErr) throw pkgErr;
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "hearing_package.create", entityType: "court_actions", entityId: action.id });
      router.push(`/court-actions/${action.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the hearing package.");
      setCreating(false);
    }
  };

  return (
    <AppLayout title="Hearing Preparation">
      <div className="mb-5"><Disclaimer compact /></div>

      {!activeCase ? (
        <div className="text-center py-16 text-gray-400 text-sm">Select or create a case first.</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Builder */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock size={18} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Build my hearing package</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Creates a guided court action preconfigured for hearing preparation. Every component —
              summaries, witness and exhibit lists, questions, checklists — is generated from the same
              approved fact set so dates, names, and requested relief stay consistent.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing type <span className="text-red-400">*</span></label>
            <input value={form.hearingType} onChange={(e) => setForm((f) => ({ ...f, hearingType: e.target.value }))}
              placeholder="e.g. Temporary relief hearing"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 mb-3" />
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hearing date <span className="text-gray-400 font-normal">(if known)</span></label>
                <input type="date" value={form.hearingDate} onChange={(e) => setForm((f) => ({ ...f, hearingDate: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time allowed <span className="text-gray-400 font-normal">(if known)</span></label>
                <input value={form.timeAllowed} onChange={(e) => setForm((f) => ({ ...f, timeAllowed: e.target.value }))}
                  placeholder="e.g. 30 minutes"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
              </div>
            </div>
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <button onClick={build} disabled={creating || !form.hearingType.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {creating ? "Creating…" : <>Start Building <ArrowRight size={15} /></>}
            </button>
          </div>

          {/* Existing packages */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your hearing packages</p>
            {loading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : packages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <p className="text-gray-400 text-sm">No hearing packages yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.map((p) => (
                  <Link key={p.id} href={p.action_id ? `/court-actions/${p.action_id}` : "/court-actions"}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-purple-200 transition-all group">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gavel size={17} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.hearing_date ? `Hearing ${p.hearing_date} · ` : ""}created {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <ArrowRight size={15} className="text-gray-300 group-hover:text-purple-400 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <AssistantLauncher contextLabel="Hearing Preparation" />
    </AppLayout>
  );
}
