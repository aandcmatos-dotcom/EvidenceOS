import { cn } from "@/lib/utils";
import { ACTION_STATUS_LABEL, type ActionStatus } from "@/lib/court-actions/types";

const styles: Record<ActionStatus, string> = {
  not_started: "bg-gray-100 text-gray-500",
  in_progress: "bg-blue-100 text-blue-700",
  waiting_for_information: "bg-yellow-100 text-yellow-700",
  source_review_required: "bg-orange-100 text-orange-700",
  citation_approval_required: "bg-orange-100 text-orange-700",
  draft_ready: "bg-purple-100 text-purple-700",
  user_review_required: "bg-yellow-100 text-yellow-700",
  procedure_warning: "bg-red-100 text-red-700",
  ready_for_export: "bg-green-100 text-green-700",
  exported: "bg-green-100 text-green-700",
  filed_user_reported: "bg-indigo-100 text-indigo-700",
  served_user_reported: "bg-indigo-100 text-indigo-700",
  hearing_completed_user_reported: "bg-gray-200 text-gray-600",
};

export default function StatusBadge({ status }: { status: ActionStatus }) {
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap", styles[status])}>
      {ACTION_STATUS_LABEL[status]}
    </span>
  );
}
