import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import {
  playAccountId,
  playBillingEnabled,
  playPlanFor,
  verifyPlayPurchase,
} from "@/lib/billing/play-server";
import { PLAY_PRODUCT } from "@/lib/billing/play-policy";
import { effectivePlan } from "@/lib/billing/plans";
export const runtime = "nodejs";
export async function GET() {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    {
      enabled: playBillingEnabled(),
      productId: PLAY_PRODUCT,
      accountId: playAccountId(s.user.id),
      plan: await playPlanFor(s.user.id),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (!playBillingEnabled())
    return NextResponse.json(
      { error: "Google Play billing is not enabled yet" },
      { status: 503 },
    );
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    typeof body.purchaseToken !== "string" ||
    body.purchaseToken.length < 10 ||
    body.purchaseToken.length > 4096
  )
    return NextResponse.json(
      { error: "Invalid purchase token" },
      { status: 400 },
    );
  try {
    const result = await verifyPlayPurchase(s.user.id, body.purchaseToken);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not verify this purchase. Restore purchases or contact support; do not purchase again.",
      },
      { status: 502 },
    );
  }
}
