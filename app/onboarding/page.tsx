"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";

const CASE_TYPES = [
  "Divorce", "Paternity", "Parenting plan", "Timesharing or custody", "Child support",
  "Contempt or enforcement", "Modification", "Domestic violence", "Adoption", "Other family law matter",
];

const CASE_STATUSES = ["active", "closed", "archived"];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", case_number: "", case_type: "", state: "", county: "",
    circuit_district: "", court_name: "", division: "", judge: "", magistrate: "",
    petitioner: "", respondent: "", user_role: "", opposing_party: "", opposing_counsel: "",
    date_opened: "", status: "active",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.case_type) {
      setError("Please fill in at least the case name and case type.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? "",
      email: user.email ?? "",
    } as never);

    // jurisdiction summary string kept for existing display code
    const jurisdiction = [form.county && `${form.county} County`, form.state].filter(Boolean).join(", ") || null;

    const { error: caseError } = await supabase.from("cases").insert({
      owner_id: user.id,
      name: form.name.trim(),
      case_number: form.case_number.trim() || null,
      case_type: form.case_type,
      state: form.state.trim() || null,
      county: form.county.trim() || null,
      circuit_district: form.circuit_district.trim() || null,
      court_name: form.court_name.trim() || null,
      division: form.division.trim() || null,
      judge: form.judge.trim() || null,
      magistrate: form.magistrate.trim() || null,
      petitioner: form.petitioner.trim() || null,
      respondent: form.respondent.trim() || null,
      user_role: form.user_role.trim() || null,
      opposing_party: form.opposing_party.trim() || null,
      opposing_counsel: form.opposing_counsel.trim() || null,
      date_opened: form.date_opened || null,
      jurisdiction,
      status: form.status,
    } as never);

    if (caseError) {
      setError(caseError.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1347] to-[#2d1b6e] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-[#1e1347]" />
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Evidence OS</span>
          </div>
          <p className="text-purple-300 text-sm">Let&apos;s set up your first case</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle size={16} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Create your case</h1>
              <p className="text-xs text-gray-500">Only case name and type are required. Everything else can be added later.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Case basics */}
            <Section title="Case">
              <Field label="Case Name" required value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Smith v. Jones" full />
              <div>
                <Label required>Case Type</Label>
                <select required value={form.case_type} onChange={(e) => set("case_type", e.target.value)} className={selectCls}>
                  <option value="">Select a type…</option>
                  {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <Field label="Case Number" value={form.case_number} onChange={(v) => set("case_number", v)} placeholder="e.g. 2026-DR-000847" />
              <Field label="Date Case Opened" type="date" value={form.date_opened} onChange={(v) => set("date_opened", v)} />
              <div>
                <Label>Current Status</Label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
                  {CASE_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </Section>

            {/* Court / jurisdiction */}
            <Section title="Court & Jurisdiction">
              <Field label="State" value={form.state} onChange={(v) => set("state", v)} placeholder="e.g. FL" />
              <Field label="County" value={form.county} onChange={(v) => set("county", v)} placeholder="e.g. Orange" />
              <Field label="Judicial Circuit / District" value={form.circuit_district} onChange={(v) => set("circuit_district", v)} placeholder="e.g. 9th Circuit" />
              <Field label="Court Name" value={form.court_name} onChange={(v) => set("court_name", v)} placeholder="e.g. Circuit Court" />
              <Field label="Division" value={form.division} onChange={(v) => set("division", v)} placeholder="e.g. Family / Div. 32" />
              <Field label="Judge" value={form.judge} onChange={(v) => set("judge", v)} placeholder="e.g. Hon. Patricia Williams" />
              <Field label="Magistrate / Hearing Officer" value={form.magistrate} onChange={(v) => set("magistrate", v)} placeholder="Optional" />
            </Section>

            {/* Parties */}
            <Section title="Parties">
              <Field label="Petitioner" value={form.petitioner} onChange={(v) => set("petitioner", v)} />
              <Field label="Respondent" value={form.respondent} onChange={(v) => set("respondent", v)} />
              <Field label="Your Role in the Case" value={form.user_role} onChange={(v) => set("user_role", v)} placeholder="e.g. Petitioner (self-represented)" />
              <Field label="Opposing Party" value={form.opposing_party} onChange={(v) => set("opposing_party", v)} />
              <Field label="Opposing Counsel" value={form.opposing_counsel} onChange={(v) => set("opposing_counsel", v)} placeholder="Name / firm, if any" />
            </Section>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 leading-relaxed">
                Evidence OS helps you organize information — it does not provide legal advice. The court, division, and
                judge you enter are used to associate reference materials with your case; the app never claims those
                materials are current or applicable without your verification. Always consult a licensed attorney.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm flex items-center justify-center gap-2">
              {loading ? "Creating case…" : <>Create Case &amp; Continue <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400";
const selectCls = inputCls + " bg-white";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-1.5">{children} {required && <span className="text-red-400">*</span>}</label>;
}

function Field({ label, value, onChange, placeholder, type = "text", required, full }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label required={required}>{label}</Label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}
