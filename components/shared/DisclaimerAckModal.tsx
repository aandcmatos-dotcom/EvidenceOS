"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PLATFORM_DISCLAIMER } from "@/lib/disclaimers";

// First-login acknowledgment (Task C). Blocks nothing structurally — a user
// could refresh past it — but records a persisted timestamp on profiles and
// re-appears every session until acknowledged, satisfying "no legal advice,
// user responsible for verifying sources and requirements."
export default function DisclaimerAckModal() {
  const { user, loading, disclaimerAckAt, acknowledgeDisclaimer } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading || !user || disclaimerAckAt) return null;

  const accept = async () => {
    setSaving(true);
    await acknowledgeDisclaimer();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">Before you start</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{PLATFORM_DISCLAIMER}</p>
        <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <span className="text-xs text-gray-600 leading-relaxed">
            I understand Evidence OS is an educational and organizational tool, not a lawyer. It does not
            provide legal advice. I am responsible for verifying sources, deadlines, and procedural requirements.
          </span>
        </label>
        <button onClick={accept} disabled={!checked || saving}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors">
          {saving ? "Saving…" : "I understand, continue"}
        </button>
      </div>
    </div>
  );
}
