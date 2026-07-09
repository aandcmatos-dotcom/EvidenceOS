import AppLayout from "@/components/AppLayout";
import { mockTasks } from "@/lib/mock-data";
import { Plus, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  "in-progress": "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
};

const allTasks = [
  ...mockTasks,
  { id: 5, title: "Organize hearing notebook for May 14", due: "May 13, 2025", priority: "high", status: "pending" },
  { id: 6, title: "Verify exhibit numbers with attorney", due: "May 8, 2025", priority: "medium", status: "pending" },
  { id: 7, title: "Download court docket updates", due: "Apr 30, 2025", priority: "low", status: "done" },
];

export default function TasksPage() {
  return (
    <AppLayout title="Tasks">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{allTasks.filter(t => t.status !== "done").length} open · {allTasks.filter(t => t.status === "done").length} completed</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Task
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-4">
          {["All", "Pending", "In Progress", "Done"].map((tab) => (
            <button key={tab} className={`text-sm font-medium pb-0.5 transition-colors ${tab === "All" ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-700"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="divide-y divide-gray-50">
          {allTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
              <input
                type="checkbox"
                defaultChecked={task.status === "done"}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", task.status === "done" ? "line-through text-gray-400" : "text-gray-900")}>
                  {task.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Due {task.due}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", priorityColors[task.priority])}>
                  {task.priority}
                </span>
                <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", statusColors[task.status])}>
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
