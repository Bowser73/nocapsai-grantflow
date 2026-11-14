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
  LogOut,
  Bell,
  Landmark,
} from "lucide-react";
import { ProfileSwitcher } from "@/components/ui/profile-switcher";
import { Logo } from "@/components/brand/logo";
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
    label: "Foundation Finder",
    href: "/foundations",
    icon: Landmark,
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
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
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
  unreadNotifications?: number;
}

export function Sidebar({ orgs, activeOrgId, orgName, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname();

  const showSwitcher = orgs && orgs.length > 0;

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen sticky top-0 bg-[#06151c] bg-[radial-gradient(120%_60%_at_0%_0%,rgba(0,236,149,.14),transparent_60%),linear-gradient(180deg,#0c2a2e,#06151c)]">
      {/* Logo */}
      <div className="flex flex-col gap-3 px-5 pt-4 pb-3 border-b border-white/10">
        <a
          href="https://nocapsai.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="NoCapsAI website"
          className="group inline-flex w-fit items-center gap-2.5 rounded-md"
        >
          <span className="flex">
            {[3, 1, 2].map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={n}
                src={`/brand/nocapsai-logo-${n}.webp`}
                alt=""
                width={34}
                height={34}
                className="-mr-2 h-[34px] w-[34px] rounded-full border-2 border-[#0c2a2e] object-cover shadow-[0_0_12px_rgba(0,236,149,.35)] transition-transform group-hover:-translate-y-0.5"
              />
            ))}
          </span>
          <span className="ml-2.5 font-bold text-[17px] tracking-tight text-white group-hover:text-mint">NoCapsAI</span>
        </a>
        <Link href="/dashboard" aria-label="GrantFlow dashboard" className="w-fit">
          <Logo tone="light" />
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
                  ? "bg-white/10 text-white shadow-[inset_3px_0_0_0_#00EC95]"
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
              {item.href === "/notifications" && unreadNotifications > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-highlight text-[11px] font-bold text-brand-900 flex items-center justify-center">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
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
