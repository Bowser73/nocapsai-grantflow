/**
 * Daily reminder job endpoint.
 *
 * Called by Vercel Cron (see vercel.json), which sends
 *   Authorization: Bearer <CRON_SECRET>
 * The route refuses to run unless CRON_SECRET is set and matches, so it cannot
 * be triggered by the public even though it sits outside the login wall.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReminders } from "@/lib/reminders/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runReminders();
    console.log("[reminders] run complete:", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[reminders] run failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Reminder run failed." }, { status: 500 });
  }
}
