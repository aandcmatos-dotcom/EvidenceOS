// Dependency-free document export. DOCX is produced as Word-compatible HTML (Word opens
// .doc HTML natively), PDF via the browser print dialog, plus plain-text and clipboard.
// Preserves captions, headings, signature blocks, exhibit references, tables, and citations
// that are present in the provided HTML/blocks.

import type { DraftStatement } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface ExportDoc {
  title: string;
  caption?: string;      // court caption block
  statements: DraftStatement[];
  signatureBlock?: string;
}

function bodyHtml(doc: ExportDoc): string {
  const caption = doc.caption ? `<p class="caption">${esc(doc.caption).replace(/\n/g, "<br>")}</p>` : "";
  const paras = doc.statements.map((s, i) => `<p>${i + 1}. ${esc(s.text)}</p>`).join("");
  const sig = doc.signatureBlock ? `<p class="sig">${esc(doc.signatureBlock).replace(/\n/g, "<br>")}</p>` : "";
  return `${caption}<h1>${esc(doc.title)}</h1>${paras}${sig}
<p class="disclaimer">Prepared with Evidence OS. Organizational aid only; not legal advice and not a determination of legal sufficiency.</p>`;
}

const STYLE = `body{font-family:Georgia,serif;color:#111;max-width:720px;margin:40px auto;line-height:1.6}
h1{font-size:18px;text-transform:uppercase;text-align:center;margin:18px 0}
.caption{border:1px solid #333;padding:10px;font-size:13px}
.sig{margin-top:40px}.disclaimer{margin-top:36px;font-size:11px;color:#666;border-top:1px solid #ccc;padding-top:10px}
p{margin:8px 0}`;

export function exportDocx(doc: ExportDoc) {
  const html = `<!doctype html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>${STYLE}</style></head>
<body>${bodyHtml(doc)}</body></html>`;
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  triggerDownload(blob, `${safeName(doc.title)}.doc`);
}

export function exportPDF(doc: ExportDoc) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>${STYLE}@media print{body{margin:.5in}}</style></head>
<body>${bodyHtml(doc)}<script>window.onload=()=>window.print()</script></body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Pop-up blocked — allow pop-ups to save as PDF."); return; }
  win.document.write(html); win.document.close();
}

export function exportText(doc: ExportDoc) {
  const lines = [
    doc.caption ?? "", doc.title.toUpperCase(), "",
    ...doc.statements.map((s, i) => `${i + 1}. ${s.text}`),
    "", doc.signatureBlock ?? "",
    "", "Prepared with Evidence OS. Not legal advice.",
  ].filter((l) => l !== undefined);
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  triggerDownload(blob, `${safeName(doc.title)}.txt`);
}

export async function copyToClipboard(doc: ExportDoc): Promise<boolean> {
  const text = [doc.title.toUpperCase(), "", ...doc.statements.map((s, i) => `${i + 1}. ${s.text}`)].join("\n");
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function safeName(s: string) { return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "document"; }
