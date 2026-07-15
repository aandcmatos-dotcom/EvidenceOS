"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { CaseRole } from "@/lib/services/roleGuard";

interface CaseRecord {
  id: string;
  name: string;
  case_type: string | null;
  status: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  cases: CaseRecord[];
  activeCase: CaseRecord | null;
  caseRole: CaseRole;
  disclaimerAckAt: string | null;
  acknowledgeDisclaimer: () => Promise<void>;
  setActiveCase: (c: CaseRecord) => void;
  refreshCases: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  cases: [],
  activeCase: null,
  caseRole: null,
  disclaimerAckAt: null,
  acknowledgeDisclaimer: async () => {},
  setActiveCase: () => {},
  refreshCases: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCase, setActiveCaseState] = useState<CaseRecord | null>(null);
  const [caseRole, setCaseRole] = useState<CaseRole>(null);
  const [disclaimerAckAt, setDisclaimerAckAt] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshCases = useCallback(async () => {
    if (!user) { setCases([]); setActiveCaseState(null); return; }
    // No owner_id filter: RLS (case_members-based, migration 012) already scopes
    // this to cases the user is a party OR helper on — filtering here would hide
    // a helper's cases entirely.
    const { data } = await supabase
      .from("cases")
      .select("id, name, case_type, status")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as CaseRecord[];
    setCases(list);
    setActiveCaseState((prev) => (prev && list.some((c) => c.id === prev.id) ? prev : list[0] ?? null));
  }, [user]);

  useEffect(() => {
    refreshCases();
    if (!user) { setDisclaimerAckAt(null); return; }
    supabase.from("profiles").select("disclaimer_ack_at").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisclaimerAckAt((data as { disclaimer_ack_at: string | null } | null)?.disclaimer_ack_at ?? null));
  }, [user, refreshCases]);

  useEffect(() => {
    if (!user || !activeCase) { setCaseRole(null); return; }
    supabase.from("case_members").select("role").eq("case_id", activeCase.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setCaseRole((data as { role: "party" | "helper" } | null)?.role ?? null));
  }, [user, activeCase]);

  const setActiveCase = (c: CaseRecord) => setActiveCaseState(c);

  const acknowledgeDisclaimer = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({ disclaimer_ack_at: now } as never).eq("id", user.id);
    if (!error) setDisclaimerAckAt(now);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{
      user, loading, cases, activeCase, caseRole, disclaimerAckAt, acknowledgeDisclaimer,
      setActiveCase, refreshCases, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
