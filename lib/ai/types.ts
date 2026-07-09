// AI Analysis types for Evidence OS
// These interfaces define the contract between the upload flow and the future Claude API integration.
// User MUST approve all AI suggestions before they are saved.

export interface AIAnalysisResult {
  // Document understanding
  summary: string;                  // Short paragraph summarizing the document
  datesDetected: string[];          // ISO date strings found in the document
  peopleDetected: string[];         // Names detected in the document text

  // Organization suggestions (user must approve)
  categorysuggestion: string;       // Suggested evidence category
  titleSuggestion: string;          // Suggested exhibit title
  tagSuggestions: string[];         // Suggested tags

  // Linking suggestions (user must approve)
  timelineEventSuggestions: {
    title: string;
    date: string;
    category: string;
    description: string;
  }[];

  relatedEvidenceSuggestions: string[]; // IDs of potentially related existing evidence

  // Confidence + safety
  confidence: "high" | "medium" | "low";
  disclaimers: string[];            // Legal safety notes shown to user
  requiresReview: true;             // Always true — AI output is never final
}

export interface AIAnalysisRequest {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  extractedText?: string;           // OCR/text extraction result (future)
  caseContext?: {
    caseName: string;
    existingPeople: string[];
    existingCategories: string[];
  };
}
