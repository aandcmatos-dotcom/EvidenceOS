import { createClient } from "@/lib/supabase/client";

export async function getEvidence(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getEvidenceById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence")
    .select("*, evidence_timeline_links(timeline_event_id), evidence_people_links(person_id)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createEvidence(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence")
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvidence(id: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("evidence")
    .update(payload as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvidence(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("evidence").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadEvidenceFile(caseId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${caseId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("evidence-files")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function getEvidenceFileUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("evidence-files")
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function linkEvidenceToEvent(evidenceId: string, eventId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("evidence_timeline_links")
    .upsert({ evidence_id: evidenceId, timeline_event_id: eventId } as never);
  if (error) throw error;
}

export async function linkEvidenceToPerson(evidenceId: string, personId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("evidence_people_links")
    .upsert({ evidence_id: evidenceId, person_id: personId } as never);
  if (error) throw error;
}
