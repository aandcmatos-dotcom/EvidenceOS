// Server-side classification via the env-gated LLM adapter. Returns the raw model
// JSON for the client to validate/sanitize (people-matching + flags stay
// deterministic client-side). Returns { raw: null } when no key is configured or on
// any error, so the client falls back to the heuristic classifier.

import { NextResponse } from "next/server";
import { callModelJSON, llmConfigured } from "@/lib/ai/llmClient";

export async function POST(request: Request) {
  if (!llmConfigured()) return NextResponse.json({ raw: null });
  try {
    const { filename, subject, text } = await request.json();
    const out = await callModelJSON(
      `Classify a court-case file for organization only. Return ONLY JSON:
{"primaryType": one of court_order|pleading_filing|evidence|communication|discovery|hearing_material|case_note|legal_reference|administrative_record|other,
 "subtype": short string, "subjectCategories": string[], "documentDate": "YYYY-MM-DD"|null, "dateConfidence": high|medium|low,
 "summary": one neutral descriptive paragraph (NO legal conclusions, advice, or predictions), "confidence": high|medium|low}
File name: ${filename}
Subject: ${subject ?? "(none)"}
Extracted text (may be truncated):
${String(text ?? "").slice(0, 12000)}`,
      { caseRecords: [], references: [] },
    );
    if (!out) return NextResponse.json({ raw: null });
    const raw = JSON.parse(out.replace(/^```(json)?|```$/g, "").trim());
    return NextResponse.json({ raw });
  } catch {
    return NextResponse.json({ raw: null });
  }
}
