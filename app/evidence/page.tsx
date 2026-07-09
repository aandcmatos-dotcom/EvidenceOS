import AppLayout from "@/components/AppLayout";
import { mockRecentEvidence } from "@/lib/mock-data";
import { FileText, Upload, Filter, Search, Grid, List, Download, Eye } from "lucide-react";

const allEvidence = [
  ...mockRecentEvidence,
  { id: 4, name: "Exchange Log – Q1 2025.xlsx", type: "Excel", category: "Exchange Records", date: "Mar 31, 2025", size: "422 KB", tags: ["exchange"] },
  { id: 5, name: "Medical Records – Pediatric.pdf", type: "PDF", category: "Medical", date: "Mar 20, 2025", size: "3.1 MB", tags: ["medical"] },
  { id: 6, name: "Email Threads – Jan-Mar 2025.pdf", type: "PDF", category: "Communications", date: "Mar 15, 2025", size: "788 KB", tags: ["email"] },
  { id: 7, name: "Court Order – Jan 15 2025.pdf", type: "PDF", category: "Court Documents", date: "Jan 15, 2025", size: "512 KB", tags: ["court"] },
  { id: 8, name: "Photos – Exchange Location.zip", type: "ZIP", category: "Photos", date: "Apr 28, 2025", size: "14.2 MB", tags: ["photos", "exchange"] },
];

const typeIcons: Record<string, string> = {
  PDF: "text-red-500",
  Excel: "text-green-600",
  ZIP: "text-yellow-600",
};

const categories = ["All", "Law Enforcement", "Communications", "Education", "Medical", "Exchange Records", "Court Documents", "Photos"];

export default function EvidencePage() {
  return (
    <AppLayout title="Evidence Library">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{allEvidence.length} items · 23.4 MB total</p>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={15} /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Upload size={15} /> Upload Evidence
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Sidebar filter */}
        <div className="w-48 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Category</p>
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li key={cat}>
                  <button className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${cat === "All" ? "bg-purple-600 text-white font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mb-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search evidence..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Date Added</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Size</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {allEvidence.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className={typeIcons[item.type] ?? "text-gray-400"} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{item.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{item.size}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
