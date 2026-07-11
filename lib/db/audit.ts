import { createClient } from "@/lib/supabase/client";

export async function logAudit(payload: {
  userId: string; caseId?: string | null; action: string;
  entityType?: string; entityId?: string; metadata?: Record<string, unknown>;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("audit_logs").insert({
    user_id: payload.userId,
    case_id: payload.caseId ?? null,
    action: payload.action,
    entity_type: payload.entityType ?? null,
    entity_id: payload.entityId ?? null,
    metadata: payload.metadata ?? {},
  } as never);
  if (error) throw error;
}

export async function logFileAccess(payload: {
  userId: string; caseId?: string | null; filePath: string; accessType?: "view" | "download" | "signed_url";
}) {
  const supabase = createClient();
  const { error } = await supabase.from("file_access_history").insert({
    user_id: payload.userId,
    case_id: payload.caseId ?? null,
    file_path: payload.filePath,
    access_type: payload.accessType ?? "view",
  } as never);
  if (error) throw error;
}
