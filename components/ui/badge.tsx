import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

const variantClasses = {
  default: "bg-brand-100 text-brand-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger:  "bg-red-100 text-red-700",
  info:    "bg-blue-100 text-blue-700",
  neutral: "bg-gray-100 text-gray-600",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "status-badge font-semibold",
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Application Status Badge ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; variant: BadgeProps["variant"]; dot: string }> = {
  DRAFTING:          { label: "Drafting",          variant: "neutral",  dot: "bg-gray-400"  },
  NEEDS_REVIEW:      { label: "Needs Review",      variant: "warning",  dot: "bg-amber-400" },
  READY_TO_SUBMIT:   { label: "Ready to Submit",   variant: "info",     dot: "bg-blue-400"  },
  SUBMITTED:         { label: "Submitted",          variant: "info",     dot: "bg-blue-600"  },
  FOLLOW_UP_NEEDED:  { label: "Follow-Up Needed",  variant: "warning",  dot: "bg-amber-500" },
  AWARDED:           { label: "Awarded",            variant: "success",  dot: "bg-green-500" },
  DENIED:            { label: "Denied",             variant: "danger",   dot: "bg-red-400"   },
  REPORTING_REQUIRED:{ label: "Reporting Required", variant: "warning",  dot: "bg-orange-400"},
  CLOSED:            { label: "Closed",             variant: "neutral",  dot: "bg-gray-300"  },
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  );
}
