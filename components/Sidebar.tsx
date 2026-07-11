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
  Shield,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  { href: "/patterns", label: "AI Insights", icon: Sparkles },
  { href: "/hearing-notebook", label: "Hearing Notebook", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, cases, activeCase, setActiveCase, signOut } = useAuth();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

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
        {cases.length === 0 ? (
          <Link href="/onboarding" className="block w-full text-center bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
            + Create First Case
          </Link>
        ) : (
          <div className="relative group">
            <button className="w-full flex items-center justify-between bg-purple-900/50 hover:bg-purple-900/70 transition-colors rounded-lg px-3 py-2.5">
              <div className="text-left overflow-hidden">
                <p className="text-purple-300 text-[10px] font-medium uppercase tracking-wider mb-0.5">Active Case</p>
                <p className="text-white text-sm font-semibold truncate">{activeCase?.name ?? "—"}</p>
              </div>
              <ChevronDown className="text-purple-400 flex-shrink-0 ml-2" size={16} />
            </button>
            {cases.length > 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#2d1b6e] rounded-lg shadow-xl border border-purple-700/40 z-50 hidden group-focus-within:block">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCase(c)}
                    className="w-full text-left px-3 py-2 text-sm text-purple-200 hover:bg-purple-700/40 hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg truncate"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

      {/* User footer */}
      <div className="px-4 py-3 border-t border-purple-800/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">
              {user?.user_metadata?.full_name ?? user?.email ?? "User"}
            </p>
            <p className="text-purple-400 text-[10px] truncate">{user?.email ?? ""}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="text-purple-400 hover:text-white transition-colors flex-shrink-0">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
