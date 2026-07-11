"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";

const CASE_TYPES = [
  "Family Law / Custody",
  "Divorce / Separation",
  "Domestic Violence / Protective Order",
  "Child Support",
  "Civil Lawsuit",
  "Other",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [caseName, setCaseName] = useState("");
  const [caseType, setCaseType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim() || !caseType) {
      setError("Please fill in the case name and type.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Ensure profile exists
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? "",
      email: user.email ?? "",
    } as never);

    const { error: caseError } = await supabase.from("cases").insert({
      owner_id: user.id,
      name: caseName.trim(),
      case_type: caseType,
      jurisdiction: jurisdiction.trim() || null,
      status: "active",
    } as never);

    if (caseError) {
      setError(caseError.message);
      setLoading(false);
    } else {
      // Full reload so AuthContext re-fetches cases fresh
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1347] to-[#2d1b6e] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-[#1e1347]" />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Evidence OS</span>
          </div>
          <p className="text-purple-300 text-sm">Let's set up your first case</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle size={16} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Create your case</h1>
              <p className="text-xs text-gray-500">You can add more cases later from the sidebar.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Case Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                placeholder="e.g. Smith v. Jones Custody Matter"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Case Type <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                <option value="">Select a type…</option>
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Jurisdiction <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="e.g. Los Angeles County, CA"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
              <p className="text-xs text-amber-700 leading-relaxed">
                Evidence OS helps you organize information — it does not provide legal advice.
                Always consult a licensed attorney for guidance on your legal matter.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? "Creating case…" : (
                <>Create Case & Continue <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
