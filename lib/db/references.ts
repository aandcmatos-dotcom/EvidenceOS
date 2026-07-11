import { createClient } from "@/lib/supabase/client";

export async function getReferences(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("legal_references")
    .select("*, reference_sections(*), reference_case_links(case_id)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReferenceById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("legal_references")
    .select("*, reference_sections(*), reference_case_links(case_id), legal_reference_versions(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createReference(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("legal_references")
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReference(id: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("legal_references")
    .update(payload as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReference(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("legal_references").delete().eq("id", id);
  if (error) throw error;
}

export async function assignReferenceToCase(referenceId: string, caseId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reference_case_links")
    .upsert({ reference_id: referenceId, case_id: caseId } as never);
  if (error) throw error;
}

export async function unassignReferenceFromCase(referenceId: string, caseId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reference_case_links")
    .delete()
    .eq("reference_id", referenceId)
    .eq("case_id", caseId);
  if (error) throw error;
}

// Records a verification action and updates the reference's status/last_verified_date.
export async function verifyReference(id: string, userId: string, note?: string) {
  const supabase = createClient();
  const { error: recError } = await supabase.from("verification_records").insert({
    reference_id: id,
    verified_by: userId,
    status: "verified_official",
    note: note ?? null,
  } as never);
  if (recError) throw recError;

  const { error } = await supabase
    .from("legal_references")
    .update({
      verification_status: "verified_official",
      last_verified_date: new Date().toISOString().slice(0, 10),
    } as never)
    .eq("id", id);
  if (error) throw error;
}

// Creates a new version of a reference: archives the current full_text into
// legal_reference_versions, marks it superseded, and bumps the version number.
export async function supersedeReference(id: string, newFullText: string, newEffectiveDate: string | null) {
  const supabase = createClient();
  const { data: current, error: fetchErr } = await supabase
    .from("legal_references")
    .select("version, full_text, effective_date")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  const cur = current as { version: number; full_text: string | null; effective_date: string | null };

  const { error: verErr } = await supabase.from("legal_reference_versions").insert({
    reference_id: id,
    version: cur.version,
    effective_date: cur.effective_date,
    superseded_date: new Date().toISOString().slice(0, 10),
    full_text: cur.full_text,
  } as never);
  if (verErr) throw verErr;

  const { error } = await supabase
    .from("legal_references")
    .update({
      version: cur.version + 1,
      full_text: newFullText,
      effective_date: newEffectiveDate,
      verification_status: "needs_verification",
    } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function addReferenceSections(referenceId: string, sections: { heading: string; text: string; ordinal: number }[]) {
  const supabase = createClient();
  const { error } = await supabase
    .from("reference_sections")
    .insert(sections.map((s) => ({ ...s, reference_id: referenceId })) as never);
  if (error) throw error;
}
