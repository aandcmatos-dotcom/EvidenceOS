import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import { FileSearch, ArrowRight } from "lucide-react";

// Placeholder for the Discovery workspace (Phase 4 of the Court Action plan).
export default function DiscoveryPage() {
  return (
    <AppLayout title="Discovery">
      <div className="mb-5"><Disclaimer compact /></div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center max-w-xl mx-auto">
        <FileSearch size={40} className="text-gray-200 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Discovery workspace is coming soon</h2>
        <p className="text-sm text-gray-500 mb-5">
          Requests for production, interrogatories, requests for admissions, and subpoena preparation
          will live here, built from your case records. This module arrives in a later phase.
        </p>
        <Link href="/court-actions" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors">
          Go to Court Actions <ArrowRight size={15} />
        </Link>
      </div>
    </AppLayout>
  );
}
