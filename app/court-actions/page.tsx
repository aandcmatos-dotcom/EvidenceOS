"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import StatusBadge from "@/components/court-actions/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { getActions } from "@/lib/db/court-actions";
import { TASK_TYPE_LABEL, type CourtActionTaskType, type ActionStatus } from "@/lib/court-actions/types";
import {
  Gavel, MessageSquareText, CalendarClock, Reply, FileSearch,
  ListChecks, HelpCircle, FolderOpen, FileText, ClipboardCheck, ArrowRight, Play,
} from "lucide-react";

interface ActionListRow {
  id: string; title: string; task_type: CourtActionTaskType;
  status: ActionStatus; step: number; updated_at: string;
}

const CARDS = [
  { href: "/court-actions/new", icon: MessageSquareText, title: "Describe what is happening", desc: "Plain-language guided entry — start here if you're not sure what you need.", accent: true },
  { href: "/court-actions/new", icon: Play, title: "Start a new action", desc: "Begin a guided court-preparation task from a known starting point." },
  { href: "/hearing-preparation", icon: CalendarClock, title: "Prepare for a hearing", desc: "Build a hearing package: summaries, questions, exhibits, checklists." },
  { href: "/court-actions/new", icon: Reply, title: "Respond to a filing", desc: "Prepare a response to something the other party filed." },
  { href: "/discovery", icon: FileSearch, title: "Request information or records", desc: "Discovery requests and third-party records." },
  { href: "/court-actions/new", icon: HelpCircle, title: "Create questions", desc: "Witness, deposition, and examination question drafts." },
  { href: "/exhibits", icon: FolderOpen, title: "Build an exhibit packet", desc: "Index, coversheets, and a combined packet from your evidence." },
  { href: "/reports", icon: FileText, title: "Generate a summary", desc: "Case, event, and evidence summaries from your records." },
  { href: "/document-review", icon: ClipboardCheck, title: "Review a document", desc: "Source, citation, procedure, and writing checks." },
  { href: "/references", icon: ListChecks, title: "Manage references", desc: "Assign rules and procedures that drive checklists and citations." },
];

export default function CourtActionsPage() {
  const { activeCase } = useAuth();
  const [actions, setActions] = useState<ActionListRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!activeCase) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getActions(activeCase.id);
      setActions((data ?? []) as unknown as ActionListRow[]);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, [activeCase]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  return (
    <AppLayout title="Court Actions">
      <div className="mb-5"><Disclaimer compact /></div>

      {/* Continue an action */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Continue an action</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading actions…</p>
        ) : actions.length === 0 ? (
          <p className="text-sm text-gray-400">No actions yet — start below by describing what is happening.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {actions.map((a) => (
              <Link key={a.id} href={`/court-actions/${a.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all group">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Gavel size={18} className="text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{a.title}</h3>
                      <p className="text-xs text-gray-400">{TASK_TYPE_LABEL[a.task_type]} · step {a.step} of 10 · updated {new Date(a.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(a.step / 10) * 100}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Start something</p>
      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <Link key={c.title} href={c.href}
            className={c.accent
              ? "bg-purple-600 rounded-2xl shadow-sm p-5 hover:bg-purple-700 transition-colors group col-span-2"
              : "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-purple-200 transition-all group"}>
            <div className="flex items-center gap-3">
              <div className={c.accent ? "w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0" : "w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0"}>
                <c.icon size={c.accent ? 20 : 18} className={c.accent ? "text-white" : "text-purple-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={c.accent ? "text-base font-bold text-white" : "text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors"}>{c.title}</p>
                <p className={c.accent ? "text-sm text-purple-200" : "text-xs text-gray-400"}>{c.desc}</p>
              </div>
              <ArrowRight size={16} className={c.accent ? "text-purple-200" : "text-gray-300 group-hover:text-purple-400 transition-colors"} />
            </div>
          </Link>
        ))}
      </div>

      <AssistantLauncher contextLabel="Court Actions" />
    </AppLayout>
  );
}
