"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIAssistantPanel from "./AIAssistantPanel";

export default function AssistantLauncher({ contextLabel }: { contextLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        >
          <Sparkles size={16} /> <span className="text-sm font-semibold">AI Assistant</span>
        </button>
      )}
      <AIAssistantPanel open={open} onClose={() => setOpen(false)} contextLabel={contextLabel} />
    </>
  );
}
