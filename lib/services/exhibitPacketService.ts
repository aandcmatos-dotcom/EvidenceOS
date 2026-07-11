// Exhibit packet assembly (spec §8I / Phase 4): numbered index, coversheets, and a
// print-ready combined packet document built from the case's evidence records.

export interface PacketExhibit {
  evidenceId: string;
  exhibitNumber: string;   // "Exhibit 1" or Bates-style
  title: string;
  category: string;
  documentDate: string | null;
  description: string | null;
}

export function assignExhibitNumbers(
  evidence: { id: string; title: string; category: string; date_of_document: string | null; notes: string | null }[],
  batesPrefix?: string,
): PacketExhibit[] {
  return evidence.map((e, i) => ({
    evidenceId: e.id,
    exhibitNumber: batesPrefix ? `${batesPrefix}-${String(i + 1).padStart(4, "0")}` : `Exhibit ${i + 1}`,
    title: e.title,
    category: e.category,
    documentDate: e.date_of_document,
    description: e.notes,
  }));
}

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Print-ready HTML: index page + one coversheet per exhibit. Opened via window.open
// like the other print/PDF flows (user saves as PDF from the print dialog).
export function buildPacketHtml(caseName: string, packetName: string, exhibits: PacketExhibit[]): string {
  const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString() : "—");
  const index = `
<h1>${esc(packetName)}</h1>
<p class="meta">${esc(caseName)} · Prepared ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${exhibits.length} exhibits</p>
<h2>Exhibit Index</h2>
<table><tr><th style="width:110px">Exhibit</th><th>Title</th><th style="width:120px">Category</th><th style="width:100px">Doc. Date</th></tr>
${exhibits.map((e) => `<tr><td>${esc(e.exhibitNumber)}</td><td>${esc(e.title)}${e.description ? `<br><span class="sub">${esc(e.description)}</span>` : ""}</td><td>${esc(e.category)}</td><td>${fmt(e.documentDate)}</td></tr>`).join("")}
</table>`;

  const coversheets = exhibits.map((e) => `
<div class="coversheet">
  <p class="exhibit-no">${esc(e.exhibitNumber)}</p>
  <p class="exhibit-title">${esc(e.title)}</p>
  <p class="exhibit-meta">${esc(e.category)}${e.documentDate ? ` · ${fmt(e.documentDate)}` : ""}</p>
  ${e.description ? `<p class="exhibit-desc">${esc(e.description)}</p>` : ""}
  <p class="attach-note">[Attach the exhibit document behind this coversheet.]</p>
</div>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(packetName)}</title>
<style>
  body { font-family: Georgia, serif; color: #111; max-width: 720px; margin: 40px auto; line-height: 1.5; }
  h1 { font-size: 22px; border-bottom: 2px solid #111; padding-bottom: 8px; }
  h2 { font-size: 15px; margin-top: 24px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; } .meta { color: #555; font-size: 13px; } .sub { color:#666; font-size: 12px; }
  .coversheet { page-break-before: always; text-align: center; padding-top: 200px; }
  .exhibit-no { font-size: 34px; font-weight: bold; letter-spacing: 2px; }
  .exhibit-title { font-size: 18px; margin-top: 14px; }
  .exhibit-meta { color: #555; font-size: 13px; } .exhibit-desc { font-size: 13px; max-width: 480px; margin: 10px auto; }
  .attach-note { margin-top: 60px; color: #999; font-size: 11px; }
  .disclaimer { margin-top: 40px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 12px; }
  @media print { body { margin: 0.5in; } }
</style></head><body>
${index}
${coversheets}
<p class="disclaimer">Prepared with Evidence OS. Organizational aid only; listing an exhibit does not make it admissible.</p>
<script>window.onload = () => window.print();</script>
</body></html>`;
}
