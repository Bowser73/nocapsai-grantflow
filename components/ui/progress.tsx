import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  size?: "sm" | "md";
  colorClass?: string;
}

export function Progress({ value, label, showPercent = true, size = "md", colorClass }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor = colorClass ?? (
    clamped >= 80 ? "bg-green-500" :
    clamped >= 50 ? "bg-brand-500" :
    "bg-amber-400"
  );

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-gray-600 font-medium">{label}</span>}
          {showPercent && <span className="text-xs text-gray-500">{clamped}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", size === "sm" ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
