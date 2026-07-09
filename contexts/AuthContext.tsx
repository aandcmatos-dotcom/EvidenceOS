"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  setActiveCase: (c: CaseRecord) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  cases: [],
  activeCase: null,
  setActiveCase: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCase, setActiveCaseState] = useState<CaseRecord | null>(null);

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

  useEffect(() => {
    if (!user) { setCases([]); setActiveCaseState(null); return; }
    supabase
      .from("cases")
      .select("id, name, case_type, status")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = (data ?? []) as CaseRecord[];
        setCases(list);
        if (list.length > 0) setActiveCaseState(list[0]);
      });
  }, [user]);

  const setActiveCase = (c: CaseRecord) => setActiveCaseState(c);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, cases, activeCase, setActiveCase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
