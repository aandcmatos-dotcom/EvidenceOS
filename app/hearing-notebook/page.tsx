import AppLayout from "@/components/AppLayout";
import { BookOpen, Plus, Download, ChevronRight } from "lucide-react";

const sections = [
  { id: 1, title: "Case Summary", items: 1, complete: true },
  { id: 2, title: "Custody Violations Log", items: 14, complete: true },
  { id: 3, title: "Key Evidence", items: 8, complete: false },
  { id: 4, title: "Witness List & Statements", items: 5, complete: false },
  { id: 5, title: "Exhibits Index", items: 6, complete: true },
  { id: 6, title: "Court Order Violations", items: 35, complete: false },
  { id: 7, title: "Requested Remedies", items: 3, complete: false },
  { id: 8, title: "Opening Statement Notes", items: 1, complete: false },
];

export default function HearingNotebookPage() {
  const completed = sections.filter((s) => s.complete).length;

  return (
    <AppLayout title="Hearing Notebook">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-500 text-sm">May 14, 2025 · 9:00 AM · Dept. 32</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={15} /> Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Plus size={15} /> Add Section
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900">Hearing Prep Progress</p>
          <p className="text-sm text-gray-500">{completed} of {sections.length} sections complete</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full transition-all"
            style={{ width: `${(completed / sections.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {sections.map((section, i) => (
            <div key={section.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${section.complete ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"}`}>
                {i + 1}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${section.complete ? "bg-green-500" : "bg-gray-300"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{section.title}</p>
                <p className="text-xs text-gray-400">{section.items} item{section.items !== 1 ? "s" : ""}</p>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${section.complete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {section.complete ? "Complete" : "Incomplete"}
              </span>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
