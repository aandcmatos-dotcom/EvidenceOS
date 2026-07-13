// Bulk-import pipeline tests (pure logic). Run: npm run test:import
// Heavy parsers (pdfjs/mammoth) are exercised via finalizeExtraction with
// representative raw inputs, matching the "text PDF / scanned PDF / DOCX" cases.

import {
  finalizeExtraction, parseEml, kindFor, capText, rtfToText, MAX_TEXT_BYTES, MIN_PDF_TEXT_CHARS,
} from "@/lib/services/extraction";
import {
  zipMemberFolderPath, memberFilename, findDuplicateId, isAccepted, importStoragePath, mapWithConcurrency,
} from "@/lib/import/helpers";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ FAIL: ${name}`); }
}

console.log("\n[extraction — text/text_source/needs_ocr decisions]");
{
  // Text PDF: a real text layer → extracted, text_layer.
  const textPdf = finalizeExtraction("pdf", "IN THE CIRCUIT COURT... this document has a real text layer.", 3);
  check("text PDF → text_source text_layer", textPdf.textSource === "text_layer" && textPdf.needsOcr === false);
  check("text PDF keeps page count", textPdf.pageCount === 3);
  check("text PDF has text", (textPdf.text ?? "").length > 0);

  // Scanned-style PDF: empty/negligible text layer → needs_ocr, none.
  const scan = finalizeExtraction("pdf", "   \n  ", 5);
  check("scanned PDF → needs_ocr", scan.needsOcr === true && scan.textSource === "none" && scan.text === null);
  const tiny = finalizeExtraction("pdf", "x".repeat(MIN_PDF_TEXT_CHARS - 1), 1);
  check("PDF below the min-char threshold → needs_ocr", tiny.needsOcr === true);

  // DOCX: has text → text_layer, not OCR.
  const docx = finalizeExtraction("docx", "This declaration states the following facts.", null);
  check("DOCX → text_layer, no OCR", docx.textSource === "text_layer" && docx.needsOcr === false);

  // Binary (image/audio/video): no extraction, no OCR flag.
  const img = finalizeExtraction("binary", "", null);
  check("image/binary → text_source none, not needs_ocr", img.textSource === "none" && img.needsOcr === false);
}

console.log("\n[extraction — cap + eml + rtf + kind]");
{
  const big = "a".repeat(MAX_TEXT_BYTES + 5000);
  const capped = capText(big);
  check("text over 500KB is truncated", capped.truncated === true && new TextEncoder().encode(capped.text).length <= MAX_TEXT_BYTES + 40);
  check("text under cap is untouched", capText("short").truncated === false);

  const eml = parseEml("From: a@x.com\r\nTo: b@y.com\r\nDate: Mon, 1 Jun 2026 10:00:00 -0400\r\nSubject: Exchange\r\n\r\nBody text here.");
  check("eml captures from/to/date/subject", eml.headers.from === "a@x.com" && eml.headers.subject === "Exchange" && eml.headers.to === "b@y.com");
  check("eml body separated from headers", eml.body === "Body text here.");

  check("rtf control words stripped", !/\\b|\{|\}/.test(rtfToText("{\\rtf1\\ansi \\b Hello\\b0 world\\par}")));

  check("kindFor detects pdf/docx/eml/csv", kindFor("a.pdf") === "pdf" && kindFor("b.docx") === "docx" && kindFor("c.eml") === "eml" && kindFor("d.csv") === "csv");
  check("kindFor unknown → binary", kindFor("photo.heic") === "binary" && kindFor("clip.mp4") === "binary");
}

console.log("\n[import helpers — zip paths, dedup, accepted types]");
{
  check("zip member folder path prefixes the zip name", zipMemberFolderPath("archive.zip", "orders/2026/motion.pdf") === "archive/orders/2026");
  check("zip member at root uses zip base only", zipMemberFolderPath("archive.zip", "motion.pdf") === "archive");
  check("member filename extracted", memberFilename("orders/2026/motion.pdf") === "motion.pdf");

  const existing = new Map([["abc", "file-1"]]);
  check("known hash → duplicate id", findDuplicateId("abc", existing) === "file-1");
  check("unseen hash → null", findDuplicateId("zzz", existing) === null);

  check("accepted extension", isAccepted("scan.PDF") && isAccepted("note.docx") && isAccepted("pic.heic"));
  check("rejected extension", !isAccepted("malware.exe") && !isAccepted("data.bin"));

  const path = importStoragePath("case1", "batch1", "deadbeefdeadbeefcafe", "Motion.PDF");
  check("storage path is batch-scoped under case", path.startsWith("case1/imports/batch1/") && path.endsWith(".PDF"));
}

console.log("\n[import helpers — concurrency mapper]");
{
  let maxInFlight = 0, inFlight = 0;
  const run = async () => {
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--; return n * 2;
    });
  };
  await run();
  check("concurrency never exceeds the limit", maxInFlight <= 3);
  const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => n + 10);
  check("results preserve input order", results[0] === 11 && results[2] === 13);
}

console.log(`\n${failed === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
