import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/db/audit";
import { canVerify } from "@/lib/services/deadlines";

// Deadlines are ALWAYS created requiring verification — there is deliberately no
// way to create one already verified.
export async function createDeadline(payload: {
  caseId: string; sourceType: string; sourceId: string | null;
  title: string; triggerEvent: string; triggerDate: string | null; notes?: string | null;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.from("deadlines").insert({
    case_id: payload.caseId, source_type: payload.sourceType, source_id: payload.sourceId,
    title: payload.title, trigger_event: payload.triggerEvent, trigger_date: payload.triggerDate,
    status: "requires_verification", notes: payload.notes ?? null,
  } as never).select().single();
  if (error) throw error;
  return data as { id: string };
}

export async function getDeadlines(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("deadlines").select("*")
    .eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Verification requires a user-selected counting-method reference and a
// user-confirmed final due date. The audit log records who/when/what basis.
export async function verifyDeadline(payload: {
  id: string; caseId: string; userId: string;
  countingMethodReferenceId: string; userConfirmedDueDate: string;
  computedCandidateDate: string | null;
}) {
  if (!canVerify({ countingMethodReferenceId: payload.countingMethodReferenceId, userConfirmedDueDate: payload.userConfirmedDueDate })) {
    throw new Error("Verification requires a selected counting-method reference and a confirmed due date.");
  }
  const supabase = createClient();
  const { error } = await supabase.from("deadlines").update({
    counting_method_reference_id: payload.countingMethodReferenceId,
    computed_due_date: payload.computedCandidateDate,
    due_date: payload.userConfirmedDueDate,
    status: "verified",
    verified_by: payload.userId,
    verified_at: new Date().toISOString(),
  } as never).eq("id", payload.id);
  if (error) throw error;
  await logAudit({
    userId: payload.userId, caseId: payload.caseId, action: "deadline.verify",
    entityType: "deadlines", entityId: payload.id,
    metadata: { basisReferenceId: payload.countingMethodReferenceId, dueDate: payload.userConfirmedDueDate },
  });
}

export async function updateDeadlineStatus(id: string, status: "completed" | "superseded") {
  const supabase = createClient();
  const { error } = await supabase.from("deadlines").update({ status } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteDeadline(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("deadlines").delete().eq("id", id);
  if (error) throw error;
}
