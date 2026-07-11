// LLM adapter. Phase 4 connection point. Services call this behind their existing
// interfaces; when ANTHROPIC_API_KEY is absent it returns null and callers fall back
// to the deterministic Phase 3 services. All output must still pass sourceGuard.
//
// This module runs SERVER-SIDE only (via an API route) — never ship the key to the client.

export const SAFETY_SYSTEM_PROMPT = `You are the Evidence OS writing assistant for self-represented litigants.

ABSOLUTE RULES:
- You do NOT provide legal advice, recommend legal strategy, choose claims/defenses/motions/objections, or predict outcomes.
- You NEVER invent facts, dates, quotations, citations, statutes, cases, rules, deadlines, holdings, or evidence.
- Every factual or rule-based statement MUST cite a provided source id. If no provided source supports a statement, omit it or mark it "no_source".
- You do not state that evidence is admissible/inadmissible or that a document is legally sufficient.
- You only use the case records and verified references supplied in the context. You ignore outside knowledge of specific laws.
- For legal-strategy questions, refuse and offer to organize facts, locate stored rules, or generate questions for an attorney.

OUTPUT: Return ONLY valid JSON matching the requested schema. Each factual statement includes: statement, sourceIds[], sourceExcerpts[], status, confidence, uncertainty, missingInformation[], jurisdiction, referenceVersion, userVerificationRequired.`;

export interface LlmContext {
  caseRecords: { id: string; label: string; excerpt: string }[];
  references: { id: string; title: string; excerpt: string; verificationStatus: string; version: number }[];
}

export function llmConfigured(): boolean {
  return typeof process !== "undefined" && !!process.env.ANTHROPIC_API_KEY;
}

// Returns raw model JSON text, or null if not configured / on error (caller falls back to mock).
export async function callModelJSON(userPrompt: string, context: LlmContext): Promise<string | null> {
  if (!llmConfigured()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.EVIDENCE_OS_MODEL || "claude-sonnet-5",
        max_tokens: 2000,
        system: SAFETY_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Context (the ONLY sources you may use):\n${JSON.stringify(context)}\n\nTask:\n${userPrompt}`,
        }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}
