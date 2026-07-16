"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, GripVertical } from "lucide-react";
import AIAssistantPanel from "./AIAssistantPanel";

const STORAGE_KEY = "eos_assistant_launcher_pos";
const BUTTON_W = 168; // approx rendered width, for clamping
const BUTTON_H = 48;
const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag, not a click

// Default position: middle-right, well clear of the bottom action bars (wizard
// "Continue", import batch bar) that every "fixed bottom-*" footer in this app
// uses. Draggable + persisted so a user can move it anywhere it's never in the way.
function defaultPos() {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return { x: window.innerWidth - BUTTON_W - 24, y: window.innerHeight * 0.45 };
}

export default function AssistantLauncher({ contextLabel }: { contextLabel: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") { setPos(clamp(parsed)); return; }
      } catch { /* fall through to default */ }
    }
    setPos(defaultPos());
  }, []);

  function clamp(p: { x: number; y: number }) {
    if (typeof window === "undefined") return p;
    return {
      x: Math.min(Math.max(0, p.x), window.innerWidth - BUTTON_W),
      y: Math.min(Math.max(0, p.y), window.innerHeight - BUTTON_H),
    };
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, moved: false };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) setPos(clamp({ x: d.originX + dx, y: d.originY + dy }));
  }, []);

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved && pos) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } else if (!d?.moved) {
      setOpen(true);
    }
  };

  if (!pos) return null;

  return (
    <>
      {!open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ left: pos.x, top: pos.y }}
          title="Drag to move · click to open"
          className="fixed z-30 flex items-center gap-1.5 pl-2 pr-4 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <GripVertical size={14} className="opacity-50" />
          <Sparkles size={16} /> <span className="text-sm font-semibold">AI Assistant</span>
        </button>
      )}
      <AIAssistantPanel open={open} onClose={() => setOpen(false)} contextLabel={contextLabel} />
    </>
  );
}
