import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { effectivePlan, subscriptionEnded } from "@/lib/billing/plans";
import { playPlanFor, playBillingEnabled } from "@/lib/billing/play-server";
import { getStripe } from "@/lib/billing/stripe";
export async function GET() {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!playBillingEnabled())
    return NextResponse.json(
      { error: "Google Play purchases are not available yet" },
      { status: 503 },
    );
  const u = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { plan: true, subscriptionStatus: true, stripeCustomerId: true },
  });
  if (!u)
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (effectivePlan(u) === "PRO" || (await playPlanFor(s.user.id)) === "PRO")
    return NextResponse.json(
      { error: "You already have Pro access. Restore purchases or refresh." },
      { status: 409 },
    );
  if (u.stripeCustomerId) {
    try {
      const subs = await getStripe().subscriptions.list({
        customer: u.stripeCustomerId,
        status: "all",
        limit: 100,
      });
      if (subs.has_more || subs.data.some((x) => !subscriptionEnded(x.status)))
        return NextResponse.json(
          {
            error:
              "An existing subscription needs to be managed before starting another.",
          },
          { status: 409 },
        );
    } catch {
      return NextResponse.json(
        { error: "Existing billing could not be checked. Please try later." },
        { status: 503 },
      );
    }
  }
  return NextResponse.json(
    { eligible: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
