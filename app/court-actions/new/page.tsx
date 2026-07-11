"use client";

import { useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import Disclaimer from "@/components/shared/Disclaimer";
import DocumentOptionCard from "@/components/court-actions/DocumentOptionCard";
import { intakeSituation, type IntakeResult } from "@/lib/services/situationIntakeService";
import { COMMON_SITUATIONS, NOT_SURE_OPTIONS } from "@/lib/mock/court-actions";
import { MessageSquareText, ArrowRight, ChevronLeft, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TellUsPage() {
  const [picked, setPicked] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [result, setResult] = useState<IntakeResult | null>(null);

  const description = picked ?? freeText;

  const submit = () => {
    if (!description.trim()) return;
    setResult(intakeSituation(description));
  };

  return (
    <AppLayout title="Tell Us What Is Happening">
      <div className="mb-5"><Disclaimer compact /></div>

      <Link href="/court-actions" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={15} /> Back to Court Actions
      </Link>

      {!result ? (
        <div className="max-w-3xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <MessageSquareText size={18} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Tell us what is happening</h2>
                <p className="text-xs text-gray-500">Pick a common situation or describe it in your own words — no legal terms needed.</p>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-5 mb-2">Common situations</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {COMMON_SITUATIONS.map((s) => (
                <button key={s} onClick={() => { setPicked(picked === s ? null : s); setFreeText(""); }}
                  className={cn("text-xs px-3 py-1.5 rounded-full border text-left transition-colors",
                    picked === s ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700")}>
                  {s}
                </button>
              ))}
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Or describe it yourself</p>
            <textarea rows={4} value={freeText}
              onChange={(e) => { setFreeText(e.target.value); setPicked(null); }}
              placeholder="Example: The other parent enrolled our child in a different school without discussing it, and there's an enrollment deadline coming up…"
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none mb-4" />

            <button onClick={submit} disabled={!description.trim()}
              className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              Show possible document categories <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Your description</p>
            <p className="text-sm text-gray-800 mb-3">{result.extractedIssue}</p>
            {result.missingInformation.length > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  {result.missingInformation.map((m) => <p key={m}>{m}</p>)}
                </div>
              </div>
            )}
            <button onClick={() => setResult(null)} className="mt-3 text-xs text-purple-600 font-medium hover:text-purple-700">
              ← Change description
            </button>
          </div>

          <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5">
            <Info size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Based on the situation you described, these document categories may be related. Review the definitions
              and official sources before choosing. These options are shown for informational purposes — Evidence OS
              is not suggesting that you select or file any specific document.
            </p>
          </div>

          {result.matches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-500 text-sm mb-2">No matching document categories were found for that description.</p>
              <p className="text-gray-400 text-xs">Try describing the situation with more detail, or browse the options below.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {result.matches.map(({ definition, matchedKeywords }) => (
                <DocumentOptionCard key={definition.id} definition={definition} matchedKeywords={matchedKeywords} />
              ))}
            </div>
          )}

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Not ready to pick?</p>
          <div className="flex flex-wrap gap-2">
            {NOT_SURE_OPTIONS.map((o) => (
              <button key={o} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors">
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
