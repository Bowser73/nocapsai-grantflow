/**
 * GrantFlow AI — Stripe client and subscription sync (server only)
 */
import Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { planAfterSubscriptionChange } from "@/lib/billing/plans";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
  if (!client) {
    // STRIPE_API_HOST is only for local tests against a mock server.
    const mock = process.env.STRIPE_API_HOST;
    client = new Stripe(key, mock ? { host: mock.split(":")[0], port: Number(mock.split(":")[1] ?? 80), protocol: "http" } : {});
  }
  return client;
}

/** Finds or creates the Stripe customer for a user and stores the id. */
export async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await getStripe().customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId },
  });
  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
}

/** Reads the fields we need from a Stripe subscription object. The period end
 *  moved from the subscription to its items in newer Stripe API versions, so
 *  both places are checked. */
export function snapshotSubscription(sub: Stripe.Subscription): SubscriptionSnapshot {
  const loose = sub as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const end = loose.current_period_end ?? loose.items?.data?.[0]?.current_period_end ?? null;
  return {
    id: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  };
}

/**
 * Applies a subscription's state to the matching user. Returns false when no
 * user is linked to that Stripe customer.
 *
 * A "canceled"/ended event for a subscription that is not the one on file is
 * ignored, so cancelling an old subscription cannot switch off a newer one.
 */
export async function applySubscription(snap: SubscriptionSnapshot): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: snap.customerId },
    select: { id: true, plan: true, stripeSubscriptionId: true },
  });
  if (!user) return false;

  const nextPlan = planAfterSubscriptionChange(user.plan, snap.status);
  const isCurrent = !user.stripeSubscriptionId || user.stripeSubscriptionId === snap.id;
  if (!isCurrent && nextPlan !== "PRO") return true;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: nextPlan,
      stripeSubscriptionId: snap.id,
      subscriptionStatus: snap.status,
      currentPeriodEnd: snap.currentPeriodEnd,
    },
  });
  return true;
}
