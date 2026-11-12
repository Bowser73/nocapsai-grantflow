/**
 * GrantFlow AI — Starting a Pro checkout (server only)
 *
 * One subscription per account. Stripe is the source of truth: our own record
 * can lag behind a checkout that just completed, or show FREE while an unpaid
 * subscription still exists.
 */
import { appUrl } from "@/lib/email/send";
import { subscriptionEnded } from "@/lib/billing/plans";
import { applySubscription, ensureCustomer, getStripe, snapshotSubscription } from "@/lib/billing/stripe";

/** Requests inside the same window share one Stripe idempotency key, so two
 *  tabs or a double click cannot create two checkout sessions. */
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

export type CheckoutStart =
  | { kind: "url"; url: string }
  | { kind: "conflict"; message: string };

export async function startProCheckout(userId: string, now: number = Date.now()): Promise<CheckoutStart> {
  const stripe = getStripe();
  const customer = await ensureCustomer(userId);

  // 1. Never start a second subscription.
  const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
  const existing = subs.data.find((s) => !subscriptionEnded(s.status));
  if (existing) {
    await applySubscription(snapshotSubscription(existing));
    const paid = existing.status === "active" || existing.status === "trialing";
    return {
      kind: "conflict",
      message: paid
        ? "This account already has a Pro subscription. Refresh the page to see it."
        : "This account already has a subscription with a payment problem. Use Manage billing to update your card instead of subscribing again.",
    };
  }

  // 2. Reuse a checkout that is already open (second tab, back button).
  const open = await stripe.checkout.sessions.list({ customer, status: "open", limit: 10 });
  const reusable = open.data.find((s) => s.mode === "subscription" && s.url);
  if (reusable?.url) return { kind: "url", url: reusable.url };

  // 3. Otherwise create one. The idempotency key makes simultaneous requests
  //    resolve to the same session.
  const windowId = Math.floor(now / CHECKOUT_WINDOW_MS);
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer,
      client_reference_id: userId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: appUrl("/settings?billing=success"),
      cancel_url: appUrl("/settings?billing=cancelled"),
      subscription_data: { metadata: { userId } },
    },
    { idempotencyKey: `checkout:${userId}:${windowId}` }
  );
  if (!checkout.url) throw new Error("Stripe did not return a checkout URL");
  return { kind: "url", url: checkout.url };
}
