/**
 * POST /api/billing/webhook — Stripe tells us when a subscription starts,
 * changes, or ends. This is the only thing that grants or removes Pro access.
 *
 * The request is trusted only if its signature matches STRIPE_WEBHOOK_SECRET.
 * The route sits outside the login wall (see auth.config.ts).
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import prisma from "@/lib/db/prisma";
import { applySubscription, getStripe, snapshotSubscription } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing webhook is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("missing signature");
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[billing] webhook signature rejected:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // Link the Stripe customer to our user in case checkout created the link
        // before our own record was saved. Access itself is granted by the
        // subscription events below.
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (userId && customerId) {
          await prisma.user.updateMany({
            where: { id: userId, stripeCustomerId: null },
            data: { stripeCustomerId: customerId },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const snap = snapshotSubscription(event.data.object as Stripe.Subscription);
        const matched = await applySubscription(snap);
        if (!matched) console.error("[billing] no user for Stripe customer", snap.customerId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // A 500 makes Stripe retry later, which is what we want if the database blipped.
    console.error("[billing] webhook handling failed:", event.type, err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
