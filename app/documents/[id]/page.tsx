"use client";

import { use } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { SupportBadge } from "@/components/shared/badges";
import { MOCK_DOCUMENTS } from "@/lib/mock/documents";
import { ArrowLeft, FileText, ClipboardCheck, Download, AlertTriangle } from "lucide-react";

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const doc = MOCK_DOCUMENTS.find((d) => d.id === id);

  if (!doc) {
    return (
      <AppLayout title="Document">
        <div className="text-center py-20">
          <FileText size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">Document not found.</p>
          <Link href="/documents" className="text-purple-600 text-sm font-semibold">Back to Documents</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Document">
      <Link href="/documents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Documents
      </Link>

      <div className="mb-5"><Disclaimer compact /></div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{doc.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{doc.category} · v{doc.version} · updated {doc.updatedAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/document-review" className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <ClipboardCheck size={15} /> Review
          </Link>
          <Link href="/documents/draft" className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
            <Download size={15} /> Export
          </Link>
        </div>
      </div>

      {doc.usesSupersededReference && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
          <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">This document was drafted using a reference that has since been superseded. Re-check the affected sections against the current version.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {doc.statements.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">This document has no drafted statements yet.</p>
        ) : (
          <div className="space-y-3">
            {doc.statements.map((s, i) => (
              <div key={s.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                <span className="text-gray-300 text-sm mt-0.5">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed mb-1.5">{s.text}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <SupportBadge status={s.status} />
                    {s.sources.map((src, j) => (
                      <span key={j} className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{src.label}</span>
                    ))}
                    {s.sources.length === 0 && <span className="text-[11px] text-red-600">No source located</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssistantLauncher contextLabel="Documents" />
    </AppLayout>
  );
}
