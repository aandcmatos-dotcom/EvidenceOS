"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, ShieldAlert, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRATEGY_REFUSAL, STRATEGY_ALTERNATIVES } from "@/lib/disclaimers";

const MODES = [
  "Draft", "Rewrite", "Summarize", "Organize", "Compare", "Find supporting records",
  "Identify missing information", "Check sources", "Explain reference in plain language", "Create checklist",
] as const;
type Mode = typeof MODES[number];

// Very small heuristic to detect legal-strategy questions so we can return the fixed refusal.
const STRATEGY_PATTERNS = [
  /should i (file|argue|say|claim|object|raise)/i,
  /what (motion|claim|defense|argument|objection) should/i,
  /will i (win|lose)/i,
  /what are my chances/i,
  /is (this|it) admissible/i,
  /is (this|my) (document|filing) (legally )?(sufficient|valid|enough)/i,
  /what.s my best (argument|strategy)/i,
  /how (do|should) i (win|beat)/i,
];

interface Message {
  role: "user" | "assistant";
  text: string;
  recordsUsed?: string[];
  referencesUsed?: string[];
  recordsNotReviewed?: string[];
  confidence?: "high" | "medium" | "low";
  missingInfo?: string[];
  warnings?: string[];
  strategyRefusal?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contextLabel: string; // e.g. "Documents", "Timeline"
}

export default function AIAssistantPanel({ open, onClose, contextLabel }: Props) {
  const [mode, setMode] = useState<Mode>("Draft");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const isStrategy = (text: string) => STRATEGY_PATTERNS.some((p) => p.test(text));

  const send = () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg: Message = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);

    // Phase 1: deterministic mock response. Phase 4 swaps this for the LLM service.
    setTimeout(() => {
      let reply: Message;
      if (isStrategy(text)) {
        reply = { role: "assistant", text: STRATEGY_REFUSAL, strategyRefusal: true };
      } else {
        reply = {
          role: "assistant",
          text: `[${mode}] This is a preview of the ${contextLabel} assistant. When connected, I will ${mode.toLowerCase()} using only your selected case records and verified references — never inventing facts, dates, citations, or rules. Every statement will show its source below.`,
          recordsUsed: ["Timeline: Missed Exchange (Apr 15)", "Exhibit 2 — Text Messages"],
          referencesUsed: ["§ 90.901, Fla. Stat. (verified)"],
          recordsNotReviewed: ["Communications after May 1 (not selected)"],
          confidence: "medium",
          missingInfo: ["No document date provided", "Recipient not specified"],
          warnings: ["One selected reference is marked \"Needs verification.\""],
        };
      }
      setMessages((m) => [...m, reply]);
      setThinking(false);
    }, 900);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">AI Assistant</p>
            <p className="text-[11px] text-gray-500">Context: {contextLabel} · current case only</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      {/* Mode selector */}
      <div className="px-3 py-2 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
        {MODES.map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors",
              mode === m ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {m}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <Sparkles size={28} className="text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">How can I help organize your case?</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              I can draft, rewrite, summarize, and organize using your records and verified references.
              I cannot recommend legal strategy or predict outcomes.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
              msg.role === "user" ? "bg-purple-600 text-white" : "bg-gray-50 border border-gray-100 text-gray-800")}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {msg.strategyRefusal && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">I can instead:</p>
                  {STRATEGY_ALTERNATIVES.map((alt) => (
                    <button key={alt} className="block w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-purple-300 hover:text-purple-700 transition-colors">
                      {alt}
                    </button>
                  ))}
                </div>
              )}

              {msg.role === "assistant" && !msg.strategyRefusal && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-[11px]">
                  <SourceRow icon={<FileText size={11} />} label="Records used" items={msg.recordsUsed} tone="green" />
                  <SourceRow icon={<ShieldAlert size={11} />} label="References used" items={msg.referencesUsed} tone="purple" />
                  <SourceRow icon={<FileText size={11} />} label="Records not reviewed" items={msg.recordsNotReviewed} tone="gray" />
                  {msg.missingInfo && msg.missingInfo.length > 0 && (
                    <SourceRow icon={<AlertTriangle size={11} />} label="Missing information" items={msg.missingInfo} tone="orange" />
                  )}
                  {msg.warnings && msg.warnings.length > 0 && (
                    <SourceRow icon={<AlertTriangle size={11} />} label="Verification warnings" items={msg.warnings} tone="red" />
                  )}
                  {msg.confidence && (
                    <p className="text-gray-500">Confidence: <span className="font-semibold capitalize">{msg.confidence}</span></p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-3.5 py-2.5 text-sm text-gray-400">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder={`Ask the assistant to ${mode.toLowerCase()}…`}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
          />
          <button onClick={send} disabled={!input.trim() || thinking}
            className="w-9 h-9 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 transition-colors flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Not legal advice. Responses draw only from your case records and verified references.
        </p>
      </div>
    </div>
  );
}

function SourceRow({ icon, label, items, tone }: {
  icon: React.ReactNode; label: string; items?: string[]; tone: "green" | "purple" | "gray" | "orange" | "red";
}) {
  if (!items || items.length === 0) return null;
  const toneCls = {
    green: "text-green-700", purple: "text-purple-700", gray: "text-gray-500",
    orange: "text-orange-700", red: "text-red-700",
  }[tone];
  return (
    <div>
      <p className={cn("flex items-center gap-1 font-semibold mb-0.5", toneCls)}>{icon} {label}</p>
      <ul className="pl-4 space-y-0.5">
        {items.map((it, i) => <li key={i} className="text-gray-600 list-disc list-outside">{it}</li>)}
      </ul>
    </div>
  );
}
