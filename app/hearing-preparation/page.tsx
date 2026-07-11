import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import { CalendarClock, ArrowRight } from "lucide-react";

// Placeholder for "Build My Hearing Package" (Phase 4 of the Court Action plan).
// Until then, the existing Hearing Notebook covers hearing prep basics.
export default function HearingPreparationPage() {
  return (
    <AppLayout title="Hearing Preparation">
      <div className="mb-5"><Disclaimer compact /></div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center max-w-xl mx-auto">
        <CalendarClock size={40} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Build My Hearing Package is coming soon</h2>
        <p className="text-sm text-gray-500 mb-5">
          Full hearing packages — summaries, witness and exhibit lists, examination questions, and
          checklists generated from one approved fact set — arrive in a later phase. For now, the
          Hearing Notebook covers packet basics.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/hearing-notebook" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
            Open Hearing Notebook <ArrowRight size={15} />
          </Link>
          <Link href="/court-actions" className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            Court Actions
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
