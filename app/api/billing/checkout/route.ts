/**
 * POST /api/billing/checkout — start a Pro subscription.
 * Returns { url } for Stripe's hosted checkout page.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { billingEnabled } from "@/lib/billing/entitlements";
import { effectivePlan } from "@/lib/billing/plans";
import { startProCheckout } from "@/lib/billing/checkout";

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
    const result = await startProCheckout(session.user.id);
    if (result.kind === "conflict") {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("[billing] checkout failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
