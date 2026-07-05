import type { GrantEligibilityTag, GrantWritingStage } from "@prisma/client";

export const FOR_PROFIT_APPLICANT_WARNING =
  "This opportunity may still be useful, but NoCapsAI should not be listed as the applicant unless the funder allows for-profit entities. Consider assigning this to an eligible partner or client.";

export const GRANT_ELIGIBILITY_LABELS: Record<GrantEligibilityTag, string> = {
  DIRECT_NOCAPSAI_ELIGIBLE: "Direct NoCapsAI eligible",
  PARTNER_OR_CLIENT_ELIGIBLE: "Partner/client eligible",
  WATCHLIST_ONLY: "Watchlist only",
  NOT_ELIGIBLE: "Not eligible",
};

export const GRANT_STAGE_LABELS: Record<GrantWritingStage, string> = {
  FOUND: "Found",
  ELIGIBILITY_REVIEW: "Eligibility Review",
  DOCUMENTS_NEEDED: "Documents Needed",
  DRAFTING: "Drafting",
  BUDGET_DRAFT: "Budget Draft",
  INTERNAL_REVIEW: "Internal Review",
  CLIENT_REVIEW: "Client Review",
  READY_TO_SUBMIT: "Ready to Submit",
  SUBMITTED: "Submitted",
  AWARDED: "Awarded",
  REJECTED: "Rejected",
  WATCHLIST: "Watchlist",
};

export function shouldWarnForProfitApplicant(input: {
  eligibilityTag: GrantEligibilityTag | string;
  applicantTypeRequired?: string | null;
  nocapsCanApplyDirectly?: boolean | null;
}): boolean {
  if (input.nocapsCanApplyDirectly === true) return false;
  if (input.eligibilityTag === "DIRECT_NOCAPSAI_ELIGIBLE") return false;

  const requiredType = (input.applicantTypeRequired ?? "").toLowerCase();
  const explicitlyAllowsForProfit =
    requiredType.includes("for-profit") ||
    requiredType.includes("for profit") ||
    requiredType.includes("small business") ||
    requiredType.includes("llc");

  return !explicitlyAllowsForProfit;
}

export type GrantDashboardLane =
  | "nocaps"
  | "twizted"
  | "dads"
  | "partnerOnly"
  | "watchlist";

export const GRANT_DASHBOARD_LANE_LABELS: Record<GrantDashboardLane, string> = {
  nocaps: "Grants for NoCapsAI",
  twizted: "Grants for Twizted Journeys",
  dads: "Grants for Dedicated Dads / We Help Dads",
  partnerOnly: "Partner-only opportunities",
  watchlist: "Watchlist",
};

export function getGrantDashboardLane(input: {
  eligibilityTag: GrantEligibilityTag | string;
  partnerClientName?: string | null;
}): GrantDashboardLane {
  const partner = (input.partnerClientName ?? "").toLowerCase();

  if (input.eligibilityTag === "DIRECT_NOCAPSAI_ELIGIBLE") return "nocaps";
  if (partner.includes("twizted")) return "twizted";
  if (partner.includes("dedicated dads") || partner.includes("we help dads")) return "dads";
  if (input.eligibilityTag === "PARTNER_OR_CLIENT_ELIGIBLE") return "partnerOnly";
  return "watchlist";
}
