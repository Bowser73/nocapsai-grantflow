"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Search,
  Radar,
  FolderOpen,
  KanbanSquare,
  FileText,
  Settings,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import { ProfileSwitcher } from "@/components/ui/profile-switcher";
import type { OrgSummary } from "@/lib/user-orgs";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Organization Profile",
    href: "/profile",
    icon: Building2,
  },
  {
    label: "Grant Search",
    href: "/search",
    icon: Search,
  },
  {
    label: "Funding Scout",
    href: "/funding-scout",
    icon: Radar,
  },
  {
    label: "Applications",
    href: "/grants",
    icon: FolderOpen,
  },
  {
    label: "Grant Tracker",
    href: "/tracker",
    icon: KanbanSquare,
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  orgs?: OrgSummary[];
  activeOrgId?: string | null;
  /** @deprecated use orgs + activeOrgId instead */
  orgName?: string;
}

export function Sidebar({ orgs, activeOrgId, orgName }: SidebarProps) {
  const pathname = usePathname();

  const showSwitcher = orgs && orgs.length > 0;

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-gradient-to-b from-brand-700 to-brand-800 h-screen sticky top-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-[15px]">GrantFlow AI</span>
        </Link>
      </div>

      {/* Profile switcher or static org name */}
      <div className="pt-3 pb-1">
        {showSwitcher ? (
          <ProfileSwitcher orgs={orgs} activeOrgId={activeOrgId} />
        ) : orgName ? (
          <div className="px-4 py-2 mx-3 mb-1 rounded-lg bg-white/10">
            <p className="text-[10px] font-semibold text-brand-300 uppercase tracking-wider mb-0.5">
              Organization
            </p>
            <p className="text-sm font-medium text-white truncate">{orgName}</p>
          </div>
        ) : (
          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-3 py-2 mx-3 mb-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors border border-amber-400/30"
          >
            <Building2 size={14} className="text-amber-300 shrink-0" />
            <span className="text-xs font-semibold text-amber-200">Set up organization &rarr;</span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium mb-0.5 group transition-colors",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-brand-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "shrink-0",
                  isActive ? "text-white" : "text-brand-300 group-hover:text-white"
                )}
                size={18}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-brand-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} className="text-brand-300" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
