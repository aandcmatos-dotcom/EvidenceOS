"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Phone, Mail, FileText, Trash2, Users } from "lucide-react";

const roleColors: Record<string, string> = {
  Petitioner: "bg-purple-100 text-purple-700",
  Respondent: "bg-red-100 text-red-700",
  Witness: "bg-blue-100 text-blue-700",
  Attorney: "bg-green-100 text-green-700",
  "Guardian ad Litem": "bg-orange-100 text-orange-700",
  Expert: "bg-indigo-100 text-indigo-700",
  Other: "bg-gray-100 text-gray-600",
};

const ROLES = ["Petitioner", "Respondent", "Witness", "Attorney", "Guardian ad Litem", "Expert", "Other"];

interface Person {
  id: string;
  name: string;
  role: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

export default function PeoplePage() {
  const { activeCase } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Witness", relationship: "", phone: "", email: "" });

  const supabase = createClient();

  const fetchPeople = useCallback(async () => {
    if (!activeCase) return;
    setLoading(true);
    const { data } = await supabase
      .from("people")
      .select("id, name, role, relationship, phone, email")
      .eq("case_id", activeCase.id)
      .order("name");
    setPeople((data ?? []) as Person[]);
    setLoading(false);
  }, [activeCase]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase || !form.name.trim()) return;
    setSaving(true);
    await supabase.from("people").insert({
      case_id: activeCase.id,
      name: form.name.trim(),
      role: form.role,
      relationship: form.relationship.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    } as never);
    setForm({ name: "", role: "Witness", relationship: "", phone: "", email: "" });
    setModalOpen(false);
    setSaving(false);
    fetchPeople();
  };

  const deletePerson = async (id: string) => {
    if (!confirm("Remove this person from the case?")) return;
    await supabase.from("people").delete().eq("id", id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AppLayout title="People">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          {loading ? "Loading…" : `${people.length} people in this case`}
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus size={15} /> Add Person
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : people.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No people added yet.</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-purple-600 text-sm font-semibold hover:text-purple-700">
            + Add the first person
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {people.map((person) => (
            <div key={person.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all group relative">
              <button
                onClick={() => deletePerson(person.id)}
                className="absolute top-3 right-3 text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{person.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[person.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {person.role}
                  </span>
                </div>
              </div>
              {person.relationship && (
                <p className="text-xs text-gray-500 mb-3">{person.relationship}</p>
              )}
              <div className="space-y-1">
                {person.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone size={12} /> {person.phone}
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Mail size={12} /> {person.email}
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors">
                  <FileText size={12} /> View Files
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Person">
        <form onSubmit={addPerson} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jane Doe"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role in Case</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 bg-white"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Relationship / Description</label>
            <input
              type="text"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              placeholder="e.g. Opposing party, Child's teacher"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 000-0000"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Add Person"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
