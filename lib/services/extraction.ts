// Text extraction pipeline (no AI, no classification). Structured so it can move
// server-side later without rework: the decision logic is pure and testable, while
// the heavy parsers (pdfjs-dist, mammoth) are dynamically imported inside the
// browser-only extract function so the Node test harness never loads them.

export type TextSource = "text_layer" | "ocr" | "none";
export type ExtractKind = "pdf" | "docx" | "text" | "rtf" | "csv" | "eml" | "binary";

export interface EmlHeaders { from: string | null; to: string | null; date: string | null; subject: string | null }

export interface ExtractionResult {
  text: string | null;
  textSource: TextSource;
  pageCount: number | null;
  needsOcr: boolean;
  truncated: boolean;
  emlHeaders: EmlHeaders | null;
  error: string | null;
}

// Cap stored text so a huge document can't bloat a row; note truncation.
export const MAX_TEXT_BYTES = 500 * 1024;
// A PDF page set below this many non-whitespace chars is treated as image-only → needs OCR.
export const MIN_PDF_TEXT_CHARS = 24;

export function capText(text: string): { text: string; truncated: boolean } {
  // Byte-accurate cap (UTF-8) without splitting surrogate pairs badly.
  const encoded = new TextEncoder().encode(text);
  if (encoded.length <= MAX_TEXT_BYTES) return { text, truncated: false };
  const slice = encoded.slice(0, MAX_TEXT_BYTES);
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return { text: decoded + "\n\n[Text truncated at 500 KB.]", truncated: true };
}

export function kindFor(filename: string, mime?: string | null): ExtractKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "docx" || mime?.includes("wordprocessingml")) return "docx";
  if (ext === "eml" || mime === "message/rfc822") return "eml";
  if (ext === "rtf" || mime === "application/rtf") return "rtf";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (ext === "txt" || mime === "text/plain") return "text";
  return "binary"; // doc, msg, images, audio, video, zip members already expanded, etc.
}

// Pure decision: given raw extracted text + kind, produce the stored result.
// This is the unit under test — it never touches a file or a heavy library.
export function finalizeExtraction(kind: ExtractKind, rawText: string, pageCount: number | null): ExtractionResult {
  if (kind === "binary") {
    return { text: null, textSource: "none", pageCount, needsOcr: false, truncated: false, emlHeaders: null, error: null };
  }
  const trimmed = rawText.replace(/\s+/g, " ").trim();

  if (kind === "pdf" && trimmed.length < MIN_PDF_TEXT_CHARS) {
    // Text layer empty/negligible → almost certainly a scan. Mark for OCR (built later).
    return { text: null, textSource: "none", pageCount, needsOcr: true, truncated: false, emlHeaders: null, error: null };
  }
  if (trimmed.length === 0) {
    return { text: null, textSource: "none", pageCount, needsOcr: false, truncated: false, emlHeaders: null, error: null };
  }
  const { text, truncated } = capText(rawText);
  return { text, textSource: "text_layer", pageCount, needsOcr: false, truncated, emlHeaders: null, error: null };
}

// Parse the headers an .eml carries so classification can use them later.
export function parseEml(raw: string): { headers: EmlHeaders; body: string } {
  const splitAt = raw.search(/\r?\n\r?\n/);
  const headerBlock = splitAt >= 0 ? raw.slice(0, splitAt) : raw;
  const body = splitAt >= 0 ? raw.slice(splitAt).trim() : "";
  const get = (name: string): string | null => {
    const m = headerBlock.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
    return m ? m[1].trim() : null;
  };
  return {
    headers: { from: get("From"), to: get("To"), date: get("Date"), subject: get("Subject") },
    body,
  };
}

// Light RTF → text: drop control words/groups. Not a full parser, but enough to
// index a plain RTF note without pulling in a dependency.
export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\{\\[^{}]*\}/g, "")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r?\n\s*\r?\n/g, "\n")
    .trim();
}

// ── Browser-only extraction ─────────────────────────────────────────────────
// Dynamically imports parsers; guarded so it is never evaluated in Node tests.
export async function extractFromFile(file: File | Blob, filename: string, mime?: string | null): Promise<ExtractionResult> {
  const kind = kindFor(filename, mime);
  try {
    if (kind === "text" || kind === "csv") {
      return finalizeExtraction(kind, await file.text(), null);
    }
    if (kind === "rtf") {
      return finalizeExtraction("rtf", rtfToText(await file.text()), null);
    }
    if (kind === "eml") {
      const { headers, body } = parseEml(await file.text());
      const res = finalizeExtraction("eml", body || Object.values(headers).filter(Boolean).join(" "), null);
      return { ...res, emlHeaders: headers };
    }
    if (kind === "docx") {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      return finalizeExtraction("docx", value ?? "", null);
    }
    if (kind === "pdf") {
      const pdfjs = await import("pdfjs-dist");
      // Worker asset resolved by the bundler; browser-only path.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
      const data = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data }).promise;
      let text = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        text += content.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
      }
      return finalizeExtraction("pdf", text, doc.numPages);
    }
    return finalizeExtraction("binary", "", null);
  } catch (err) {
    return {
      text: null, textSource: "none", pageCount: null, needsOcr: false, truncated: false, emlHeaders: null,
      error: err instanceof Error ? err.message : "Extraction failed.",
    };
  }
}
