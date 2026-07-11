"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Mail, Phone, Plus, Trash2, Smartphone } from "lucide-react";

interface Communication {
  id: string;
  comm_type: string;
  from_party: string;
  to_party: string;
  occurred_at: string;
  summary: string | null;
  responded: boolean;
  message_count: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare size={16} className="text-purple-500" />,
  email: <Mail size={16} className="text-blue-500" />,
  call: <Phone size={16} className="text-green-500" />,
  app: <Smartphone size={16} className="text-indigo-500" />,
  other: <MessageSquare size={16} className="text-gray-400" />,
};

export default function CommunicationsPage() {
  const { activeCase } = useAuth();
  const [comms, setComms] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    comm_type: "text", from_party: "", to_party: "",
    occurred_at: "", summary: "", responded: false, message_count: 1,
  });

  const supabase = createClient();

  const fetchComms = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("communications")
      .select("*")
      .eq("case_id", activeCase.id)
      .order("occurred_at", { ascending: false });
    if (error && error.message.toLowerCase().includes("communications")) {
      setTableMissing(true);
    } else {
      setComms((data ?? []) as Communication[]);
    }
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchComms(); }, [fetchComms]);

  const addComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.from_party.trim() || !form.to_party.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("communications").insert({
      case_id: activeCase.id,
      comm_type: form.comm_type,
      from_party: form.from_party.trim(),
      to_party: form.to_party.trim(),
      occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
      summary: form.summary.trim() || null,
      responded: form.responded,
      message_count: form.message_count,
    } as never);
    setSaving(false);
    if (error) { alert(`Could not save communication: ${error.message}`); return; }
    setForm({ comm_type: "text", from_party: "", to_party: "", occurred_at: "", summary: "", responded: false, message_count: 1 });
    setModalOpen(false);
    fetchComms();
  };

  const toggleResponded = async (c: Communication) => {
    const { error } = await supabase.from("communications").update({ responded: !c.responded } as never).eq("id", c.id);
    if (!error) setComms((prev) => prev.map((x) => x.id === c.id ? { ...x, responded: !x.responded } : x));
  };

  const deleteComm = async (id: string) => {
    if (!confirm("Delete this communication log entry?")) return;
    const { error } = await supabase.from("communications").delete().eq("id", id);
    if (!error) setComms((prev) => prev.filter((c) => c.id !== id));
  };

  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <AppLayout title="Communications">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          {loading ? "Loading…" : `${comms.length} entries · ${comms.filter((c) => !c.responded).length} unanswered`}
        </p>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Log Communication
        </button>
      </div>

      {tableMissing && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>Setup needed:</strong> run the SQL in <code>supabase/migrations/002_communications.sql</code> in
            your Supabase SQL Editor to create the communications table, then refresh this page.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : comms.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <MessageSquare size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No communications logged yet. Log texts, emails, and calls to build a record.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {comms.map((comm) => (
              <div key={comm.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {typeIcons[comm.comm_type] ?? typeIcons.other}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{comm.from_party} → {comm.to_party}</span>
                    <button
                      onClick={() => toggleResponded(comm)}
                      title="Click to toggle"
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide cursor-pointer ${comm.responded ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}
                    >
                      {comm.responded ? "Replied" : "No Reply"}
                    </button>
                  </div>
                  {comm.summary && <p className="text-sm text-gray-500">{comm.summary}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {fmtDateTime(comm.occurred_at)} · {comm.message_count} message{comm.message_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => deleteComm(comm.id)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 mt-1">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Communication">
        <form onSubmit={addComm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
              <select value={form.comm_type}
                onChange={(e) => setForm((f) => ({ ...f, comm_type: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white">
                <option value="text">Text Message</option>
                <option value="email">Email</option>
                <option value="call">Phone Call</option>
                <option value="app">Co-Parenting App</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date &amp; Time</label>
              <input type="datetime-local" value={form.occurred_at}
                onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">From</label>
              <input type="text" required value={form.from_party}
                onChange={(e) => setForm((f) => ({ ...f, from_party: e.target.value }))}
                placeholder="Sender name"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">To</label>
              <input type="text" required value={form.to_party}
                onChange={(e) => setForm((f) => ({ ...f, to_party: e.target.value }))}
                placeholder="Recipient name"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Summary <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.summary} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Brief description of the communication"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5"># of Messages</label>
              <input type="number" min={1} value={form.message_count}
                onChange={(e) => setForm((f) => ({ ...f, message_count: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
            <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
              <input type="checkbox" checked={form.responded}
                onChange={(e) => setForm((f) => ({ ...f, responded: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-gray-700">Got a reply</span>
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Log It"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
