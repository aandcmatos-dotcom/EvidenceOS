import { createClient } from "@/lib/supabase/client";
import type { CaseRole } from "@/lib/services/roleGuard";

export interface CaseMemberRow {
  id: string;
  case_id: string;
  user_id: string;
  role: "party" | "helper";
  created_at: string;
  profiles?: { email: string; full_name: string | null } | null;
}

export async function getCaseRole(caseId: string, userId: string): Promise<CaseRole> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("case_members")
    .select("role")
    .eq("case_id", caseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { role: "party" | "helper" } | null)?.role ?? null;
}

export async function getCaseMembers(caseId: string): Promise<CaseMemberRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("case_members")
    .select("*, profiles(email, full_name)")
    .eq("case_id", caseId)
    .order("role", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CaseMemberRow[];
}

export interface CaseInviteRow {
  id: string;
  case_id: string;
  email: string;
  role: string;
  token: string;
  accepted_at: string | null;
  created_at: string;
  expires_at: string;
}

// Party invites a helper by email to a specific case. The invite token is
// server-generated (default gen_random_bytes in the migration); acceptance
// happens when the invited user, once authenticated, calls acceptInvite.
export async function createInvite(caseId: string, email: string, invitedBy: string): Promise<CaseInviteRow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("case_invites")
    .insert({ case_id: caseId, email: email.trim().toLowerCase(), role: "helper", invited_by: invitedBy } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CaseInviteRow;
}

export async function getCaseInvites(caseId: string): Promise<CaseInviteRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("case_invites")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CaseInviteRow[];
}

// Called by the invited (now-authenticated) user. Validation (token, email
// match, expiry, not already used) and the case_members insert happen
// server-side in the accept_case_invite() SQL function — a helper accepting
// their own invite isn't a party yet, so the client can't satisfy the
// case_members write policy directly.
export async function acceptInvite(token: string): Promise<{ caseId: string }> {
  const supabase = createClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("accept_case_invite", { p_token: token });
  if (error) throw error;
  return { caseId: data as unknown as string };
}
