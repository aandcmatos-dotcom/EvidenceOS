"use client";

import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  title: string;
  caseName?: string;
}

export default function TopBar({ title, caseName }: TopBarProps) {
  const { user, activeCase } = useAuth();
  const displayCase = caseName ?? activeCase?.name ?? "No Case";
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <span className="text-gray-300">·</span>
        <span className="text-sm text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-full">
          {displayCase}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold">
          {initials}
        </div>
      </div>
    </header>
  );
}
