/**
 * POST /api/grants/applications/[appId]/sections/[sectionId]/regenerate
 * Regenerate a single section using the writer agent.
 * Saves version history, logs AgentRun, resets approval.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { runWriterAgent } from "@/lib/agents/writer-agent";
import type { GrantSectionType } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { appId: string; sectionId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, sectionId } = params;

  // Verify ownership and load section type
  const section = await prisma.grantApplicationSection.findUnique({
    where: { id: sectionId },
    include: { application: { select: { organizationId: true } } },
  });

  if (!section || section.applicationId !== appId) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }
  if (section.application.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (section.isLocked) {
    return NextResponse.json({ error: "Section is locked and cannot be regenerated" }, { status: 409 });
  }

  try {
    const result = await runWriterAgent({
      applicationId: appId,
      organizationId: session.user.organizationId,
      triggeredById: session.user.id,
      sectionType: section.sectionType as GrantSectionType,
    });

    return NextResponse.json({
      success: true,
      content: result.content,
      wordCount: result.wordCount,
      placeholders: result.placeholders,
      complianceFlags: result.complianceFlags ?? [],
      agentRunId: result.agentRunId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Writer agent failed";
    console.error("Regenerate section error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
