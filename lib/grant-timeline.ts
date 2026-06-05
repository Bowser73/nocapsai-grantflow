/**
 * GrantFlow AI — Grant Timeline / Decision Tracker helpers
 *
 * Pure module: no Prisma runtime imports, no side effects.
 * All functions operate on plain data so they are safe to use in
 * both server components and client components.
 */

import { addDays, differenceInDays, isAfter, isBefore, isToday } from "date-fns";

// ── Grant type → decision window ──────────────────────────────────────────────

export type GrantType = "LOCAL" | "CORPORATE" | "STATE" | "FEDERAL" | "CUSTOM";

export const GRANT_TYPE_LABELS: Record<GrantType, string> = {
  LOCAL:     "Local / Community Foundation",
  CORPORATE: "Corporate / Private Foundation",
  STATE:     "Indiana / State Agency",
  FEDERAL:   "Federal",
  CUSTOM:    "Custom",
};

/** Number of days after submission before the decision window opens / closes */
export const DECISION_WINDOWS: Record<
  Exclude<GrantType, "CUSTOM">,
  { minDays: number; maxDays: number; followUpDays: number }
> = {
  LOCAL:     { minDays: 30,  maxDays: 90,  followUpDays: 45  },
  CORPORATE: { minDays: 60,  maxDays: 120, followUpDays: 75  },
  STATE:     { minDays: 90,  maxDays: 180, followUpDays: 100 },
  FEDERAL:   { minDays: 120, maxDays: 240, followUpDays: 135 },
};

export function calcDecisionWindow(
  submittedAt: Date,
  grantType: Exclude<GrantType, "CUSTOM">
): { start: Date; end: Date; followUpDate: Date } {
  const w = DECISION_WINDOWS[grantType];
  return {
    start:       addDays(submittedAt, w.minDays),
    end:         addDays(submittedAt, w.maxDays),
    followUpDate: addDays(submittedAt, w.followUpDays),
  };
}

// ── Decision status ───────────────────────────────────────────────────────────

export type DecisionStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED_WAITING"
  | "FOLLOW_UP_NEEDED"
  | "AWARDED"
  | "DECLINED"
  | "WAITLISTED"
  | "REPORTING_DUE"
  | "CLOSED";

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  NOT_SUBMITTED:    "Not submitted",
  SUBMITTED_WAITING: "Submitted — waiting",
  FOLLOW_UP_NEEDED: "Follow-up needed",
  AWARDED:          "Awarded",
  DECLINED:         "Declined",
  WAITLISTED:       "Waitlisted",
  REPORTING_DUE:    "Reporting due",
  CLOSED:           "Closed",
};

export const DECISION_STATUS_COLORS: Record<
  DecisionStatus,
  { badge: string; dot: string }
> = {
  NOT_SUBMITTED:    { badge: "bg-gray-100 text-gray-600",   dot: "bg-gray-400"   },
  SUBMITTED_WAITING:{ badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  FOLLOW_UP_NEEDED: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500"  },
  AWARDED:          { badge: "bg-green-100 text-green-700", dot: "bg-green-500"  },
  DECLINED:         { badge: "bg-red-100 text-red-700",     dot: "bg-red-500"    },
  WAITLISTED:       { badge: "bg-purple-100 text-purple-700", dot: "bg-purple-400" },
  REPORTING_DUE:    { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  CLOSED:           { badge: "bg-gray-100 text-gray-500",   dot: "bg-gray-300"   },
};

// ── Contract status ───────────────────────────────────────────────────────────

export type ContractStatus = "NOT_STARTED" | "PENDING" | "SIGNED" | "NOT_REQUIRED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  NOT_STARTED:  "Not started",
  PENDING:      "Pending signature",
  SIGNED:       "Signed",
  NOT_REQUIRED: "Not required",
};

// ── Funds received status ─────────────────────────────────────────────────────

export type FundsReceivedStatus = "NOT_RECEIVED" | "PARTIAL" | "RECEIVED" | "NOT_APPLICABLE";

export const FUNDS_STATUS_LABELS: Record<FundsReceivedStatus, string> = {
  NOT_RECEIVED:   "Not received",
  PARTIAL:        "Partially received",
  RECEIVED:       "Fully received",
  NOT_APPLICABLE: "N/A",
};

// ── Warning detection ─────────────────────────────────────────────────────────

export type TimelineWarning =
  | "MISSING_SUBMITTED_DATE"
  | "MISSING_DEADLINE"
  | "FOLLOW_UP_OVERDUE"
  | "FOLLOW_UP_DUE_SOON"
  | "DECISION_WINDOW_OPEN"
  | "DECISION_WINDOW_PASSED"
  | "REPORTING_DEADLINE_APPROACHING"
  | "REPORTING_DEADLINE_OVERDUE";

export interface TimelineWarningInfo {
  type: TimelineWarning;
  label: string;
  severity: "error" | "warning" | "info";
}

export interface ApplicationTimelineSnapshot {
  status: string;
  decisionStatus: string | null;
  submittedAt: Date | null;
  deadline: Date | null;
  followUpDate: Date | null;
  expectedDecisionStart: Date | null;
  expectedDecisionEnd: Date | null;
  reportDueDate: Date | null;
}

export function getTimelineWarnings(
  app: ApplicationTimelineSnapshot
): TimelineWarningInfo[] {
  const now = new Date();
  const warnings: TimelineWarningInfo[] = [];

  const isSubmitted =
    !!app.submittedAt ||
    app.status === "SUBMITTED" ||
    app.status === "FOLLOW_UP_NEEDED" ||
    app.status === "AWARDED" ||
    app.status === "DENIED" ||
    app.status === "REPORTING_REQUIRED";

  // Missing data warnings
  if (!app.deadline && !isSubmitted) {
    warnings.push({
      type: "MISSING_DEADLINE",
      label: "No deadline set",
      severity: "warning",
    });
  }
  if (
    (app.status === "SUBMITTED" || app.status === "FOLLOW_UP_NEEDED") &&
    !app.submittedAt
  ) {
    warnings.push({
      type: "MISSING_SUBMITTED_DATE",
      label: "Submitted date not recorded",
      severity: "warning",
    });
  }

  // Follow-up warnings
  if (app.followUpDate && isSubmitted) {
    const daysToFollowUp = differenceInDays(app.followUpDate, now);
    if (daysToFollowUp < 0) {
      warnings.push({
        type: "FOLLOW_UP_OVERDUE",
        label: `Follow-up overdue by ${Math.abs(daysToFollowUp)} day${Math.abs(daysToFollowUp) === 1 ? "" : "s"}`,
        severity: "error",
      });
    } else if (daysToFollowUp <= 7) {
      warnings.push({
        type: "FOLLOW_UP_DUE_SOON",
        label: `Follow-up due in ${daysToFollowUp} day${daysToFollowUp === 1 ? "" : "s"}`,
        severity: "warning",
      });
    }
  }

  // Decision window warnings
  if (app.expectedDecisionStart && app.expectedDecisionEnd && isSubmitted) {
    const windowStarted = isAfter(now, app.expectedDecisionStart) || isToday(app.expectedDecisionStart);
    const windowPassed  = isAfter(now, app.expectedDecisionEnd);
    const ds = app.decisionStatus;
    const resolved = ds === "AWARDED" || ds === "DECLINED" || ds === "CLOSED";

    if (!resolved) {
      if (windowPassed) {
        warnings.push({
          type: "DECISION_WINDOW_PASSED",
          label: "Decision window has passed — consider following up",
          severity: "error",
        });
      } else if (windowStarted) {
        warnings.push({
          type: "DECISION_WINDOW_OPEN",
          label: "Decision window is open",
          severity: "info",
        });
      }
    }
  }

  // Reporting warnings
  if (app.reportDueDate) {
    const daysToReport = differenceInDays(app.reportDueDate, now);
    if (daysToReport < 0) {
      warnings.push({
        type: "REPORTING_DEADLINE_OVERDUE",
        label: `Reporting deadline overdue by ${Math.abs(daysToReport)} day${Math.abs(daysToReport) === 1 ? "" : "s"}`,
        severity: "error",
      });
    } else if (daysToReport <= 30) {
      warnings.push({
        type: "REPORTING_DEADLINE_APPROACHING",
        label: `Reporting due in ${daysToReport} day${daysToReport === 1 ? "" : "s"}`,
        severity: "warning",
      });
    }
  }

  return warnings;
}

// ── Group applications into tracker buckets ───────────────────────────────────

export type TrackerGroup =
  | "drafting"
  | "submitted"
  | "followup"
  | "awarded"
  | "declined"
  | "reporting"
  | "closed";

export const TRACKER_GROUP_META: Record<
  TrackerGroup,
  { label: string; color: string; emptyLabel: string }
> = {
  drafting:  { label: "Drafting",          color: "text-gray-600",   emptyLabel: "No drafts"               },
  submitted: { label: "Submitted / Waiting", color: "text-blue-700",  emptyLabel: "None submitted"          },
  followup:  { label: "Follow-Up Needed",  color: "text-amber-700",  emptyLabel: "No follow-ups needed"    },
  awarded:   { label: "Awarded",           color: "text-green-700",  emptyLabel: "No awards yet"           },
  declined:  { label: "Declined",          color: "text-red-700",    emptyLabel: "No declines"             },
  reporting: { label: "Reporting Due",     color: "text-orange-700", emptyLabel: "No reports due"          },
  closed:    { label: "Closed",            color: "text-gray-500",   emptyLabel: "None closed"             },
};

export function getTrackerGroup(
  appStatus: string,
  decisionStatus: string | null
): TrackerGroup {
  // Decision status takes priority for resolved applications
  if (decisionStatus === "AWARDED")        return "awarded";
  if (decisionStatus === "DECLINED")       return "declined";
  if (decisionStatus === "REPORTING_DUE")  return "reporting";
  if (decisionStatus === "CLOSED")         return "closed";
  if (decisionStatus === "FOLLOW_UP_NEEDED") return "followup";
  if (decisionStatus === "WAITLISTED")     return "submitted";

  // Fall back to ApplicationStatus
  switch (appStatus) {
    case "AWARDED":            return "awarded";
    case "DENIED":             return "declined";
    case "REPORTING_REQUIRED": return "reporting";
    case "CLOSED":             return "closed";
    case "FOLLOW_UP_NEEDED":   return "followup";
    case "SUBMITTED":          return "submitted";
    case "NEEDS_REVIEW":
    case "READY_TO_SUBMIT":
    case "DRAFTING":
    default:                   return "drafting";
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatDecisionWindow(
  start: Date | null,
  end: Date | null
): string {
  if (!start || !end) return "Not set";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
