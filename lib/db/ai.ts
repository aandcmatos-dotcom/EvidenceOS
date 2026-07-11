import { createClient } from "@/lib/supabase/client";

export async function createConversation(caseId: string, userId: string, context: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ case_id: caseId, created_by: userId, context } as never)
    .select()
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function addMessage(payload: {
  conversationId: string; role: "user" | "assistant"; mode?: string; content: string;
  confidence?: string; missingInfo?: string[]; warnings?: string[]; strategyRefusal?: boolean;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: payload.conversationId,
      role: payload.role,
      mode: payload.mode ?? null,
      content: payload.content,
      confidence: payload.confidence ?? null,
      missing_info: payload.missingInfo ?? [],
      warnings: payload.warnings ?? [],
      strategy_refusal: payload.strategyRefusal ?? false,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function addSourceLinks(messageId: string, links: {
  sourceType: string; sourceId: string | null; label: string; reviewed: boolean;
}[]) {
  const supabase = createClient();
  const { error } = await supabase.from("ai_source_links").insert(
    links.map((l) => ({
      message_id: messageId,
      source_type: l.sourceType,
      source_id: l.sourceId,
      label: l.label,
      reviewed: l.reviewed,
    })) as never
  );
  if (error) throw error;
}

export async function getConversationMessages(conversationId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("*, ai_source_links(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function logAiRequest(payload: {
  userId: string; caseId: string | null; mode: string; context: string; usedLlm: boolean; model?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("ai_request_logs").insert({
    user_id: payload.userId,
    case_id: payload.caseId,
    mode: payload.mode,
    context: payload.context,
    used_llm: payload.usedLlm,
    model: payload.model ?? null,
  } as never);
  if (error) throw error;
}
