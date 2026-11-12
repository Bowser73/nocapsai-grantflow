/**
 * GrantFlow AI — Plans and limits
 *
 * Pure module (no Prisma, no Stripe): the single place that defines what each
 * plan includes. Client-safe.
 *
 * Stored plan values (User.plan):
 *   FREE — default for new sign-ups
 *   PRO  — paying subscriber (kept in sync by the Stripe webhook)
 *   COMP — complimentary full access (accounts that predate billing, or granted by hand)
 */

export type StoredPlan = "FREE" | "PRO" | "COMP";
export type EffectivePlan = "FREE" | "PRO";

export interface PlanLimits {
  /** Organization profiles a person can create. null = no limit. */
  organizations: number | null;
  /** Applications per organization. null = no limit. */
  applications: number | null;
  /** AI-written sections per calendar month (drafts and regenerations). */
  aiDraftsPerMonth: number;
}

export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  FREE: { organizations: 1, applications: 2, aiDraftsPerMonth: 25 },
  PRO:  { organizations: null, applications: null, aiDraftsPerMonth: 500 },
};

export const PRO_PRICE_LABEL = "$29/month";

/** Stripe subscription statuses that keep paid access switched on.
 *  past_due stays on while Stripe retries the card; it becomes
 *  unpaid/canceled if the retries fail. */
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export interface PlanHolder {
  plan: string;
  subscriptionStatus: string | null;
}

export function effectivePlan(holder: PlanHolder | null | undefined): EffectivePlan {
  if (!holder) return "FREE";
  if (holder.plan === "COMP") return "PRO";
  if (holder.plan === "PRO" && holder.subscriptionStatus && PAID_STATUSES.has(holder.subscriptionStatus)) {
    return "PRO";
  }
  return "FREE";
}

/** The better of two plans — used so everyone in an organization gets the
 *  access its owner pays for. */
export function bestPlan(...plans: EffectivePlan[]): EffectivePlan {
  return plans.includes("PRO") ? "PRO" : "FREE";
}

/** What the stored plan should become after a Stripe subscription change. */
export function planAfterSubscriptionChange(currentPlan: string, status: string): StoredPlan {
  if (currentPlan === "COMP") return "COMP"; // complimentary access is never downgraded by billing events
  return PAID_STATUSES.has(status) ? "PRO" : "FREE";
}

export type LimitKind = "organizations" | "applications" | "aiDrafts";

export interface LimitCheck {
  allowed: boolean;
  kind: LimitKind;
  limit: number | null;
  used: number;
  message: string | null;
}

export function checkLimit(kind: LimitKind, plan: EffectivePlan, used: number, adding = 1): LimitCheck {
  const limits = PLAN_LIMITS[plan];
  const limit =
    kind === "organizations" ? limits.organizations :
    kind === "applications" ? limits.applications :
    limits.aiDraftsPerMonth;

  if (limit === null || used + adding <= limit) {
    return { allowed: true, kind, limit, used, message: null };
  }

  const upgrade = plan === "FREE" ? ` Upgrade to Pro (${PRO_PRICE_LABEL}) to keep going.` : "";
  const message =
    kind === "organizations"
      ? `The Free plan includes ${limit} organization profile.${upgrade}`
      : kind === "applications"
      ? `The Free plan includes ${limit} applications per organization.${upgrade}`
      : plan === "FREE"
      ? `You have used ${used} of ${limit} AI-written sections this month, and this needs ${adding} more.${upgrade}`
      : `You have reached this month's fair-use limit of ${limit} AI-written sections. It resets on the 1st.`;

  return { allowed: false, kind, limit, used, message };
}

export function startOfMonthUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
