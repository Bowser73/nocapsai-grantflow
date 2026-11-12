/**
 * POST /api/billing/portal — open Stripe's customer portal (update card,
 * download invoices, cancel). Returns { url }.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { appUrl } from "@/lib/email/send";
import { billingEnabled } from "@/lib/billing/entitlements";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing is not set up yet." }, { status: 503 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account exists for this user yet." }, { status: 404 });
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: appUrl("/settings"),
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[billing] portal failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Could not open billing. Please try again." }, { status: 502 });
  }
}
