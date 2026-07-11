"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PackageComponent } from "@/lib/court-actions/types";

// Step 6: package contents. "Recommended by template" is a product-configuration
// recommendation (which components this template usually bundles), not legal advice.
export default function PackageComponentPicker({ components, onChange }: {
  components: PackageComponent[];
  onChange: (c: PackageComponent[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(components.map((c) => c.id === id ? { ...c, selected: !c.selected } : c));

  const selectAll = () => onChange(components.map((c) => ({ ...c, selected: true })));
  const selectRecommended = () => onChange(components.map((c) => ({ ...c, selected: c.templateRecommended })));

  const selectedCount = components.filter((c) => c.selected).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={selectRecommended} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors">
          Select template defaults
        </button>
        <button onClick={selectAll} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors">
          Select all
        </button>
        <span className="text-xs text-gray-400 ml-auto">{selectedCount} of {components.length} selected</span>
      </div>

      <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 mb-4">
        <Info size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500">
          &ldquo;Template default&rdquo; marks the components this package template usually bundles together —
          a product configuration, not legal advice about what you should file.
        </p>
      </div>

      <div className="space-y-2">
        {components.map((c) => (
          <label key={c.id} className={cn("flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors",
            c.selected ? "border-purple-300 bg-purple-50/50" : "border-gray-100 hover:bg-gray-50")}>
            <input type="checkbox" checked={c.selected} onChange={() => toggle(c.id)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.templateRecommended && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Template default</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{c.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
