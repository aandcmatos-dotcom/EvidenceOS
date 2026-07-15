"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, ArrowRight, BookMarked } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPacksForJurisdiction, applyPackToCase, getCaseAssignedReferenceCategories, type PackRow } from "@/lib/db/referencePacks";
import { computeChecklistStatus, CHECKLIST_CATEGORY_KEYS, CHECKLIST_CATEGORY_LABEL } from "@/lib/services/referenceChecklist";
import { logAudit } from "@/lib/db/audit";

// Onboarding step 2: offer packs matching the new case's state/circuit, plus the
// minimum reference checklist. Applying a pack links references and creates
// THIS user's own needs_verification attestation — never copies anyone else's.
export default function OnboardingReferencesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const caseId = params.get("case") ?? "";
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCaseAssignedReferenceCategories>>>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!caseId) { setLoading(false); return; }
    const supabase = createClient();
    const { data: caseRow } = await supabase.from("cases").select("state, circuit_district").eq("id", caseId).maybeSingle();
    const state = (caseRow as { state: string | null } | null)?.state ?? null;
    const circuit = (caseRow as { circuit_district: string | null } | null)?.circuit_district ?? null;
    const [p, cats] = await Promise.all([getPacksForJurisdiction(state, circuit), getCaseAssignedReferenceCategories(caseId)]);
    setPacks(p);
    setCategories(cats);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { refresh(); }, [refresh]);

  const apply = async (packId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setApplying(packId);
    try {
      await applyPackToCase(packId, caseId, user.id);
      await logAudit({ userId: user.id, caseId, action: "reference_pack.apply", entityType: "jurisdiction_reference_packs", entityId: packId });
      await refresh();
    } finally {
      setApplying(null);
    }
  };

  const checklist = computeChecklistStatus(categories);
  const missing = checklist.filter((c) => !c.done);

  return (
    <div className="min-h-screen bg-[#1e1347] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <div className="flex items-center gap-2.5 mb-1">
          <Shield className="text-purple-600" size={20} />
          <h1 className="text-xl font-bold text-gray-900">Reference materials</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Optional. Applying a pack links its reference pointers to your case and starts a fresh,
          <strong> unverified</strong> attestation for you — Evidence OS never copies someone else&apos;s
          verification date onto your case. You can also skip this and add references later from
          the References library.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            {packs.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Matching packs for your jurisdiction</p>
                <div className="space-y-2">
                  {packs.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <BookMarked size={15} className="text-purple-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.item_count ?? 0} reference{p.item_count === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <button onClick={() => apply(p.id)} disabled={applying === p.id}
                        className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 disabled:opacity-50">
                        {applying === p.id ? "Applying…" : "Apply pack"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Minimum reference checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {CHECKLIST_CATEGORY_KEYS.map((key) => {
                  const c = checklist.find((x) => x.key === key)!;
                  return (
                    <div key={key} className={`text-xs px-3 py-2 rounded-lg border ${c.done ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                      {c.done ? "✓ " : "— "}{CHECKLIST_CATEGORY_LABEL[key]}
                    </div>
                  );
                })}
              </div>
              {missing.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{missing.length} categor{missing.length === 1 ? "y" : "ies"} not yet on file — add them anytime from References.</p>
              )}
            </div>
          </>
        )}

        <button onClick={() => router.push("/dashboard")}
          className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
          Continue to dashboard <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
