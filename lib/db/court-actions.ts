import { createClient } from "@/lib/supabase/client";
import type {
  FactCandidate, CitationSuggestion, PackageComponent, ChecklistItem,
} from "@/lib/court-actions/types";

// ─── Actions ────────────────────────────────────────────────────────────────
export async function getActions(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("court_actions")
    .select("*")
    .eq("case_id", caseId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getActionById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("court_actions")
    .select("*, court_action_answers(*), court_action_sources(*), fact_candidates(*), citation_suggestions(*), court_action_packages(*, package_components(*))")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAction(payload: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("court_actions").insert(payload as never).select().single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateAction(id: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from("court_actions").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("court_actions").delete().eq("id", id);
  if (error) throw error;
}

// ─── Autosaved answers + sources ────────────────────────────────────────────
export async function saveAnswer(actionId: string, questionKey: string, answer: string) {
  const supabase = createClient();
  const { error } = await supabase.from("court_action_answers").upsert({
    action_id: actionId, question_key: questionKey, answer, answered_at: new Date().toISOString(),
  } as never, { onConflict: "action_id,question_key" });
  if (error) throw error;
}

export async function setActionSources(actionId: string, sources: { sourceType: string; sourceId: string }[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase.from("court_action_sources").delete().eq("action_id", actionId);
  if (delErr) throw delErr;
  if (sources.length === 0) return;
  const { error } = await supabase.from("court_action_sources").insert(
    sources.map((s) => ({ action_id: actionId, source_type: s.sourceType, source_id: s.sourceId })) as never
  );
  if (error) throw error;
}

// ─── Facts (approved once, reused package-wide) ─────────────────────────────
export async function saveFactCandidates(actionId: string, facts: FactCandidate[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase.from("fact_candidates").delete().eq("action_id", actionId);
  if (delErr) throw delErr;
  if (facts.length === 0) return;
  const { error } = await supabase.from("fact_candidates").insert(facts.map((f) => ({
    action_id: actionId, text: f.text, source_type: f.sourceType, source_label: f.sourceLabel,
    source_date: f.sourceDate, support: f.support, conflict_note: f.conflictNote,
    decision: f.decision, edited_text: f.editedText ?? null,
  })) as never);
  if (error) throw error;
}

export async function updateFactDecision(id: string, decision: string, editedText?: string) {
  const supabase = createClient();
  const { error } = await supabase.from("fact_candidates")
    .update({ decision, ...(editedText !== undefined ? { edited_text: editedText } : {}) } as never)
    .eq("id", id);
  if (error) throw error;
}

// ─── Citations ──────────────────────────────────────────────────────────────
export async function saveCitationSuggestions(actionId: string, suggestions: CitationSuggestion[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase.from("citation_suggestions").delete().eq("action_id", actionId);
  if (delErr) throw delErr;
  if (suggestions.length === 0) return;
  const { error } = await supabase.from("citation_suggestions").insert(suggestions.map((s) => ({
    action_id: actionId, title: s.title, citation: s.citation, why_related: s.whyRelated,
    limitations: s.limitations, excerpt: s.excerpt, decision: s.decision,
  })) as never);
  if (error) throw error;
}

export async function updateCitationDecision(id: string, decision: string) {
  const supabase = createClient();
  const { error } = await supabase.from("citation_suggestions").update({ decision } as never).eq("id", id);
  if (error) throw error;
}

// ─── Packages + components ──────────────────────────────────────────────────
export async function ensurePackage(actionId: string, components: PackageComponent[]) {
  const supabase = createClient();
  const { data: existing } = await supabase.from("court_action_packages")
    .select("id").eq("action_id", actionId).limit(1);
  let packageId = (existing as { id: string }[] | null)?.[0]?.id;
  if (!packageId) {
    const { data, error } = await supabase.from("court_action_packages")
      .insert({ action_id: actionId } as never).select().single();
    if (error) throw error;
    packageId = (data as { id: string }).id;
  }
  const { error: delErr } = await supabase.from("package_components").delete().eq("package_id", packageId);
  if (delErr) throw delErr;
  const { error } = await supabase.from("package_components").insert(components.map((c, i) => ({
    package_id: packageId, name: c.name, description: c.description,
    template_recommended: c.templateRecommended, selected: c.selected, status: c.status, ordinal: i,
  })) as never);
  if (error) throw error;
  return packageId;
}

export async function getPackageComponents(packageId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("package_components")
    .select("*").eq("package_id", packageId).order("ordinal");
  if (error) throw error;
  return data as { id: string; name: string; selected: boolean; generated_document_id: string | null }[];
}

export async function linkComponentDocument(componentId: string, documentId: string, status: string) {
  const supabase = createClient();
  const { error } = await supabase.from("package_components")
    .update({ generated_document_id: documentId, status } as never).eq("id", componentId);
  if (error) throw error;
}

export async function saveConsistencyFindings(packageId: string, findings: { field: string; values: unknown[]; note: string }[]) {
  const supabase = createClient();
  const { error: delErr } = await supabase.from("package_consistency_findings").delete().eq("package_id", packageId);
  if (delErr) throw delErr;
  if (findings.length === 0) return;
  const { error } = await supabase.from("package_consistency_findings").insert(findings.map((f) => ({
    package_id: packageId, field: f.field, values_json: f.values, note: f.note,
  })) as never);
  if (error) throw error;
}

// ─── Checklists ─────────────────────────────────────────────────────────────
export async function saveChecklist(actionId: string, items: ChecklistItem[]) {
  const supabase = createClient();
  const { data: existing } = await supabase.from("procedural_checklists")
    .select("id").eq("action_id", actionId).limit(1);
  let checklistId = (existing as { id: string }[] | null)?.[0]?.id;
  if (!checklistId) {
    const { data, error } = await supabase.from("procedural_checklists")
      .insert({ action_id: actionId } as never).select().single();
    if (error) throw error;
    checklistId = (data as { id: string }).id;
  }
  const { error: delErr } = await supabase.from("procedural_checklist_items").delete().eq("checklist_id", checklistId);
  if (delErr) throw delErr;
  const { error } = await supabase.from("procedural_checklist_items").insert(items.map((i, idx) => ({
    checklist_id: checklistId, phase: i.phase, text: i.text, origin: i.origin,
    source_label: i.sourceLabel, done: i.done, ordinal: idx,
  })) as never);
  if (error) throw error;
}

// ─── Confirmations ──────────────────────────────────────────────────────────
export async function recordConfirmations(entityType: string, entityId: string, keys: string[], userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("user_review_confirmations").insert(keys.map((k) => ({
    entity_type: entityType, entity_id: entityId, confirmation_key: k, confirmed_by: userId,
  })) as never);
  if (error) throw error;
}

// ─── Case style / captions / signature / service profiles ──────────────────
export async function getStyleProfile(caseId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("case_style_profiles").select("*").eq("case_id", caseId).maybeSingle();
  return data;
}

export async function upsertStyleProfile(caseId: string, payload: Record<string, unknown>) {
  const supabase = createClient();
  const { error } = await supabase.from("case_style_profiles")
    .upsert({ case_id: caseId, ...payload, updated_at: new Date().toISOString() } as never, { onConflict: "case_id" });
  if (error) throw error;
}

export async function getCaptions(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("court_captions").select("*").eq("case_id", caseId).order("created_at");
  if (error) throw error;
  return data;
}

export async function saveCaption(caseId: string, label: string, captionText: string, isDefault: boolean) {
  const supabase = createClient();
  if (isDefault) {
    await supabase.from("court_captions").update({ is_default: false } as never).eq("case_id", caseId);
  }
  const { error } = await supabase.from("court_captions")
    .insert({ case_id: caseId, label, caption_text: captionText, is_default: isDefault } as never);
  if (error) throw error;
}

export async function deleteCaption(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("court_captions").delete().eq("id", id);
  if (error) throw error;
}
