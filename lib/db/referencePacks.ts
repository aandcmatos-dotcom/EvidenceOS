import { createClient } from "@/lib/supabase/client";
import type { ReferenceCategory } from "@/lib/references/types";

export interface PackRow {
  id: string; name: string; state: string | null; county: string | null;
  circuit_district: string | null; court: string | null; division: string | null; judge: string | null;
  created_at: string; item_count?: number;
}

// "Save my case's assigned references as a pack": pointers only (reference_id),
// title + jurisdiction scope. Deliberately does NOT copy verification_status or
// any attestation — a pack is a shareable pointer list, never someone's sign-off.
export async function savePackFromCase(
  caseId: string,
  ownerId: string,
  name: string,
  scope: { state?: string | null; county?: string | null; circuitDistrict?: string | null; court?: string | null; division?: string | null; judge?: string | null },
): Promise<string> {
  const supabase = createClient();
  const { data: links, error: linkErr } = await supabase
    .from("reference_case_links")
    .select("reference_id")
    .eq("case_id", caseId);
  if (linkErr) throw linkErr;
  const referenceIds = ((links ?? []) as unknown as { reference_id: string }[]).map((l) => l.reference_id);

  const { data: pack, error: packErr } = await supabase
    .from("jurisdiction_reference_packs")
    .insert({
      owner_id: ownerId, name,
      state: scope.state ?? null, county: scope.county ?? null, circuit_district: scope.circuitDistrict ?? null,
      court: scope.court ?? null, division: scope.division ?? null, judge: scope.judge ?? null,
    } as never)
    .select("id")
    .single();
  if (packErr) throw packErr;
  const packId = (pack as unknown as { id: string }).id;

  if (referenceIds.length > 0) {
    const { error: itemErr } = await supabase
      .from("reference_pack_items")
      .insert(referenceIds.map((reference_id) => ({ pack_id: packId, reference_id })) as never);
    if (itemErr) throw itemErr;
  }
  return packId;
}

export async function getPacksForJurisdiction(state: string | null, circuitDistrict: string | null): Promise<PackRow[]> {
  const supabase = createClient();
  let query = supabase.from("jurisdiction_reference_packs").select("*, reference_pack_items(reference_id)");
  if (state) query = query.eq("state", state);
  if (circuitDistrict) query = query.eq("circuit_district", circuitDistrict);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (PackRow & { reference_pack_items: { reference_id: string }[] })[]).map((p) => ({
    ...p, item_count: p.reference_pack_items?.length ?? 0,
  }));
}

// "Apply pack to case": links each pack reference to the case (idempotent) and
// creates a fresh case_reference_attestations row per (case, reference, this
// user) defaulting to needs_verification — never copies the pack owner's (or
// anyone else's) verification_status/last_verified_date.
export async function applyPackToCase(packId: string, caseId: string, userId: string): Promise<{ linked: number; alreadyLinked: number }> {
  const supabase = createClient();
  const { data: items, error: itemErr } = await supabase
    .from("reference_pack_items")
    .select("reference_id")
    .eq("pack_id", packId);
  if (itemErr) throw itemErr;
  const referenceIds = ((items ?? []) as unknown as { reference_id: string }[]).map((i) => i.reference_id);
  if (referenceIds.length === 0) return { linked: 0, alreadyLinked: 0 };

  const { data: existingLinks } = await supabase
    .from("reference_case_links")
    .select("reference_id")
    .eq("case_id", caseId)
    .in("reference_id", referenceIds);
  const already = new Set(((existingLinks ?? []) as unknown as { reference_id: string }[]).map((l) => l.reference_id));
  const toLink = referenceIds.filter((id) => !already.has(id));

  if (toLink.length > 0) {
    const { error: linkErr } = await supabase
      .from("reference_case_links")
      .insert(toLink.map((reference_id) => ({ reference_id, case_id: caseId })) as never);
    if (linkErr) throw linkErr;
  }

  // Every linked reference (new or pre-existing) gets THIS user's own
  // attestation row if they don't already have one — always needs_verification.
  const { error: attestErr } = await supabase
    .from("case_reference_attestations")
    .upsert(
      referenceIds.map((reference_id) => ({ case_id: caseId, reference_id, user_id: userId, status: "needs_verification" })) as never,
      { onConflict: "case_id,reference_id,user_id", ignoreDuplicates: true },
    );
  if (attestErr) throw attestErr;

  return { linked: toLink.length, alreadyLinked: already.size };
}

export interface AttestationRow {
  reference_id: string;
  status: "needs_verification" | "verified" | "possibly_outdated";
  verified_date: string | null;
  notes: string | null;
}

export async function getMyAttestations(caseId: string, userId: string): Promise<AttestationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("case_reference_attestations")
    .select("reference_id, status, verified_date, notes")
    .eq("case_id", caseId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as unknown as AttestationRow[];
}

// A user attests to their OWN verification of a case-assigned reference —
// never writes another user's row (unique constraint + RLS both enforce this).
export async function attestReference(
  caseId: string, referenceId: string, userId: string,
  status: "needs_verification" | "verified" | "possibly_outdated", verifiedDate: string | null, notes: string | null,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("case_reference_attestations")
    .upsert({ case_id: caseId, reference_id: referenceId, user_id: userId, status, verified_date: verifiedDate, notes } as never,
      { onConflict: "case_id,reference_id,user_id" });
  if (error) throw error;
}

export async function getCaseAssignedReferenceCategories(caseId: string): Promise<ReferenceCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reference_case_links")
    .select("legal_references(category)")
    .eq("case_id", caseId);
  if (error) throw error;
  return ((data ?? []) as unknown as { legal_references: { category: ReferenceCategory } | null }[])
    .map((r) => r.legal_references?.category)
    .filter((c): c is ReferenceCategory => !!c);
}
