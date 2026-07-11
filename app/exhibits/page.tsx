"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookMarked, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Exhibit {
  id: string;
  number: string;
  title: string;
  description: string | null;
  status: string;
  admitted: boolean;
  evidence_id: string | null;
}

interface EvidenceOption { id: string; title: string; }

export default function ExhibitsPage() {
  const { activeCase } = useAuth();
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [evidenceOptions, setEvidenceOptions] = useState<EvidenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ number: "", title: "", description: "", status: "pending", evidence_id: "" });

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    const [{ data: ex }, { data: ev }] = await Promise.all([
      supabase.from("exhibits").select("*").eq("case_id", activeCase.id).order("created_at", { ascending: true }),
      supabase.from("evidence").select("id, title").eq("case_id", activeCase.id).order("created_at", { ascending: false }),
    ]);
    setExhibits((ex ?? []) as Exhibit[]);
    setEvidenceOptions((ev ?? []) as EvidenceOption[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = () => {
    setForm({ number: `Exhibit ${exhibits.length + 1}`, title: "", description: "", status: "pending", evidence_id: "" });
    setModalOpen(true);
  };

  const addExhibit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.number.trim() || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("exhibits").insert({
      case_id: activeCase.id,
      number: form.number.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      evidence_id: form.evidence_id || null,
    } as never);
    setSaving(false);
    if (error) { alert(`Could not save exhibit: ${error.message}`); return; }
    setModalOpen(false);
    fetchAll();
  };

  const toggleAdmitted = async (ex: Exhibit) => {
    const { error } = await supabase.from("exhibits").update({ admitted: !ex.admitted } as never).eq("id", ex.id);
    if (!error) setExhibits((prev) => prev.map((x) => x.id === ex.id ? { ...x, admitted: !x.admitted } : x));
  };

  const toggleStatus = async (ex: Exhibit) => {
    const next = ex.status === "marked" ? "pending" : "marked";
    const { error } = await supabase.from("exhibits").update({ status: next } as never).eq("id", ex.id);
    if (!error) setExhibits((prev) => prev.map((x) => x.id === ex.id ? { ...x, status: next } : x));
  };

  const deleteExhibit = async (id: string) => {
    if (!confirm("Delete this exhibit? (The underlying evidence file is not deleted.)")) return;
    const { error } = await supabase.from("exhibits").delete().eq("id", id);
    if (!error) setExhibits((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <AppLayout title="Exhibits">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          {loading ? "Loading…" : `${exhibits.length} exhibits · ${exhibits.filter((e) => e.admitted).length} admitted`}
        </p>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Create Exhibit
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">Loading exhibits…</div>
        ) : exhibits.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BookMarked size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No exhibits yet. Create one to build your exhibit list for court.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Exhibit</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Description</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {exhibits.map((exhibit) => (
                <tr key={exhibit.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                        <BookMarked size={15} className="text-purple-600" />
                      </div>
                      <span className="text-sm font-bold text-purple-700 whitespace-nowrap">{exhibit.number}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{exhibit.title}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-500 max-w-xs">{exhibit.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => toggleStatus(exhibit)}
                        title="Click to toggle marked/pending"
                        className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium w-fit cursor-pointer",
                          exhibit.status === "marked" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500")}
                      >
                        {exhibit.status}
                      </button>
                      <button
                        onClick={() => toggleAdmitted(exhibit)}
                        title="Click to toggle admitted"
                        className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium w-fit cursor-pointer",
                          exhibit.admitted ? "bg-green-100 text-green-700" : "bg-gray-50 text-gray-400 border border-dashed border-gray-200")}
                      >
                        {exhibit.admitted ? "admitted" : "not admitted"}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => deleteExhibit(exhibit.id)} className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Exhibit">
        <form onSubmit={addExhibit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Exhibit Number</label>
              <input type="text" required value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                placeholder="Exhibit 1"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white">
                <option value="pending">Pending</option>
                <option value="marked">Marked</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
            <input type="text" required value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Police Report – April 15"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={form.description} rows={2}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link to Evidence <span className="text-gray-400 font-normal">(optional)</span></label>
            <select value={form.evidence_id}
              onChange={(e) => setForm((f) => ({ ...f, evidence_id: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white">
              <option value="">None</option>
              {evidenceOptions.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Create Exhibit"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
