"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface OrgOption {
  id: string;
  name: string;
  orgType: string | null;
  city: string | null;
  state: string | null;
}

interface OrgLinkerProps {
  orgs: OrgOption[];
  userId: string;
}

export function OrgLinker({ orgs }: OrgLinkerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(
    orgs.length === 1 ? orgs[0].id : null
  );
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    if (!selected) return;
    setLinking(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selected }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to link organization");
      }

      // Refresh so JWT callback re-reads the updated organizationId
      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Org list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {orgs.length === 1 ? "Your organization" : "Select an organization"}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {orgs.map((org) => {
            const isSelected = org.id === selected;
            return (
              <button
                key={org.id}
                onClick={() => setSelected(org.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isSelected
                    ? "bg-brand-50 border-l-4 border-l-brand-600"
                    : "hover:bg-gray-50 border-l-4 border-l-transparent"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-brand-600" : "bg-gray-100"
                  }`}
                >
                  {isSelected ? (
                    <Check size={16} className="text-white" />
                  ) : (
                    <Building2 size={16} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isSelected ? "text-brand-800" : "text-gray-900"
                    }`}
                  >
                    {org.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {org.orgType && (
                      <span className="text-xs text-gray-500">{org.orgType.replace(/_/g, " ")}</span>
                    )}
                    {(org.city || org.state) && (
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin size={10} />
                        {[org.city, org.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="sm" icon={<Plus size={13} />}>
            Create new organization instead
          </Button>
        </Link>
        <Button
          onClick={handleLink}
          disabled={!selected || linking}
          loading={linking}
        >
          {linking ? "Linking..." : "Link My Account"}
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center">
        You can switch between organizations at any time from the sidebar.
      </p>
    </div>
  );
}