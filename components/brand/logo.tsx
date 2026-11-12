import { cn } from "@/lib/utils";

/**
 * GrantFlow mark: a form checkbox, ticked, with the tick in highlighter yellow.
 * `tone="light"` is for dark backgrounds (the sidebar).
 */
export function LogoMark({ size = 28, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) {
  const ink = tone === "light" ? "#FFFFFF" : "#14213D";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="3" stroke={ink} strokeWidth="2.5" />
      <path d="M9 16.5l5 5L24 10" stroke="#FFE04A" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16.5l5 5L24 10" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      <span
        className={cn(
          "font-display font-extrabold text-[17px] tracking-tight",
          tone === "light" ? "text-white" : "text-brand-800"
        )}
        style={{ fontStretch: "112%" }}
      >
        GrantFlow
      </span>
    </span>
  );
}
