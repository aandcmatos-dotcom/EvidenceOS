// Settings -> AI Connection diagnostic. Makes one minimal real request to
// Anthropic and reports the actual outcome (configured/connected/error) instead
// of the silent-null fallback every feature path uses. On-demand only (called
// from a button in Settings) so it doesn't burn a request on every page load.

import { NextResponse } from "next/server";
import { checkAnthropicConnection } from "@/lib/ai/llmClient";

export async function GET() {
  const status = await checkAnthropicConnection();
  return NextResponse.json(status);
}
