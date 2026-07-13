// Shared print/PDF renderer for discovery instruments and subpoenas: caption,
// title, definitions/instructions, independently numbered items, optional
// production + custodian blocks, certificate of service, and signature block.
// Caption text comes from the case's saved court_captions (user-authored).

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nl2br = (s: string) => esc(s).replace(/\n/g, "<br>");

export interface InstrumentPrintInput {
  captionText: string | null;      // null → placeholder caption box the user fills by hand
  title: string;
  definitions?: string | null;
  instructions?: string | null;
  items: { ordinal: number; text: string; dateRange?: string | null }[];
  productionBlock?: { date: string | null; place: string | null } | null;   // subpoenas
  custodianCertText?: string | null;                                        // subpoenas
  serviceRecipients?: string | null;   // free text; user-authored
  serviceMethod?: string | null;
  signatureName?: string | null;
}

export function buildInstrumentHtml(input: InstrumentPrintInput): string {
  const caption = input.captionText
    ? `<div class="caption">${nl2br(input.captionText)}</div>`
    : `<div class="caption placeholder">[Caption — save a default caption in your case style settings, or complete by hand:<br>Court · Case number · Petitioner v. Respondent]</div>`;

  const items = input.items.map((i) =>
    `<li>${esc(i.text)}${i.dateRange ? ` <span class="range">(${esc(i.dateRange)})</span>` : ""}</li>`
  ).join("");

  const production = input.productionBlock
    ? `<h2>Date and Place for Production</h2>
       <p>Date: ${esc(input.productionBlock.date ?? "____________")} &nbsp;·&nbsp; Place: ${esc(input.productionBlock.place ?? "____________________________")}</p>`
    : "";

  const custodian = input.custodianCertText
    ? `<h2>Records Custodian Certification</h2><p class="cert">${nl2br(input.custodianCertText)}</p>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(input.title)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #111; max-width: 720px; margin: 40px auto; line-height: 2; }
  .caption { border: 1px solid #333; padding: 12px; font-size: 11pt; line-height: 1.5; margin-bottom: 18px; }
  .caption.placeholder { color: #777; border-style: dashed; }
  h1 { font-size: 13pt; text-transform: uppercase; text-align: center; margin: 18px 0; }
  h2 { font-size: 11.5pt; text-transform: uppercase; letter-spacing: .5px; margin-top: 22px; line-height: 1.4; }
  p, li { line-height: 1.9; } ol li { margin: 10px 0; }
  .range { color: #555; font-size: 10.5pt; }
  .cert { border: 1px solid #999; padding: 10px; line-height: 1.6; font-size: 11pt; }
  .sig { margin-top: 42px; line-height: 1.6; }
  .cos { margin-top: 30px; }
  .disclaimer { margin-top: 36px; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px; line-height: 1.4; }
  @media print { body { margin: .5in; } }
</style></head><body>
${caption}
<h1>${esc(input.title)}</h1>
${input.definitions ? `<h2>Definitions</h2><p>${esc(input.definitions)}</p>` : ""}
${input.instructions ? `<h2>Instructions</h2><p>${esc(input.instructions)}</p>` : ""}
<h2>Requests</h2>
<ol>${items}</ol>
${production}
${custodian}
<div class="cos">
  <h2>Certificate of Service</h2>
  <p>I certify that a copy of the foregoing was served on ${esc(input.serviceRecipients ?? "____________________________")}
  by ${esc(input.serviceMethod ?? "____________")} on the date below.</p>
</div>
<div class="sig">
  <p>Dated: _____________</p>
  <p>_______________________________<br>${esc(input.signatureName ?? "(Signature)")}</p>
</div>
<p class="disclaimer">Prepared with Evidence OS from user-selected and user-authored content. Organizational aid only —
not legal advice, and not a determination that this instrument is correct or sufficient for any jurisdiction. Review
all content and the official procedural sources before use.</p>
<script>window.onload = () => window.print();</script>
</body></html>`;
}
