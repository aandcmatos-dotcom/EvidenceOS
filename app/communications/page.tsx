import AppLayout from "@/components/AppLayout";
import { MessageSquare, Mail, Phone, Plus, Filter } from "lucide-react";

const communications = [
  { id: 1, type: "text", from: "Jane Doe", to: "Robert Smith", date: "Apr 18, 2025 · 2:14 PM", preview: "Reminder: pickup is at 3:00 PM today at Lincoln Elementary.", responded: false, count: 47 },
  { id: 2, type: "email", from: "Jane Doe", to: "Robert Smith", date: "Apr 12, 2025 · 9:30 AM", preview: "Per our parenting plan, please confirm the April 18 exchange...", responded: false, count: 1 },
  { id: 3, type: "text", from: "Robert Smith", to: "Jane Doe", date: "Apr 10, 2025 · 7:45 PM", preview: "I will not be available for the Saturday exchange.", responded: true, count: 3 },
  { id: 4, type: "email", from: "Jane Doe", to: "Principal Adams", date: "Apr 9, 2025 · 11:00 AM", preview: "Requesting attendance records for the period Jan–Mar 2025.", responded: true, count: 1 },
  { id: 5, type: "text", from: "Jane Doe", to: "Robert Smith", date: "Apr 5, 2025 · 3:02 PM", preview: "I'm at the school for pickup. Where are you?", responded: false, count: 12 },
];

const typeIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare size={16} className="text-purple-500" />,
  email: <Mail size={16} className="text-blue-500" />,
  call: <Phone size={16} className="text-green-500" />,
};

export default function CommunicationsPage() {
  return (
    <AppLayout title="Communications">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{communications.length} threads · {communications.filter(c => !c.responded).length} unanswered</p>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Filter size={15} /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Plus size={15} /> Log Communication
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {communications.map((comm) => (
            <div key={comm.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {typeIcons[comm.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-gray-900">{comm.from} → {comm.to}</span>
                  {!comm.responded && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">No Reply</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{comm.preview}</p>
                <p className="text-xs text-gray-400 mt-1">{comm.date} · {comm.count} message{comm.count !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
