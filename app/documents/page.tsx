"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { useAuth } from "@/contexts/AuthContext";
import { getDocuments, getTemplates, deleteDocument } from "@/lib/db/documents";
import { DOCUMENT_CATEGORIES } from "@/lib/documents/types";
import {
  FileText, Plus, FilePlus2, LayoutTemplate, ClipboardCheck, Download,
  AlertTriangle, Clock, CheckCircle, ArrowRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["My Documents", "Templates", "Draft New Document", "Review Document", "Exported Documents"] as const;
type Tab = typeof TABS[number];

const statusConfig: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  draft:     { label: "Draft",      cls: "bg-gray-100 text-gray-600",     icon: FileText },
  in_review: { label: "In Review",  cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  reviewed:  { label: "Reviewed",   cls: "bg-green-100 text-green-700",   icon: CheckCircle },
  exported:  { label: "Exported",   cls: "bg-purple-100 text-purple-700", icon: Download },
};

interface DocRow {
  id: string; title: string; category: string; status: string; version: number;
  updated_at: string; uses_superseded_reference: boolean; document_sources: { id: string }[];
}
interface TemplateRow { id: string; name: string; category: string; description: string | null; built_in: boolean; template_variables: { key: string }[] }

export default function DocumentsPage() {
  const [tab, setTab] = useState<Tab>("My Documents");
  const { user, activeCase } = useAuth();

  const [docs, setDocs] = useState<DocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!activeCase) { setDocsLoading(false); return; }
    setDocsLoading(true);
    try {
      const data = await getDocuments(activeCase.id);
      setDocs((data ?? []) as unknown as DocRow[]);
    } finally {
      setDocsLoading(false);
    }
  }, [activeCase]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    if (!user) return;
    setTemplatesLoading(true);
    getTemplates(user.id)
      .then((data) => setTemplates((data ?? []) as unknown as TemplateRow[]))
      .finally(() => setTemplatesLoading(false));
  }, [user]);

  return (
    <AppLayout title="Documents">
      <div className="mb-5"><Disclaimer compact /></div>

      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              tab === t ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "My Documents" && <MyDocuments docs={docs} loading={docsLoading} onDeleted={fetchDocs} hasCase={!!activeCase} />}
      {tab === "Templates" && <Templates templates={templates} loading={templatesLoading} />}
      {tab === "Draft New Document" && <DraftNew />}
      {tab === "Review Document" && <ReviewTab />}
      {tab === "Exported Documents" && <ExportedTab />}

      <AssistantLauncher contextLabel="Documents" />
    </AppLayout>
  );
}

function MyDocuments({ docs, loading, onDeleted, hasCase }: {
  docs: DocRow[]; loading: boolean; onDeleted: () => void; hasCase: boolean;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await deleteDocument(id);
    onDeleted();
  };

  if (!hasCase) {
    return <div className="text-center py-16"><p className="text-gray-400 text-sm">Select or create a case to see its documents.</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500 text-sm">{loading ? "Loading…" : `${docs.length} documents`}</p>
        <Link href="/documents/draft" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={15} /> Draft New Document
        </Link>
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium mb-1">No documents yet</p>
          <p className="text-gray-400 text-sm mb-4">Draft your first document from your case&apos;s evidence, timeline, and references.</p>
          <Link href="/documents/draft" className="inline-block px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Draft New Document
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {docs.map((doc) => {
            const cfg = statusConfig[doc.status] ?? statusConfig.draft;
            const StatusIcon = cfg.icon;
            return (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow group relative">
                <Link href={`/documents/${doc.id}`} className="block">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-purple-700 transition-colors">{doc.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.category} · v{doc.version} · updated {new Date(doc.updated_at).toLocaleDateString()}</p>
                    </div>
                    <span className={cn("flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0", cfg.cls)}>
                      <StatusIcon size={10} /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {doc.uses_superseded_reference ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle size={12} /> uses superseded reference</span>
                    ) : (
                      <span className="text-gray-400">{doc.document_sources?.length ?? 0} linked source{doc.document_sources?.length === 1 ? "" : "s"}</span>
                    )}
                  </div>
                </Link>
                <button onClick={() => handleDelete(doc.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Templates({ templates, loading }: { templates: TemplateRow[]; loading: boolean }) {
  const [category, setCategory] = useState("All");
  const cats = ["All", ...DOCUMENT_CATEGORIES];
  const filtered = category === "All" ? templates : templates.filter((t) => t.category === category);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-500 text-sm">{loading ? "Loading…" : `${templates.length} templates · none are pre-approved or certified as court-compliant`}</p>
        <Link href="/documents/draft" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          <FilePlus2 size={15} /> Use in a Draft
        </Link>
      </div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {cats.slice(0, 12).map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={cn("text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
              category === c ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300")}>
            {c}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading templates…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <LayoutTemplate size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No templates in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <LayoutTemplate size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
                  <p className="text-xs text-gray-400">{tpl.category}{tpl.built_in ? " · built-in" : " · custom"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">{tpl.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(tpl.template_variables ?? []).slice(0, 4).map((v) => (
                  <span key={v.key} className="text-[10px] font-mono bg-gray-50 border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</span>
                ))}
              </div>
              <Link href={`/documents/draft?template=${tpl.id}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700">
                Start from this template <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DraftNew() {
  return (
    <div className="max-w-xl mx-auto text-center py-10">
      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FilePlus2 size={26} className="text-purple-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Draft a new document</h2>
      <p className="text-sm text-gray-500 mb-6">
        A guided 7-step workflow: choose a document type, select your own case sources, answer a few questions,
        and generate a draft where every factual sentence shows where it came from.
      </p>
      <Link href="/documents/draft" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
        Start Drafting <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function ReviewTab() {
  return (
    <div className="max-w-xl mx-auto text-center py-10">
      <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ClipboardCheck size={26} className="text-purple-600" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Review a document</h2>
      <p className="text-sm text-gray-500 mb-6">
        Run a document through source, citation, procedure, evidence-foundation, and writing checks against your
        stored records and verified references. This is a review aid, not a legal approval.
      </p>
      <Link href="/document-review" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
        Open Document Review <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function ExportedTab() {
  return (
    <div className="text-center py-16">
      <Download size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-gray-500 font-medium mb-1">No exported documents yet</p>
      <p className="text-gray-400 text-sm">Documents you export to DOCX, PDF, or text will be listed here with their export history.</p>
    </div>
  );
}
