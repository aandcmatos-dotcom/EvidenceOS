"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database, LogOut, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, cases, activeCase, setActiveCase, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, plan").eq("id", user.id).single()
      .then(({ data }) => {
        const profile = data as { full_name: string | null; plan: string | null } | null;
        setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
        setPlan(profile?.plan ?? "free");
      });
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName.trim() } as never)
      .eq("id", user.id);
    setSaving(false);
    if (error) { alert(`Could not save: ${error.message}`); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = (fullName || user?.email || "??")
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xl font-bold">
              {initials}
            </div>
            <div>
              <p className="font-bold text-gray-900">{fullName || "Your Profile"}</p>
              <p className="text-sm text-gray-500">{user?.email ?? ""}</p>
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-medium mt-1 inline-block capitalize">{plan} Plan</span>
            </div>
          </div>
          <form onSubmit={saveProfile} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
            <button type="submit" disabled={saving}
              className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
                saved ? "bg-green-100 text-green-700" : "bg-purple-600 text-white hover:bg-purple-700")}>
              {saved ? (<span className="flex items-center gap-1.5"><Check size={14} /> Saved</span>) : saving ? "Saving…" : "Save"}
            </button>
          </form>
        </div>

        {/* Cases */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-purple-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Your Cases</h2>
          </div>
          {cases.length === 0 ? (
            <p className="text-sm text-gray-400">No cases yet.</p>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.case_type ?? "No type"} · {c.status ?? "active"}</p>
                  </div>
                  {activeCase?.id === c.id ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">Active</span>
                  ) : (
                    <button onClick={() => setActiveCase(c)}
                      className="text-xs border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full hover:bg-white transition-colors">
                      Switch to
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Account</h2>
          <button onClick={signOut}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
            <LogOut size={15} /> Sign Out
          </button>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Legal Disclaimer:</strong> Evidence OS is an organizational tool only. It does not provide legal advice,
            does not constitute an attorney-client relationship, and should not be used as a substitute for consulting a
            licensed attorney. All information entered is user-provided.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
