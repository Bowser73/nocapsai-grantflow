"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Building2, Plus, Check, Loader2 } from "lucide-react";
import type { OrgSummary } from "@/lib/user-orgs";

interface ProfileSwitcherProps {
  orgs: OrgSummary[];
  activeOrgId: string | null | undefined;
}

export function ProfileSwitcher({ orgs, activeOrgId }: ProfileSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    setSwitching(orgId);
    try {
      const res = await fetch("/api/profile/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSwitching(null);
      setOpen(false);
    }
  }

  if (orgs.length === 0) return null;

  return (
    <div ref={ref} className="relative px-3 mb-2">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-left"
      >
        <Building2 className="h-4 w-4 text-brand-200 shrink-0" />
        <span className="flex-1 text-sm font-medium text-white truncate">
          {activeOrg?.name ?? "Select profile"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-brand-300 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="py-1">
            {orgs.map((org) => {
              const isActive = org.id === activeOrgId;
              const isLoading = switching === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 text-brand-600 animate-spin shrink-0" />
                  ) : isActive ? (
                    <Check className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {org.name}
                    </div>
                    {org.orgType && (
                      <div className="text-xs text-gray-500 truncate">
                        {org.orgType}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t border-gray-100">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/organizations/new");
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-600">Add organization</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
