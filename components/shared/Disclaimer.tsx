import { AlertTriangle } from "lucide-react";
import { PLATFORM_DISCLAIMER } from "@/lib/disclaimers";

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <p className={compact ? "text-amber-800 text-xs leading-relaxed" : "text-amber-800 text-sm leading-relaxed"}>
        {compact ? (
          <>Evidence OS organizes information and assists with writing. It does <strong>not</strong> provide legal advice or determine that any document, citation, or procedure is legally sufficient.</>
        ) : PLATFORM_DISCLAIMER}
      </p>
    </div>
  );
}
