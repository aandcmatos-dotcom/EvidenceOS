import { createClient } from "@/lib/supabase/client";

export async function getTemplates(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*, template_variables(*)")
    .or(`built_in.eq.true,owner_id.eq.${userId}`)
    .order("built_in", { ascending: false })
    .order("name");
  if (error) throw error;
  return data;
}

export async function createTemplate(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDocuments(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*, document_sources(*)")
    .eq("case_id", caseId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDocumentById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*, document_sources(*), document_versions(*), document_exports(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createDocument(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDocument(id: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("generated_documents")
    .update(payload as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDocument(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("generated_documents").delete().eq("id", id);
  if (error) throw error;
}

// Saves a new version snapshot: current body + the sources/reference versions used.
export async function saveDocumentVersion(payload: {
  documentId: string;
  version: number;
  body: unknown;
  sourcesSnapshot: unknown[];
  referenceVersionsSnapshot: unknown[];
  createdBy: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("document_versions").insert({
    document_id: payload.documentId,
    version: payload.version,
    body: payload.body,
    sources_snapshot: payload.sourcesSnapshot,
    reference_versions_snapshot: payload.referenceVersionsSnapshot,
    created_by: payload.createdBy,
  } as never);
  if (error) throw error;
}

export async function addDocumentSources(documentId: string, sources: {
  sourceType: string; sourceId: string | null; refVersion: number | null; excerpt: string | null;
}[]) {
  const supabase = createClient();
  const { error } = await supabase.from("document_sources").insert(
    sources.map((s) => ({
      document_id: documentId,
      source_type: s.sourceType,
      source_id: s.sourceId,
      ref_version: s.refVersion,
      excerpt: s.excerpt,
    })) as never
  );
  if (error) throw error;
}

export async function recordExport(payload: {
  documentId: string; format: string; exportedBy: string; attested: boolean;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("document_exports").insert({
    document_id: payload.documentId,
    format: payload.format,
    exported_by: payload.exportedBy,
    attested: payload.attested,
  } as never);
  if (error) throw error;

  await supabase.from("export_history").insert({
    user_id: payload.exportedBy,
    document_id: payload.documentId,
    format: payload.format,
    attested: payload.attested,
  } as never);
}
