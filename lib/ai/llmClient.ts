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
// Failures are logged server-side (never to the client) so a misconfigured key doesn't
// fail silently forever — check the server logs, or use checkAnthropicConnection() below
// for a structured diagnostic (surfaced in Settings → AI Connection).
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
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[llmClient] Anthropic request failed: ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
      return null;
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") {
      console.error("[llmClient] Anthropic response had no text content:", JSON.stringify(data).slice(0, 500));
      return null;
    }
    return text;
  } catch (err) {
    console.error("[llmClient] Anthropic request threw:", err instanceof Error ? err.message : err);
    return null;
  }
}

export interface AnthropicConnectionStatus {
  configured: boolean;
  connected: boolean;
  model: string | null;
  error: string | null;
}

// Real, un-swallowed connectivity check — one minimal request, the actual
// status/error surfaced instead of collapsing to null. Used only by the
// Settings → AI Connection diagnostic (app/api/ai-status/route.ts); never
// called from a feature path, so it never affects normal fallback behavior.
export async function checkAnthropicConnection(): Promise<AnthropicConnectionStatus> {
  const model = process.env.EVIDENCE_OS_MODEL || "claude-sonnet-5";
  if (!llmConfigured()) {
    return { configured: false, connected: false, model: null, error: "ANTHROPIC_API_KEY is not set." };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: "user", content: "ping" }] }),
    });
    if (res.ok) {
      return { configured: true, connected: true, model, error: null };
    }
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body).slice(0, 300);
    } catch {
      detail = await res.text().catch(() => "");
    }
    const hint =
      res.status === 401 ? "The API key was rejected — check it's correct and active." :
      res.status === 404 ? `The model "${model}" was not found — check EVIDENCE_OS_MODEL, if set.` :
      res.status === 429 ? "Rate limited or the account is out of credit." :
      `Anthropic returned HTTP ${res.status}.`;
    return { configured: true, connected: false, model, error: `${hint}${detail ? ` (${detail})` : ""}` };
  } catch (err) {
    return {
      configured: true, connected: false, model,
      error: `Network error reaching Anthropic: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
