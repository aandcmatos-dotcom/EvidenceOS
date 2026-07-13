// Inbound-filing classification suggestions. Uses the LLM adapter when
// ANTHROPIC_API_KEY is configured; otherwise returns null and the client falls
// back to the plain form. Suggestions are prefill hints only — the user reviews
// and can change every field before anything is saved.

import { NextResponse } from "next/server";
import { callModelJSON, llmConfigured } from "@/lib/ai/llmClient";

export async function POST(request: Request) {
  if (!llmConfigured()) return NextResponse.json({ suggestion: null });
  try {
    const { fileName, excerpt } = await request.json();
    const raw = await callModelJSON(
      `A self-represented litigant uploaded a court filing they received. Based ONLY on the file name and excerpt below, suggest values for this JSON shape: {"filingType": string, "filer": string|null, "hearingNoticed": boolean}. If you cannot tell, use null/false. Do not guess specifics that are not present.\n\nFile name: ${fileName}\nExcerpt: ${String(excerpt ?? "").slice(0, 1500)}`,
      { caseRecords: [], references: [] },
    );
    if (!raw) return NextResponse.json({ suggestion: null });
    const parsed = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
    return NextResponse.json({
      suggestion: {
        filingType: typeof parsed.filingType === "string" ? parsed.filingType : null,
        filer: typeof parsed.filer === "string" ? parsed.filer : null,
        hearingNoticed: parsed.hearingNoticed === true,
      },
    });
  } catch {
    return NextResponse.json({ suggestion: null });
  }
}
