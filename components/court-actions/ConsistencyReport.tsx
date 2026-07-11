import { AlertTriangle, CheckCircle } from "lucide-react";
import type { ConsistencyFinding } from "@/lib/court-actions/types";

// Step 9: cross-document consistency. Purely comparative — the system flags
// disagreement between documents but never asserts which value is correct.
export default function ConsistencyReport({ findings }: { findings: ConsistencyFinding[] }) {
  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle size={16} className="text-green-600" />
        <p className="text-sm text-green-800">No consistency issues detected across the package components.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {findings.map((f) => (
        <div key={f.id} className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 mb-2">
            <AlertTriangle size={14} className="text-orange-500" /> {f.field} differs across documents
          </p>
          <div className="space-y-1 mb-2">
            {f.values.map((v) => (
              <div key={v.document} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 w-48 flex-shrink-0 truncate">{v.document}</span>
                <span className="font-mono bg-gray-50 border border-gray-100 rounded px-2 py-0.5 text-gray-700">{v.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">{f.note}</p>
        </div>
      ))}
    </div>
  );
}
