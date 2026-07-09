"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  FolderOpen,
  BookMarked,
  Users,
  MessageSquare,
  CalendarDays,
  CheckSquare,
  Scale,
  BookOpen,
  BarChart3,
  Settings,
  ChevronDown,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/evidence", label: "Evidence Library", icon: FolderOpen },
  { href: "/exhibits", label: "Exhibits", icon: BookMarked },
  { href: "/people", label: "People", icon: Users },
  { href: "/communications", label: "Communications", icon: MessageSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/court-orders", label: "Court Orders", icon: Scale },
  { href: "/hearing-notebook", label: "Hearing Notebook", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#1e1347] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-purple-800/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-purple-400 rounded-lg flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-[#1e1347]" size={18} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Evidence OS</span>
        </div>
      </div>

      {/* Case Selector */}
      <div className="px-4 py-3 border-b border-purple-800/40">
        <button className="w-full flex items-center justify-between bg-purple-900/50 hover:bg-purple-900/70 transition-colors rounded-lg px-3 py-2.5">
          <div className="text-left">
            <p className="text-purple-300 text-[10px] font-medium uppercase tracking-wider mb-0.5">Active Case</p>
            <p className="text-white text-sm font-semibold truncate">Doe v. Smith</p>
          </div>
          <ChevronDown className="text-purple-400 flex-shrink-0 ml-2" size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-purple-400/60 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Navigation</p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-900/50"
                      : "text-purple-200/80 hover:bg-purple-800/40 hover:text-white"
                  )}
                >
                  <Icon size={16} className={active ? "text-white" : "text-purple-400"} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Upgrade Card */}
      <div className="px-4 py-4 border-t border-purple-800/40">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} className="text-yellow-300" />
            <span className="text-white text-xs font-bold uppercase tracking-wide">Upgrade to Pro</span>
          </div>
          <p className="text-purple-200 text-xs mb-3 leading-relaxed">
            Unlimited evidence, AI insights, and hearing prep tools.
          </p>
          <button className="w-full bg-white text-purple-700 text-xs font-bold py-2 rounded-lg hover:bg-purple-50 transition-colors">
            View Plans
          </button>
        </div>
      </div>
    </aside>
  );
}
