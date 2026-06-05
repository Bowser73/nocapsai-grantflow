"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "DRAFTING",           label: "Drafting" },
  { value: "NEEDS_REVIEW",       label: "Needs Review" },
  { value: "READY_TO_SUBMIT",    label: "Ready to Submit" },
  { value: "SUBMITTED",          label: "Submitted" },
  { value: "FOLLOW_UP_NEEDED",   label: "Follow-Up Needed" },
  { value: "AWARDED",            label: "Awarded" },
  { value: "DENIED",             label: "Denied" },
  { value: "REPORTING_REQUIRED", label: "Reporting Required" },
  { value: "CLOSED",             label: "Closed" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFTING:           "text-gray-600",
  NEEDS_REVIEW:       "text-amber-600",
  READY_TO_SUBMIT:    "text-blue-600",
  SUBMITTED:          "text-blue-700",
  FOLLOW_UP_NEEDED:   "text-amber-700",
  AWARDED:            "text-green-700",
  DENIED:             "text-red-600",
  REPORTING_REQUIRED: "text-orange-600",
  CLOSED:             "text-gray-400",
};

interface StatusSelectorProps {
  applicationId: string;
  currentStatus: string;
}

export function StatusSelector({ applicationId, currentStatus }: StatusSelectorProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === status) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/grants/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isUpdating}
      className={cn(
        "text-xs border border-gray-200 rounded-md px-3 py-1.5 bg-white font-medium",
        "focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50",
        "transition-colors cursor-pointer",
        STATUS_COLORS[status]
      )}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
