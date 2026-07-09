import AppLayout from "@/components/AppLayout";
import { Scale, Plus, FileText, AlertCircle } from "lucide-react";

const orders = [
  {
    id: 1,
    title: "Temporary Custody Orders",
    date: "January 15, 2025",
    judge: "Hon. Patricia Williams",
    summary: "Establishes temporary legal and physical custody arrangement pending final hearing. Primary physical with Petitioner; alternating weekends with Respondent.",
    status: "Active",
    violations: 3,
  },
  {
    id: 2,
    title: "Holiday Schedule Order",
    date: "December 10, 2024",
    judge: "Hon. Patricia Williams",
    summary: "Governs holiday custody schedule including Thanksgiving, Winter Break, Spring Break, and summer vacation.",
    status: "Active",
    violations: 1,
  },
  {
    id: 3,
    title: "Communication Protocol Order",
    date: "November 5, 2024",
    judge: "Hon. Robert Jameson",
    summary: "Both parties required to respond to co-parenting communications within 24 hours. OFW or TalkingParents app required.",
    status: "Active",
    violations: 31,
  },
];

export default function CourtOrdersPage() {
  return (
    <AppLayout title="Court Orders">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{orders.length} active orders</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Order
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Scale size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-0.5">{order.title}</h3>
                    <p className="text-xs text-gray-400">Issued {order.date} · {order.judge}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.violations > 0 && (
                      <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium">
                        <AlertCircle size={12} />
                        {order.violations} violation{order.violations !== 1 ? "s" : ""}
                      </div>
                    )}
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">{order.status}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{order.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
