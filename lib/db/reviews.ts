import { createClient } from "@/lib/supabase/client";

export async function getReviews(caseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_reviews")
    .select("*, review_findings(*)")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReviewById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_reviews")
    .select("*, review_findings(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createReview(payload: {
  caseId: string; documentId: string | null; documentTitle: string; createdBy: string;
  summary: Record<string, unknown>; sourcesChecked: string[]; sourcesUnavailable: string[];
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_reviews")
    .insert({
      case_id: payload.caseId,
      document_id: payload.documentId,
      document_title: payload.documentTitle,
      created_by: payload.createdBy,
      summary: payload.summary,
      sources_checked: payload.sourcesChecked,
      sources_unavailable: payload.sourcesUnavailable,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addFindings(reviewId: string, findings: {
  category: string; severity: string; section: string | null; highlightedText: string | null;
  explanation: string | null; referenceSectionId: string | null; sourceRelied: string | null;
  ruleExcerpt: string | null; effectiveDate: string | null; suggestedCorrection: string | null;
}[]) {
  const supabase = createClient();
  const { error } = await supabase.from("review_findings").insert(
    findings.map((f) => ({
      review_id: reviewId,
      category: f.category,
      severity: f.severity,
      section: f.section,
      highlighted_text: f.highlightedText,
      explanation: f.explanation,
      reference_section_id: f.referenceSectionId,
      source_relied: f.sourceRelied,
      rule_excerpt: f.ruleExcerpt,
      effective_date: f.effectiveDate,
      suggested_correction: f.suggestedCorrection,
    })) as never
  );
  if (error) throw error;
}

export async function updateFindingDecision(id: string, decision: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("review_findings")
    .update({ decision } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReview(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("document_reviews").delete().eq("id", id);
  if (error) throw error;
}
