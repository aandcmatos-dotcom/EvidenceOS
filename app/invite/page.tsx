"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { acceptInvite } from "@/lib/db/caseMembers";

// Landing page for a case-helper invite link: /invite?token=...
export default function InvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, loading, refreshCases } = useAuth();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) return; // wait for the login/signup CTA below
    if (!token) { setStatus("error"); setError("This invite link is missing its token."); return; }
    if (status !== "idle") return;
    setStatus("working");
    acceptInvite(token)
      .then(async () => {
        await refreshCases();
        setStatus("done");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not accept this invite.");
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, token]);

  return (
    <div className="min-h-screen bg-[#1e1347] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Shield className="text-purple-600" size={22} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Case invite</h1>

        {!user && !loading && (
          <>
            <p className="text-sm text-gray-500 mb-5">Sign in or create an account with the invited email to accept this invite.</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/login?redirect=/invite?token=${encodeURIComponent(token)}`} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">Log in</Link>
              <Link href={`/signup?redirect=/invite?token=${encodeURIComponent(token)}`} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Sign up</Link>
            </div>
          </>
        )}

        {status === "working" && <p className="text-sm text-gray-500">Accepting invite…</p>}

        {status === "done" && (
          <>
            <CheckCircle2 className="text-green-600 mx-auto mb-3" size={28} />
            <p className="text-sm text-gray-600 mb-5">You&apos;ve joined the case as a helper.</p>
            <button onClick={() => router.push("/dashboard")} className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">Go to dashboard</button>
          </>
        )}

        {status === "error" && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-left">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
