/**
 * POST /api/agents/search
 * Trigger the Grants.gov Search Agent for a given query.
 * Upserts live results into GrantOpportunity table and returns them.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runSearchAgent } from "@/lib/agents/search-agent";

// This route uses Prisma, external fetch, and env-dependent logic at request
// time. Force dynamic + Node.js runtime so Next.js does not try to evaluate or
// statically collect page data for it during build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Validate required env at request time (never throw at import/build time).
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Server is not configured: DATABASE_URL is missing." },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = "";
  try {
    const body = await req.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const result = await runSearchAgent({
      query,
      organizationId: session.user.organizationId,
      triggeredById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      opportunities: result.opportunities,
      totalFound: result.totalFound,
      sourcesQueried: result.sourcesQueried,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search agent failed";
    console.error("Search agent error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
