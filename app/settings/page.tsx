"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database, LogOut, Check, Users, UserPlus, Download, Sparkles, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCaseMembers, getCaseInvites, createInvite, type CaseMemberRow, type CaseInviteRow } from "@/lib/db/caseMembers";
import { buildCaseExport } from "@/lib/services/caseExport";
import { logAudit } from "@/lib/db/audit";

export default function SettingsPage() {
  const { user, cases, activeCase, caseRole, setActiveCase, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [members, setMembers] = useState<CaseMemberRow[]>([]);
  const [invites, setInvites] = useState<CaseInviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const [aiStatus, setAiStatus] = useState<{ configured: boolean; connected: boolean; model: string | null; error: string | null } | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);

  const supabase = createClient();

  const checkAiConnection = async () => {
    setCheckingAi(true);
    try {
      const res = await fetch("/api/ai-status");
      setAiStatus(await res.json());
    } catch {
      setAiStatus({ configured: false, connected: false, model: null, error: "Could not reach the status check itself." });
    } finally {
      setCheckingAi(false);
    }
  };

  const loadTeam = useCallback(async () => {
    if (!activeCase) { setMembers([]); setInvites([]); return; }
    try {
      const [m, i] = await Promise.all([getCaseMembers(activeCase.id), getCaseInvites(activeCase.id)]);
      setMembers(m);
      setInvites(i);
    } catch {
      setMembers([]); setInvites([]);
    }
  }, [activeCase]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCase || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    try {
      await createInvite(activeCase.id, inviteEmail.trim(), user.id);
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "case_invite.create", entityType: "case_invites" });
      setInviteEmail("");
      await loadTeam();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Could not send the invite.");
    } finally {
      setInviting(false);
    }
  };

  const exportCase = async () => {
    if (!user || !activeCase) return;
    setExporting(true);
    try {
      const blob = await buildCaseExport(activeCase.id, activeCase.name, user.id, (p) => setExportProgress(`${p.table} (${p.done + 1}/${p.total})`));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeCase.name.replace(/[^\w-]+/g, "_")}-export.zip`;
      a.click();
      URL.revokeObjectURL(url);
      await logAudit({ userId: user.id, caseId: activeCase.id, action: "case.export", entityType: "cases", entityId: activeCase.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
      setExportProgress("");
    }
  };

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

        {/* AI Connection */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-purple-600" />
            <h2 className="font-semibold text-gray-900 text-sm">AI Connection</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Every AI-assisted feature (import classification, document drafting, question
            generation) works without this — it falls back to deterministic, non-AI logic
            automatically. This checks whether your <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> is
            actually reachable, so a bad key doesn&apos;t just silently look like nothing happened.
          </p>

          {aiStatus && (
            <div className={cn("flex items-start gap-2.5 rounded-xl p-3 mb-4 border",
              aiStatus.connected ? "bg-green-50 border-green-200" :
              aiStatus.configured ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
              {aiStatus.connected ? <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" /> :
                aiStatus.configured ? <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" /> :
                <HelpCircle size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />}
              <div className="text-sm">
                {aiStatus.connected ? (
                  <p className="text-green-800"><strong>Connected.</strong> Using model <code className="text-xs bg-white/60 px-1 py-0.5 rounded">{aiStatus.model}</code>.</p>
                ) : aiStatus.configured ? (
                  <>
                    <p className="text-red-800 font-semibold mb-0.5">Key present, but the connection failed.</p>
                    <p className="text-red-700 text-xs">{aiStatus.error}</p>
                  </>
                ) : (
                  <p className="text-gray-600">Not configured — <code className="text-xs bg-white px-1 py-0.5 rounded">ANTHROPIC_API_KEY</code> is not set. AI features use their deterministic fallback.</p>
                )}
              </div>
            </div>
          )}

          <button onClick={checkAiConnection} disabled={checkingAi}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            <Sparkles size={14} /> {checkingAi ? "Checking…" : "Check connection"}
          </button>
        </div>

        {/* Team & Access */}
        {activeCase && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-purple-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Team &amp; Access — {activeCase.name}</h2>
            </div>
            <div className="space-y-2 mb-4">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.profiles?.full_name || m.profiles?.email || m.user_id}</p>
                    <p className="text-xs text-gray-400">{m.profiles?.email}</p>
                  </div>
                  <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold capitalize",
                    m.role === "party" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>{m.role}</span>
                </div>
              ))}
              {invites.filter((i) => !i.accepted_at).map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-sm text-amber-800">{i.email}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite?token=${i.token}`)}
                    className="text-xs text-amber-700 font-medium hover:underline"
                  >
                    Copy invite link
                  </button>
                </div>
              ))}
            </div>
            {caseRole === "party" ? (
              <form onSubmit={sendInvite} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Invite a helper by email</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="helper@example.com"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
                </div>
                <button type="submit" disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  <UserPlus size={14} /> {inviting ? "Sending…" : "Invite"}
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-400">Only the case party can invite helpers.</p>
            )}
            {inviteError && <p className="text-xs text-red-600 mt-2">{inviteError}</p>}
            <p className="text-xs text-gray-400 mt-3">
              Helpers can create, edit, upload, and prepare drafts. Confirmations, deadline verification, final
              approvals, and document export/finalization stay with the party — helper work shows as
              &quot;Awaiting party approval&quot; until reviewed.
            </p>
          </div>
        )}

        {/* Full-case export */}
        {activeCase && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <Download size={16} className="text-purple-600" />
              <h2 className="font-semibold text-gray-900 text-sm">Export this case</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Download a ZIP of every record and file for {activeCase.name} — your own copy, portable to
              another tool at any time. Includes case data as JSON plus the stored evidence files.
            </p>
            <button onClick={exportCase} disabled={exporting}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              <Download size={14} /> {exporting ? (exportProgress || "Exporting…") : "Download full export"}
            </button>
          </div>
        )}

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
