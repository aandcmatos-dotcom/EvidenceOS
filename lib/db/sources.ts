import { createClient } from "@/lib/supabase/client";
import type { SelectableSource } from "@/lib/mock/sources";

// Pulls real case records across tables into the unified SelectableSource shape
// used by the document draft wizard's source picker.
export async function getSelectableSources(caseId: string, userId: string): Promise<SelectableSource[]> {
  const supabase = createClient();

  const [{ data: events }, { data: evidence }, { data: comms }, { data: orders }, { data: people }, { data: refs }] =
    await Promise.all([
      supabase.from("timeline_events").select("id, title, event_date, category").eq("case_id", caseId),
      supabase.from("evidence").select("id, title, category, file_type, date_of_document").eq("case_id", caseId),
      supabase.from("communications").select("id, from_party, to_party, occurred_at, comm_type").eq("case_id", caseId),
      supabase.from("court_orders").select("id, title, issued_date, status").eq("case_id", caseId),
      supabase.from("people").select("id, name, role").eq("case_id", caseId),
      supabase.from("legal_references")
        .select("id, title, citation, verification_status, effective_date, reference_case_links!inner(case_id)")
        .eq("owner_id", userId)
        .eq("reference_case_links.case_id", caseId),
    ]);

  const out: SelectableSource[] = [];

  (events ?? []).forEach((e: Record<string, unknown>) => out.push({
    id: e.id as string, sourceType: "event", label: e.title as string, sublabel: "Timeline event",
    date: e.event_date as string, category: e.category as string, verified: true,
  }));

  (evidence ?? []).forEach((e: Record<string, unknown>) => out.push({
    id: e.id as string, sourceType: "evidence", label: e.title as string,
    sublabel: `Evidence${e.file_type ? ` · ${e.file_type}` : ""}`,
    date: (e.date_of_document as string) ?? null, category: e.category as string, verified: true,
  }));

  (comms ?? []).forEach((c: Record<string, unknown>) => out.push({
    id: c.id as string, sourceType: "communication",
    label: `${c.from_party} → ${c.to_party}`, sublabel: `Communication · ${c.comm_type}`,
    date: (c.occurred_at as string)?.slice(0, 10) ?? null, category: "Communications", verified: true,
  }));

  (orders ?? []).forEach((o: Record<string, unknown>) => out.push({
    id: o.id as string, sourceType: "order", label: o.title as string, sublabel: "Court order",
    date: (o.issued_date as string) ?? null, category: "Court Orders", verified: true,
  }));

  (people ?? []).forEach((p: Record<string, unknown>) => out.push({
    id: p.id as string, sourceType: "person", label: p.name as string, sublabel: `Person · ${p.role}`,
    date: null, category: "People", verified: true,
  }));

  (refs ?? []).forEach((r: Record<string, unknown>) => out.push({
    id: r.id as string, sourceType: "reference",
    label: `${r.title}${r.citation ? ` — ${r.citation}` : ""}`,
    sublabel: `Reference · ${r.verification_status === "verified_official" ? "verified official" : String(r.verification_status).replace(/_/g, " ")}`,
    date: (r.effective_date as string) ?? null, category: "References",
    verified: r.verification_status === "verified_official",
  }));

  return out;
}
