"use client";

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Download, FileText, Printer, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportId = "summary" | "timeline" | "evidence" | "communications" | "orders";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function downloadCSV(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openPrintView(title: string, bodyHtml: string) {
  const html = `<!doctype html><html><head><title>${esc(title)}</title>
<style>
  body { font-family: Georgia, serif; color: #111; max-width: 720px; margin: 40px auto; line-height: 1.5; }
  h1 { font-size: 22px; border-bottom: 2px solid #111; padding-bottom: 8px; }
  h2 { font-size: 15px; margin-top: 28px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  .meta { color: #555; font-size: 13px; }
  .disclaimer { margin-top: 40px; font-size: 11px; color: #666; border-top: 1px solid #ccc; padding-top: 12px; }
  @media print { body { margin: 0.5in; } }
</style></head><body>${bodyHtml}
<p class="disclaimer">Prepared with Evidence OS. This document is an organizational aid only and does not constitute legal advice.</p>
<script>window.onload = () => window.print();</script>
</body></html>`;
  const win = window.open("", "_blank");
  if (!win) { alert("Pop-up blocked — please allow pop-ups for this site and try again."); return; }
  win.document.write(html);
  win.document.close();
}

const fmtDate = (d: string | null) => (d ? new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString() : "");

export default function ReportsPage() {
  const { activeCase } = useAuth();
  const [busy, setBusy] = useState<ReportId | null>(null);
  const [done, setDone] = useState<ReportId | null>(null);

  const supabase = createClient();

  const markDone = (id: ReportId) => {
    setDone(id);
    setTimeout(() => setDone(null), 2500);
  };

  const run = async (id: ReportId) => {
    if (!activeCase) { alert("No active case selected."); return; }
    setBusy(id);
    const caseId = activeCase.id;
    try {
      if (id === "timeline") {
        const { data } = await supabase.from("timeline_events")
          .select("event_date, title, description, category, severity, flagged")
          .eq("case_id", caseId).order("event_date");
        downloadCSV("timeline-report.csv", [
          ["Date", "Event", "Details", "Category", "Severity", "Flagged"],
          ...(data ?? []).map((e: Record<string, unknown>) => [
            fmtDate(e.event_date as string), e.title as string, (e.description as string) ?? "",
            e.category as string, e.severity as string, e.flagged ? "Yes" : "No",
          ]),
        ]);
      } else if (id === "evidence") {
        const { data } = await supabase.from("evidence")
          .select("title, category, file_type, date_of_document, status, notes, created_at")
          .eq("case_id", caseId).order("created_at");
        downloadCSV("evidence-inventory.csv", [
          ["Title", "Category", "File Type", "Document Date", "Status", "Notes", "Uploaded"],
          ...(data ?? []).map((e: Record<string, unknown>) => [
            e.title as string, e.category as string, (e.file_type as string) ?? "",
            fmtDate(e.date_of_document as string | null), e.status as string,
            (e.notes as string) ?? "", fmtDate(e.created_at as string),
          ]),
        ]);
      } else if (id === "communications") {
        const { data, error } = await supabase.from("communications")
          .select("occurred_at, comm_type, from_party, to_party, summary, responded, message_count")
          .eq("case_id", caseId).order("occurred_at");
        if (error) { alert("Communications table not set up yet — run migration 002 in Supabase first."); return; }
        downloadCSV("communications-log.csv", [
          ["Date/Time", "Type", "From", "To", "Summary", "Got Reply", "Messages"],
          ...(data ?? []).map((c: Record<string, unknown>) => [
            new Date(c.occurred_at as string).toLocaleString(), c.comm_type as string,
            c.from_party as string, c.to_party as string, (c.summary as string) ?? "",
            c.responded ? "Yes" : "No", c.message_count as number,
          ]),
        ]);
      } else if (id === "orders") {
        const { data } = await supabase.from("court_orders")
          .select("title, issued_date, judge, summary, status")
          .eq("case_id", caseId).order("issued_date");
        downloadCSV("court-orders.csv", [
          ["Title", "Date Issued", "Judge", "Summary", "Status"],
          ...(data ?? []).map((o: Record<string, unknown>) => [
            o.title as string, fmtDate(o.issued_date as string | null),
            (o.judge as string) ?? "", (o.summary as string) ?? "", o.status as string,
          ]),
        ]);
      } else if (id === "summary") {
        const [{ data: evts }, { data: evd }, { data: ppl }, { data: ords }] = await Promise.all([
          supabase.from("timeline_events").select("event_date, title, category, severity, flagged").eq("case_id", caseId).order("event_date"),
          supabase.from("evidence").select("title, category, file_type, date_of_document, status").eq("case_id", caseId).order("created_at"),
          supabase.from("people").select("name, role, relationship").eq("case_id", caseId).order("name"),
          supabase.from("court_orders").select("title, issued_date, judge, status").eq("case_id", caseId).order("issued_date"),
        ]);
        const body = `
<h1>Case Summary — ${esc(activeCase.name)}</h1>
<p class="meta">Prepared ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
· ${(evts ?? []).length} timeline events · ${(evd ?? []).length} evidence items · ${(ppl ?? []).length} people · ${(ords ?? []).length} court orders</p>

<h2>People in the Case</h2>
<table><tr><th>Name</th><th>Role</th><th>Relationship</th></tr>
${(ppl ?? []).map((p: Record<string, unknown>) => `<tr><td>${esc(p.name)}</td><td>${esc(p.role)}</td><td>${esc(p.relationship)}</td></tr>`).join("") || "<tr><td colspan=3>None recorded</td></tr>"}
</table>

<h2>Court Orders</h2>
<table><tr><th>Order</th><th>Issued</th><th>Judge</th><th>Status</th></tr>
${(ords ?? []).map((o: Record<string, unknown>) => `<tr><td>${esc(o.title)}</td><td>${fmtDate(o.issued_date as string | null)}</td><td>${esc(o.judge)}</td><td>${esc(o.status)}</td></tr>`).join("") || "<tr><td colspan=4>None recorded</td></tr>"}
</table>

<h2>Chronological Timeline</h2>
<table><tr><th style="width:100px">Date</th><th>Event</th><th style="width:110px">Category</th><th style="width:70px">Severity</th><th style="width:60px">Flagged</th></tr>
${(evts ?? []).map((e: Record<string, unknown>) => `<tr><td>${fmtDate(e.event_date as string)}</td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td>${esc(e.severity)}</td><td>${e.flagged ? "Yes" : ""}</td></tr>`).join("") || "<tr><td colspan=5>None recorded</td></tr>"}
</table>

<h2>Evidence Inventory</h2>
<table><tr><th>Title</th><th style="width:110px">Category</th><th style="width:70px">Type</th><th style="width:100px">Doc. Date</th><th style="width:80px">Status</th></tr>
${(evd ?? []).map((e: Record<string, unknown>) => `<tr><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td>${esc(e.file_type)}</td><td>${fmtDate(e.date_of_document as string | null)}</td><td>${esc(e.status)}</td></tr>`).join("") || "<tr><td colspan=5>None recorded</td></tr>"}
</table>`;
        openPrintView(`Case Summary — ${activeCase.name}`, body);
      }
      markDone(id);
    } finally {
      setBusy(null);
    }
  };

  const reports: { id: ReportId; name: string; description: string; action: string; icon: React.ReactNode }[] = [
    { id: "summary", name: "Case Summary Report", description: "Print-ready overview: people, court orders, full timeline, and evidence inventory. Save as PDF from the print dialog.", action: "Print / Save PDF", icon: <Printer size={14} /> },
    { id: "timeline", name: "Timeline Report", description: "Chronological log of every timeline event with category, severity, and flags. Downloads as a spreadsheet.", action: "Download CSV", icon: <Download size={14} /> },
    { id: "evidence", name: "Evidence Inventory", description: "Every evidence item with category, file type, document date, and review status. Downloads as a spreadsheet.", action: "Download CSV", icon: <Download size={14} /> },
    { id: "communications", name: "Communication Log", description: "All logged texts, emails, and calls — including which ones got no reply. Downloads as a spreadsheet.", action: "Download CSV", icon: <Download size={14} /> },
    { id: "orders", name: "Court Order List", description: "Every court order with issue date, judge, and current status. Downloads as a spreadsheet.", action: "Download CSV", icon: <Download size={14} /> },
  ];

  return (
    <AppLayout title="Reports">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">Reports are generated live from your case data.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{report.name}</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">{report.description}</p>
            <button
              onClick={() => run(report.id)}
              disabled={busy !== null}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg transition-colors font-medium disabled:opacity-50",
                done === report.id ? "bg-green-50 text-green-700" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              )}
            >
              {done === report.id ? (<><Check size={14} /> Done</>) :
               busy === report.id ? "Generating…" : (<>{report.icon} {report.action}</>)}
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
