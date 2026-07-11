"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, CheckSquare, Trash2 } from "lucide-react";
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

type Tab = "All" | "Pending" | "In Progress" | "Done";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
}

const TABS: Tab[] = ["All", "Pending", "In Progress", "Done"];
const TAB_STATUS: Record<Tab, string | null> = {
  All: null,
  Pending: "pending",
  "In Progress": "in-progress",
  Done: "done",
};

export default function TasksPage() {
  const { activeCase } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", priority: "medium", status: "pending" });

  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    if (!activeCase) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id, title, due_date, priority, status")
      .eq("case_id", activeCase.id)
      .order("due_date", { ascending: true });
    setTasks((data ?? []) as Task[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tasks").insert({
      case_id: activeCase.id,
      owner_id: user?.id,
      title: form.title.trim(),
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
    } as never);
    setSaving(false);
    if (error) {
      alert(`Could not save task: ${error.message}`);
      return;
    }
    setForm({ title: "", due_date: "", priority: "medium", status: "pending" });
    setModalOpen(false);
    fetchTasks();
  };

  const toggleDone = async (task: Task) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    await supabase.from("tasks").update({ status: newStatus } as never).eq("id", task.id);
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = tasks.filter((t) => {
    const s = TAB_STATUS[tab];
    return s === null || t.status === s;
  });

  const open = tasks.filter((t) => t.status !== "done").length;
  const done = tasks.filter((t) => t.status === "done").length;

  const formatDate = (d: string | null) => {
    if (!d) return "No due date";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <AppLayout title="Tasks">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          {loading ? "Loading…" : `${open} open · ${done} completed`}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-4">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium pb-0.5 transition-colors ${tab === t ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <CheckSquare size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No tasks yet. Add one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((task) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggleDone(task)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", task.status === "done" ? "line-through text-gray-400" : "text-gray-900")}>
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Due {formatDate(task.due_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", priorityColors[task.priority] ?? "bg-gray-100 text-gray-600")}>
                    {task.priority}
                  </span>
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", statusColors[task.status] ?? "bg-gray-100 text-gray-600")}>
                    {task.status}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="ml-1 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Task">
        <form onSubmit={addTask} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Task"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
