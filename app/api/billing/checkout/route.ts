/**
 * POST /api/billing/checkout — start a Pro subscription.
 * Returns { url } for Stripe's hosted checkout page.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { appUrl } from "@/lib/email/send";
import { billingEnabled } from "@/lib/billing/entitlements";
import { effectivePlan } from "@/lib/billing/plans";
import { ensureCustomer, getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing is not set up yet." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, subscriptionStatus: true },
  });
  if (effectivePlan(user) === "PRO") {
    return NextResponse.json({ error: "This account already has full access." }, { status: 409 });
  }

  try {
    const customer = await ensureCustomer(session.user.id);
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: session.user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: appUrl("/settings?billing=success"),
      cancel_url: appUrl("/settings?billing=cancelled"),
      subscription_data: { metadata: { userId: session.user.id } },
    });
    if (!checkout.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("[billing] checkout failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
