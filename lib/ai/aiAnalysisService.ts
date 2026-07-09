/**
 * AI Analysis Service for Evidence OS
 *
 * This module provides document analysis via the Claude API.
 * Current state: mock implementation — no API calls are made.
 *
 * To activate real AI analysis:
 * 1. Add ANTHROPIC_API_KEY to your environment
 * 2. Replace mockAnalyzeDocument() with realAnalyzeDocument() below
 * 3. User approval flow (AIReviewScreen) is already wired — AI output is NEVER saved automatically
 *
 * Legal safety: AI suggestions are informational only. Users must review and approve
 * all suggestions. The app must never treat AI output as legal advice.
 */

import type { AIAnalysisRequest, AIAnalysisResult } from "./types";

const LEGAL_DISCLAIMERS = [
  "AI detected possible patterns based on document content. Review for accuracy before use.",
  "This analysis is for organizational purposes only. It is not legal advice.",
  "Dates and names detected by AI may be incomplete or inaccurate. Verify against original documents.",
  "Do not submit AI-generated summaries to court without independent verification.",
];

// ─── Mock Implementation (active) ────────────────────────────────────────────
// Returns realistic mock data so the UI works without an API key.
// Replace with realAnalyzeDocument() when ready.

export async function analyzeDocument(
  request: AIAnalysisRequest
): Promise<AIAnalysisResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return mockAnalyzeDocument(request);
}

function mockAnalyzeDocument(request: AIAnalysisRequest): AIAnalysisResult {
  const name = request.fileName.toLowerCase();

  if (name.includes("police") || name.includes("report")) {
    return {
      summary:
        "AI detected possible pattern: Document appears to be a law enforcement report. Content references a custody exchange incident. Officer involvement and timestamps are present.",
      datesDetected: ["2025-04-15"],
      peopleDetected: ["Officer Martinez", "Jane Doe", "Robert Smith"],
      categorysuggestion: "Police",
      titleSuggestion: `Police Report – ${new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`,
      tagSuggestions: ["police", "incident", "custody violation"],
      timelineEventSuggestions: [
        {
          title: "Police Report Filed",
          date: "2025-04-15",
          category: "Police",
          description: "Law enforcement report filed related to a custody exchange. Verify date and details against original document.",
        },
      ],
      relatedEvidenceSuggestions: [],
      confidence: "medium",
      disclaimers: LEGAL_DISCLAIMERS,
      requiresReview: true,
    };
  }

  if (name.includes("text") || name.includes("message") || name.includes("sms")) {
    return {
      summary:
        "AI detected possible pattern: Document appears to contain text message records. Multiple messages detected. Response rate and timing may be relevant to communication patterns.",
      datesDetected: [],
      peopleDetected: ["Robert Smith"],
      categorysuggestion: "Messages",
      titleSuggestion: "Text Messages – " + new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      tagSuggestions: ["texts", "communications", "unanswered"],
      timelineEventSuggestions: [
        {
          title: "Text Message Thread",
          date: new Date().toISOString().split("T")[0],
          category: "Communications",
          description: "Text message records. Review for dates, parties, and response patterns.",
        },
      ],
      relatedEvidenceSuggestions: [],
      confidence: "medium",
      disclaimers: LEGAL_DISCLAIMERS,
      requiresReview: true,
    };
  }

  if (name.includes("school") || name.includes("attendance")) {
    return {
      summary:
        "AI detected possible pattern: Document appears to be educational records. Attendance or absence information may be present. School and dates should be verified.",
      datesDetected: [],
      peopleDetected: ["Principal Adams"],
      categorysuggestion: "School",
      titleSuggestion: "School Records – " + new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      tagSuggestions: ["school", "attendance", "absences"],
      timelineEventSuggestions: [
        {
          title: "School Record",
          date: new Date().toISOString().split("T")[0],
          category: "School",
          description: "School attendance or academic record. Verify dates and content against original.",
        },
      ],
      relatedEvidenceSuggestions: [],
      confidence: "medium",
      disclaimers: LEGAL_DISCLAIMERS,
      requiresReview: true,
    };
  }

  if (name.includes("medical") || name.includes("doctor") || name.includes("health")) {
    return {
      summary:
        "AI detected possible pattern: Document appears to contain medical or healthcare records. Appointment dates and provider information may be present.",
      datesDetected: [],
      peopleDetected: ["Dr. Sarah Chen"],
      categorysuggestion: "Medical",
      titleSuggestion: "Medical Records – " + new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      tagSuggestions: ["medical", "appointments", "healthcare"],
      timelineEventSuggestions: [
        {
          title: "Medical Appointment",
          date: new Date().toISOString().split("T")[0],
          category: "Medical",
          description: "Medical record or appointment documentation. Verify dates and details.",
        },
      ],
      relatedEvidenceSuggestions: [],
      confidence: "low",
      disclaimers: LEGAL_DISCLAIMERS,
      requiresReview: true,
    };
  }

  // Generic fallback
  return {
    summary:
      "AI detected possible patterns in this document. Content analysis is limited without full text extraction. Please review the document manually and edit the suggestions below.",
    datesDetected: [],
    peopleDetected: [],
    categorysuggestion: "Other",
    titleSuggestion: request.fileName.replace(/\.[^.]+$/, ""),
    tagSuggestions: [],
    timelineEventSuggestions: [],
    relatedEvidenceSuggestions: [],
    confidence: "low",
    disclaimers: LEGAL_DISCLAIMERS,
    requiresReview: true,
  };
}

// ─── Real Implementation (inactive — wire in when API key is available) ───────
// Uncomment and replace analyzeDocument() export above when ready.
//
// import Anthropic from "@anthropic-ai/sdk";
//
// async function realAnalyzeDocument(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
//   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
//
//   const prompt = buildAnalysisPrompt(request);
//
//   const message = await client.messages.create({
//     model: "claude-sonnet-5",
//     max_tokens: 1024,
//     messages: [{ role: "user", content: prompt }],
//   });
//
//   const text = message.content[0].type === "text" ? message.content[0].text : "";
//   return parseAnalysisResponse(text);
// }
//
// function buildAnalysisPrompt(request: AIAnalysisRequest): string {
//   return `You are a document analysis assistant for a legal case organization tool.
// Analyze the following document and return structured JSON.
//
// IMPORTANT RULES:
// - Never provide legal advice or predict legal outcomes
// - Use "possible pattern" or "may indicate" language, never "proves" or "you should argue"
// - Always include requiresReview: true
// - If unsure, set confidence to "low"
//
// Document: ${request.fileName}
// Type: ${request.fileType}
// Text: ${request.extractedText ?? "(text extraction not available)"}
//
// Return JSON matching the AIAnalysisResult interface.`;
// }
