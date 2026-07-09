import { createClient } from "@/lib/supabase/client";

export async function getTimelineEvents(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*, timeline_people_links(person_id), evidence_timeline_links(evidence_id)")
    .eq("case_id", caseId)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTimelineEvent(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTimelineEvent(id: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timeline_events")
    .update(payload as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTimelineEvent(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("timeline_events").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleEventFlag(id: string, flagged: boolean) {
  return updateTimelineEvent(id, { flagged });
}
