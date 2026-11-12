/**
 * Monthly foundation data refresh (Vercel Cron, CRON_SECRET required).
 * Imports one state per run: `?state=IN` if given, otherwise the configured
 * state whose data is oldest. One state per run keeps each run short.
 */
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { importState, nextStateToImport } from "@/lib/foundations/import";

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
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const state = req.nextUrl.searchParams.get("state") || (await nextStateToImport());
    const summary = await importState(state);
    console.log("[foundations] import complete:", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[foundations] import failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
