import AppLayout from "@/components/AppLayout";
import { BookMarked, Plus, FileText } from "lucide-react";

const exhibits = [
  { id: 1, number: "Exhibit 1", name: "Police Report – April 15, 2025", description: "LAPD incident report #LA-2025-04-8821 re: custody violation.", status: "marked", admitted: true },
  { id: 2, number: "Exhibit 2", name: "Text Message Thread – April 18, 2025", description: "47-message thread demonstrating lack of communication response.", status: "marked", admitted: false },
  { id: 3, number: "Exhibit 3", name: "School Attendance Records – Q1/Q2", description: "Official records from Lincoln Elementary showing 7 absences.", status: "marked", admitted: false },
  { id: 4, number: "Exhibit 4", name: "Medical Records – Pediatric Appointments", description: "Records from Children's Medical Group showing 6 missed appointments.", status: "pending", admitted: false },
  { id: 5, number: "Exhibit 5", name: "Court Order – January 15, 2025", description: "Temporary orders regarding custody schedule and holiday exchanges.", status: "marked", admitted: true },
  { id: 6, number: "Exhibit 6", name: "Exchange Log – January through April 2025", description: "Spreadsheet documenting all scheduled and completed exchanges.", status: "pending", admitted: false },
];

export default function ExhibitsPage() {
  return (
    <AppLayout title="Exhibits">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{exhibits.length} exhibits · {exhibits.filter(e => e.admitted).length} admitted</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Create Exhibit
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Exhibit</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {exhibits.map((exhibit) => (
              <tr key={exhibit.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                      <BookMarked size={15} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-bold text-purple-700">{exhibit.number}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900">{exhibit.name}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-gray-500 max-w-xs">{exhibit.description}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium w-fit ${exhibit.status === "marked" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                      {exhibit.status}
                    </span>
                    {exhibit.admitted && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700 w-fit">admitted</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
