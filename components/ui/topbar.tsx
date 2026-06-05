"use client";

import { Bell, User } from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  title: string;
  userName?: string;
  unreadNotifications?: number;
  actions?: React.ReactNode;
}

export function Topbar({ title, userName, unreadNotifications = 0, actions }: TopbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-gray-200 sticky top-0 z-10">
      <h1 className="text-[15px] font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {actions}

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell size={18} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>

        {/* User avatar */}
        <Link
          href="/settings"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
        >
          {userName ? (
            <span className="text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User size={16} />
          )}
        </Link>
      </div>
    </header>
  );
}
