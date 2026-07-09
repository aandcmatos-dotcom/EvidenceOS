import AppLayout from "@/components/AppLayout";
import { BarChart3, Download, FileText, TrendingUp } from "lucide-react";

const reports = [
  { id: 1, name: "Case Summary Report", description: "Full overview of all evidence, events, and patterns.", updated: "Apr 30, 2025", pages: 12 },
  { id: 2, name: "Pattern Analysis Report", description: "AI-generated analysis of behavioral patterns across 357 events.", updated: "Apr 30, 2025", pages: 8 },
  { id: 3, name: "Communication Audit", description: "Analysis of all communications, response rates, and violations.", updated: "Apr 28, 2025", pages: 6 },
  { id: 4, name: "Custody Violation Log", description: "Chronological log of all custody order violations.", updated: "Apr 28, 2025", pages: 4 },
  { id: 5, name: "Hearing Preparation Brief", description: "Condensed hearing notebook formatted for court.", updated: "May 1, 2025", pages: 15 },
];

export default function ReportsPage() {
  return (
    <AppLayout title="Reports">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{reports.length} reports available</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{report.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Updated {report.updated} · {report.pages} pages</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">{report.description}</p>
            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-purple-50 text-purple-700 py-2 rounded-lg hover:bg-purple-100 transition-colors font-medium">
                <TrendingUp size={14} /> View Report
              </button>
              <button className="flex items-center justify-center gap-1.5 text-sm border border-gray-200 text-gray-600 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
