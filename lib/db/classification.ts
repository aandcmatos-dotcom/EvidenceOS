import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/db/audit";
import { createDeadline } from "@/lib/db/deadlines";
import type { ClassificationResult } from "@/lib/ai/schema";
import { routeClassification, targetTable } from "@/lib/services/importRouting";

// Map classification subjects/type → the existing evidence category enum.
function evidenceCategory(c: ClassificationResult): string {
  const s = new Set(c.subjectCategories);
  if (c.primaryType === "court_order") return "Court Orders";
  if (c.primaryType === "communication" || s.has("communication")) return "Messages";
  if (s.has("school")) return "School";
  if (s.has("medical")) return "Medical";
  if (s.has("police")) return "Police";
  if (c.subtype === "photo") return "Photos";
  return "Other";
}

export interface ClassificationRow {
  id: string; import_file_id: string; case_id: string;
  primary_type: string | null; subtype: string | null; subject_categories: string[];
  document_date: string | null; date_confidence: string | null;
  detected_people: { name: string; suggestedRole: string; matchedPersonId: string | null }[];
  summary: string | null; detected_case_number: string | null; case_number_matches: boolean | null;
  confidence: string; flags: string[]; routing: string; classification_source: string;
  user_edited_fields: string[]; resolved: boolean;
  // joined from import_files:
  original_filename: string; original_folder_path: string | null; storage_path: string | null;
  extracted_text: string | null; promoted_evidence_id: string | null; status: string;
}

// Persist a classification WITHOUT overwriting any field the user has edited.
export async function saveClassification(
  importFileId: string, caseId: string, result: ClassificationResult,
) {
  const supabase = createClient();
  const { data: existing } = await supabase.from("import_file_classifications")
    .select("id, user_edited_fields").eq("import_file_id", importFileId).maybeSingle();
  const edited = new Set(((existing as { user_edited_fields: string[] } | null)?.user_edited_fields) ?? []);
  const routing = routeClassification(result).routing;

  const full: Record<string, unknown> = {
    import_file_id: importFileId, case_id: caseId,
    primary_type: result.primaryType, subtype: result.subtype,
    subject_categories: result.subjectCategories, document_date: result.documentDate,
    date_confidence: result.dateConfidence, detected_people: result.detectedPeople,
    summary: result.summary, detected_case_number: result.detectedCaseNumber,
    case_number_matches: result.caseNumberMatches, confidence: result.confidence,
    flags: result.flags, routing, classification_source: result.source,
  };
  // Drop any user-edited field so reclassification never overwrites it.
  for (const f of edited) delete full[f];

  if (existing) {
    const { error } = await supabase.from("import_file_classifications")
      .update(full as never).eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("import_file_classifications").insert(full as never);
    if (error) throw error;
  }
  return routing;
}

// A user edit: apply the change AND record the field as protected.
export async function editClassificationField(classificationId: string, field: string, value: unknown) {
  const supabase = createClient();
  const { data } = await supabase.from("import_file_classifications")
    .select("user_edited_fields").eq("id", classificationId).single();
  const edited = new Set((data as { user_edited_fields: string[] } | null)?.user_edited_fields ?? []);
  edited.add(field);
  const { error } = await supabase.from("import_file_classifications")
    .update({ [field]: value, user_edited_fields: Array.from(edited) } as never).eq("id", classificationId);
  if (error) throw error;
}

export async function getBatchClassifications(batchId: string): Promise<ClassificationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("import_files")
    .select("id, original_filename, original_folder_path, storage_path, extracted_text, promoted_evidence_id, status, import_file_classifications(*)")
    .eq("batch_id", batchId).order("original_filename");
  if (error) throw error;
  const rows: ClassificationRow[] = [];
  for (const f of (data ?? []) as Record<string, unknown>[]) {
    const cl = (f.import_file_classifications as Record<string, unknown>[] | null)?.[0];
    if (!cl) continue;
    rows.push({
      ...(cl as unknown as ClassificationRow),
      original_filename: f.original_filename as string,
      original_folder_path: (f.original_folder_path as string) ?? null,
      storage_path: (f.storage_path as string) ?? null,
      extracted_text: (f.extracted_text as string) ?? null,
      promoted_evidence_id: (f.promoted_evidence_id as string) ?? null,
      status: f.status as string,
    });
  }
  return rows;
}

// Auto-promote a classified import file to evidence/communications as UNVERIFIED.
// Court orders are NOT promoted here — they wait for mandatory confirmation.
export async function promoteClassified(row: ClassificationRow, caseId: string, userId: string, resultLike: ClassificationResult) {
  const supabase = createClient();
  if (row.promoted_evidence_id || !row.storage_path) return null;
  if (targetTable(resultLike) === "communications" && row.import_file_id) {
    const { data: comm, error } = await supabase.from("communications").insert({
      case_id: caseId, comm_type: resultLike.subtype === "email" ? "email" : "text",
      from_party: "(imported)", to_party: "(imported)",
      occurred_at: resultLike.documentDate ? new Date(resultLike.documentDate + "T00:00:00").toISOString() : new Date().toISOString(),
      summary: resultLike.summary, verification_status: "unverified",
      source_import_file_id: row.import_file_id,
    } as never).select("id").single();
    if (error) throw error;
    await supabase.from("import_files").update({ status: "promoted" } as never).eq("id", row.import_file_id);
    return { table: "communications", id: (comm as { id: string }).id };
  }
  const ext = (row.original_filename.split(".").pop() ?? "").toUpperCase();
  const { data: ev, error } = await supabase.from("evidence").insert({
    case_id: caseId, uploaded_by: userId,
    title: row.original_filename.replace(/\.[^.]+$/, ""),
    category: evidenceCategory(resultLike),
    file_path: row.storage_path, file_type: ext || null,
    date_of_document: resultLike.documentDate,
    tags: resultLike.subjectCategories.length ? resultLike.subjectCategories : null,
    status: "pending", verification_status: "unverified",
    extracted_text: row.extracted_text, text_source: row.extracted_text ? "text_layer" : "none",
    source_import_file_id: row.import_file_id,
    notes: row.original_folder_path ? `Imported from ${row.original_folder_path}` : null,
  } as never).select("id").single();
  if (error) throw error;
  await supabase.from("import_files").update({ status: "promoted", promoted_evidence_id: (ev as { id: string }).id } as never).eq("id", row.import_file_id);
  return { table: "evidence", id: (ev as { id: string }).id };
}

// Mandatory: confirm a court-order candidate → creates a court_orders row.
export async function confirmCourtOrder(row: ClassificationRow, caseId: string, userId: string, fields: { title: string; issuedDate: string | null; judge: string | null; summary: string | null }) {
  const supabase = createClient();
  const { data: order, error } = await supabase.from("court_orders").insert({
    case_id: caseId, title: fields.title, issued_date: fields.issuedDate,
    judge: fields.judge, summary: fields.summary, status: "active",
  } as never).select("id").single();
  if (error) throw error;
  // Also store the file as verified evidence so the order's document is retained.
  if (row.storage_path) {
    await supabase.from("evidence").insert({
      case_id: caseId, uploaded_by: userId, title: fields.title, category: "Court Orders",
      file_path: row.storage_path, date_of_document: fields.issuedDate,
      status: "reviewed", verification_status: "verified", verified_by: userId, verified_at: new Date().toISOString(),
      extracted_text: row.extracted_text, source_import_file_id: row.import_file_id,
    } as never);
  }
  await supabase.from("import_file_classifications").update({ resolved: true } as never).eq("id", row.id);
  await supabase.from("import_files").update({ status: "promoted" } as never).eq("id", row.import_file_id);
  await logAudit({ userId, caseId, action: "import.confirm_court_order", entityType: "court_orders", entityId: (order as { id: string }).id });
  return (order as { id: string }).id;
}

// Mandatory: confirm a date candidate → hearing OR requires_verification deadline.
export async function confirmDateCandidate(row: ClassificationRow, caseId: string, userId: string, choice: "hearing" | "deadline", date: string, title: string) {
  const supabase = createClient();
  if (choice === "hearing") {
    await supabase.from("hearings").insert({
      case_id: caseId, hearing_type: title,
      hearing_date: new Date(date + "T09:00:00").toISOString(),
      notes: "Created from an imported document. Confirm details against the document.",
    } as never);
  } else {
    await createDeadline({
      caseId, sourceType: "inbound_filing", sourceId: null,
      title, triggerEvent: "Date in imported document", triggerDate: date,
    });
  }
  await supabase.from("import_file_classifications").update({ resolved: true } as never).eq("id", row.id);
  await logAudit({ userId, caseId, action: "import.confirm_date", entityType: "import_file_classifications", entityId: row.id, metadata: { choice, date } });
}

export async function resolveMandatory(classificationId: string, userId: string, caseId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("import_file_classifications").update({ resolved: true } as never).eq("id", classificationId);
  if (error) throw error;
  await logAudit({ userId, caseId, action: "import.mandatory_dismiss", entityType: "import_file_classifications", entityId: classificationId });
}

// Verify-at-use: mark a record verified (audit-logged). table ∈ evidence|communications.
export async function verifyRecord(table: "evidence" | "communications", id: string, caseId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from(table).update({
    verification_status: "verified", verified_by: userId, verified_at: new Date().toISOString(),
  } as never).eq("id", id);
  if (error) throw error;
  await logAudit({ userId, caseId, action: "record.verify", entityType: table, entityId: id });
}

export async function setRecordVerification(table: "evidence" | "communications", id: string, status: "unverified" | "verified" | "disputed", caseId: string, userId: string) {
  const supabase = createClient();
  const patch: Record<string, unknown> = { verification_status: status };
  if (status === "verified") { patch.verified_by = userId; patch.verified_at = new Date().toISOString(); }
  const { error } = await supabase.from(table).update(patch as never).eq("id", id);
  if (error) throw error;
  await logAudit({ userId, caseId, action: "record.verification_set", entityType: table, entityId: id, metadata: { status } });
}

export async function getReviewCounts(caseId: string) {
  const supabase = createClient();
  const { data } = await supabase.from("import_file_classifications")
    .select("routing, resolved").eq("case_id", caseId);
  const rows = (data ?? []) as { routing: string; resolved: boolean }[];
  return {
    mandatory: rows.filter((r) => r.routing === "mandatory" && !r.resolved).length,
    reviewQueue: rows.filter((r) => r.routing === "review_queue").length,
  };
}
