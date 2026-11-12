/**
 * POST /api/admin/foundations — load or refresh one state's foundation data now.
 * Only for signed-in users whose email is listed in ADMIN_EMAILS.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { importState, isAdminEmail } from "@/lib/foundations/import";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ state: z.string().length(2) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a state." }, { status: 400 });

  try {
    const summary = await importState(parsed.data.state);
    return NextResponse.json({ success: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[foundations] admin import failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
