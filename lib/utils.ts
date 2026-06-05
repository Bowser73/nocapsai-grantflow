import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getDeadlineUrgency(deadline: Date | string | null | undefined): "overdue" | "urgent" | "soon" | "normal" | "none" {
  if (!deadline) return "none";
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return "overdue";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "normal";
}

export function formatDeadline(deadline: Date | string | null | undefined): string {
  if (!deadline) return "No deadline";
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 14) return `Due in ${days} days`;
  return formatDate(deadline);
}

export function computeProfileCompleteness(org: Record<string, unknown>): number {
  const fields = [
    "name", "ein", "orgType", "missionStatement", "programsServices",
    "geographicArea", "targetPopulation", "city", "state", "phone", "email",
    "annualBudget", "fiscalYearEnd",
  ];
  const filled = fields.filter((f) => !!org[f]).length;
  return Math.round((filled / fields.length) * 100);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}
