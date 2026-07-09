"use client";

import { Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  caseName?: string;
}

export default function TopBar({ title, caseName = "Doe v. Smith" }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <span className="text-gray-300">·</span>
        <span className="text-sm text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-full">
          {caseName}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search evidence, people, events..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
          />
        </div>
        <button className="relative w-9 h-9 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Bell size={16} className="text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
          JD
        </div>
      </div>
    </header>
  );
}
