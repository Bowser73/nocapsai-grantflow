/**
 * GrantFlow AI — Entitlements (server only)
 *
 * Works out which plan applies to the signed-in person and how much of each
 * limit they have used. Limits are only enforced once billing is switched on
 * (Stripe keys present); until then every account has full access, so
 * deploying this code changes nothing for existing users.
 */
import prisma from "@/lib/db/prisma";
import {
  bestPlan, checkLimit, effectivePlan, startOfMonthUTC,
  PLAN_LIMITS, type EffectivePlan, type LimitCheck, type PlanLimits,
} from "@/lib/billing/plans";

export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

const PLAN_FIELDS = { plan: true, subscriptionStatus: true } as const;

/** Plan that applies when `userId` works inside `organizationId`: their own
 *  plan, or the organization creator's plan if that is better. */
export async function planFor(userId: string, organizationId?: string | null): Promise<EffectivePlan> {
  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: PLAN_FIELDS }),
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          select: { createdBy: { select: PLAN_FIELDS } },
        })
      : null,
  ]);
  return bestPlan(effectivePlan(user), effectivePlan(org?.createdBy));
}

export interface Usage {
  organizations: number;
  applications: number;
  aiDraftsThisMonth: number;
}

export async function usageFor(userId: string, organizationId?: string | null): Promise<Usage> {
  const [organizations, applications, aiDraftsThisMonth] = await Promise.all([
    prisma.organization.count({ where: { createdByUserId: userId } }),
    organizationId ? prisma.grantApplication.count({ where: { organizationId } }) : 0,
    prisma.agentRun.count({
      where: {
        agentType: "WRITER",
        triggeredById: userId,
        status: { in: ["COMPLETED", "RUNNING"] },
        createdAt: { gte: startOfMonthUTC() },
      },
    }),
  ]);
  return { organizations, applications, aiDraftsThisMonth };
}

export interface Entitlements {
  enforced: boolean;
  plan: EffectivePlan;
  limits: PlanLimits;
  usage: Usage;
}

export async function entitlementsFor(userId: string, organizationId?: string | null): Promise<Entitlements> {
  const [plan, usage] = await Promise.all([
    planFor(userId, organizationId),
    usageFor(userId, organizationId),
  ]);
  return { enforced: billingEnabled(), plan, limits: PLAN_LIMITS[plan], usage };
}

const OK = (kind: LimitCheck["kind"]): LimitCheck => ({ allowed: true, kind, limit: null, used: 0, message: null });

export async function canCreateOrganization(userId: string): Promise<LimitCheck> {
  if (!billingEnabled()) return OK("organizations");
  const e = await entitlementsFor(userId, null);
  return checkLimit("organizations", e.plan, e.usage.organizations);
}

export async function canStartApplication(userId: string, organizationId: string): Promise<LimitCheck> {
  if (!billingEnabled()) return OK("applications");
  const e = await entitlementsFor(userId, organizationId);
  return checkLimit("applications", e.plan, e.usage.applications);
}

export async function canWriteSections(userId: string, organizationId: string, count: number): Promise<LimitCheck> {
  if (!billingEnabled()) return OK("aiDrafts");
  const e = await entitlementsFor(userId, organizationId);
  return checkLimit("aiDrafts", e.plan, e.usage.aiDraftsThisMonth, count);
}
