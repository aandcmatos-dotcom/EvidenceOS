"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Scale, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourtOrder {
  id: string;
  title: string;
  issued_date: string | null;
  judge: string | null;
  summary: string | null;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  superseded: "bg-gray-100 text-gray-500",
  expired: "bg-red-100 text-red-600",
};

export default function CourtOrdersPage() {
  const { activeCase } = useAuth();
  const [orders, setOrders] = useState<CourtOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", issued_date: "", judge: "", summary: "", status: "active" });

  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("court_orders")
      .select("*")
      .eq("case_id", activeCase.id)
      .order("issued_date", { ascending: false });
    setOrders((data ?? []) as CourtOrder[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const addOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("court_orders").insert({
      case_id: activeCase.id,
      title: form.title.trim(),
      issued_date: form.issued_date || null,
      judge: form.judge.trim() || null,
      summary: form.summary.trim() || null,
      status: form.status,
    } as never);
    setSaving(false);
    if (error) { alert(`Could not save order: ${error.message}`); return; }
    setForm({ title: "", issued_date: "", judge: "", summary: "", status: "active" });
    setModalOpen(false);
    fetchOrders();
  };

  const cycleStatus = async (order: CourtOrder) => {
    const next = order.status === "active" ? "superseded" : order.status === "superseded" ? "expired" : "active";
    const { error } = await supabase.from("court_orders").update({ status: next } as never).eq("id", order.id);
    if (!error) setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: next } : o));
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Delete this court order entry?")) return;
    const { error } = await supabase.from("court_orders").delete().eq("id", id);
    if (!error) setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Unknown date";

  return (
    <AppLayout title="Court Orders">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          {loading ? "Loading…" : `${orders.filter((o) => o.status === "active").length} active orders · ${orders.length} total`}
        </p>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Add Order
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading court orders…</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-12 text-center">
          <Scale size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No court orders logged yet. Add each order in your case so you can track them in one place.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scale size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-0.5">{order.title}</h3>
                      <p className="text-xs text-gray-400">
                        Issued {fmtDate(order.issued_date)}{order.judge ? ` · ${order.judge}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cycleStatus(order)}
                        title="Click to change status"
                        className={cn("px-3 py-1 rounded-full text-xs font-medium cursor-pointer", STATUS_STYLES[order.status] ?? STATUS_STYLES.active)}
                      >
                        {order.status}
                      </button>
                      <button onClick={() => deleteOrder(order.id)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {order.summary && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{order.summary}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Court Order">
        <form onSubmit={addOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
            <input type="text" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Temporary Custody Orders"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date Issued</label>
              <input type="date" value={form.issued_date}
                onChange={(e) => setForm((f) => ({ ...f, issued_date: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white">
                <option value="active">Active</option>
                <option value="superseded">Superseded</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Judge <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={form.judge}
              onChange={(e) => setForm((f) => ({ ...f, judge: e.target.value }))}
              placeholder="e.g. Hon. Patricia Williams"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Summary <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.summary} rows={3}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="What does this order require?"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Order"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
